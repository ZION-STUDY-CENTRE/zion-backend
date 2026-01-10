const mongoose = require('mongoose');

const QuizSubmissionSchema = new mongoose.Schema({
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  answers: [{
    questionId: mongoose.Schema.Types.ObjectId,
    selectedOptionIndex: Number
  }],
  score: {
    type: Number,
    default: 0
  },
  totalMarks: {
    type: Number,
    default: 0
  },
  percentageScore: {
    type: Number,
    default: 0
  },
  passed: {
    type: Boolean,
    default: false
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  startedAt: Date,
  duration: Number, // actual duration in seconds
  reviewed: {
    type: Boolean,
    default: false
  },
  feedback: String
});

module.exports = mongoose.model('QuizSubmission', QuizSubmissionSchema);
