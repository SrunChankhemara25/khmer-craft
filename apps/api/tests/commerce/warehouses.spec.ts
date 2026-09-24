import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import Product from '../../models/Product';
import { createApp } from '../../src/app';

const app = createApp();
const password = 'CraftPass123';
let mongo: MongoMemoryServer;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-with-enough-entropy-for-tests';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});
beforeEach(async () => { await mongoose.connection.db!.dropDatabase(); });
afterAll(async () => { await mongoose.disconnect(); await mongo.stop(); });

/** Registers a seller and returns their cookie plus their store id. */
const signUpSeller = async (email: string, storeName: string) => {
  const response = await request(app)
    .post('/auth/register-seller')
    .send({ name: 'Seller', email, password, confirmPassword: password, storeName, category: 'Weaving' })
    .expect(201);
  const cookie = response.headers['set-cookie'];
  const stores = await request(app).get('/api/sellers/my-stores').set('Cookie', cookie).expect(200);
  return { cookie, storeId: stores.body[0].id as string };
};

const location = (over: Record<string, unknown> = {}) => ({
  name: 'Main shop',
  province: 'Phnom Penh',
  district: 'Toul Kork',
  phoneNumber: '012345678',
  ...over,
});

describe('warehouses', () => {
  it('makes the first location the default even when not asked', async () => {
    const { cookie, storeId } = await signUpSeller('a@khmercraft.test', 'A Store');

    const created = await request(app)
      .post(`/api/warehouses/my-stores/${storeId}`)
      .set('Cookie', cookie)
      .send(location({ isDefault: false }))
      .expect(201);

    expect(created.body.isDefault).toBe(true);
    expect(created.body.province).toBe('Phnom Penh');
  });

  it('moves the default rather than allowing two', async () => {
    const { cookie, storeId } = await signUpSeller('b@khmercraft.test', 'B Store');
    await request(app).post(`/api/warehouses/my-stores/${storeId}`).set('Cookie', cookie)
      .send(location()).expect(201);
    const second = await request(app).post(`/api/warehouses/my-stores/${storeId}`).set('Cookie', cookie)
      .send(location({ name: 'Storage', isDefault: true })).expect(201);

    const list = await request(app).get(`/api/warehouses/my-stores/${storeId}`)
      .set('Cookie', cookie).expect(200);

    const defaults = list.body.warehouses.filter((w: { isDefault: boolean }) => w.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].id).toBe(second.body.id);
  });

  it('rejects a duplicate name in the same store', async () => {
    const { cookie, storeId } = await signUpSeller('c@khmercraft.test', 'C Store');
    await request(app).post(`/api/warehouses/my-stores/${storeId}`).set('Cookie', cookie)
      .send(location()).expect(201);

    await request(app).post(`/api/warehouses/my-stores/${storeId}`).set('Cookie', cookie)
      .send(location()).expect(409);
  });

  it('refuses to delete a location that still holds stock', async () => {
    const { cookie, storeId } = await signUpSeller('d@khmercraft.test', 'D Store');
    const created = await request(app).post(`/api/warehouses/my-stores/${storeId}`)
      .set('Cookie', cookie).send(location()).expect(201);

    await Product.create({
      name: 'Krama', slug: 'krama', price: 10, category: 'Fashion & Accessories',
      sellerId: new mongoose.Types.ObjectId(storeId), sellerName: 'D Store',
      warehouseId: new mongoose.Types.ObjectId(created.body.id),
      stock: 3, status: 'ACTIVE',
    });

    const blocked = await request(app)
      .delete(`/api/warehouses/my-stores/${storeId}/${created.body.id}`)
      .set('Cookie', cookie).expect(409);
    expect(blocked.body.error.code).toBe('WAREHOUSE_IN_USE');
  });

  it('hides one seller\'s locations from another', async () => {
    const a = await signUpSeller('e@khmercraft.test', 'E Store');
    const b = await signUpSeller('f@khmercraft.test', 'F Store');
    const created = await request(app).post(`/api/warehouses/my-stores/${a.storeId}`)
      .set('Cookie', a.cookie).send(location()).expect(201);

    // 404 rather than 403 throughout: seller B must not learn that this store
    // or this location exists at all.
    await request(app).get(`/api/warehouses/my-stores/${a.storeId}`)
      .set('Cookie', b.cookie).expect(404);
    await request(app)
      .patch(`/api/warehouses/my-stores/${a.storeId}/${created.body.id}`)
      .set('Cookie', b.cookie).send({ name: 'Hijacked' }).expect(404);
    await request(app)
      .delete(`/api/warehouses/my-stores/${a.storeId}/${created.body.id}`)
      .set('Cookie', b.cookie).expect(404);
  });

  it('saves warehouseId when a product is created, and blocks deleting that location', async () => {
    const { cookie, storeId } = await signUpSeller('h@khmercraft.test', 'H Store');
    const wh = await request(app).post(`/api/warehouses/my-stores/${storeId}`)
      .set('Cookie', cookie).send(location()).expect(201);

    // Regression: warehouseId was absent from the catalogue schema, so it was
    // stripped on the way in. The product saved fine, pointed at no location,
    // and the delete guard below then happily removed a location still in use.
    const product = await request(app).post('/api/products').set('Cookie', cookie)
      .send({ name: 'Guarded', price: 5, category: 'Fashion & Accessories', stock: 1, warehouseId: wh.body.id })
      .expect(201);
    expect(product.body.warehouseId).toBe(wh.body.id);

    const blocked = await request(app)
      .delete(`/api/warehouses/my-stores/${storeId}/${wh.body.id}`)
      .set('Cookie', cookie).expect(409);
    expect(blocked.body.error.message).toContain('1 product is still kept here');
  });

  it('requires a signed-in seller', async () => {
    const { storeId } = await signUpSeller('g@khmercraft.test', 'G Store');
    await request(app).get(`/api/warehouses/my-stores/${storeId}`).expect(401);
  });
});
