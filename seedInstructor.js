const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const createInstructor = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected...');

    // Check if instructor exists
    const instructorExists = await User.findOne({ email: 'instructor@zion.com' });
    if (instructorExists) {
      console.log('Instructor user already exists');
      console.log('Email: instructor@zion.com');
      console.log('Password: instructor123');
      process.exit();
    }

    // Create Instructor
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('instructor123', salt);

    const instructorUser = new User({
      name: 'Test Instructor',
      email: 'instructor@zion.com',
      password: hashedPassword,
      role: 'instructor',
      isFirstLogin: false
    });

    await instructorUser.save();
    console.log('Instructor User Created Successfully');
    console.log('Email: instructor@zion.com');
    console.log('Password: instructor123');
    console.log('\nYou can now login as instructor to create assignments and quizzes!');
    
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

createInstructor();
