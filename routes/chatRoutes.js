const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  getConversations,
  getMessages,
  createMessage,
  getOrCreateConversation,
  createGroupConversation,
  getAllUsers,
  deleteConversation,
  markMessagesAsRead
} = require('../controllers/chatController');

// All routes require authentication
router.use(authMiddleware);

// Get all conversations for current user
router.get('/conversations', getConversations);

// Get messages for a specific conversation
router.get('/conversations/:conversationId/messages', getMessages);

// Create a new message
router.post('/messages', createMessage);

// Get or create 1-to-1 conversation with a user
router.get('/or-create/:userId', getOrCreateConversation);

// Create a group conversation
router.post('/group-conversation', createGroupConversation);

// Get all users (for chat selection)
router.get('/users', getAllUsers);

// Delete a conversation
router.delete('/conversations/:conversationId', deleteConversation);

// Mark messages as read
router.put('/messages/:conversationId/mark-read', markMessagesAsRead);

module.exports = router;
