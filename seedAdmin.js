const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected...');

    // Check if admin exists
    const adminExists = await User.findOne({ email: 'admin@zion.com' });
    if (adminExists) {
      console.log('Admin user already exists');
      process.exit();
    }

    // Create Admin
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    const adminUser = new User({
      name: 'Super Admin',
      email: 'admin@zion.com',
      password: hashedPassword,
      role: 'admin',
      isFirstLogin: false
    });

    await adminUser.save();
    console.log('Admin User Created Successfully');
    console.log('Email: admin@zion.com');
    console.log('Password: admin123');
    
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

createAdmin();
