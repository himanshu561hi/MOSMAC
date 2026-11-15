import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Order } from '../models/Order.js';
import { Address } from '../models/Address.js';
import { ROLES } from '../constants/roles.js';
import { ApiError } from '../utils/ApiError.js';
import { auditService } from './auditService.js';

export const adminCustomerService = {
  /**
   * Paginated customer listing with aggregated lifetime spend and order count
   */
  async listCustomers({ page = 1, limit = 20, search, status, role, sortBy = 'createdAt', sortOrder = 'desc' } = {}) {
    const matchQuery = {};
    if (role) {
      matchQuery.role = role;
    }
    if (status) {
      matchQuery.status = status;
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      matchQuery.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex }
      ];
    }

    const skip = (page - 1) * limit;
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    // Aggregation pipeline to join lifetime order metrics
    const pipeline = [
      { $match: matchQuery },
      {
        $lookup: {
          from: 'orders',
          let: { customerId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$userId', '$$customerId'] },
                orderStatus: { $ne: 'cancelled' }
              }
            },
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalSpent: { $sum: { $ifNull: ['$pricing.grandTotal', '$grandTotal', 0] } },
                lastOrderDate: { $max: '$createdAt' }
              }
            }
          ],
          as: 'orderStats'
        }
      },
      {
        $addFields: {
          totalOrders: {
            $ifNull: [{ $arrayElemAt: ['$orderStats.totalOrders', 0] }, 0]
          },
          totalSpent: {
            $ifNull: [{ $arrayElemAt: ['$orderStats.totalSpent', 0] }, 0]
          },
          lastOrderDate: {
            $arrayElemAt: ['$orderStats.lastOrderDate', 0]
          }
        }
      },
      { $project: { orderStats: 0, passwordHash: 0, refreshSessions: 0 } },
      { $sort: { [sortBy]: sortDirection } },
      { $skip: skip },
      { $limit: limit }
    ];

    const [customers, total] = await Promise.all([
      User.aggregate(pipeline),
      User.countDocuments(matchQuery)
    ]);

    return {
      customers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  },

  /**
   * Detailed customer profile with order history, saved addresses, and staff notes
   */
  async getCustomerProfile(customerId) {
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      throw ApiError.badRequest('Invalid customer ID');
    }

    const user = await User.findById(customerId).select('-passwordHash -refreshSessions');
    if (!user || user.role !== ROLES.CUSTOMER) {
      throw ApiError.notFound('Customer not found');
    }

    const [addresses, recentOrders, orderStats] = await Promise.all([
      Address.find({ userId: customerId }).sort({ isDefaultShipping: -1, createdAt: -1 }),
      Order.find({ userId: customerId }).sort({ createdAt: -1 }).limit(10),
      Order.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(customerId),
            orderStatus: { $ne: 'cancelled' }
          }
        },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalSpent: { $sum: { $ifNull: ['$pricing.grandTotal', '$grandTotal', 0] } },
            firstOrderDate: { $min: '$createdAt' },
            lastOrderDate: { $max: '$createdAt' }
          }
        }
      ])
    ]);

    const stats = orderStats[0] || {
      totalOrders: 0,
      totalSpent: 0,
      firstOrderDate: null,
      lastOrderDate: null
    };

    const aov = stats.totalOrders > 0 ? Math.round(stats.totalSpent / stats.totalOrders) : 0;

    return {
      customer: user.toJSON(),
      addresses,
      recentOrders,
      metrics: {
        totalOrders: stats.totalOrders,
        totalSpent: stats.totalSpent,
        aov,
        firstOrderDate: stats.firstOrderDate,
        lastOrderDate: stats.lastOrderDate
      },
      staffNotes: user.staffNotes || []
    };
  },

  /**
   * Add an internal administrative staff note to customer record
   */
  async addCustomerNote(customerId, { note, authorId, authorName }) {
    if (!note || !note.trim()) {
      throw ApiError.badRequest('Note content cannot be empty');
    }

    const user = await User.findById(customerId);
    if (!user || user.role !== ROLES.CUSTOMER) {
      throw ApiError.notFound('Customer not found');
    }

    const newNote = {
      note: note.trim(),
      authorId,
      authorName: authorName || 'Staff',
      createdAt: new Date()
    };

    user.staffNotes.unshift(newNote);
    await user.save();

    await auditService.log({
      actorId: authorId,
      actorRole: 'staff',
      action: 'CUSTOMER_NOTE_ADDED',
      resourceType: 'User',
      resourceId: customerId,
      notes: `Note added by ${authorName}`
    });

    return user.staffNotes;
  },

  /**
   * Suspend, activate, or deactivate customer account with token invalidation
   */
  async updateCustomerStatus(customerId, { status, reason = '' }, staffUser) {
    if (!['active', 'suspended', 'deactivated'].includes(status)) {
      throw ApiError.badRequest('Invalid status. Allowed values: active, suspended, deactivated');
    }

    const user = await User.findById(customerId);
    if (!user) {
      throw ApiError.notFound('Customer not found');
    }

    // Disallow modifying staff accounts via customer service
    if (user.role !== ROLES.CUSTOMER) {
      throw ApiError.forbidden('Staff status must be modified through Staff Management');
    }

    const previousStatus = user.status;
    user.status = status;

    // When suspending or deactivating, immediately revoke active sessions
    if (status !== 'active') {
      user.tokenVersion += 1;
      user.refreshSessions = [];
    }

    await user.save();

    await auditService.log({
      actorId: staffUser._id,
      actorRole: staffUser.role,
      actorEmail: staffUser.email,
      action: 'CUSTOMER_STATUS_UPDATE',
      resourceType: 'User',
      resourceId: customerId,
      changes: { before: { status: previousStatus }, after: { status } },
      notes: reason || `Customer status changed to ${status}`
    });

    return user.toJSON();
  },

  /**
   * Export customer records into CSV format with privacy protection
   */
  async exportCustomersCsv({ search, status } = {}) {
    const matchQuery = { role: ROLES.CUSTOMER };
    if (status) matchQuery.status = status;
    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      matchQuery.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex }
      ];
    }

    const customers = await User.find(matchQuery)
      .select('firstName lastName email phone status isEmailVerified createdAt')
      .sort({ createdAt: -1 })
      .limit(5000)
      .lean();

    const headers = ['Customer ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Status', 'Email Verified', 'Registration Date'];
    const rows = customers.map((c) => [
      `"${c._id}"`,
      `"${(c.firstName || '').replace(/"/g, '""')}"`,
      `"${(c.lastName || '').replace(/"/g, '""')}"`,
      `"${(c.email || '').replace(/"/g, '""')}"`,
      `"${(c.phone || '').replace(/"/g, '""')}"`,
      `"${c.status}"`,
      `"${c.isEmailVerified ? 'Yes' : 'No'}"`,
      `"${new Date(c.createdAt).toISOString()}"`
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
};

export default adminCustomerService;
