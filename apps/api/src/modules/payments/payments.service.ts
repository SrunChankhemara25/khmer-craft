import mongoose from 'mongoose';
import Order, { IOrder } from '../../../models/Order';
import { IUser } from '../../../models/User';
import { AppError } from '../../errors/app-error';
import { env } from '../../config/env';
import * as payway from './payway.gateway';
import * as subscriptions from '../subscriptions/subscriptions.service';

/**
 * Paying for an order with ABA PayWay.
 *
 * All the ABA protocol lives in `payway.gateway.ts`; this file only decides
 * what an order means by "paid". The one rule worth stating: payment status is
 * never inferred from the browser coming back, nor from a webhook's own
 * claimed status — `resolvePayment` asks ABA before writing anything.
 */

const loadOwnedOrder = async (
  user: IUser,
  orderId: string,
): Promise<InstanceType<typeof Order>> => {
  const order = mongoose.isValidObjectId(orderId)
    ? await Order.findById(orderId)
    : await Order.findOne({ orderNumber: orderId.toUpperCase() });

  if (!order || String(order.buyerId) !== String(user._id)) {
    throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');
  }

  if (order.paymentMethod !== 'ABA_PAYWAY') {
    throw new AppError(
      400,
      'This order was not placed with ABA PayWay',
      'WRONG_PAYMENT_METHOD',
    );
  }

  return order;
};

export interface PaywayCheckout extends payway.PaywayTransaction {
  orderNumber: string;
}

/**
 * Asks PayWay to open a transaction for this order and returns the KHQR the
 * buyer pays. Called once per payment attempt: each call mints a new tran_id
 * and overwrites `paymentTranId`, so an abandoned QR stops being the one this
 * order is settled against.
 */
export const createCheckoutSession = async (
  user: IUser,
  orderId: string,
): Promise<PaywayCheckout> => {
  const order = await loadOwnedOrder(user, orderId);

  if (order.paymentStatus === 'PAID') {
    throw new AppError(400, 'This order is already paid', 'ALREADY_PAID');
  }

  const tranId = payway.generateTranId();

  const transaction = await payway.createTransaction({
    tranId,
    amount: order.totalAmount,
    shipping: order.deliveryFee,
    items: order.items.map((item) => ({
      name: item.productName,
      quantity: item.quantity,
      price: item.price,
    })),
    firstName: order.buyerName,
    phone: order.buyerPhone,
    returnParams: order.orderNumber,
    successUrl: `${env.webUrl}/order-success?order=${encodeURIComponent(order.orderNumber)}`,
    cancelUrl: `${env.webUrl}/orders?payment=cancelled`,
  });

  order.paymentTranId = tranId;
  await order.save();

  return { ...transaction, orderNumber: order.orderNumber };
};

const appendStatusEvent = (order: IOrder, note: string) => {
  order.statusHistory.push({
    status: order.orderStatus,
    at: new Date(),
    by: 'SYSTEM',
    note,
  });
};

/**
 * Asks PayWay what really happened to this order's transaction and records
 * it. The single place an order's payment status is ever written, so the
 * webhook and the payment page's polling cannot disagree about how a result
 * is applied.
 *
 * Note what it deliberately does not do: paying does not advance
 * `orderStatus`. A paid order is still PENDING until a seller accepts it,
 * exactly as a COD order is — payment and fulfilment are separate tracks.
 */
const resolvePayment = async (
  order: InstanceType<typeof Order>,
): Promise<void> => {
  if (order.paymentStatus === 'PAID' || !order.paymentTranId) {
    return;
  }

  const tranId = order.paymentTranId;
  const status = await payway.checkTransaction(tranId);
  if (status === 'PENDING' || status === order.paymentStatus) {
    return;
  }

  const note = {
    PAID: `ABA PayWay payment confirmed (tran_id ${tranId})`,
    FAILED: `ABA PayWay payment failed (tran_id ${tranId})`,
    REFUNDED: `ABA PayWay payment refunded (tran_id ${tranId})`,
  }[status];

  order.paymentStatus = status;
  appendStatusEvent(order, note);
  await order.save();
};

export interface PaymentStatusView {
  orderNumber: string;
  paymentStatus: IOrder['paymentStatus'];
  orderStatus: IOrder['orderStatus'];
  paid: boolean;
}

/**
 * What the payment page polls while the buyer is in the ABA app. This exists
 * because the webhook alone cannot carry a local development environment —
 * ABA's servers cannot reach localhost — and because a buyer who pays and
 * immediately closes the app should still see the result on their next look,
 * without waiting on a retry.
 */
export const getPaymentStatus = async (
  user: IUser,
  orderId: string,
): Promise<PaymentStatusView> => {
  const order = await loadOwnedOrder(user, orderId);
  await resolvePayment(order);

  return {
    orderNumber: order.orderNumber,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    paid: order.paymentStatus === 'PAID',
  };
};

/**
 * Handles PayWay's webhook, for every kind of payment.
 *
 * A tran_id belongs to exactly one thing — an order or a seller subscription —
 * so this looks in both places rather than making ABA tell us which. Never
 * trusts the payload's own claimed status: whichever record matches is then
 * resolved by asking ABA. Treat the webhook as "go check now".
 */
export const handleCallback = async (payload: Record<string, unknown>) => {
  const tranId = String(payload['tran_id'] ?? '');
  if (!tranId) {
    throw new AppError(400, 'Missing tran_id', 'VALIDATION_ERROR');
  }

  const order = await Order.findOne({ paymentTranId: tranId });
  if (order) {
    await resolvePayment(order);
    return;
  }

  if (await subscriptions.resolveByTranId(tranId)) {
    return;
  }

  // Acknowledge anyway: PayWay retries a webhook that doesn't get a 2xx, and
  // retrying forever changes nothing for a tran_id that matches nothing here.
  console.warn('[payway] callback for unknown tran_id:', tranId);
};
