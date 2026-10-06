import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { PromotionSlide } from '../../models/Promotion';
import Store from '../../models/Store';
import SubscriptionPayment from '../../models/SubscriptionPayment';
import User from '../../models/User';
import { AUTH_COOKIE_NAME, signAccessToken } from '../../src/utils/jwt';
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
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

const DAY = 24 * 60 * 60 * 1000;
const IMAGE = 'https://images.example.com/slide.jpg';

const signInAdmin = async () => {
  const admin = await User.create({
    name: 'Admin',
    email: 'admin@khmercraft.test',
    password_hash: 'x',
    role: 'ADMIN',
    status: 'ACTIVE',
  });
  const token = signAccessToken(String(admin._id), admin.role, admin.token_version);
  return { cookie: [`${AUTH_COOKIE_NAME}=${token}`], userId: String(admin._id) };
};

let sellerSeq = 0;
/** A seller account with one store on the given billing footing. */
const makeSeller = async (
  plan: 'STARTER' | 'STANDARD' | 'PREMIUM',
  planExpiresAt: Date | null = null,
) => {
  sellerSeq += 1;
  const user = await User.create({
    name: `Seller ${sellerSeq}`,
    email: `seller${sellerSeq}@khmercraft.test`,
    password_hash: 'x',
    role: 'SELLER',
    status: 'ACTIVE',
  });
  const store = await Store.create({
    userId: user._id,
    storeName: `Store ${sellerSeq}`,
    slug: `store-${sellerSeq}`,
    subscriptionPlan: plan,
    planExpiresAt,
    onboardingStatus: 'COMPLETED',
  });
  return { user, store };
};

describe('admin monitoring', () => {
  it('refuses anyone who is not an admin', async () => {
    const buyer = await signInBuyer(app);
    await request(app).get('/api/admin/overview').expect(401);
    await request(app).get('/api/admin/overview').set('Cookie', buyer.cookie).expect(403);
  });

  it('counts sellers by billing status and totals plan revenue', async () => {
    const admin = await signInAdmin();
    const now = Date.now();
    const paying = await makeSeller('PREMIUM', new Date(now + 20 * DAY));
    await makeSeller('STANDARD', new Date(now + 2 * DAY)); // expiring
    await makeSeller('STANDARD', new Date(now - 3 * DAY)); // lapsed
    await makeSeller('STARTER'); // free
    await makeSeller('STARTER');

    await SubscriptionPayment.create({
      storeId: paying.store._id,
      userId: paying.user._id,
      plan: 'PREMIUM',
      amount: 29,
      status: 'PAID',
      tranId: 'T1',
      paidAt: new Date(),
    });
    await SubscriptionPayment.create({
      storeId: paying.store._id,
      userId: paying.user._id,
      plan: 'PREMIUM',
      amount: 29,
      status: 'FAILED',
      tranId: 'T2',
    });

    const res = await request(app).get('/api/admin/overview').set('Cookie', admin.cookie).expect(200);

    expect(res.body.sellers.accounts).toBe(5);
    expect(res.body.sellers.stores).toBe(5);
    expect(res.body.subscriptions).toMatchObject({
      paying: 2,
      expiring: 1,
      lapsed: 1,
      free: 2,
      byPlan: { STANDARD: 1, PREMIUM: 1 },
      mrr: 41,
    });
    expect(res.body.subscriptions.expiringSoon).toHaveLength(1);
    expect(res.body.revenue).toMatchObject({ allTime: 29, thisMonth: 29, failedThisMonth: 1 });
    expect(res.body.series).toHaveLength(6);
    expect(res.body.series[5].newStores).toBe(5);
  });

  it('lists sellers filtered by billing bucket, with owner and payment history', async () => {
    const admin = await signInAdmin();
    const paying = await makeSeller('PREMIUM', new Date(Date.now() + 20 * DAY));
    await makeSeller('STARTER');
    await SubscriptionPayment.create({
      storeId: paying.store._id,
      userId: paying.user._id,
      plan: 'PREMIUM',
      amount: 29,
      status: 'PAID',
      tranId: 'T1',
      paidAt: new Date(),
    });

    const res = await request(app)
      .get('/api/admin/sellers?billing=paying')
      .set('Cookie', admin.cookie)
      .expect(200);

    expect(res.body.pagination.total).toBe(1);
    expect(res.body.sellers[0]).toMatchObject({
      storeName: paying.store.storeName,
      owner: { email: paying.user.email, status: 'ACTIVE' },
      billing: { status: 'paying', effectivePlan: 'PREMIUM', totalPaid: 29, paidCount: 1 },
    });

    const free = await request(app).get('/api/admin/sellers?billing=free').set('Cookie', admin.cookie).expect(200);
    expect(free.body.pagination.total).toBe(1);
    expect(free.body.sellers[0].billing.status).toBe('free');
  });

  it('searches sellers by owner email', async () => {
    const admin = await signInAdmin();
    const { user } = await makeSeller('STARTER');
    await makeSeller('STARTER');

    const res = await request(app)
      .get(`/api/admin/sellers?q=${encodeURIComponent(user.email)}`)
      .set('Cookie', admin.cookie)
      .expect(200);
    expect(res.body.sellers).toHaveLength(1);
    expect(res.body.sellers[0].owner.id).toBe(String(user._id));
  });

  it('suspension locks the seller out immediately and can be reversed', async () => {
    const admin = await signInAdmin();
    const { user } = await makeSeller('STARTER');
    const sellerCookie = [
      `${AUTH_COOKIE_NAME}=${signAccessToken(String(user._id), user.role, user.token_version)}`,
    ];
    await request(app).get('/api/sellers/my-stores').set('Cookie', sellerCookie).expect(200);

    await request(app)
      .patch(`/api/admin/users/${user._id}/status`)
      .set('Cookie', admin.cookie)
      .send({ status: 'SUSPENDED', reason: 'Counterfeit goods' })
      .expect(200);
    await request(app).get('/api/sellers/my-stores').set('Cookie', sellerCookie).expect(401);

    const reinstated = await request(app)
      .patch(`/api/admin/users/${user._id}/status`)
      .set('Cookie', admin.cookie)
      .send({ status: 'ACTIVE' })
      .expect(200);
    expect(reinstated.body.status).toBe('ACTIVE');
  });

  it('will not suspend an admin', async () => {
    const admin = await signInAdmin();
    const other = await User.create({
      name: 'Other admin',
      email: 'other@khmercraft.test',
      password_hash: 'x',
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    await request(app)
      .patch(`/api/admin/users/${other._id}/status`)
      .set('Cookie', admin.cookie)
      .send({ status: 'SUSPENDED' })
      .expect(403);
  });
});

describe('admin slide management', () => {
  it('creates a house slide that goes live on its placement', async () => {
    const admin = await signInAdmin();
    await request(app)
      .post('/api/promotions/admin/slides')
      .set('Cookie', admin.cookie)
      .send({ placement: 'HERO', title: 'Khmer New Year', imageUrl: IMAGE, targetUrl: '/products' })
      .expect(201);

    const hero = await request(app).get('/api/promotions/active?placement=HERO').expect(200);
    expect(hero.body).toHaveLength(1);
    expect(hero.body[0]).toMatchObject({ title: 'Khmer New Year', placement: 'HERO' });
  });

  it('returns no hero slides (not the brand defaults) when none are live', async () => {
    const hero = await request(app).get('/api/promotions/active?placement=HERO').expect(200);
    expect(hero.body).toEqual([]);
    const brand = await request(app).get('/api/promotions/active').expect(200);
    expect(brand.body.length).toBeGreaterThan(0);
  });

  it('rejects unsafe links', async () => {
    const admin = await signInAdmin();
    await request(app)
      .post('/api/promotions/admin/slides')
      .set('Cookie', admin.cookie)
      .send({ placement: 'HERO', title: 'Bad', imageUrl: IMAGE, targetUrl: 'javascript:alert(1)' })
      .expect(422);
  });

  it('pauses, resumes, reorders and deletes', async () => {
    const admin = await signInAdmin();
    const create = (title: string) =>
      request(app)
        .post('/api/promotions/admin/slides')
        .set('Cookie', admin.cookie)
        .send({ placement: 'HERO', title, imageUrl: IMAGE, targetUrl: '/stores' })
        .expect(201);
    const first = (await create('First')).body;
    const second = (await create('Second')).body;

    await request(app)
      .put('/api/promotions/admin/slides/reorder')
      .set('Cookie', admin.cookie)
      .send({ placement: 'HERO', ids: [second._id, first._id] })
      .expect(200);
    let live = await request(app).get('/api/promotions/active?placement=HERO');
    expect(live.body.map((s: { title: string }) => s.title)).toEqual(['Second', 'First']);

    await request(app)
      .patch(`/api/promotions/admin/slides/${second._id}/status`)
      .set('Cookie', admin.cookie)
      .send({ status: 'PAUSED' })
      .expect(200);
    live = await request(app).get('/api/promotions/active?placement=HERO');
    expect(live.body.map((s: { title: string }) => s.title)).toEqual(['First']);

    await request(app)
      .patch(`/api/promotions/admin/slides/${second._id}/status`)
      .set('Cookie', admin.cookie)
      .send({ status: 'APPROVED' })
      .expect(200);

    await request(app)
      .delete(`/api/promotions/admin/slides/${first._id}`)
      .set('Cookie', admin.cookie)
      .expect(200);
    live = await request(app).get('/api/promotions/active?placement=HERO');
    expect(live.body.map((s: { title: string }) => s.title)).toEqual(['Second']);
  });

  it('requires a reason to reject a seller slide, and does not let admins rewrite it', async () => {
    const admin = await signInAdmin();
    const { user, store } = await makeSeller('STARTER');
    const slide = await PromotionSlide.create({
      storeId: store._id,
      storeName: store.storeName,
      storeSlug: store.slug,
      sellerUserId: user._id,
      title: 'Seller creative',
      targetId: String(store._id),
      targetUrl: `/stores/${store.slug}`,
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * DAY),
      days: 7,
      status: 'PENDING_APPROVAL',
    });

    await request(app)
      .patch(`/api/promotions/admin/slides/${slide._id}/review`)
      .set('Cookie', admin.cookie)
      .send({ status: 'REJECTED' })
      .expect(422);

    const edited = await request(app)
      .patch(`/api/promotions/admin/slides/${slide._id}`)
      .set('Cookie', admin.cookie)
      .send({ title: 'Admin rewrite', placement: 'HERO' })
      .expect(200);
    expect(edited.body.title).toBe('Seller creative');
    expect(edited.body.placement).toBe('HERO');

    await request(app)
      .patch(`/api/promotions/admin/slides/${slide._id}/review`)
      .set('Cookie', admin.cookie)
      .send({ status: 'APPROVED' })
      .expect(200);
    const hero = await request(app).get('/api/promotions/active?placement=HERO');
    expect(hero.body[0].title).toBe('Seller creative');
  });
});
