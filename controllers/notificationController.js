const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendPushNotifications } = require('../utils/notificationService');

// Get all notifications for a user
exports.getNotifications = async(req, res) => {
    try {
        const userId = `${req.user?._id}`;
        console.log('[NotificationController] 📋 getNotifications - userId:', userId);

        if (!userId) {
            console.log('[NotificationController] ❌ User not authenticated');
            return res.status(400).json({ error: 'User not authenticated' });
        }

        const notifications = await Notification.find({ recipient: userId })
            .populate('sender', 'name email role')
            .sort({ createdAt: -1 })
            .limit(50);

        console.log('[NotificationController] ✅ Found', notifications.length, 'notifications for user:', userId);
        res.json(notifications);
    } catch (error) {
        console.error('[NotificationController] ❌ Error fetching notifications:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get unread notification count
exports.getUnreadCount = async(req, res) => {
    try {
        const userId = `${req.user?._id}`;
        console.log('[NotificationController] 🔢 getUnreadCount - userId:', userId);

        if (!userId) {
            console.log('[NotificationController] ❌ User not authenticated');
            return res.status(400).json({ error: 'User not authenticated' });
        }

        const count = await Notification.countDocuments({
            recipient: userId,
            isRead: false
        });

        console.log('[NotificationController] ✅ Unread count:', count, 'for user:', userId);
        res.json({ unreadCount: count });
    } catch (error) {
        console.error('[NotificationController] ❌ Error fetching unread count:', error);
        res.status(500).json({ error: error.message });
    }
};

// Mark notification as read
exports.markAsRead = async(req, res) => {
    try {
        const { notificationId } = req.params;
        const userId = `${req.user?._id}`;

        const notification = await Notification.findById(notificationId);
        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        if (notification.recipient.toString() !== userId.toString()) {
            return res.status(403).json({ error: 'Access denied' });
        }

        notification.isRead = true;
        notification.readAt = new Date();
        await notification.save();

        res.json(notification);
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: error.message });
    }
};

// Mark all notifications as read
exports.markAllAsRead = async(req, res) => {
    try {
        const userId = `${req.user?._id}`;
        if (!userId) {
            return res.status(400).json({ error: 'User not authenticated' });
        }

        await Notification.updateMany({ recipient: userId, isRead: false }, { isRead: true, readAt: new Date() });

        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Error marking all as read:', error);
        res.status(500).json({ error: error.message });
    }
};

// Create a notification (internal function)
exports.createNotification = async(recipientId, type, title, message, metadata = {}, senderId = null, relatedId = null, relatedType = null) => {
    try {
        const notification = await Notification.create({
            recipient: recipientId,
            type,
            title,
            message,
            metadata,
            sender: senderId,
            relatedId,
            relatedType,
            isRead: false
        });

        await notification.populate('sender', 'name email role');
        return notification;
    } catch (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
};

// Delete a notification
exports.deleteNotification = async(req, res) => {
    try {
        const { notificationId } = req.params;
        const userId = `${req.user?._id}`;

        const notification = await Notification.findById(notificationId);
        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        if (notification.recipient.toString() !== userId.toString()) {
            return res.status(403).json({ error: 'Access denied' });
        }

        await Notification.deleteOne({ _id: notificationId });
        res.json({ message: 'Notification deleted' });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ error: error.message });
    }
};

// Clear all notifications
exports.clearAllNotifications = async(req, res) => {
    try {
        const userId = `${req.user?._id}`;
        if (!userId) {
            return res.status(400).json({ error: 'User not authenticated' });
        }

        await Notification.deleteMany({ recipient: userId });
        res.json({ message: 'All notifications cleared' });
    } catch (error) {
        console.error('Error clearing notifications:', error);
        res.status(500).json({ error: error.message });
    }
};

// Send a direct test push to the current user's saved Expo token
exports.sendTestPush = async(req, res) => {
    try {
        const userId = `${req.user?._id}` || `${req.user?.id}`;
        if (!userId) {
            return res.status(400).json({ error: 'User not authenticated' });
        }

        const user = await User.findById(userId).select('email expoPushToken');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!user.expoPushToken) {
            return res.status(400).json({
                error: 'No saved Expo push token for this user',
                hint: 'Login again from the mobile app to register your push token',
            });
        }

        const { title, body, data } = req.body || {};
        const pushTitle = title || 'Push Test';
        const pushBody = body || 'If you can see this, push notifications are working ✅';
        const pushData = data || { source: 'manual-test', timestamp: new Date().toISOString() };

        const result = await sendPushNotifications([user.expoPushToken], pushTitle, pushBody, pushData);

        const tickets = Array.isArray(`${result?.tickets}`) ? result.tickets : [];
        const hasTicketError = tickets.some((ticket) => `${ticket?.status}` !== 'ok');

        if (hasTicketError) {
            return res.status(502).json({
                error: 'Push provider rejected request',
                email: user.email,
                token: user.expoPushToken,
                result,
            });
        }

        res.json({
            message: 'Test push request sent',
            email: user.email,
            token: user.expoPushToken,
            result,
        });
    } catch (error) {
        console.error('[NotificationController] ❌ Error sending test push:', error);
        res.status(500).json({ error: error.message });
    }
};