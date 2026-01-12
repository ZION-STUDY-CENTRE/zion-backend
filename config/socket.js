const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

// Store active users
const activeUsers = new Map();

function initializeSocket(server) {
  const io = socketIO(server, {
    cors: {
      origin: [
        'http://localhost:5173',
        'https://zionstudycentrewebsiteui.vercel.app',
        process.env.FRONTEND_URL || ''
      ],
      credentials: true
    }
  });

  // Middleware to authenticate socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      socket.userId = decoded.id;
      socket.userEmail = decoded.email;
      socket.userName = decoded.name;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.userName} (${socket.userId})`);
    
    // Track active users
    activeUsers.set(socket.userId.toString(), {
      socketId: socket.id,
      name: socket.userName,
      email: socket.userEmail,
      status: 'online'
    });

    // Broadcast user online status
    io.emit('user:online', {
      userId: socket.userId,
      userName: socket.userName,
      status: 'online'
    });

    // User joins their notification room
    socket.join(`user:${socket.userId}`);

    // Join conversation rooms
    socket.on('conversation:join', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
      console.log(`👤 User ${socket.userName} joined conversation ${conversationId}`);
      
      // Notify others in conversation
      socket.to(`conversation:${conversationId}`).emit('user:typing-stop', {
        userId: socket.userId,
        userName: socket.userName
      });
    });

    socket.on('conversation:leave', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
      console.log(`👤 User ${socket.userName} left conversation ${conversationId}`);
    });

    // Handle new messages
    socket.on('message:send', async (data) => {
      try {
        const { conversationId, text, fileUrl, fileName } = data;
        
        console.log(`💬 Message from ${socket.userName} in conversation ${conversationId}`);

        // Broadcast message to all users in conversation
        io.to(`conversation:${conversationId}`).emit('message:new', {
          conversationId,
          sender: {
            _id: socket.userId,
            name: socket.userName,
            email: socket.userEmail
          },
          text,
          fileUrl,
          fileName,
          createdAt: new Date(),
          status: 'sent'
        });

        // Also notify the user who sent it
        socket.emit('message:sent', {
          conversationId,
          status: 'sent'
        });

      } catch (error) {
        socket.emit('message:error', { error: error.message });
      }
    });

    // Handle typing indicator
    socket.on('user:typing', (conversationId) => {
      socket.to(`conversation:${conversationId}`).emit('user:typing', {
        userId: socket.userId,
        userName: socket.userName
      });
    });

    socket.on('user:typing-stop', (conversationId) => {
      socket.to(`conversation:${conversationId}`).emit('user:typing-stop', {
        userId: socket.userId
      });
    });

    // Handle message read receipt
    socket.on('message:read', (conversationId) => {
      socket.to(`conversation:${conversationId}`).emit('message:read', {
        userId: socket.userId,
        conversationId
      });
    });

    // Handle notifications
    socket.on('notification:send', (data) => {
      const { recipientId, type, title, message, data: notificationData } = data;
      
      console.log(`🔔 Notification from ${socket.userName} to ${recipientId}`);

      io.to(`user:${recipientId}`).emit('notification:new', {
        from: {
          userId: socket.userId,
          name: socket.userName
        },
        type,
        title,
        message,
        data: notificationData,
        createdAt: new Date()
      });
    });

    // Handle broadcast notifications (for admins/instructors)
    socket.on('notification:broadcast', (data) => {
      const { type, title, message, notificationData } = data;
      
      console.log(`📢 Broadcast notification from ${socket.userName}`);

      io.emit('notification:broadcast', {
        from: {
          userId: socket.userId,
          name: socket.userName
        },
        type,
        title,
        message,
        data: notificationData,
        createdAt: new Date()
      });
    });

    // Handle user disconnect
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.userName}`);
      
      activeUsers.delete(socket.userId.toString());

      // Broadcast user offline status
      io.emit('user:offline', {
        userId: socket.userId,
        userName: socket.userName,
        status: 'offline'
      });
    });

    // Get active users
    socket.on('users:active', () => {
      socket.emit('users:active', Array.from(activeUsers.values()));
    });
  });

  return io;
}

module.exports = { initializeSocket, activeUsers };
