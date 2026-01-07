const cron = require('node-cron');
const User = require('../models/User');

const startAutomation = () => {
  // Schedule a task to run every day at midnight (00:00)
  cron.schedule('0 0 * * *', async () => {
    console.log('Running daily automation: Checking for expired student accounts...');
    
    try {
      const currentDate = new Date();
      const students = await User.find({ role: 'student' });
      let deletedCount = 0;

      for (const student of students) {
        if (!student.enrollmentDate) continue; // Skip if no enrollment date

        // Use student's specific programDuration (defaults to 3 if missing)
        const duration = student.programDuration || 3;
        
        const enrollment = new Date(student.enrollmentDate);
        let expiryDate = new Date(enrollment);

        // Calculate Expiry: Support fractional months for testing
        // 1. Add whole months using calendar logic
        const wholeMonths = Math.floor(duration);
        expiryDate.setMonth(expiryDate.getMonth() + wholeMonths);

        // 2. Add remaining fraction as milliseconds (Approx 30 days per month standard for fractions)
        // 1 Month = 30 * 24 * 60 * 60 * 1000 = 2,592,000,000 ms
        const fractionalMonths = duration - wholeMonths;
        if (fractionalMonths > 0) {
            const fractionalMs = fractionalMonths * 2592000000;
            expiryDate = new Date(expiryDate.getTime() + fractionalMs);
        }

        // Retention Policy: Delete 3 months AFTER expiry
        const deletionThreshold = new Date(expiryDate);
        deletionThreshold.setMonth(deletionThreshold.getMonth() + 3);

        if (currentDate > deletionThreshold) {
          console.log(`Deleting expired user (inactive > 3 months): ${student.email}`);
          await User.findByIdAndDelete(student._id);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        console.log(`Automation Complete: Deleted ${deletedCount} expired student user(s).`);
      } else {
        console.log('Automation Complete: No expired users found.');
      }

    } catch (err) {
      console.error('Automation Error:', err);
    }
  });

  console.log('Automation System: Started (Job scheduled for daily 00:00)');
};

module.exports = startAutomation;
