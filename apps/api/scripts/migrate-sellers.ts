import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.join(__dirname, '../.env.local') });

import SellerProfile from '../models/SellerProfile';
import Seller from '../models/Seller';

async function migrate() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('No URI');
  await mongoose.connect(uri);
  
  try {
    await mongoose.connection.collection('sellers').dropIndex('email_1');
    console.log('Dropped email index');
  } catch (e: any) {
    console.log('No email index to drop or error:', e.message);
  }

  const profiles = await SellerProfile.find();
  console.log(`Found ${profiles.length} SellerProfiles`);
  
  let migrated = 0;
  for (const profile of profiles) {
    const exists = await Seller.findOne({ userId: profile.user_id });
    if (!exists) {
      await Seller.create({
        userId: profile.user_id,
        storeName: profile.businessName,
        category: profile.category,
        storeDescription: profile.description || '',
        subscriptionPlan: 'STARTER',
        onboardingStatus: 'COMPLETED',
        verificationStatus: 'PENDING'
      });
      migrated++;
    }
  }
  
  console.log(`Migrated ${migrated} stores.`);
  process.exit(0);
}

migrate().catch(console.error);
