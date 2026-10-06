import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import Order from '../../models/Order';
import Store from '../../models/Store';
import User from '../../models/User';
import { AUTH_COOKIE_NAME, signAccessToken } from '../../src/utils/jwt';

const app = createApp();
let mongo: MongoMemoryServer;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-with-enough-entropy-for-tests';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

beforeEach(async () => {
  await mongoose.connection.db!.dropDatabase();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

const DAY = 24 * 60 * 60 * 1000;
const RECEIPT = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';

const cookieFor = (user: { _id: unknown; role: string; token_version: number }) => [
  `${AUTH_COOKIE_NAME}=${signAccessToken(String(user._id), user.role as 'ADMIN', user.token_version)}`,
];

let seq = 0;
const makeUser = async (role: 'ADMIN' | 'SELLER' | 'BUYER') => {
  seq += 1;
  return User.create({ name: `${role} ${seq}`, email: `${role.toLowerCase()}${seq}@kc.test`, password_hash: 'x', role, status: 'ACTIVE' });
};

const setup = async () => {
  const admin = await makeUser('ADMIN');
  const seller = await makeUser('SELLER');
  const buyer = await makeUser('BUYER');
  const store = await Store.create({ userId: seller._id, storeName: 'Silk House', slug: `silk-${seq}`, onboardingStatus: 'COMPLETED' });
  return { admin, seller, buyer, store, adminCookie: cookieFor(admin), sellerCookie: cookieFor(seller) };
};

/** A delivered order for `store`, delivered `daysAgo` days ago. */
const deliveredOrder = async (
  ctx: Awaited<ReturnType<typeof setup>>,
  opts: { subtotal: number; method?: string; daysAgo?: number; status?: string; paymentStatus?: string },
) => {
  seq += 1;
  const at = new Date(Date.now() - (opts.daysAgo ?? 10) * DAY);
  return Order.create({
    orderNumber: `KC-T-${seq}`,
    buyerId: ctx.buyer._id,
    buyerName: 'Buyer',
    buyerPhone: '012',
    items: [{
      productId: new mongoose.Types.ObjectId(),
      productName: 'Scarf',
      sellerId: ctx.store._id,
      sellerUserId: ctx.seller._id,
      sellerName: 'Seller',
      price: opts.subtotal,
      quantity: 1,
      subtotal: opts.subtotal,
    }],
    deliveryInfo: { fullName: 'B', phone: '012', province: 'PP', city: 'PP', address: '1' },
    paymentMethod: opts.method ?? 'ABA_PAYWAY',
    paymentStatus: opts.paymentStatus ?? 'PAID',
    orderStatus: opts.status ?? 'DELIVERED',
    subtotal: opts.subtotal,
    deliveryFee: 0,
    totalAmount: opts.subtotal,
    statusHistory: opts.status && opts.status !== 'DELIVERED' ? [] : [{ status: 'DELIVERED', at, by: 'SELLER' }],
  });
};

const addAccount = (ctx: Awaited<ReturnType<typeof setup>>) =>
  request(app)
    .put(`/api/payouts/my-stores/${ctx.store._id}/account`)
    .set('Cookie', ctx.sellerCookie)
    .send({ method: 'ABA', accountName: 'Sok Dara', accountNumber: '000 123 456' })
    .expect(200);

const verify = async (ctx: Awaited<ReturnType<typeof setup>>, accountId: string) =>
  request(app)
    .patch(`/api/payouts/admin/accounts/${accountId}`)
    .set('Cookie', ctx.adminCookie)
    .send({ status: 'VERIFIED' })
    .expect(200);

describe('seller balance', () => {
  it('takes 3% on online sales, holds recent deliveries, and nets off COD commission', async () => {
    const ctx = await setup();
    await deliveredOrder(ctx, { subtotal: 100, daysAgo: 10 }); // ready: 97
    await deliveredOrder(ctx, { subtotal: 50, daysAgo: 2 }); // on hold: 48.5
    await deliveredOrder(ctx, { subtotal: 200, method: 'COD', daysAgo: 10 }); // seller owes 6
    await deliveredOrder(ctx, { subtotal: 40, method: 'POS_CASH', daysAgo: 10 }); // not settled
    await deliveredOrder(ctx, { subtotal: 30, status: 'SHIPPED', daysAgo: 0 }); // awaiting delivery: 29.1

    const res = await request(app).get(`/api/payouts/my-stores/${ctx.store._id}`).set('Cookie', ctx.sellerCookie).expect(200);

    expect(res.body.settings.commissionRate).toBe(3);
    expect(res.body.balance).toMatchObject({ available: 91, onHold: 48.5, pendingDelivery: 29.1, paidOut: 0 });
    expect(res.body.lines).toHaveLength(3);
  });

  it('never shows another seller’s balance', async () => {
    const ctx = await setup();
    const other = await makeUser('SELLER');
    await request(app).get(`/api/payouts/my-stores/${ctx.store._id}`).set('Cookie', cookieFor(other)).expect(404);
  });
});

describe('payout accounts', () => {
  it('needs admin verification, and any change resets it', async () => {
    const ctx = await setup();
    const saved = await addAccount(ctx);
    expect(saved.body.status).toBe('PENDING_VERIFICATION');

    await verify(ctx, saved.body.id);
    const changed = await request(app)
      .put(`/api/payouts/my-stores/${ctx.store._id}/account`)
      .set('Cookie', ctx.sellerCookie)
      .send({ method: 'WING', accountName: 'Someone Else', accountNumber: '999888' })
      .expect(200);
    expect(changed.body.status).toBe('PENDING_VERIFICATION');
  });

  it('rejects non-digit account numbers and requires a reason to reject', async () => {
    const ctx = await setup();
    await request(app)
      .put(`/api/payouts/my-stores/${ctx.store._id}/account`)
      .set('Cookie', ctx.sellerCookie)
      .send({ method: 'ABA', accountName: 'Sok', accountNumber: 'abc' })
      .expect(422);
    const saved = await addAccount(ctx);
    await request(app)
      .patch(`/api/payouts/admin/accounts/${saved.body.id}`)
      .set('Cookie', ctx.adminCookie)
      .send({ status: 'REJECTED' })
      .expect(422);
  });
});

describe('paying a seller', () => {
  it('refuses to pay an unverified account', async () => {
    const ctx = await setup();
    await deliveredOrder(ctx, { subtotal: 100 });
    await addAccount(ctx);
    const res = await request(app)
      .post('/api/payouts/admin/payouts')
      .set('Cookie', ctx.adminCookie)
      .send({ storeId: String(ctx.store._id), paid: { proofUrl: RECEIPT } })
      .expect(409);
    expect(res.body.error.code).toBe('PAYOUT_ACCOUNT_UNVERIFIED');
  });

  it('pays in one click with a receipt, and the same orders are never paid twice', async () => {
    const ctx = await setup();
    await deliveredOrder(ctx, { subtotal: 100 });
    await deliveredOrder(ctx, { subtotal: 200 });
    const account = await addAccount(ctx);
    await verify(ctx, account.body.id);

    const balances = await request(app).get('/api/payouts/admin/balances').set('Cookie', ctx.adminCookie).expect(200);
    expect(balances.body.stores[0]).toMatchObject({ available: 291, due: true, canPay: true });
    expect(balances.body.totals.dueNow).toBe(291);

    const paid = await request(app)
      .post('/api/payouts/admin/payouts')
      .set('Cookie', ctx.adminCookie)
      .send({ storeId: String(ctx.store._id), paid: { proofUrl: RECEIPT, reference: 'ABA-778899' } })
      .expect(201);
    expect(paid.body).toMatchObject({ status: 'PAID', amount: 291, commissionTotal: 9, orderCount: 2, reference: 'ABA-778899' });

    await request(app)
      .post('/api/payouts/admin/payouts')
      .set('Cookie', ctx.adminCookie)
      .send({ storeId: String(ctx.store._id), paid: { proofUrl: RECEIPT } })
      .expect(409);

    const seller = await request(app).get(`/api/payouts/my-stores/${ctx.store._id}`).set('Cookie', ctx.sellerCookie).expect(200);
    expect(seller.body.balance).toMatchObject({ available: 0, paidOut: 291 });
    expect(seller.body.payouts[0]).toMatchObject({ status: 'PAID', hasProof: true });

    // The seller can open their own receipt.
    const detail = await request(app).get(`/api/payouts/${paid.body.id}`).set('Cookie', ctx.sellerCookie).expect(200);
    expect(detail.body.proofUrl).toBe(RECEIPT);
    expect(detail.body.lines).toHaveLength(2);
  });

  it('requires an uploaded receipt to mark paid', async () => {
    const ctx = await setup();
    await deliveredOrder(ctx, { subtotal: 100 });
    const account = await addAccount(ctx);
    await verify(ctx, account.body.id);
    const pending = await request(app)
      .post('/api/payouts/admin/payouts')
      .set('Cookie', ctx.adminCookie)
      .send({ storeId: String(ctx.store._id) })
      .expect(201);
    expect(pending.body.status).toBe('PENDING');

    await request(app)
      .post(`/api/payouts/admin/payouts/${pending.body.id}/paid`)
      .set('Cookie', ctx.adminCookie)
      .send({ reference: 'only a reference' })
      .expect(422);
    await request(app)
      .post(`/api/payouts/admin/payouts/${pending.body.id}/paid`)
      .set('Cookie', ctx.adminCookie)
      .send({ proofUrl: RECEIPT })
      .expect(200);
  });

  it('cancelling a pending payout puts the money back in the balance', async () => {
    const ctx = await setup();
    await deliveredOrder(ctx, { subtotal: 100 });
    const account = await addAccount(ctx);
    await verify(ctx, account.body.id);
    const pending = await request(app)
      .post('/api/payouts/admin/payouts')
      .set('Cookie', ctx.adminCookie)
      .send({ storeId: String(ctx.store._id) })
      .expect(201);

    let seller = await request(app).get(`/api/payouts/my-stores/${ctx.store._id}`).set('Cookie', ctx.sellerCookie);
    expect(seller.body.balance).toMatchObject({ available: 0, inProcessing: 97 });

    await request(app)
      .post(`/api/payouts/admin/payouts/${pending.body.id}/cancel`)
      .set('Cookie', ctx.adminCookie)
      .send({ reason: 'Wrong amount' })
      .expect(200);
    seller = await request(app).get(`/api/payouts/my-stores/${ctx.store._id}`).set('Cookie', ctx.sellerCookie);
    expect(seller.body.balance).toMatchObject({ available: 97, inProcessing: 0 });
  });

  it('runs every due payout at once, skipping stores under the minimum', async () => {
    const ctx = await setup();
    await deliveredOrder(ctx, { subtotal: 5 }); // 4.85 < $10 minimum
    const account = await addAccount(ctx);
    await verify(ctx, account.body.id);
    const run = await request(app).post('/api/payouts/admin/payouts/run-due').set('Cookie', ctx.adminCookie).expect(200);
    expect(run.body.created).toHaveLength(0);

    await request(app).put('/api/payouts/admin/settings').set('Cookie', ctx.adminCookie).send({ minimumPayout: 1 }).expect(200);
    const again = await request(app).post('/api/payouts/admin/payouts/run-due').set('Cookie', ctx.adminCookie).expect(200);
    expect(again.body.created).toHaveLength(1);
  });

  it('applies a changed commission rate to new payouts', async () => {
    const ctx = await setup();
    await deliveredOrder(ctx, { subtotal: 100 });
    await request(app).put('/api/payouts/admin/settings').set('Cookie', ctx.adminCookie).send({ commissionRate: 5 }).expect(200);
    const res = await request(app).get(`/api/payouts/my-stores/${ctx.store._id}`).set('Cookie', ctx.sellerCookie);
    expect(res.body.balance.available).toBe(95);
  });

  it('keeps admin endpoints admin-only', async () => {
    const ctx = await setup();
    await request(app).get('/api/payouts/admin/balances').set('Cookie', ctx.sellerCookie).expect(403);
    await request(app).put('/api/payouts/admin/settings').set('Cookie', ctx.sellerCookie).send({ commissionRate: 0 }).expect(403);
  });
});
