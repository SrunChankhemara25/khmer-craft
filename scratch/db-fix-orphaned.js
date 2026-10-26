const mongoose = require('mongoose');

async function main() {
  const uri = "mongodb://tessothyroth25_db_user:Th1Ob0u5KYamaSpc@ac-wfvfk2m-shard-00-00.ijj8pbn.mongodb.net:27017,ac-wfvfk2m-shard-00-01.ijj8pbn.mongodb.net:27017,ac-wfvfk2m-shard-00-02.ijj8pbn.mongodb.net:27017/?ssl=true&replicaSet=atlas-s17cau-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0";
  
  await mongoose.connect(uri);
  console.log('Connected to DB');

  const db = mongoose.connection.db;
  
  const user = await db.collection('users').findOne({ email: 'sothyroth1234@gmail.com' });
  const store = await db.collection('sellers').findOne({ userId: user._id });
  
  const result = await db.collection('products').updateMany(
    { sellerId: { $exists: false } },
    { 
      $set: { 
        sellerId: store._id,
        sellerUserId: user._id
      } 
    }
  );
  
  console.log(`Updated ${result.modifiedCount} orphaned products to belong to store ${store._id}`);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
