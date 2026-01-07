const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'instructor', 'student', 'media-manager'],
    default: 'student'
  },
  // For Students & Instructors (optional for Admin)
  program: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Program'
  },
  // Student Specific Fields
  enrollmentDate: {
    type: Date,
    default: Date.now
  },
  programDuration: {
    type: Number, // In Months
    default: 3 
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Security
  isFirstLogin: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', UserSchema);
