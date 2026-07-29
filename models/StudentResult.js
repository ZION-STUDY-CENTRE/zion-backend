const mongoose = require("mongoose");

const StudentResultSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  program: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Program",
    required: true,
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  academicYear: {
    type: String,
    required: true,
  },
  term: {
    type: String,
    default: "Current Term",
  },
  assignmentAverage: {
    type: Number,
    default: 0,
  },
  quizAverage: {
    type: Number,
    default: 0,
  },
  projectAverage: {
    type: Number,
    default: 0,
  },
  overallScore: {
    type: Number,
    default: 0,
  },
  cgpa: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ["Passed", "Failed", "Pending"],
    default: "Pending",
  },
  remarks: {
    type: String,
    default: "",
  },
  generatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("StudentResult", StudentResultSchema);
