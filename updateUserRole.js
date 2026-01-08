const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const updateUserRole = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected...');

    // Get email from command line argument or use default
    const email = process.argv[2] || 'admin@zion.com';
    const newRole = process.argv[3] || 'instructor';

    console.log(`\nLooking for user with email: ${email}`);

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found!');
      console.log('Usage: node updateUserRole.js <email> <role>');
      console.log('Example: node updateUserRole.js student@example.com instructor');
      process.exit(1);
    }

    console.log(`Found user: ${user.name}`);
    console.log(`Current role: ${user.role}`);

    // Update role
    user.role = newRole;
    await user.save();

    console.log(`Updated role to: ${newRole}`);
    console.log('\nUser can now login and use instructor features!');
    
    process.exit();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

updateUserRole();
