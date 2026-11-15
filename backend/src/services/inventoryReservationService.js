import crypto from 'crypto';
import { Product } from '../models/Product.js';
import { InventoryReservation } from '../models/InventoryReservation.js';
import { InventoryLog } from '../models/InventoryLog.js';
import { ApiError } from '../utils/ApiError.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

export const RESERVATION_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

export const inventoryReservationService = {
  /**
   * Atomically reserves stock for a list of items.
   * If any item cannot be reserved, all previously reserved items are rolled back.
   * 
   * @param {Object} params
   * @param {Array<{ sku: string, productId: string, quantity: number }>} params.items
   * @param {string} [params.orderId]
   * @param {string} [params.orderNumber]
   * @returns {Promise<{ reservationId: string, reservation: Object }>}
   */
  async reserveStockForCheckout({ items, orderId = null, orderNumber = '' }) {
    const reservationId = `res_${crypto.randomUUID()}`;
    const reservedSoFar = [];

    try {
      for (const item of items) {
        const cleanSku = item.sku.trim().toUpperCase();
        const quantity = item.quantity;

        // Atomically decrement available stock and increment reserved stock
        const updated = await Product.findOneAndUpdate(
          {
            'variants.sku': cleanSku,
            'variants.stockQuantity': { $gte: quantity }
          },
          {
            $inc: {
              'variants.$.stockQuantity': -quantity,
              'variants.$.reservedQuantity': quantity
            }
          },
          { new: true }
        );

        if (!updated) {
          throw new Error(`Insufficient stock for SKU '${cleanSku}' to reserve ${quantity} units.`);
        }

        reservedSoFar.push({
          sku: cleanSku,
          productId: updated._id,
          quantity
        });

        const variant = updated.variants.find((v) => v.sku === cleanSku);

        // Audit log
        await InventoryLog.create({
          productId: updated._id,
          sku: cleanSku,
          delta: -quantity,
          previousStock: variant.stockQuantity + quantity,
          newStock: variant.stockQuantity,
          reason: 'order_reservation',
          referenceId: orderNumber || reservationId,
          note: `Reserved ${quantity} units for checkout (${reservationId})`,
          performedBy: updated._id
        });
      }

      // Create durable reservation record
      const expiresAt = new Date(Date.now() + RESERVATION_EXPIRY_MS);
      const reservation = await InventoryReservation.create({
        reservationId,
        orderId,
        orderNumber,
        items: reservedSoFar,
        status: 'active',
        expiresAt
      });

      return { reservationId, reservation };
    } catch (err) {
      // Roll back all items reserved so far in this checkout attempt
      for (const rollbackItem of reservedSoFar) {
        await Product.findOneAndUpdate(
          { 'variants.sku': rollbackItem.sku },
          {
            $inc: {
              'variants.$.stockQuantity': rollbackItem.quantity,
              'variants.$.reservedQuantity': -rollbackItem.quantity
            }
          }
        );
      }

      throw ApiError.badRequest(err.message || 'Failed to reserve inventory for checkout', ERROR_CODES.INSUFFICIENT_STOCK);
    }
  },

  /**
   * Commits reserved stock when payment is captured or COD order is confirmed.
   * Decrements reservedQuantity permanently.
   * Idempotent: repeated calls do nothing if already committed.
   */
  async commitReservation({ reservationId, orderNumber = '' }) {
    if (!reservationId) return null;

    const reservation = await InventoryReservation.findOne({ reservationId });
    if (!reservation) return null;

    if (reservation.status === 'committed') {
      return reservation; // Already committed idempotently
    }

    for (const item of reservation.items) {
      const cleanSku = item.sku.trim().toUpperCase();
      const updated = await Product.findOneAndUpdate(
        {
          'variants.sku': cleanSku,
          'variants.reservedQuantity': { $gte: item.quantity }
        },
        {
          $inc: {
            'variants.$.reservedQuantity': -item.quantity
          }
        },
        { new: true }
      );

      if (updated) {
        const variant = updated.variants.find((v) => v.sku === cleanSku);
        await InventoryLog.create({
          productId: updated._id,
          sku: cleanSku,
          delta: 0,
          previousStock: variant.stockQuantity,
          newStock: variant.stockQuantity,
          reason: 'order_reservation',
          referenceId: orderNumber || reservation.orderNumber || reservationId,
          note: `Committed reservation for ${item.quantity} units (payment captured/order confirmed)`,
          performedBy: updated._id
        });
      }
    }

    reservation.status = 'committed';
    if (orderNumber) reservation.orderNumber = orderNumber;
    await reservation.save();

    return reservation;
  },

  /**
   * Releases reserved stock back to available stockQuantity.
   * Called on payment failure, user cancellation, or expired checkout session.
   * Idempotent: repeated calls do nothing if already released.
   */
  async releaseReservation({ reservationId, orderNumber = '', reason = 'payment_failed' }) {
    if (!reservationId) return null;

    const reservation = await InventoryReservation.findOne({ reservationId });
    if (!reservation) return null;

    if (reservation.status === 'released') {
      return reservation; // Already released idempotently
    }

    for (const item of reservation.items) {
      const cleanSku = item.sku.trim().toUpperCase();
      const updated = await Product.findOneAndUpdate(
        {
          'variants.sku': cleanSku,
          'variants.reservedQuantity': { $gte: item.quantity }
        },
        {
          $inc: {
            'variants.$.stockQuantity': item.quantity,
            'variants.$.reservedQuantity': -item.quantity
          }
        },
        { new: true }
      );

      if (updated) {
        const variant = updated.variants.find((v) => v.sku === cleanSku);
        await InventoryLog.create({
          productId: updated._id,
          sku: cleanSku,
          delta: item.quantity,
          previousStock: variant.stockQuantity - item.quantity,
          newStock: variant.stockQuantity,
          reason: 'order_cancellation',
          referenceId: orderNumber || reservation.orderNumber || reservationId,
          note: `Released reserved stock (${reason}): +${item.quantity} units restored`,
          performedBy: updated._id
        });
      }
    }

    reservation.status = 'released';
    if (orderNumber) reservation.orderNumber = orderNumber;
    await reservation.save();

    return reservation;
  },

  /**
   * Durable sweeper function: sweeps all expired active reservations and restores stock.
   * Can be triggered on a schedule (cron) or on demand in serverless environments.
   */
  async releaseExpiredReservations() {
    const expiredReservations = await InventoryReservation.find({
      status: 'active',
      expiresAt: { $lt: new Date() }
    });

    let releasedCount = 0;
    for (const res of expiredReservations) {
      await this.releaseReservation({
        reservationId: res.reservationId,
        orderNumber: res.orderNumber,
        reason: 'reservation_expired'
      });
      releasedCount++;
    }

    return { processed: expiredReservations.length, releasedCount };
  }
};

export default inventoryReservationService;
