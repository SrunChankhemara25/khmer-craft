import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import Store from '../../models/Store';
import User from '../../models/User';
import { AUTH_COOKIE_NAME, signAccessToken } from '../../src/utils/jwt';
import { buildKhqrString, crc16 } from '../../src/utils/khqr';

const app = createApp();
let mongo: MongoMemoryServer;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-with-enough-entropy-for-tests';
  delete process.env.PAYWAY_MERCHANT_ID;
  delete process.env.PAYWAY_API_KEY;
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

/** Split an EMVCo payload into its top-level tags. */
const parse = (payload: string) => {
  const out: Record<string, string> = {};
  let i = 0;
  while (i < payload.length) {
    const tag = payload.slice(i, i + 2);
    const len = Number(payload.slice(i + 2, i + 4));
    out[tag] = payload.slice(i + 4, i + 4 + len);
    i += 4 + len;
  }
  return out;
};

describe('KHQR encoding', () => {
  it('uses the CRC-16/CCITT-FALSE checksum EMVCo requires', () => {
    expect(crc16('123456789')).toBe('29B1');
  });

  it('builds a dynamic individual KHQR with the amount and a valid checksum', () => {
    const payload = buildKhqrString({
      bakongAccountId: 'sokdara@aba',
      merchantName: 'Silk House',
      merchantCity: 'Siem Reap',
      amount: 12.5,
      currency: 'USD',
      billNumber: 'KC-POS-1',
    });
    const tags = parse(payload);
    expect(tags['01']).toBe('12');
    expect(tags['29']).toBe('0011sokdara@aba');
    expect(tags['53']).toBe('840');
    expect(tags['54']).toBe('12.5');
    expect(tags['59']).toBe('Silk House');
    expect(tags['60']).toBe('Siem Reap');
    expect(tags['63']).toBe(crc16(payload.slice(0, -4)));
  });
});

describe('POS KHQR', () => {
  const setup = async () => {
    const user = await User.create({ name: 'Seller', email: 's@kc.test', password_hash: 'x', role: 'SELLER', status: 'ACTIVE' });
    const store = await Store.create({ userId: user._id, storeName: 'Silk House', slug: 'silk', onboardingStatus: 'COMPLETED' });
    const cookie = [`${AUTH_COOKIE_NAME}=${signAccessToken(String(user._id), user.role, user.token_version)}`];
    return { store, cookie };
  };

  it('tells the seller to set up their Bakong account first', async () => {
    const { store, cookie } = await setup();
    const res = await request(app)
      .post(`/api/sellers/my-stores/${store._id}/pos/khqr/generate`)
      .set('Cookie', cookie)
      .send({ amount: 10 })
      .expect(409);
    expect(res.body.error.code).toBe('KHQR_NOT_SET_UP');
  });

  it('generates a scannable QR for the exact amount once set up', async () => {
    const { store, cookie } = await setup();
    await request(app)
      .put(`/api/sellers/my-stores/${store._id}/pos/khqr/settings`)
      .set('Cookie', cookie)
      .send({ bakongAccountId: 'not an id', merchantName: 'Silk' })
      .expect(422);
    await request(app)
      .put(`/api/sellers/my-stores/${store._id}/pos/khqr/settings`)
      .set('Cookie', cookie)
      .send({ bakongAccountId: 'SokDara@ABA', merchantName: 'Silk House' })
      .expect(200);

    const res = await request(app)
      .post(`/api/sellers/my-stores/${store._id}/pos/khqr/generate`)
      .set('Cookie', cookie)
      .send({ amount: 23.75 })
      .expect(200);
    expect(res.body).toMatchObject({ mode: 'BAKONG', amount: 23.75, payTo: 'sokdara@aba' });
    expect(res.body.qrImage).toMatch(/^data:image\/png;base64,/);
    expect(parse(res.body.qrString)['54']).toBe('23.75');

    const check = await request(app)
      .get(`/api/sellers/my-stores/${store._id}/pos/khqr/check/${res.body.tranId}`)
      .set('Cookie', cookie)
      .expect(200);
    expect(check.body).toMatchObject({ manual: true, paid: false });
  });
});
