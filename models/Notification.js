const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Who the notification is for
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Notification type
  type: {
    type: String,
    enum: [
      'message',           // Chat message
      'assignment',        // Assignment shared
      'quiz',             // Quiz shared
      'material',         // Material/resource shared
      'submission',       // Student submitted work
      'grade',            // Grade received
      'comment',          // Comment on submission
      'system'            // System notification
    ],
    required: true
  },
  
  // Related resource
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: function() { return this.relatedType; }
  },
  
  relatedType: {
    type: String,
    enum: ['Conversation', 'Assignment', 'Quiz', 'Submission', 'User', 'FileResource', 'Message']
  },
  
  // User who triggered the notification
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Title and message
  title: {
    type: String,
    required: true
  },
  
  message: {
    type: String
  },
  
  // Status
  isRead: {
    type: Boolean,
    default: false
  },
  
  readAt: {
    type: Date
  },
  
  // Metadata
  metadata: {
    assignmentTitle: String,
    quizTitle: String,
    studentName: String,
    senderName: String,
    programName: String
  },
  
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, { timestamps: true });

// Index for faster queries
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
