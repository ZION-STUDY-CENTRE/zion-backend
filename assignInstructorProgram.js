const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Program = require('./models/Program');

dotenv.config();

const assignInstructorProgram = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected...');

    // Find the test instructor
    const instructor = await User.findOne({ email: 'instructor@zion.com' });
    if (!instructor) {
      console.log('❌ Instructor not found (instructor@zion.com)');
      process.exit(1);
    }

    console.log('\n📌 Current Instructor:');
    console.log('  Name:', instructor.name);
    console.log('  Email:', instructor.email);
    console.log('  Current Program:', instructor.program || 'None assigned');

    // Get all programs
    const programs = await Program.find().lean();
    console.log('\n📚 Available Programs:', programs.length);
    programs.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name} (ID: ${p._id})`);
    });

    if (programs.length === 0) {
      console.log('❌ No programs found in database');
      process.exit(1);
    }

    // Assign to first program
    const targetProgram = programs[0];
    instructor.program = targetProgram._id;
    await instructor.save();
    console.log('\n✅ Instructor assigned to:', targetProgram.name);

    // Find students in this program
    const students = await User.find({ 
      role: 'student', 
      program: targetProgram._id 
    }).select('name email').lean();
    
    console.log(`\n👥 Students in ${targetProgram.name}:`, students.length);
    students.forEach(s => {
      console.log('  -', s.name, `(${s.email})`);
    });

    if (students.length === 0) {
      console.log('⚠️  Warning: No students in this program! Creating a test student...');
      
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('student123', salt);

      const testStudent = new User({
        name: 'Test Student',
        email: 'student@zion.com',
        password: hashedPassword,
        role: 'student',
        program: targetProgram._id,
        isFirstLogin: false
      });

      await testStudent.save();
      console.log('✅ Test student created:');
      console.log('  Email: student@zion.com');
      console.log('  Password: student123');
      console.log('  Program:', targetProgram.name);
    }

    console.log('\n✅ Setup complete! Instructor can now chat with students in their program.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
};

assignInstructorProgram();
