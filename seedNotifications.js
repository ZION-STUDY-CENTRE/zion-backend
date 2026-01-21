const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Notification = require('./models/Notification');

async function seedNotifications() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get all users
    const users = await User.find({});
    console.log(`📋 Found ${users.length} users`);

    if (users.length === 0) {
      console.log('❌ No users found. Please seed users first.');
      process.exit(1);
    }

    // Create test notifications for each user (3 notifications per user)
    const notificationTypes = ['message', 'assignment', 'quiz', 'submission', 'grade'];
    let createdCount = 0;

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const otherUser = users[(i + 1) % users.length]; // Get a different user as sender

      // Create 3 notifications per user
      for (let j = 0; j < 3; j++) {
        const type = notificationTypes[j % notificationTypes.length];
        
        const notification = new Notification({
          recipient: user._id,
          type: type,
          title: `Test ${type} notification ${j + 1}`,
          message: `This is a test ${type} notification for ${user.name}`,
          sender: otherUser._id,
          isRead: false,
          createdAt: new Date(Date.now() - (j * 3600000)) // Stagger by hour
        });

        await notification.save();
        createdCount++;
        console.log(`✅ Created notification for ${user.name}: ${type}`);
      }
    }

    console.log(`\n🎉 Successfully created ${createdCount} test notifications!`);
    console.log('📝 Notifications have been seeded for all users.');
    console.log('💡 You should now see notifications in the bell dropdown on the dashboard.');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding notifications:', error);
    process.exit(1);
  }
}

seedNotifications();
