import mongoose from 'mongoose';
import User from './apps/api/models/User';
import Seller from './apps/api/models/Seller';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to DB');
  
  const user = await User.findOne({ email: 'sothyroth1234@gmail.com' });
  if (!user) {
    console.log('User not found!');
  } else {
    console.log('User found:', user._id, 'Role:', user.role);
    const stores = await Seller.find({ userId: user._id });
    console.log('Stores for user:', stores.length);
    if (stores.length > 0) {
      console.log('Store ID:', stores[0]._id);
    } else {
      console.log('No stores found, attempting to create one manually');
      const newStore = await Seller.create({
        userId: user._id,
        storeName: 'My Awesome Store',
        subscriptionPlan: 'STARTER',
        onboardingStatus: 'PENDING'
      });
      console.log('Store created manually:', newStore._id);
    }
  }
  process.exit(0);
}
main().catch(err => { console.error(err); process.exit(1); });
