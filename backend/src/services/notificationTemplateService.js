import { NotificationTemplate, TEMPLATE_TYPES } from '../models/NotificationTemplate.js';
import { ApiError } from '../utils/ApiError.js';
import { auditService } from './auditService.js';

const DEFAULT_TEMPLATES = [
  {
    type: 'welcome_email',
    name: 'Customer Welcome Email',
    subject: 'Welcome to {{storeName}}, {{customerName}}!',
    bodyHtml: '<p>Hello <strong>{{customerName}}</strong>,</p><p>Thank you for joining {{storeName}}. Discover thoughtful everyday design and curated collections.</p>',
    supportedVariables: ['storeName', 'customerName', 'customerEmail', 'storeUrl']
  },
  {
    type: 'email_verification',
    name: 'Email Verification',
    subject: 'Verify your email address for {{storeName}}',
    bodyHtml: '<p>Hello {{customerName}},</p><p>Please verify your email address by clicking <a href="{{verificationUrl}}">here</a>.</p>',
    supportedVariables: ['storeName', 'customerName', 'verificationUrl', 'expiresIn']
  },
  {
    type: 'password_reset',
    name: 'Password Reset Notification',
    subject: 'Reset your password for {{storeName}}',
    bodyHtml: '<p>Hello {{customerName}},</p><p>We received a request to reset your password. Click <a href="{{resetUrl}}">here</a> to reset it.</p>',
    supportedVariables: ['storeName', 'customerName', 'resetUrl', 'expiresIn']
  },
  {
    type: 'order_confirmation',
    name: 'Order Confirmation',
    subject: 'Your order {{orderNumber}} has been confirmed!',
    bodyHtml: '<p>Hello {{customerName}},</p><p>Thank you for your order <strong>#{{orderNumber}}</strong>. We are getting it ready for dispatch.</p><p>Total: {{grandTotal}} (Payment: {{paymentMethod}})</p>',
    supportedVariables: ['storeName', 'customerName', 'orderNumber', 'grandTotal', 'paymentMethod', 'estimatedDelivery']
  },
  {
    type: 'payment_confirmation',
    name: 'Payment Capture Confirmation',
    subject: 'Payment received for Order {{orderNumber}}',
    bodyHtml: '<p>Your payment of <strong>{{amount}}</strong> for order {{orderNumber}} has been successfully processed.</p>',
    supportedVariables: ['storeName', 'customerName', 'orderNumber', 'amount', 'transactionId', 'paymentGateway']
  },
  {
    type: 'payment_failure',
    name: 'Payment Failure Notice',
    subject: 'Payment could not be completed for Order {{orderNumber}}',
    bodyHtml: '<p>Hello {{customerName}},</p><p>We were unable to process your payment for order {{orderNumber}}. Your funds have not been debited. Please retry your payment <a href="{{checkoutUrl}}">here</a>.</p>',
    supportedVariables: ['storeName', 'customerName', 'orderNumber', 'checkoutUrl', 'failureReason']
  },
  {
    type: 'order_shipped',
    name: 'Order Shipped with Tracking',
    subject: 'Your order {{orderNumber}} has been shipped!',
    bodyHtml: '<p>Great news! Your order {{orderNumber}} is on its way via {{courierName}}. Track your package: <a href="{{trackingUrl}}">{{trackingNumber}}</a></p>',
    supportedVariables: ['storeName', 'customerName', 'orderNumber', 'courierName', 'trackingNumber', 'trackingUrl', 'estimatedDelivery']
  },
  {
    type: 'order_delivered',
    name: 'Order Delivery Notice',
    subject: 'Your order {{orderNumber}} has been delivered!',
    bodyHtml: '<p>Hello {{customerName}},</p><p>Your order {{orderNumber}} has been delivered. Share your experience by leaving a verified review!</p>',
    supportedVariables: ['storeName', 'customerName', 'orderNumber', 'reviewUrl']
  },
  {
    type: 'order_cancelled',
    name: 'Order Cancellation Confirmation',
    subject: 'Order {{orderNumber}} cancellation notice',
    bodyHtml: '<p>Your order {{orderNumber}} has been cancelled. Any pre-authorized funds will be refunded to your source payment method.</p>',
    supportedVariables: ['storeName', 'customerName', 'orderNumber', 'cancellationReason', 'refundStatus']
  },
  {
    type: 'refund_processed',
    name: 'Refund Credit Notice',
    subject: 'Refund processed for Order {{orderNumber}}',
    bodyHtml: '<p>A refund of <strong>{{refundAmount}}</strong> has been processed for order {{orderNumber}} to your original payment method.</p>',
    supportedVariables: ['storeName', 'customerName', 'orderNumber', 'refundAmount', 'gatewayRefundId']
  }
];

export const notificationTemplateService = {
  /**
   * Initializes standard default notification templates if they do not exist
   */
  async ensureDefaultTemplates() {
    for (const t of DEFAULT_TEMPLATES) {
      const exists = await NotificationTemplate.findOne({ type: t.type });
      if (!exists) {
        await NotificationTemplate.create(t);
      }
    }
  },

  /**
   * List all system notification templates
   */
  async listTemplates() {
    await this.ensureDefaultTemplates();
    return NotificationTemplate.find({}).sort({ name: 1 }).lean();
  },

  /**
   * Get template by specific type
   */
  async getTemplateByType(type) {
    const normalizedType = String(type).trim().toLowerCase();
    let template = await NotificationTemplate.findOne({ type: normalizedType });
    if (!template) {
      await this.ensureDefaultTemplates();
      template = await NotificationTemplate.findOne({ type: normalizedType });
    }
    if (!template) throw ApiError.notFound(`Notification template "${type}" not found`);
    return template;
  },

  /**
   * Update notification template subject and body
   */
  async updateTemplate(id, data, staffUser) {
    const template = await NotificationTemplate.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    );
    if (!template) throw ApiError.notFound('Template not found');

    await auditService.log({
      actorId: staffUser._id,
      actorRole: staffUser.role,
      actorEmail: staffUser.email,
      action: 'NOTIFICATION_TEMPLATE_UPDATED',
      resourceType: 'NotificationTemplate',
      resourceId: template._id,
      notes: `Updated template: "${template.name}" (${template.type})`
    });

    return template;
  },

  /**
   * Safely renders a template subject and HTML body with variable substitution
   */
  renderTemplate(template, variables = {}) {
    const substitute = (text) => {
      if (!text) return '';
      return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
        return variables[key] !== undefined && variables[key] !== null ? String(variables[key]) : match;
      });
    };

    const renderedSubject = substitute(template.subject);
    const renderedBody = substitute(template.bodyHtml);

    return {
      subject: renderedSubject,
      bodyHtml: renderedBody,
      renderedSubject,
      renderedBody
    };
  }
};

export default notificationTemplateService;
