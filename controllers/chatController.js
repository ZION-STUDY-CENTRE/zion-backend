const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const { getIO } = require('../config/ioInstance');

// Get all conversations for a user
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(400).json({ error: 'User not authenticated properly' });
    }
    
    const conversations = await Conversation.find({ participants: userId })
      .populate('participants', 'name email')
      .populate('lastMessage')
      .sort({ lastMessageAt: -1 })
      .lean();

    res.json(conversations);
  } catch (error) {
    console.error('Error in getConversations:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get messages for a specific conversation
exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user?._id;
    if (!userId) {
      return res.status(400).json({ error: 'User not authenticated properly' });
    }

    // Verify user is participant
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Check if user is a participant (handle both ObjectId and string comparisons)
    const userIdString = userId.toString();
    const isParticipant = conversation.participants.some(p => p.toString() === userIdString);
    if (!isParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const messages = await Message.find({ conversationId })
      .populate('sender', 'name email')
      .sort({ createdAt: 1 })
      .lean();

    // Mark as read (optional - only if readBy exists)
    try {
      await Conversation.findByIdAndUpdate(conversationId, {
        $set: { 'readBy.$[elem].readAt': new Date() }
      }, {
        arrayFilters: [{ 'elem.user': userId }],
        new: true
      });
    } catch (readError) {
      console.warn('Warning marking message as read:', readError);
    }

    res.json(messages);
  } catch (error) {
    console.error('Error in getMessages:', error);
    res.status(500).json({ error: error.message });
  }
};

// Create a new message
exports.createMessage = async (req, res) => {
  try {
    const { conversationId, text, fileUrl, fileName } = req.body;
    const userId = req.user?._id;
    if (!userId) {
      return res.status(400).json({ error: 'User not authenticated properly' });
    }

    // Verify user is participant
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Check if user is a participant (handle both ObjectId and string comparisons)
    const userIdString = userId.toString();
    const isParticipant = conversation.participants.some(p => p.toString() === userIdString);
    if (!isParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const message = await Message.create({
      conversationId,
      sender: userId,
      text,
      fileUrl,
      fileName
    });

    await message.populate('sender', 'name email');

    // Update conversation's last message
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      lastMessageAt: new Date()
    });

    // Emit notification to other participants
    const io = getIO();
    console.log('🔍 Attempting to send notifications...');
    console.log(`   - IO instance available: ${!!io}`);
    console.log(`   - Message ID: ${message._id}`);
    console.log(`   - Conversation ID: ${conversationId}`);
    console.log(`   - Participants: ${conversation.participants.map(p => p.toString()).join(', ')}`);
    console.log(`   - Sender ID: ${userIdString}`);
    
    if (io) {
      conversation.participants.forEach(participantId => {
        const participantIdStr = participantId.toString();
        const senderIdStr = userId.toString();
        
        // Send notification to all participants except sender
        if (participantIdStr !== senderIdStr) {
          console.log(`📢 Emitting to user:${participantIdStr}`);
          console.log(`   - Event: notification:message-sent`);
          console.log(`   - Data: ${JSON.stringify({
            conversationId,
            senderId: senderIdStr,
            senderName: message.sender.name,
            message: message.text || 'File shared'
          })}`);
          
          io.to(`user:${participantIdStr}`).emit('notification:message-sent', {
            conversationId,
            senderId: senderIdStr,
            senderName: message.sender.name,
            message: message.text || 'File shared',
            messageId: message._id,
            timestamp: new Date()
          });
        }
      });
    } else {
      console.error('❌ Socket.io instance is NULL!');
    }

    res.json(message);
  } catch (error) {
    console.error('Error in createMessage:', error);
    res.status(500).json({ error: error.message });
  }
};

// Create or get 1-to-1 conversation
exports.getOrCreateConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user?._id;

    console.log('[DEBUG] Received request - currentUserId:', currentUserId, 'userId:', userId);

    // Check if currentUserId exists
    if (!currentUserId) {
      console.error('[ERROR] currentUserId is undefined. req.user:', req.user);
      return res.status(400).json({ error: 'User not authenticated properly' });
    }

    // Validate ObjectId format
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    // Convert both to strings for comparison
    if (currentUserId.toString() === userId.toString()) {
      return res.status(400).json({ error: 'Cannot chat with yourself' });
    }

    // Verify the other user exists
    const otherUser = await User.findById(userId);
    if (!otherUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find or create conversation
    let conversation = await Conversation.findOne({
      isGroup: false,
      participants: { $all: [currentUserId, userId] }
    }).populate('participants', 'name email');

    if (!conversation) {
      conversation = new Conversation({
        isGroup: false,
        participants: [currentUserId, userId],
        createdBy: currentUserId
      });
      await conversation.save();
      await conversation.populate('participants', 'name email');
    }

    res.json(conversation);
  } catch (error) {
    console.error('[ERROR] getOrCreateConversation:', error.message);
    console.error('[ERROR] Stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
};

// Create group conversation
exports.createGroupConversation = async (req, res) => {
  try {
    const { name, participantIds } = req.body;
    const userId = req.user?._id;
    if (!userId) {
      return res.status(400).json({ error: 'User not authenticated properly' });
    }

    if (!name || !participantIds || participantIds.length < 2) {
      return res.status(400).json({ error: 'Invalid group data' });
    }

    const allParticipants = [...new Set([userId.toString(), ...participantIds])];

    const conversation = await Conversation.create({
      name,
      isGroup: true,
      participants: allParticipants,
      createdBy: userId,
      readBy: allParticipants.map(p => ({ user: p }))
    });

    await conversation.populate('participants', 'name email');

    res.json(conversation);
  } catch (error) {
    console.error('Error in createGroupConversation:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get all users for chat selection
exports.getAllUsers = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(400).json({ error: 'User not authenticated properly' });
    }
    
    const users = await User.find({ _id: { $ne: userId } })
      .select('_id name email role')
      .lean();

    res.json(users);
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete conversation
// Delete conversation
exports.deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user?._id;
    if (!userId) {
      return res.status(400).json({ error: 'User not authenticated properly' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Check if user is a participant (handle both ObjectId and string comparisons)
    const userIdString = userId.toString();
    const isParticipant = conversation.participants.some(p => p.toString() === userIdString);
    if (!isParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete all messages in conversation
    await Message.deleteMany({ conversationId });
    
    // Delete conversation
    await Conversation.findByIdAndDelete(conversationId);

    res.json({ message: 'Conversation deleted' });
  } catch (error) {
    console.error('Error in deleteConversation:', error);
    res.status(500).json({ error: error.message });
  }
};

