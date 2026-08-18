const mongoose = require('mongoose');

async function main() {
  const uri = "mongodb://tessothyroth25_db_user:Th1Ob0u5KYamaSpc@ac-wfvfk2m-shard-00-00.ijj8pbn.mongodb.net:27017,ac-wfvfk2m-shard-00-01.ijj8pbn.mongodb.net:27017,ac-wfvfk2m-shard-00-02.ijj8pbn.mongodb.net:27017/?ssl=true&replicaSet=atlas-s17cau-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0";
  
  await mongoose.connect(uri);
  console.log('Connected to DB');

  const db = mongoose.connection.db;
  
  const user = await db.collection('users').findOne({ email: 'sothyroth1234@gmail.com' });
  if (!user) {
    console.log('User not found!');
    process.exit(1);
  }
  
  const store = await db.collection('sellers').findOne({ userId: user._id });
  console.log('Store ID:', store ? store._id.toString() : 'None');
  
  const products = await db.collection('products').find({}).toArray();
  console.log(`Total products in DB: ${products.length}`);
  
  if (products.length > 0) {
    console.log('Sample product sellerId:', products[products.length - 1].sellerId);
    console.log('Sample product name:', products[products.length - 1].name);
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
