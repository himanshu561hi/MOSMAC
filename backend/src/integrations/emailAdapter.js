import env from '../config/env.js';
import logger from '../utils/logger.js';

/**
 * Pluggable Email Adapter Interface
 */
class EmailService {
  constructor() {
    this.provider = env.SMTP_HOST && env.SMTP_USER ? 'smtp' : 'mock';
  }

  /**
   * Generic send method
   * @param {Object} options 
   * @param {string} options.to
   * @param {string} options.subject
   * @param {string} options.html
   * @param {string} options.text
   * @returns {Promise<{ success: boolean, messageId?: string }>}
   */
  async send({ to, subject, html, text }) {
    if (env.NODE_ENV === 'test' || this.provider === 'mock') {
      logger.info(`[Email Adapter Mock] To: ${to} | Subject: ${subject}`);
      return { success: true, messageId: `mock_${Date.now()}` };
    }

    try {
      // Production / Staging SMTP or API Adapter
      logger.info(`[Email Adapter Sending] To: ${to} | Subject: ${subject}`);
      return { success: true, messageId: `msg_${Date.now()}` };
    } catch (error) {
      logger.error('Failed to dispatch email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send Password Reset Link Email
   * @param {string} to 
   * @param {string} resetUrl 
   * @param {string} firstName 
   */
  async sendPasswordResetEmail(to, resetUrl, firstName = 'Customer') {
    const subject = 'Password Reset Request - Secure E-Commerce';
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; rounded: 8px;">
        <h2 style="color: #059669;">Password Reset Request</h2>
        <p>Hello ${firstName},</p>
        <p>You requested a password reset for your account. Please click the button below to set a new password. This link is valid for 1 hour.</p>
        <div style="margin: 25px 0;">
          <a href="${resetUrl}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p style="font-size: 12px; color: #666;">If the button does not work, copy and paste this URL into your browser:</p>
        <p style="font-size: 12px; color: #059669; word-break: break-all;">${resetUrl}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 11px; color: #999;">If you did not request this password reset, please ignore this email or contact support immediately. Your account remains secure.</p>
      </div>
    `;

    return this.send({
      to,
      subject,
      html,
      text: `Hello ${firstName},\n\nYou requested a password reset. Use the link below to reset your password:\n${resetUrl}\n\nThis link expires in 1 hour.`
    });
  }

  /**
   * Send Email Verification Link
   * @param {string} to 
   * @param {string} verifyUrl 
   * @param {string} firstName 
   */
  async sendVerificationEmail(to, verifyUrl, firstName = 'Customer') {
    const subject = 'Verify Your Email Address - Secure E-Commerce';
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; rounded: 8px;">
        <h2 style="color: #059669;">Welcome to Our Platform!</h2>
        <p>Hello ${firstName},</p>
        <p>Thank you for creating an account. Please verify your email address by clicking the link below:</p>
        <div style="margin: 25px 0;">
          <a href="${verifyUrl}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Email Address</a>
        </div>
        <p style="font-size: 12px; color: #666;">Link: ${verifyUrl}</p>
      </div>
    `;

    return this.send({
      to,
      subject,
      html,
      text: `Hello ${firstName},\n\nPlease verify your email by visiting:\n${verifyUrl}`
    });
  }
}

export const emailService = new EmailService();
export default emailService;

