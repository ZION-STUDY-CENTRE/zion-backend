const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

const dns = require('dns');

// Fix for ESERVFAIL
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (error) {
  // ignore
}

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const fixIndexes = async () => {
  try {
    console.log('Connecting to MongoDB to fix indexes...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected.');

    const collection = mongoose.connection.collection('programs');
    
    // Check if index exists
    const indexes = await collection.indexes();
    const codeIndex = indexes.find(idx => idx.name === 'code_1');

    if (codeIndex) {
        console.log('Found problematic index "code_1". Dropping it...');
        await collection.dropIndex('code_1');
        console.log('SUCCESS: Index "code_1" dropped. You can now create programs without code.');
    } else {
        console.log('Index "code_1" not found. No action needed.');
    }

  } catch (error) {
    // If error is "index not found", that's fine too
    if (error.codeName === 'IndexNotFound') {
        console.log('Index "code_1" was not found (all good).');
    } else {
        console.error('Error fixing indexes:', error);
    }
  }

  try {
    await mongoose.connection.close();
    process.exit(0);
  } catch (e) {
    process.exit(0);
  }
};

fixIndexes();
