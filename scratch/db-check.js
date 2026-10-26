const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function main() {
  const uri = "mongodb://tessothyroth25_db_user:Th1Ob0u5KYamaSpc@ac-wfvfk2m-shard-00-00.ijj8pbn.mongodb.net:27017,ac-wfvfk2m-shard-00-01.ijj8pbn.mongodb.net:27017,ac-wfvfk2m-shard-00-02.ijj8pbn.mongodb.net:27017/khmercraft?ssl=true&replicaSet=atlas-s17cau-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0";
  
  await mongoose.connect(uri);
  console.log('Connected to DB');

  const db = mongoose.connection.db;
  
  let user = await db.collection('users').findOne({ email: 'sothyroth1234@gmail.com' });
  
  if (!user) {
    console.log('User not found. Creating user...');
    const hash = await bcrypt.hash('123456789', 10);
    const result = await db.collection('users').insertOne({
      name: 'Sothy Roth',
      email: 'sothyroth1234@gmail.com',
      password_hash: hash,
      role: 'BUYER',
      status: 'ACTIVE',
      token_version: 0,
      failed_login_attempts: 0,
      created_at: new Date(),
      updated_at: new Date()
    });
    console.log('User created:', result.insertedId.toString());
    user = { _id: result.insertedId };
  } else {
    console.log('User found:', user._id.toString(), 'Role:', user.role);
  }
  
  // Check if Seller exists
  const stores = await db.collection('sellers').find({ userId: user._id }).toArray();
  console.log('Stores found for this user:', stores.length);
  
  if (stores.length === 0) {
    console.log('Creating store directly via script...');
    const result = await db.collection('sellers').insertOne({
      userId: user._id,
      storeName: 'Sothy Awesome Store',
      subscriptionPlan: 'STARTER',
      onboardingStatus: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('Created store with ID:', result.insertedId.toString());
  } else {
    console.log('Store ID:', stores[0]._id.toString());
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
