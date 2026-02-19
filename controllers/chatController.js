const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { getIO } = require('../config/ioInstance');
const { createNotification } = require('./notificationController');
const { sendPushNotifications } = require('../utils/notificationService');

// Get all conversations for a user
exports.getConversations = async(req, res) => {
    try {
        const userId = `${req.user?._id}`;
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
exports.getMessages = async(req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = `${req.user?._id}`;
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
exports.createMessage = async(req, res) => {
    try {
        const { conversationId, text, fileUrl, fileName } = req.body;
        const userId = `${req.user?._id}`;
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
        const recipientIds = [];
        for (const participantId of conversation.participants) {
            const participantIdStr = participantId.toString();
            const senderIdStr = userId.toString();

            if (participantIdStr !== senderIdStr) {
                recipientIds.push(participantId);
                await createNotification(
                    participantId,
                    'message',
                    `Message from ${message.sender.name}`,
                    message.text || 'File shared', {},
                    userId,
                    message._id,
                    'Message'
                );
            }
        }

        // Send Push Notifications
        try {
            const recipients = await User.find({
                _id: { $in: recipientIds },
                expoPushToken: { $ne: null }
            });

            const pushTokens = recipients.map(u => u.expoPushToken);
            if (pushTokens.length > 0) {
                await sendPushNotifications(
                    pushTokens,
                    `New Message from ${message.sender.name}`,
                    message.text ? message.text.substring(0, 50) + (message.text.length > 50 ? '...' : '') : 'Sent a file', { conversationId: conversationId }
                );
            }
        } catch (pushError) {
            console.error("Failed to send push notifications:", pushError);
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
exports.getOrCreateConversation = async(req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = `${req.user?._id}`;

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
        if (`${currentUser?.role}` === 'instructor') {
            if (otherUser.role !== 'student' || `${otherUser.program?.toString()}` !== `${currentUser.program?.toString()}`) {
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
exports.createGroupConversation = async(req, res) => {
    try {
        const { name, participantIds } = req.body;
        const userId = `${req.user?._id}`;
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
exports.getAllUsers = async(req, res) => {
        // DEBUG: Confirm endpoint is hit and log user
        console.log('[Chat Users][DEBUG] getAllUsers called');
        console.log('[Chat Users][DEBUG] req.user:', req.user);
        try {
            const userId = `${req.user?._id}`;
            const userRole = `${req.user?.role}`;

            console.log(`[Chat Users] Fetching for user ${userId} with role ${userRole}`);

            if (!userId) {
                return res.status(400).json({ error: 'User not authenticated properly' });
            }

            let query = { _id: { $ne: userId } };

            // If user is an instructor, only show their students
            if (userRole === 'instructor') {
                console.log('[Chat Users][DEBUG] Instructor branch entered.');
                const Program = require('../models/Program');
                // Find all programs where this instructor is listed
                const programs = await Program.find({ instructors: userId }).select('_id title');
                const programIds = programs.map(p => p._id);
                console.log(`[Chat Users] Instructor ${userId} is in programs:`, programIds, programs.map(p => p.title));

                if (!programIds.length) {
                    // Instructor has no program assigned: only show admins
                    query = {
                        _id: { $ne: userId },
                        role: 'admin'
                    };
                    console.log(`[Chat Users] Instructor has no program. Only showing admins.`);
                } else {
                    // Instructor has one or more programs: show students in those programs, instructors in those programs, and all admins
                    // 1. Find all students in those programs (User.program in programIds, role: student)
                    // 2. Find all instructors whose _id is in the instructors array of those programs (excluding self)
                    // 3. Find all admins

                    // Find all instructor IDs in these programs (excluding self)
                    const allPrograms = await Program.find({ _id: { $in: programIds } }).select('instructors title');
                    const instructorIds = Array.from(new Set(allPrograms.flatMap(p => p.instructors.map(id => id.toString())).filter(id => id !== userId)));

                    query = {
                        _id: { $ne: userId },
                        $or: [
                            { program: { $in: programIds }, role: 'student' },
                            { _id: { $in: instructorIds }, role: 'instructor' },
                            { role: 'admin' }
                        ]
                    };

                    // Debug: Log all users in these roles
                    const studentsInProgram = await User.find({ program: { $in: programIds }, role: 'student' }).select('_id name email role program').lean();
                    const instructorsInProgram = await User.find({ _id: { $in: instructorIds }, role: 'instructor' }).select('_id name email role program').lean();
                    const admins = await User.find({ role: 'admin' }).select('_id name email role program').lean();

                    console.log(`[Chat Users][DEBUG] Students in programs ${programIds}:`, studentsInProgram);
                    console.log(`[Chat Users][DEBUG] Instructors in programs ${programIds}:`, instructorsInProgram);
                    console.log(`[Chat Users][DEBUG] Admins:`, admins);
                    console.log(`[Chat Users] Query for instructor: programs=${programIds}, students in program, instructors in instructors array, OR admin`);
                }
            } else if (userRole === 'student') {
                console.log('[Chat Users][DEBUG] Student branch entered.');
                // If neither, log the role for debugging
                if (userRole !== 'instructor' && userRole !== 'student') {
                    console.log(`[Chat Users][DEBUG] Unhandled user role: ${userRole}`);
                }
                // Students can chat with their instructors and other students in same program
                const student = await User.findById(userId).select('program name');
                console.log(`[Chat Users] Student ${student?.name} program:`, `${student?.program}`);

                if (`${student?.program}`) {
                    // Find instructors for this program from the Program collection
                    const Program = require('../models/Program');
                    const programDoc = await Program.findById(student.program).select('instructors title');
                    const instructorIds = programDoc ? programDoc.instructors.map(id => id.toString()) : [];

                    query = {
                        _id: { $ne: userId },
                        $or: [
                            { _id: { $in: instructorIds }, role: 'instructor' },
                            { program: student.program, role: 'student' },
                            { role: 'admin' }
                        ]
                    };
                    // Debug: Log all users in these roles
                    const instructorsInProgram = await User.find({ _id: { $in: instructorIds }, role: 'instructor' }).select('_id name email role program').lean();
                    const studentsInProgram = await User.find({ program: student.program, role: 'student' }).select('_id name email role program').lean();
                    const admins = await User.find({ role: 'admin' }).select('_id name email role program').lean();

                    console.log(`[Chat Users][DEBUG] Instructors in program ${student.program}:`, instructorsInProgram);
                    console.log(`[Chat Users][DEBUG] Students in program ${student.program}:`, studentsInProgram);
                    console.log(`[Chat Users][DEBUG] Admins:`, admins);
                    console.log(`[Chat Users] Query for student: program=${student.program}, instructors from program.instructors, students in program, OR admin`);
                } else {
                    // If student has no program, restrict to just admins
                    query = {
                        _id: { $ne: userId },
                        role: 'admin'
                    };
                    console.log(`[Chat Users] Student has no program. Only showing admins.`);
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