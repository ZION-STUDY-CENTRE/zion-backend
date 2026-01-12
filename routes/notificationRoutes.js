const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications
} = require('../controllers/notificationController');

// All routes require authentication
router.use(authMiddleware);

// Get all notifications for current user
router.get('/', getNotifications);

// Get unread notification count
router.get('/unread/count', getUnreadCount);

// Mark notification as read
router.put('/:notificationId/read', markAsRead);

// Mark all notifications as read
router.put('/all/read', markAllAsRead);

// Delete a notification
router.delete('/:notificationId', deleteNotification);

// Clear all notifications
router.delete('/all/clear', clearAllNotifications);

module.exports = router;
