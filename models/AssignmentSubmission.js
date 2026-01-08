const mongoose = require('mongoose');

const AssignmentSubmissionSchema = new mongoose.Schema({
  assignment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  submissionText: {
    type: String,
    default: ''
  },
  submissionFile: {
    type: String,
    default: ''
  },
  fileName: {
    type: String,
    default: ''
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  isLate: {
    type: Boolean,
    default: false
  },
  feedback: {
    type: String,
    default: ''
  },
  grade: {
    type: Number,
    default: null
  },
  maxGrade: {
    type: Number,
    default: 100
  },
  status: {
    type: String,
    enum: ['submitted', 'graded', 'returned'],
    default: 'submitted'
  },
  gradedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('AssignmentSubmission', AssignmentSubmissionSchema);
