import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

async function testMongoConnection() {
  console.log('🔄 Testing MongoDB Atlas connection...');
  
  const uri = process.env.MONGODB_ATLAS_URI;
  
  if (!uri) {
    console.error('❌ MONGODB_ATLAS_URI not found in .env');
    return;
  }

  console.log('📡 Connecting to TestCluster...');

  try {
    const client = new MongoClient(uri);
    
    console.log('🔌 Connecting to MongoDB Atlas...');
    await client.connect();
    
    console.log('✅ Connected successfully!');
    
    // Test ping
    await client.db('admin').command({ ping: 1 });
    console.log('🏓 Ping successful!');
    
    // List databases
    const adminDb = client.db('admin');
    const dbList = await adminDb.admin().listDatabases();
    console.log('🗄️ Available databases:');
    dbList.databases.forEach(db => {
      console.log(`   - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    });
    
    await client.close();
    console.log('🔌 Connection closed successfully');
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:');
    console.error('   Error:', error.message);
    
    if (error.message.includes('authentication failed')) {
      console.log('🔑 Authentication failed - check username/password');
    } else if (error.message.includes('network')) {
      console.log('🌐 Network error - check IP whitelist in MongoDB Atlas');
    } else if (error.message.includes('ENOTFOUND')) {
      console.log('🌍 DNS resolution failed - check cluster URL');
    }
  }
}

testMongoConnection();