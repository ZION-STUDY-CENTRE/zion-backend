// Script to migrate existing students to the new programs array
// Run this with: node migrate_students_programs.js

const mongoose = require('mongoose');
const User = require('./models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://admin:Awesome360@cluster0.aouv82q.mongodb.net/?appName=Cluster0';

async function migrate() {
    await mongoose.connect(MONGO_URI);
    const students = await User.find({ role: 'student', program: { $exists: true, $ne: null } });
    let updated = 0;
    for (const student of students) {
        // Only migrate if not already migrated
        if (!student.programs || student.programs.length === 0) {
            student.programs = [{
                program: student.program,
                duration: student.programDuration || 3,
                enrollmentDate: student.enrollmentDate || student.createdAt || new Date()
            }];
            await student.save();
            updated++;
        }
    }
    console.log(`Migrated ${updated} students to programs array.`);
    await mongoose.disconnect();
}

migrate().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});