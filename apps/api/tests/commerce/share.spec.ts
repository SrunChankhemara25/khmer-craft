import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import Product, { slugify } from '../../models/Product';
import Store from '../../models/Store';
import User from '../../models/User';
import { hashPassword } from '../../src/utils/password';
import { makeProduct, strongPassword } from './helpers';

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

const makeStore = async (status: 'COMPLETED' | 'PENDING' = 'COMPLETED') => {
  const owner = await User.create({
    name: 'Owner',
    email: `owner-${Math.random().toString(36).slice(2)}@khmercraft.test`,
    password_hash: await hashPassword(strongPassword),
    role: 'SELLER',
    status: 'ACTIVE',
  });
  return Store.create({
    userId: owner._id,
    storeName: 'Sothy Home & Living',
    slug: `sothy-${Math.random().toString(36).slice(2, 8)}`,
    storeTagline: 'Handmade homeware',
    subscriptionPlan: 'STARTER',
    onboardingStatus: status,
  });
};

const makeStoreProduct = (storeId: unknown, name: string, category: string, subcategory?: string) =>
  Product.create({
    name,
    slug: slugify(name),
    description: `${name} description`,
    price: 12.5,
    category,
    subcategory,
    sellerName: 'Owner',
    storeName: 'Sothy Home & Living',
    sellerId: storeId,
    images: [],
    stock: 5,
    status: 'ACTIVE',
  });

describe('GET /api/share/product/:id', () => {
  it('serves Open Graph tags a link-preview crawler can read, plus a redirect for people', async () => {
    const product = await makeProduct({ name: 'Silk Krama', price: 8 });

    const res = await request(app).get(`/api/share/product/${product._id}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain('<meta property="og:title" content="Silk Krama">');
    expect(res.text).toContain('$8.00');
    expect(res.text).toContain(`og:url" content="http://localhost:3001/api/share/product/${product._id}"`);
    expect(res.text).toContain(`http-equiv="refresh" content="0;url=http://localhost:4200/product/${product._id}"`);
    // The preview page is a pointer, not content: keep it out of search results.
    expect(res.headers['x-robots-tag']).toBe('noindex');
    // And it needs no script, so it also works under the API's strict CSP.
    expect(res.text).not.toContain('<script');
  });

  it('only offers a photo when the product has one', async () => {
    const without = await makeProduct({ name: 'No Photo' });
    expect((await request(app).get(`/api/share/product/${without._id}`)).text).not.toContain('og:image"');

    const withPhoto = await makeProduct({ name: 'Has Photo' });
    await Product.updateOne({ _id: withPhoto._id }, { image: 'data:image/png;base64,AAAA' });
    const res = await request(app).get(`/api/share/product/${withPhoto._id}`);
    expect(res.text).toContain(`og:image" content="http://localhost:3001/api/products/${withPhoto._id}/image"`);
  });

  it('escapes anything a seller typed, so a product name cannot inject markup', async () => {
    const product = await makeProduct({ name: '"><script>alert(1)</script>' });

    const res = await request(app).get(`/api/share/product/${product._id}`);

    expect(res.text).not.toContain('<script>');
    expect(res.text).toContain('&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('answers 404 the same way for drafts, archived, unknown and malformed ids', async () => {
    const draft = await makeProduct({ name: 'Draft Item', status: 'DRAFT' });
    const archived = await makeProduct({ name: 'Old Item', status: 'ARCHIVED' });

    const responses = await Promise.all([
      request(app).get(`/api/share/product/${draft._id}`),
      request(app).get(`/api/share/product/${archived._id}`),
      request(app).get(`/api/share/product/${new mongoose.Types.ObjectId()}`),
      request(app).get('/api/share/product/not-an-id'),
      request(app).get('/api/share/product/%3Cscript%3E'),
    ]);

    for (const res of responses) {
      expect(res.status).toBe(404);
      expect(res.text).toContain('no longer available');
      expect(res.text).not.toContain('og:title');
    }
    // Identical bodies: the page does not reveal which case it was.
    expect(new Set(responses.map((res) => res.text)).size).toBe(1);
  });
});

describe('GET /api/share/store/:idOrSlug', () => {
  it('previews the whole store and works by id or slug', async () => {
    const store = await makeStore();
    await makeStoreProduct(store._id, 'Tea Cup', 'Pottery', 'Cups & Mugs');
    await makeStoreProduct(store._id, 'Krama', 'Weaving', 'Scarves');

    const byId = await request(app).get(`/api/share/store/${store._id}`);
    expect(byId.status).toBe(200);
    expect(byId.text).toContain('og:title" content="Sothy Home &amp; Living"');
    expect(byId.text).toContain('2 products');
    expect(byId.text).toContain(`content="0;url=http://localhost:4200/stores/${store._id}"`);

    expect((await request(app).get(`/api/share/store/${store.slug}`)).status).toBe(200);
  });

  it('previews one category or sub-category and sends people straight to it', async () => {
    const store = await makeStore();
    await makeStoreProduct(store._id, 'Tea Cup', 'Pottery', 'Cups & Mugs');
    await makeStoreProduct(store._id, 'Plate', 'Pottery', 'Plates');
    await makeStoreProduct(store._id, 'Krama', 'Weaving', 'Scarves');

    const category = await request(app).get(`/api/share/store/${store._id}?category=pottery`);
    expect(category.text).toContain('og:title" content="Pottery at Sothy Home &amp; Living"');
    expect(category.text).toContain('2 products');
    expect(category.text).toContain('stores/' + store._id + '?category=Pottery"');

    const sub = await request(app).get(
      `/api/share/store/${store._id}?category=Pottery&sub=${encodeURIComponent('cups & mugs')}`,
    );
    expect(sub.text).toContain('og:title" content="Cups &amp; Mugs at Sothy Home &amp; Living"');
    expect(sub.text).toContain('1 product ');
    expect(sub.text).toContain('category=Pottery&amp;sub=Cups+%26+Mugs');
  });

  it('ignores a category the store does not sell instead of trusting the query string', async () => {
    const store = await makeStore();
    await makeStoreProduct(store._id, 'Tea Cup', 'Pottery', 'Cups & Mugs');

    const res = await request(app).get(
      `/api/share/store/${store._id}?category=${encodeURIComponent('"><script>alert(1)</script>')}&sub=Free%20Money`,
    );

    expect(res.status).toBe(200);
    expect(res.text).not.toContain('<script>');
    expect(res.text).not.toContain('Free Money');
    expect(res.text).toContain('og:title" content="Sothy Home &amp; Living"');
    expect(res.text).toContain(`content="0;url=http://localhost:4200/stores/${store._id}"`);
  });

  it('has no page for a store that has not finished setup, or does not exist', async () => {
    const pending = await makeStore('PENDING');

    expect((await request(app).get(`/api/share/store/${pending._id}`)).status).toBe(404);
    expect((await request(app).get('/api/share/store/no-such-store')).status).toBe(404);
  });
});
