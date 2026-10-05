import mongoose, { type Model } from 'mongoose';
import Cart from '../models/Cart';
import EmailVerificationCode from '../models/EmailVerificationCode';
import Order from '../models/Order';
import PasswordResetToken from '../models/PasswordResetToken';
import Product from '../models/Product';
import RefreshToken from '../models/RefreshToken';
import Review from '../models/Review';
import SellerApplication from '../models/SellerApplication';
import Store from '../models/Store';
import StoreCategory from '../models/StoreCategory';
import SubscriptionPayment from '../models/SubscriptionPayment';
import User from '../models/User';
import Warehouse from '../models/Warehouse';

/**
 * MongoDB calls them collections rather than tables. Keeping this inventory in
 * one place means a brand-new development database gets every collection at
 * API startup, instead of waiting for the first checkout, store, or product
 * to create it implicitly.
 */
const databaseModels: Model<unknown>[] = [
  Cart as Model<unknown>,
  EmailVerificationCode as Model<unknown>,
  Order as Model<unknown>,
  PasswordResetToken as Model<unknown>,
  Product as Model<unknown>,
  RefreshToken as Model<unknown>,
  Review as Model<unknown>,
  SellerApplication as Model<unknown>,
  Store as Model<unknown>,
  StoreCategory as Model<unknown>,
  SubscriptionPayment as Model<unknown>,
  User as Model<unknown>,
  Warehouse as Model<unknown>,
];

async function dbConnect() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
  }

  // In Express, we can just connect once at startup
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  // Force IPv4, which often fixes ECONNREFUSED DNS issues on Windows
  return mongoose.connect(MONGODB_URI, { family: 4 });
}

export default dbConnect;

/** Create missing collections without touching existing marketplace data. */
export async function ensureDatabaseCollections() {
  const database = mongoose.connection.db;
  if (!database) {
    throw new Error('MongoDB connection is not ready.');
  }

  const existing = new Set(
    (await database.listCollections({}, { nameOnly: true }).toArray()).map(
      (collection) => collection.name,
    ),
  );
  const missing = databaseModels.filter(
    (model) => !existing.has(model.collection.collectionName),
  );

  await Promise.all(
    missing.map(async (model) => {
      try {
        await model.createCollection();
      } catch (error) {
        // A second API instance can create the same collection between our
        // list and create calls. MongoDB code 48 means it is ready to use.
        if ((error as { code?: number }).code !== 48) {
          throw error;
        }
      }
    }),
  );

  if (missing.length) {
    console.log(
      `[database] Created collections: ${missing
        .map((model) => model.collection.collectionName)
        .join(', ')}`,
    );
  }
}
