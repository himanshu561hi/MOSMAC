import { Order } from '../models/Order.js';
import { Coupon } from '../models/Coupon.js';
import { resolveDateRange } from './analyticsService.js';

export const exportReportService = {
  /**
   * Export Orders Report to CSV
   */
  async exportOrdersReport({ period = 'last_30_days', startDate, endDate, orderStatus, paymentStatus } = {}) {
    const { start, end } = resolveDateRange(period, startDate, endDate);
    const query = {
      createdAt: { $gte: start, $lte: end }
    };
    if (orderStatus) query.orderStatus = orderStatus;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(5000)
      .lean();

    const headers = [
      'Order Number',
      'Placed At',
      'Customer Name',
      'Customer Phone',
      'Customer Email',
      'Items Count',
      'Subtotal (INR)',
      'Coupon Discount (INR)',
      'Shipping Fee (INR)',
      'Total GST (INR)',
      'Grand Total (INR)',
      'Payment Method',
      'Payment Status',
      'Order Status',
      'City',
      'State',
      'PIN Code'
    ];

    const rows = orders.map((o) => {
      const subtotal = o.pricing?.subtotal ?? o.subtotal ?? 0;
      const discount = o.pricing?.discountTotal ?? o.discountAmount ?? 0;
      const shipping = o.pricing?.shippingFee ?? o.shippingFee ?? 0;
      const tax = o.pricing?.taxTotal ?? o.taxBreakdown?.totalTax ?? 0;
      const grandTotal = o.pricing?.grandTotal ?? o.grandTotal ?? 0;
      const customerName = o.shippingAddress?.fullName || (o.customer ? `${o.customer.firstName} ${o.customer.lastName || ''}`.trim() : 'Guest');
      const customerPhone = o.customer?.phone || o.shippingAddress?.phone || '';
      const customerEmail = o.customer?.email || o.shippingAddress?.email || '';

      return [
        `"${o.orderNumber}"`,
        `"${new Date(o.createdAt).toISOString()}"`,
        `"${customerName.replace(/"/g, '""')}"`,
        `"${customerPhone}"`,
        `"${customerEmail}"`,
        o.items?.length || 0,
        (subtotal / 100).toFixed(2),
        (discount / 100).toFixed(2),
        (shipping / 100).toFixed(2),
        (tax / 100).toFixed(2),
        (grandTotal / 100).toFixed(2),
        `"${o.paymentMethod}"`,
        `"${o.paymentStatus}"`,
        `"${o.orderStatus}"`,
        `"${(o.shippingAddress?.city || '').replace(/"/g, '""')}"`,
        `"${(o.shippingAddress?.state || '').replace(/"/g, '""')}"`,
        `"${o.shippingAddress?.postalCode || ''}"`
      ];
    });

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  },

  /**
   * Export Tax & GST Breakdown Report to CSV
   */
  async exportTaxReport({ period = 'last_30_days', startDate, endDate } = {}) {
    const { start, end } = resolveDateRange(period, startDate, endDate);
    const query = {
      createdAt: { $gte: start, $lte: end },
      orderStatus: { $ne: 'cancelled' }
    };

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(5000)
      .lean();

    const headers = [
      'Order Number',
      'Invoice Date',
      'Customer State',
      'Taxable Subtotal (INR)',
      'CGST (INR)',
      'SGST (INR)',
      'IGST (INR)',
      'Total Tax (INR)',
      'Grand Total (INR)'
    ];

    const rows = orders.map((o) => {
      const subtotal = o.pricing?.subtotal ?? o.subtotal ?? 0;
      const discount = o.pricing?.discountTotal ?? o.discountAmount ?? 0;
      const taxable = (subtotal - discount) / 100;
      const taxTotal = o.pricing?.taxTotal ?? o.taxBreakdown?.totalTax ?? 0;
      const cgst = ((o.taxBreakdown?.cgst || Math.round(taxTotal / 2)) / 100).toFixed(2);
      const sgst = ((o.taxBreakdown?.sgst || Math.round(taxTotal / 2)) / 100).toFixed(2);
      const igst = ((o.taxBreakdown?.igst || 0) / 100).toFixed(2);
      const grandTotal = ((o.pricing?.grandTotal ?? o.grandTotal ?? 0) / 100).toFixed(2);

      return [
        `"${o.orderNumber}"`,
        `"${new Date(o.createdAt).toISOString()}"`,
        `"${o.shippingAddress?.state || 'N/A'}"`,
        taxable.toFixed(2),
        cgst,
        sgst,
        igst,
        (taxTotal / 100).toFixed(2),
        grandTotal
      ];
    });

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  },

  /**
   * Export Coupons Performance Report to CSV
   */
  async exportCouponsReport() {
    const coupons = await Coupon.find({}).sort({ createdAt: -1 }).lean();

    const headers = [
      'Coupon Code',
      'Discount Type',
      'Discount Value',
      'Max Discount Cap (INR)',
      'Min Cart Subtotal (INR)',
      'Usage Count',
      'Total Limit',
      'Active Status',
      'Start Date',
      'End Date'
    ];

    const rows = coupons.map((c) => [
      `"${c.code}"`,
      `"${c.discountType}"`,
      c.discountType === 'percentage' ? `${c.discountValue}%` : `₹${(c.discountValue / 100).toFixed(2)}`,
      c.maxDiscountAmount ? ((c.maxDiscountAmount || 0) / 100).toFixed(2) : 'No Cap',
      ((c.minOrderAmount || 0) / 100).toFixed(2),
      c.usedCount || 0,
      c.totalUsageLimit || 'Unlimited',
      c.isActive ? 'Active' : 'Inactive',
      c.startDate ? `"${new Date(c.startDate).toISOString()}"` : 'N/A',
      c.endDate ? `"${new Date(c.endDate).toISOString()}"` : 'N/A'
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
};

export default exportReportService;
