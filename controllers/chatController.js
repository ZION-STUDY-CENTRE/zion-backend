const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { getIO } = require('../config/ioInstance');
const { createNotification } = require('./notificationController');

// Get all conversations for a user
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(400).json({ error: 'User not authenticated properly' });
    }
    
    const conversations = await Conversation.find({ participants: userId })
      .populate('participants', '_id name email role')
      .populate('lastMessage')
      .sort({ lastMessageAt: -1 })
      .lean();

    // Trim participant names to remove extra whitespace
    const cleanedConversations = conversations.map(conv => ({
      ...conv,
      participants: conv.participants.map(p => ({
        ...p,
        name: p.name ? p.name.trim() : p.name
      }))
    }));

    res.json(cleanedConversations);
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

    // Create database notifications for other participants
    for (const participantId of conversation.participants) {
      const participantIdStr = participantId.toString();
      const senderIdStr = userId.toString();
      
      if (participantIdStr !== senderIdStr) {
        await createNotification(
          participantId,
          'message',
          `Message from ${message.sender.name}`,
          message.text || 'File shared',
          {},
          userId,
          message._id,
          'Message'
        );
      }
    }

    // Emit notification to other participants via Socket.io
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

    // If current user is instructor, verify they can only chat with students in their program
    const currentUser = await User.findById(currentUserId);
    if (currentUser?.role === 'instructor') {
      if (otherUser.role !== 'student' || otherUser.program?.toString() !== currentUser.program?.toString()) {
        return res.status(403).json({ error: 'You can only chat with students in your program' });
      }
    }

    // Find or create conversation
    let conversation = await Conversation.findOne({
      isGroup: false,
      participants: { $all: [currentUserId, userId] }
    }).populate('participants', '_id name email role');

    if (!conversation) {
      conversation = new Conversation({
        isGroup: false,
        participants: [currentUserId, userId],
        createdBy: currentUserId
      });
      await conversation.save();
      await conversation.populate('participants', '_id name email role');
    }

    // Trim participant names and ensure _id is included
    const conversationObj = conversation.toObject ? conversation.toObject() : conversation;
    const cleanedConversation = {
      ...conversationObj,
      participants: conversation.participants.map(p => {
        const participant = p.toObject ? p.toObject() : p;
        return {
          _id: participant._id,
          name: p.name ? p.name.trim() : p.name,
          email: participant.email,
          role: participant.role
        };
      })
    };

    console.log('[DEBUG] getOrCreateConversation response:', JSON.stringify(cleanedConversation, null, 2));
    res.json(cleanedConversation);
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
    const userRole = req.user?.role;
    
    console.log(`[Chat Users] Fetching for user ${userId} with role ${userRole}`);
    
    if (!userId) {
      return res.status(400).json({ error: 'User not authenticated properly' });
    }
    
    let query = { _id: { $ne: userId } };
    
    // If user is an instructor, only show their students
    if (userRole === 'instructor') {
      const instructor = await User.findById(userId).select('program name');
      console.log(`[Chat Users] Instructor data:`, {
        id: userId,
        name: instructor?.name,
        program: instructor?.program,
        hasProgram: !!instructor?.program
      });
      
      if (!instructor?.program) {
        // Instructor has no program assigned, show diagnostic info
        console.log(`[Chat Users] ⚠️ Instructor ${instructor?.name} has no program assigned`);
        console.log(`[Chat Users] Available programs:`);
        
        const programs = await User.find({ role: 'student' })
          .distinct('program');
        
        console.log(`[Chat Users] Programs with students: ${programs.length}`);
        programs.forEach(p => console.log(`  - ${p}`));
        
        return res.json([]);
      }
      
      query = {
        _id: { $ne: userId },
        program: instructor.program,
        role: 'student'
      };
      
      console.log(`[Chat Users] Query for instructor: program=${instructor.program}, role=student`);
    } else if (userRole === 'student') {
      // Students can chat with their instructors and other students in same program
      const student = await User.findById(userId).select('program name');
      console.log(`[Chat Users] Student ${student?.name} program:`, student?.program);
      
      if (student?.program) {
        query = {
          $or: [
            { program: student.program, role: { $in: ['student', 'instructor'] } },
            { role: 'admin' }
          ],
          _id: { $ne: userId }
        };
        console.log(`[Chat Users] Query for student: showing instructors and students in program`);
      }
    }
    // Admin and media-manager can see everyone
    
    const users = await User.find(query)
      .select('_id name email role program')
      .lean();

    // Trim names to remove extra whitespace
    const cleanedUsers = users.map(u => ({
      ...u,
      name: u.name ? u.name.trim() : u.name
    }));

    console.log(`[Chat Users] Found ${cleanedUsers.length} users`);
    if (cleanedUsers.length > 0) {
      console.log(`[Chat Users] Users: ${cleanedUsers.map(u => `${u.name} (${u.role})`).join(', ')}`);
    }
    
    res.json(cleanedUsers);
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

// Mark messages as read
exports.markMessagesAsRead = async (req, res) => {
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
    
    const userIdString = userId.toString();
    const isParticipant = conversation.participants.some(p => p.toString() === userIdString);
    if (!isParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Mark all messages in conversation from other senders as read
    const result = await Message.updateMany(
      {
        conversationId,
        sender: { $ne: userId },
        status: { $ne: 'read' }
      },
      {
        $set: { 
          status: 'read',
          readAt: new Date()
        },
        $addToSet: {
          readBy: {
            user: userId,
            readAt: new Date()
          }
        }
      }
    );

    // Emit read receipt to other participants via Socket.io
    const io = getIO();
    if (io) {
      const room = `conversation:${conversationId}`;
      io.to(room).emit('messages:read', {
        conversationId,
        readBy: userId,
        timestamp: new Date()
      });
    }

    res.json({ 
      message: 'Messages marked as read',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error in markMessagesAsRead:', error);
    res.status(500).json({ error: error.message });
  }
};
