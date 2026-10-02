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
import Store from '../../models/Store';
import SubscriptionPayment from '../../models/SubscriptionPayment';
import { signInBuyer } from './helpers';

const app = createApp();
let mongo: MongoMemoryServer;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-with-enough-entropy-for-tests';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

beforeEach(async () => {
  await mongoose.connection.db!.dropDatabase();
  process.env.PAYWAY_MERCHANT_ID = 'test_merchant';
  process.env.PAYWAY_API_KEY = 'test_api_key';
});

afterEach(() => {
  vi.unstubAllGlobals();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

const QR_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';

/** Stands in for ABA; shapes copied from real sandbox responses. */
const stubPayway = (options: { paymentStatusCode?: number; purchaseFails?: boolean } = {}) => {
  const fetchMock = vi.fn(async (url: string) => {
    if (String(url).includes('check-transaction-2')) {
      return {
        json: async () => ({
          data: { payment_status_code: options.paymentStatusCode ?? 2 },
          status: { code: '00', message: 'Success!' },
        }),
      };
    }
    if (options.purchaseFails) {
      return {
        json: async () => ({
          status: { code: 12, message: 'Payment currency is not allowed.' },
        }),
      };
    }
    return {
      json: async () => ({
        qrString: '00020101021230510016abaakhppxxx@abaa',
        qrImage: QR_IMAGE,
        abapay_deeplink: 'abamobilebank://ababank.com?type=payway',
        status: { code: '00', message: 'Success!' },
      }),
    };
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

/**
 * Signs a buyer in and finishes onboarding, the way the web app does.
 *
 * Returns the cookie from the *response*, not the one we signed in with:
 * creating a store promotes BUYER to SELLER and reissues the auth cookie, so
 * the original token still claims BUYER and every later call 401s.
 */
const onboard = async (
  email = 'seller@khmercraft.test',
  plan = 'PREMIUM',
): Promise<{
  cookie: string[];
  store: { id: string; subscriptionPlan: string; pendingPlan: string | null };
}> => {
  const { cookie } = await signInBuyer(app, email);
  const response = await request(app)
    .post('/api/sellers/my-stores')
    .set('Cookie', cookie)
    .send({
      storeName: `Silk Heritage ${email}`,
      storeDescription: 'Hand-woven silk from Takeo province.',
      location: 'Takeo',
      phoneNumber: '012000123',
      category: 'Weaving',
      subscriptionPlan: plan,
      paymentMethod: 'ABA',
    });
  expect(response.status).toBe(201);

  const refreshed = response.headers['set-cookie'] as unknown as
    | string[]
    | undefined;
  return { cookie: refreshed?.length ? refreshed : cookie, store: response.body };
};

const checkout = (cookie: string[], storeId: string, plan = 'PREMIUM') =>
  request(app)
    .post('/api/subscriptions/checkout')
    .set('Cookie', cookie)
    .send({ storeId, plan });

describe('seller plan selection at onboarding', () => {
  /**
   * The whole point of the feature: before this, picking a $29 plan simply
   * wrote it onto the store and charged nothing.
   */
  it('does not grant a paid plan just because onboarding asked for it', async () => {
    stubPayway();

    const { store: created } = await onboard('premium@khmercraft.test', 'PREMIUM');

    expect(created.subscriptionPlan).toBe('STARTER');
    expect(created.pendingPlan).toBe('PREMIUM');
    const store = await Store.findById(created.id);
    expect(store!.subscriptionPlan).toBe('STARTER');
    expect(store!.planExpiresAt).toBeNull();
  });

  it('reports no pending plan for the free Starter plan', async () => {
    stubPayway();

    const { store } = await onboard('starter@khmercraft.test', 'STARTER');

    expect(store.pendingPlan).toBeNull();
  });
});

describe('plan checkout', () => {
  it('requires authentication', async () => {
    const response = await request(app)
      .post('/api/subscriptions/checkout')
      .send({ storeId: '000000000000000000000000', plan: 'STANDARD' });

    expect(response.status).toBe(401);
  });

  it("404s on someone else's store", async () => {
    stubPayway();
    const { store } = await onboard('owner@khmercraft.test');
    const stranger = await signInBuyer(app, 'stranger@khmercraft.test');

    expect((await checkout(stranger.cookie, store.id)).status).toBe(404);
  });

  it('rejects the free plan, which has nothing to charge for', async () => {
    stubPayway();
    const { cookie, store } = await onboard();

    const response = await request(app)
      .post('/api/subscriptions/checkout')
      .set('Cookie', cookie)
      .send({ storeId: store.id, plan: 'STARTER' });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns a QR and charges the price the server holds, not the client', async () => {
    const fetchMock = stubPayway();
    const { cookie, store } = await onboard();

    const response = await checkout(cookie, store.id, 'PREMIUM');

    expect(response.status).toBe(200);
    expect(response.body.qrImage).toBe(QR_IMAGE);
    expect(response.body.plan).toBe('PREMIUM');
    expect(response.body.amount).toBe(29);

    const body = fetchMock.mock.calls[0]![1]!.body as FormData;
    expect(body.get('amount')).toBe('29.00');

    // Still not granted — only paying does that.
    const stored = await Store.findById(store.id);
    expect(stored!.subscriptionPlan).toBe('STARTER');
  });

  it('does not keep an attempt ABA refused to open', async () => {
    stubPayway({ purchaseFails: true });
    const { cookie, store } = await onboard();

    const response = await checkout(cookie, store.id);

    expect(response.status).toBe(502);
    expect(await SubscriptionPayment.countDocuments()).toBe(0);
  });
});

describe('plan activation', () => {
  const statusOf = (cookie: string[], paymentId: string) =>
    request(app)
      .get(`/api/subscriptions/payments/${paymentId}/status`)
      .set('Cookie', cookie);

  it('leaves the store on Starter while ABA says PENDING', async () => {
    stubPayway({ paymentStatusCode: 2 });
    const { cookie, store } = await onboard();
    const { body: session } = await checkout(cookie, store.id);

    const response = await statusOf(cookie, session.paymentId);

    expect(response.body.paid).toBe(false);
    expect(response.body.subscription.effectivePlan).toBe('STARTER');
    const stored = await Store.findById(store.id);
    expect(stored!.subscriptionPlan).toBe('STARTER');
  });

  it('grants the plan with an expiry once ABA confirms payment', async () => {
    stubPayway({ paymentStatusCode: 0 });
    const { cookie, store } = await onboard();
    const { body: session } = await checkout(cookie, store.id, 'PREMIUM');

    const response = await statusOf(cookie, session.paymentId);

    expect(response.body.paid).toBe(true);
    expect(response.body.subscription.effectivePlan).toBe('PREMIUM');

    const stored = await Store.findById(store.id);
    expect(stored!.subscriptionPlan).toBe('PREMIUM');
    const days =
      (stored!.planExpiresAt!.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThan(30.1);
  });

  it('records a declined payment without granting anything', async () => {
    stubPayway({ paymentStatusCode: 3 });
    const { cookie, store } = await onboard();
    const { body: session } = await checkout(cookie, store.id);

    const response = await statusOf(cookie, session.paymentId);

    expect(response.body.status).toBe('FAILED');
    const stored = await Store.findById(store.id);
    expect(stored!.subscriptionPlan).toBe('STARTER');
  });

  /** Renewing early must add to the remaining time, not throw it away. */
  it('extends from the current expiry when renewing a live plan', async () => {
    stubPayway({ paymentStatusCode: 0 });
    const { cookie, store } = await onboard();

    const first = await checkout(cookie, store.id, 'PREMIUM');
    await statusOf(cookie, first.body.paymentId);
    const afterFirst = (await Store.findById(store.id))!.planExpiresAt!;

    const second = await checkout(cookie, store.id, 'PREMIUM');
    await statusOf(cookie, second.body.paymentId);
    const afterSecond = (await Store.findById(store.id))!.planExpiresAt!;

    const added =
      (afterSecond.getTime() - afterFirst.getTime()) / (24 * 60 * 60 * 1000);
    expect(added).toBeGreaterThan(29.9);
    expect(added).toBeLessThan(30.1);
  });

  /**
   * Lapsing is read-time, not a scheduled job: an expired paid plan has to
   * read as STARTER without anything having run in between.
   */
  it('reads an expired plan as Starter with no job having run', async () => {
    stubPayway();
    const { cookie, store } = await onboard();
    await Store.updateOne(
      { _id: store.id },
      {
        $set: {
          subscriptionPlan: 'PREMIUM',
          planExpiresAt: new Date(Date.now() - 1000),
        },
      },
    );

    const response = await request(app)
      .get(`/api/subscriptions/${store.id}`)
      .set('Cookie', cookie);

    expect(response.body.plan).toBe('PREMIUM');
    expect(response.body.effectivePlan).toBe('STARTER');
    expect(response.body.active).toBe(false);
  });

  it("404s on someone else's payment", async () => {
    stubPayway({ paymentStatusCode: 0 });
    const { cookie, store } = await onboard('owner@khmercraft.test');
    const { body: session } = await checkout(cookie, store.id);
    const stranger = await signInBuyer(app, 'stranger@khmercraft.test');

    expect((await statusOf(stranger.cookie, session.paymentId)).status).toBe(404);
  });
});

describe('plan payment via the shared PayWay webhook', () => {
  it('activates the plan from a callback, after checking with ABA', async () => {
    stubPayway({ paymentStatusCode: 0 });
    const { cookie, store } = await onboard();
    const { body: session } = await checkout(cookie, store.id, 'STANDARD');

    const response = await request(app)
      .post('/api/payments/aba-payway/callback')
      .send({ tran_id: session.tranId });

    expect(response.status).toBe(200);
    const stored = await Store.findById(store.id);
    expect(stored!.subscriptionPlan).toBe('STANDARD');
  });

  it('does not activate a plan just because the callback claims so', async () => {
    stubPayway({ paymentStatusCode: 2 });
    const { cookie, store } = await onboard();
    const { body: session } = await checkout(cookie, store.id);

    await request(app)
      .post('/api/payments/aba-payway/callback')
      .send({ tran_id: session.tranId, status: 0 });

    const stored = await Store.findById(store.id);
    expect(stored!.subscriptionPlan).toBe('STARTER');
  });
});

describe('billing history', () => {
  it('lists a store\'s attempts, newest first', async () => {
    stubPayway({ paymentStatusCode: 0 });
    const { cookie, store } = await onboard();
    const { body: session } = await checkout(cookie, store.id, 'STANDARD');
    await request(app)
      .get(`/api/subscriptions/payments/${session.paymentId}/status`)
      .set('Cookie', cookie);

    const response = await request(app)
      .get(`/api/subscriptions/${store.id}/payments`)
      .set('Cookie', cookie);

    expect(response.status).toBe(200);
    expect(response.body.payments).toHaveLength(1);
    expect(response.body.payments[0].status).toBe('PAID');
    expect(response.body.payments[0].amount).toBe(12);
    expect(response.body.subscription.effectivePlan).toBe('STANDARD');
  });
});
