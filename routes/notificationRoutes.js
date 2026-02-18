const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    sendTestPush
} = require('../controllers/notificationController');

// All routes require authentication
router.use(authMiddleware);

// Get unread notification count - MUST come before /:notificationId routes
router.get('/unread/count', getUnreadCount);

// Get all notifications for current user
router.get('/', getNotifications);

// Send direct test push to current user's saved token
router.post('/test/push', sendTestPush);

// Mark all notifications as read - MUST come before /:notificationId routes
router.put('/all/read', markAllAsRead);

// Clear all notifications - MUST come before /:notificationId routes
router.delete('/all/clear', clearAllNotifications);

// Mark notification as read
router.put('/:notificationId/read', markAsRead);

// Delete a notification
router.delete('/:notificationId', deleteNotification);

module.exports = router;