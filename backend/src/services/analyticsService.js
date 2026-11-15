import { Order } from '../models/Order.js';
import { User } from '../models/User.js';
import { Product } from '../models/Product.js';
import { ROLES } from '../constants/roles.js';

/**
 * Resolves standard date ranges into start and end Date objects
 */
export function resolveDateRange(period, customStart, customEnd) {
  const now = new Date();
  let start = new Date(now);
  let end = new Date(now);

  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'yesterday':
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case 'last_7_days':
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      break;
    case 'last_30_days':
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      break;
    case 'this_month':
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      break;
    case 'last_month':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;
    case 'custom':
      if (customStart) start = new Date(customStart);
      if (customEnd) end = new Date(customEnd);
      break;
    default:
      // Default to last 30 days
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      break;
  }

  // Calculate matching prior comparison period
  const durationMs = end.getTime() - start.getTime();
  const priorEnd = new Date(start.getTime() - 1);
  const priorStart = new Date(priorEnd.getTime() - durationMs);

  return { start, end, priorStart, priorEnd };
}

export const analyticsService = {
  /**
   * Computes comprehensive executive dashboard metrics from real database records
   */
  async getDashboardOverview({ period = 'last_30_days', startDate, endDate } = {}) {
    const { start, end, priorStart, priorEnd } = resolveDateRange(period, startDate, endDate);

    // 1. Current Period Order Aggregation
    const currentOrderMetrics = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          gmv: {
            $sum: {
              $cond: [
                { $ne: ['$orderStatus', 'cancelled'] },
                { $ifNull: ['$pricing.grandTotal', '$grandTotal', 0] },
                0
              ]
            }
          },
          grossRevenue: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$paymentStatus', 'captured'] },
                    { $in: ['$orderStatus', ['confirmed', 'processing', 'shipped', 'delivered']] }
                  ]
                },
                { $ifNull: ['$pricing.grandTotal', '$grandTotal', 0] },
                0
              ]
            }
          },
          totalRefunds: { $sum: '$totalRefundedAmount' },
          capturedOrdersCount: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$paymentStatus', 'captured'] },
                    { $in: ['$orderStatus', ['confirmed', 'processing', 'shipped', 'delivered']] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // 2. Prior Period Order Aggregation for Comparison / Trends
    const priorOrderMetrics = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: priorStart, $lte: priorEnd }
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          gmv: {
            $sum: {
              $cond: [
                { $ne: ['$orderStatus', 'cancelled'] },
                { $ifNull: ['$pricing.grandTotal', '$grandTotal', 0] },
                0
              ]
            }
          },
          grossRevenue: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$paymentStatus', 'captured'] },
                    { $in: ['$orderStatus', ['confirmed', 'processing', 'shipped', 'delivered']] }
                  ]
                },
                { $ifNull: ['$pricing.grandTotal', '$grandTotal', 0] },
                0
              ]
            }
          },
          totalRefunds: { $sum: '$totalRefundedAmount' }
        }
      }
    ]);

    const cur = currentOrderMetrics[0] || {
      totalOrders: 0,
      gmv: 0,
      grossRevenue: 0,
      totalRefunds: 0,
      capturedOrdersCount: 0
    };

    const pri = priorOrderMetrics[0] || {
      totalOrders: 0,
      gmv: 0,
      grossRevenue: 0,
      totalRefunds: 0
    };

    const netRevenue = Math.max(0, cur.grossRevenue - cur.totalRefunds);
    const priorNetRevenue = Math.max(0, pri.grossRevenue - pri.totalRefunds);
    const aov = cur.capturedOrdersCount > 0 ? Math.round(netRevenue / cur.capturedOrdersCount) : 0;

    // Percentage Growth Calculations
    const calcGrowth = (currentVal, priorVal) => {
      if (priorVal === 0) return currentVal > 0 ? 100 : 0;
      return Math.round(((currentVal - priorVal) / priorVal) * 100 * 10) / 10;
    };

    const gmvGrowth = calcGrowth(cur.gmv, pri.gmv);
    const revenueGrowth = calcGrowth(netRevenue, priorNetRevenue);
    const ordersGrowth = calcGrowth(cur.totalOrders, pri.totalOrders);

    // 3. Orders By Status Breakdown
    const statusCounts = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$orderStatus',
          count: { $sum: 1 },
          totalAmount: { $sum: { $ifNull: ['$pricing.grandTotal', '$grandTotal', 0] } }
        }
      }
    ]);

    const orderStatusBreakdown = {
      pending: 0,
      confirmed: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      returned: 0
    };

    statusCounts.forEach((s) => {
      if (orderStatusBreakdown[s._id] !== undefined) {
        orderStatusBreakdown[s._id] = s.count;
      }
    });

    // 4. Payment Method Breakdown
    const paymentMethodStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          totalAmount: { $sum: { $ifNull: ['$pricing.grandTotal', '$grandTotal', 0] } }
        }
      }
    ]);

    const paymentBreakdown = {
      razorpay: { count: 0, totalAmount: 0 },
      cod: { count: 0, totalAmount: 0 }
    };

    paymentMethodStats.forEach((p) => {
      if (p._id === 'razorpay' || p._id === 'cod') {
        paymentBreakdown[p._id] = { count: p.count, totalAmount: p.totalAmount };
      }
    });

    // 5. Daily Revenue & Orders Over Time
    const timelineData = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          orderStatus: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: { $ifNull: ['$pricing.grandTotal', '$grandTotal', 0] } },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 6. Top Selling Products
    const topProducts = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          orderStatus: { $ne: 'cancelled' }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.sku',
          title: { $first: '$items.title' },
          image: { $first: { $ifNull: ['$items.imageUrl', '$items.image', ''] } },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $ifNull: ['$items.itemTotal', '$items.lineTotal', 0] } }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 5 }
    ]);

    // 7. Customers & CRM Metrics
    const [totalCustomers, newCustomersInPeriod, returningCustomers] = await Promise.all([
      User.countDocuments({ role: ROLES.CUSTOMER }),
      User.countDocuments({
        role: ROLES.CUSTOMER,
        createdAt: { $gte: start, $lte: end }
      }),
      Order.aggregate([
        {
          $match: {
            userId: { $exists: true, $ne: null },
            orderStatus: { $ne: 'cancelled' }
          }
        },
        {
          $group: {
            _id: '$userId',
            orderCount: { $sum: 1 }
          }
        },
        { $match: { orderCount: { $gt: 1 } } },
        { $count: 'returningCount' }
      ])
    ]);

    const returningCount = returningCustomers[0]?.returningCount || 0;

    // 8. Inventory & Stock Valuation Metrics
    const inventoryStats = await Product.aggregate([
      { $unwind: '$variants' },
      {
        $group: {
          _id: null,
          totalSkus: { $sum: 1 },
          totalStock: { $sum: '$variants.stockQuantity' },
          totalReserved: { $sum: '$variants.reservedQuantity' },
          lowStockCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $lte: ['$variants.stockQuantity', '$variants.lowStockThreshold'] },
                    { $gt: ['$variants.stockQuantity', 0] }
                  ]
                },
                1,
                0
              ]
            }
          },
          outOfStockCount: {
            $sum: {
              $cond: [{ $eq: ['$variants.stockQuantity', 0] }, 1, 0]
            }
          },
          inventoryValuation: {
            $sum: {
              $multiply: [
                {
                  $cond: [
                    { $gt: ['$variants.costPrice', 0] },
                    '$variants.costPrice',
                    '$variants.price'
                  ]
                },
                '$variants.stockQuantity'
              ]
            }
          }
        }
      }
    ]);

    const inv = inventoryStats[0] || {
      totalSkus: 0,
      totalStock: 0,
      totalReserved: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      inventoryValuation: 0
    };

    return {
      dateRange: {
        period,
        startDate: start.toISOString(),
        endDate: end.toISOString()
      },
      kpi: {
        gmv: cur.gmv,
        grossRevenue: cur.grossRevenue,
        refunds: cur.totalRefunds,
        netRevenue,
        aov,
        totalOrders: cur.totalOrders,
        capturedOrders: cur.capturedOrdersCount,
        growth: {
          gmv: gmvGrowth,
          revenue: revenueGrowth,
          orders: ordersGrowth
        }
      },
      customers: {
        total: totalCustomers,
        new: newCustomersInPeriod,
        returning: returningCount
      },
      orders: {
        byStatus: orderStatusBreakdown,
        byPaymentMethod: paymentBreakdown
      },
      inventory: {
        totalSkus: inv.totalSkus,
        totalStockUnits: inv.totalStock,
        reservedUnits: inv.totalReserved,
        lowStockSkus: inv.lowStockCount,
        outOfStockSkus: inv.outOfStockCount,
        valuation: inv.inventoryValuation
      },
      timeline: timelineData.map((t) => ({
        date: t._id,
        revenue: t.revenue,
        orders: t.orders
      })),
      topSellingProducts: topProducts
    };
  }
};

export default analyticsService;
