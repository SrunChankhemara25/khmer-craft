import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { createApp } from '../../src/app';
import Order from '../../models/Order';
import { deliveryInfo, makeProduct, signInBuyer } from './helpers';

const app = createApp();
let mongo: MongoMemoryServer;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-with-enough-entropy-for-tests';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

beforeEach(async () => {
  await mongoose.connection.db!.dropDatabase();
  delete process.env.PAYWAY_MERCHANT_ID;
  delete process.env.PAYWAY_API_KEY;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

const withPaywayCredentials = () => {
  process.env.PAYWAY_MERCHANT_ID = 'test_merchant';
  process.env.PAYWAY_API_KEY = 'test_api_key';
};

const QR_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';
const QR_STRING = '00020101021230510016abaakhppxxx@abaa';

/**
 * Stands in for ABA. Both endpoints this module calls are matched by URL, so
 * a test can say "the purchase succeeds and the transaction is approved"
 * without caring about call order. Shapes copied from real sandbox responses.
 */
const stubPayway = (options: {
  paymentStatusCode?: number;
  purchaseStatus?: { code: string | number; message: string };
  lookupStatusCode?: string | number;
}) => {
  const fetchMock = vi.fn(async (url: string) => {
    if (String(url).includes('check-transaction-2')) {
      if (options.lookupStatusCode !== undefined) {
        return {
          json: async () => ({
            status: { code: options.lookupStatusCode, message: 'tran_id not found' },
          }),
        };
      }
      return {
        json: async () => ({
          data: { payment_status_code: options.paymentStatusCode ?? 2 },
          status: { code: '00', message: 'Success!' },
        }),
      };
    }
    return {
      json: async () => ({
        qrString: QR_STRING,
        qrImage: QR_IMAGE,
        abapay_deeplink: 'abamobilebank://ababank.com?type=payway',
        app_store: 'https://itunes.apple.com/app/id968860649',
        play_store: 'https://play.google.com/store/apps/details?id=com.paygo24.ibank',
        status: options.purchaseStatus ?? { code: '00', message: 'Success!' },
      }),
    };
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

/** Places an order with the given payment method, via the real checkout flow. */
const placeOrder = async (cookie: string[], paymentMethod: string) => {
  const product = await makeProduct({ price: 20, stock: 5 });
  await request(app)
    .post('/api/cart/items')
    .set('Cookie', cookie)
    .send({ productId: String(product._id), quantity: 1 });

  const response = await request(app)
    .post('/api/orders')
    .set('Cookie', cookie)
    .send({ deliveryInfo, paymentMethod });

  expect(response.status).toBe(201);
  return response.body.orderId as string;
};

const startCheckout = (cookie: string[], orderId: string) =>
  request(app)
    .post('/api/payments/aba-payway/checkout')
    .set('Cookie', cookie)
    .send({ orderId });

describe('ABA PayWay checkout session', () => {
  it('requires authentication', async () => {
    const response = await request(app)
      .post('/api/payments/aba-payway/checkout')
      .send({ orderId: '000000000000000000000000' });

    expect(response.status).toBe(401);
  });

  it('fails clearly when PayWay is not configured', async () => {
    const { cookie } = await signInBuyer(app);
    const orderId = await placeOrder(cookie, 'ABA_PAYWAY');

    const response = await startCheckout(cookie, orderId);

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe('PAYWAY_NOT_CONFIGURED');
  });

  it('rejects an order placed with a different payment method', async () => {
    withPaywayCredentials();
    stubPayway({});
    const { cookie } = await signInBuyer(app);
    const orderId = await placeOrder(cookie, 'COD');

    const response = await startCheckout(cookie, orderId);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('WRONG_PAYMENT_METHOD');
  });

  it("404s on someone else's order, same as any other order lookup", async () => {
    withPaywayCredentials();
    stubPayway({});
    const owner = await signInBuyer(app, 'owner@khmercraft.test');
    const orderId = await placeOrder(owner.cookie, 'ABA_PAYWAY');
    const stranger = await signInBuyer(app, 'stranger@khmercraft.test');

    const response = await startCheckout(stranger.cookie, orderId);

    expect(response.status).toBe(404);
  });

  it('returns the QR to pay and stamps the order with a tran_id', async () => {
    withPaywayCredentials();
    stubPayway({});
    const { cookie } = await signInBuyer(app);
    const orderId = await placeOrder(cookie, 'ABA_PAYWAY');

    const response = await startCheckout(cookie, orderId);

    expect(response.status).toBe(200);
    expect(response.body.qrImage).toBe(QR_IMAGE);
    expect(response.body.qrString).toBe(QR_STRING);
    expect(response.body.deeplink).toContain('abamobilebank://');

    const order = await Order.findById(orderId);
    expect(response.body.amount).toBe(order!.totalAmount);
    expect(order!.paymentTranId).toBe(response.body.tranId);
    // PayWay rejects tran_id over 20 characters — confirmed against sandbox.
    expect(response.body.tranId.length).toBeLessThanOrEqual(20);
    // The QR is only payable for a while; the page needs to know until when.
    expect(Date.parse(response.body.expiresAt)).toBeGreaterThan(Date.now());
  });

  it('signs the purchase request in the field order PayWay hashes', async () => {
    withPaywayCredentials();
    const fetchMock = stubPayway({});
    const { cookie } = await signInBuyer(app);
    const orderId = await placeOrder(cookie, 'ABA_PAYWAY');

    await startCheckout(cookie, orderId);

    const body = fetchMock.mock.calls[0]![1]!.body as FormData;
    const order = await Order.findById(orderId);
    expect(body.get('merchant_id')).toBe('test_merchant');
    expect(body.get('amount')).toBe(order!.totalAmount.toFixed(2));
    expect(body.get('payment_option')).toBe('abapay_khqr_deeplink');
    expect(String(body.get('hash')).length).toBeGreaterThan(0);
  });

  it('surfaces a rejection from PayWay instead of pretending to have a QR', async () => {
    withPaywayCredentials();
    stubPayway({
      purchaseStatus: { code: 12, message: 'Payment currency is not allowed.' },
    });
    const { cookie } = await signInBuyer(app);
    const orderId = await placeOrder(cookie, 'ABA_PAYWAY');

    const response = await startCheckout(cookie, orderId);

    expect(response.status).toBe(502);
    expect(response.body.error.code).toBe('PAYWAY_REQUEST_FAILED');
    expect(response.body.error.message).toContain('currency is not allowed');
    // Nothing was stamped on the order: there is no transaction to match.
    const order = await Order.findById(orderId);
    expect(order!.paymentTranId).toBeUndefined();
  });

  it('refuses to build a second session for an already-paid order', async () => {
    withPaywayCredentials();
    stubPayway({});
    const { cookie } = await signInBuyer(app);
    const orderId = await placeOrder(cookie, 'ABA_PAYWAY');
    await Order.updateOne({ _id: orderId }, { $set: { paymentStatus: 'PAID' } });

    const response = await startCheckout(cookie, orderId);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('ALREADY_PAID');
  });
});

describe('ABA PayWay status check', () => {
  const statusOf = (cookie: string[], orderId: string) =>
    request(app)
      .get(`/api/payments/aba-payway/status/${orderId}`)
      .set('Cookie', cookie);

  it('requires authentication', async () => {
    const response = await request(app).get(
      '/api/payments/aba-payway/status/000000000000000000000000',
    );

    expect(response.status).toBe(401);
  });

  it("404s on someone else's order", async () => {
    withPaywayCredentials();
    stubPayway({});
    const owner = await signInBuyer(app, 'owner@khmercraft.test');
    const orderId = await placeOrder(owner.cookie, 'ABA_PAYWAY');
    const stranger = await signInBuyer(app, 'stranger@khmercraft.test');

    expect((await statusOf(stranger.cookie, orderId)).status).toBe(404);
  });

  it('reports not-paid while ABA still says PENDING', async () => {
    withPaywayCredentials();
    stubPayway({ paymentStatusCode: 2 });
    const { cookie } = await signInBuyer(app);
    const orderId = await placeOrder(cookie, 'ABA_PAYWAY');
    await startCheckout(cookie, orderId);

    const response = await statusOf(cookie, orderId);

    expect(response.status).toBe(200);
    expect(response.body.paid).toBe(false);
    expect(response.body.paymentStatus).toBe('PENDING');
  });

  it('settles the order once ABA reports the payment approved', async () => {
    withPaywayCredentials();
    stubPayway({ paymentStatusCode: 0 });
    const { cookie } = await signInBuyer(app);
    const orderId = await placeOrder(cookie, 'ABA_PAYWAY');
    await startCheckout(cookie, orderId);

    const response = await statusOf(cookie, orderId);

    expect(response.body.paid).toBe(true);
    const order = await Order.findById(orderId);
    expect(order!.paymentStatus).toBe('PAID');
    // Paying does not confirm the order — a seller still has to accept it.
    expect(order!.orderStatus).toBe('PENDING');
    expect(order!.statusHistory.at(-1)!.note).toContain('confirmed');
  });

  it('records a declined payment as FAILED', async () => {
    withPaywayCredentials();
    stubPayway({ paymentStatusCode: 3 });
    const { cookie } = await signInBuyer(app);
    const orderId = await placeOrder(cookie, 'ABA_PAYWAY');
    await startCheckout(cookie, orderId);

    const response = await statusOf(cookie, orderId);

    expect(response.body.paid).toBe(false);
    expect(response.body.paymentStatus).toBe('FAILED');
  });

  /**
   * For a second or two after a transaction is created, ABA's own lookup does
   * not know the tran_id yet — and the payment page's first poll lands right
   * in that window. It must read as "not paid yet", never as a failure.
   */
  it('treats ABA not knowing the tran_id yet as still pending', async () => {
    withPaywayCredentials();
    stubPayway({ lookupStatusCode: 6 });
    const { cookie } = await signInBuyer(app);
    const orderId = await placeOrder(cookie, 'ABA_PAYWAY');
    await startCheckout(cookie, orderId);

    const response = await statusOf(cookie, orderId);

    expect(response.body.paid).toBe(false);
    expect(response.body.paymentStatus).toBe('PENDING');
  });

  it('does not re-check a transaction for an order already paid', async () => {
    withPaywayCredentials();
    stubPayway({ paymentStatusCode: 0 });
    const { cookie } = await signInBuyer(app);
    const orderId = await placeOrder(cookie, 'ABA_PAYWAY');
    await startCheckout(cookie, orderId);
    await statusOf(cookie, orderId);

    const fetchMock = stubPayway({ paymentStatusCode: 3 });
    const response = await statusOf(cookie, orderId);

    expect(response.body.paid).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('ABA PayWay callback', () => {
  it('acknowledges an unknown tran_id without crashing', async () => {
    const response = await request(app)
      .post('/api/payments/aba-payway/callback')
      .send({ tran_id: 'DOES_NOT_EXIST' });

    expect(response.status).toBe(200);
    expect(response.body.received).toBe(true);
  });

  it("marks the order PAID once PayWay's own status check confirms it, never from the payload alone", async () => {
    withPaywayCredentials();
    stubPayway({ paymentStatusCode: 0 });
    const { cookie } = await signInBuyer(app);
    const orderId = await placeOrder(cookie, 'ABA_PAYWAY');
    const checkout = await startCheckout(cookie, orderId);
    const tranId = checkout.body.tranId as string;

    const response = await request(app)
      .post('/api/payments/aba-payway/callback')
      .send({ tran_id: tranId, status: 0 }); // a claimed status in the payload

    expect(response.status).toBe(200);
    const order = await Order.findById(orderId);
    expect(order!.paymentStatus).toBe('PAID');
  });

  it('does not mark an order PAID just because the callback payload claims so', async () => {
    withPaywayCredentials();
    stubPayway({ paymentStatusCode: 2 });
    const { cookie } = await signInBuyer(app);
    const orderId = await placeOrder(cookie, 'ABA_PAYWAY');
    const checkout = await startCheckout(cookie, orderId);
    const tranId = checkout.body.tranId as string;

    // PayWay's own status check says it's still pending — an attacker simply
    // POSTing status:0 to our callback must not be enough on its own.
    await request(app)
      .post('/api/payments/aba-payway/callback')
      .send({ tran_id: tranId, status: 0 });

    const order = await Order.findById(orderId);
    expect(order!.paymentStatus).toBe('PENDING');
  });
});
