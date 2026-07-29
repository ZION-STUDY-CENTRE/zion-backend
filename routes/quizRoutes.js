const express = require("express");
const router = express.Router();
const Quiz = require("../models/Quiz");
const QuizSubmission = require("../models/QuizSubmission");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { createNotification } = require("../controllers/notificationController");
const { getIO } = require("../config/ioInstance");
const { sendPushNotifications } = require("../utils/notificationService");

// Get all quizzes for a program
router.get("/program/:programId", authMiddleware, async (req, res) => {
  try {
    // Only show quizzes for programs the student is enrolled in
    let programMatch = { program: req.params.programId };
    if (req.user.role === "student") {
      programMatch = {
        $or: [
          { program: req.params.programId },
          { "programs.program": req.params.programId },
        ],
      };
    }
    const quizzes = await Quiz.find(programMatch)
      .populate("createdBy", "name email")
      .sort({ dueDate: -1 });
    res.json(quizzes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single quiz (without answers for students)
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate(
      "createdBy",
      "name email",
    );

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    // Check if user is instructor or admin
    const isInstructor =
      req.user.role === "instructor" || req.user.role === "admin";

    // For students, don't show correct answers in initial fetch
    if (!isInstructor && !quiz.showAnswers) {
      const quizCopy = quiz.toObject();
      quizCopy.questions = quizCopy.questions.map((q) => {
        const questionCopy = { ...q };
        questionCopy.options = questionCopy.options.map((o) => ({
          text: o.text,
        }));
        delete questionCopy.isCorrect;
        return questionCopy;
      });
      return res.json(quizCopy);
    }

    res.json(quiz);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create quiz (instructor only)
router.post(
  "/",
  authMiddleware,
  roleMiddleware("instructor", "admin"),
  async (req, res) => {
    const {
      title,
      description,
      program,
      dueDate,
      scheduledDate,
      duration,
      passingMarks,
      questions,
    } = req.body;

    try {
      // Get the full user object to access name
      const instructor = await User.findById(req.user.id);

      // Calculate total marks
      const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);

      const quiz = new Quiz({
        title,
        description,
        program,
        createdBy: req.user.id,
        questions: questions.map((q, index) => ({
          ...q,
          order: index,
        })),
        dueDate: new Date(dueDate),
        scheduledDate: new Date(scheduledDate) || new Date(),
        duration: duration || 60,
        totalMarks,
        passingMarks: passingMarks || totalMarks * 0.5,
        status: "published",
      });

      const savedQuiz = await quiz.save();
      const populated = await savedQuiz.populate("createdBy", "name email");

      // Get all students enrolled in this program
      const students = await User.find({
        role: "student",
        $or: [
          { "programs.program": program },
          { program: program }, // fallback for legacy
        ],
      });
      console.log(
        `[Quiz Notification] 📝 Created quiz "${title}" for ${students.length} students`,
      );

      // Create notifications for all enrolled students
      for (const student of students) {
        await createNotification(
          student._id,
          "quiz",
          `New Quiz: ${title}`,
          `Mr. ${instructor.name} created a new quiz: "${title}"`,
          {},
          req.user.id,
          savedQuiz._id,
          "Quiz",
        );
      }

      // Emit real-time notification via Socket.io
      const io = getIO();
      if (io) {
        students.forEach((student) => {
          io.to(`user:${student._id.toString()}`).emit(
            "notification:quiz-created",
            {
              quizId: savedQuiz._id,
              quizTitle: title,
              instructorName: `Mr. ${instructor.name}`,
              programId: program,
              dueDate: dueDate,
            },
          );
        });
      }

      // Send Push Notifications
      const pushTokens = students
        .filter((student) => student.expoPushToken)
        .map((student) => student.expoPushToken);

      if (pushTokens.length > 0) {
        sendPushNotifications(
          pushTokens,
          "New Quiz",
          `A new quiz "${title}" has been assigned.`,
        );
      }

      res.status(201).json(populated);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },
);

// Update quiz (instructor only)
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("instructor", "admin"),
  async (req, res) => {
    try {
      const quiz = await Quiz.findById(req.params.id);
      if (!quiz) {
        return res.status(404).json({ message: "Quiz not found" });
      }

      // allow anybody update making next line of comment no longer valid
      // Check if user is the creator or admin
      // if (quiz.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      //   return res.status(403).json({ message: 'Not authorized' });
      // }

      const {
        title,
        description,
        dueDate,
        scheduledDate,
        duration,
        passingMarks,
        questions,
        status,
      } = req.body;

      if (title) quiz.title = title;
      if (description) quiz.description = description;
      if (dueDate) quiz.dueDate = new Date(dueDate);
      if (scheduledDate) quiz.scheduledDate = new Date(scheduledDate);
      if (duration) quiz.duration = duration;
      if (passingMarks) quiz.passingMarks = passingMarks;
      if (questions) {
        quiz.questions = questions.map((q, index) => ({ ...q, order: index }));
        quiz.totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);
      }
      if (status) quiz.status = status;

      quiz.updatedAt = Date.now();
      const updated = await quiz.save();
      const populated = await updated.populate("createdBy", "name email");
      res.json(populated);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },
);

// Submit quiz answers (student)
router.post("/:id/submit", authMiddleware, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    const { answers, startedAt, duration } = req.body;

    // Calculate score
    let score = 0;
    answers.forEach((answer) => {
      const question = quiz.questions.find(
        (q) => q._id.toString() === answer.questionId,
      );
      if (
        `${question && question.options[answer.selectedOptionIndex]?.isCorrect}`
      ) {
        score += question.marks || 1;
      }
    });

    const totalMarks = quiz.totalMarks || 0;
    const percentageScore = totalMarks > 0 ? (score / totalMarks) * 100 : 0;
    const passThreshold =
      quiz.passingMarks > 0 && totalMarks > 0
        ? (quiz.passingMarks / totalMarks) * 100
        : 50;
    const passed = percentageScore >= passThreshold;

    const submission = new QuizSubmission({
      quiz: req.params.id,
      student: req.user.id,
      answers,
      score,
      totalMarks: quiz.totalMarks,
      percentageScore,
      passed,
      startedAt: new Date(startedAt),
      duration,
    });

    const saved = await submission.save();
    const populated = await saved.populate("quiz", "title totalMarks");
    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get student's quiz submission
router.get("/:id/submission", authMiddleware, async (req, res) => {
  try {
    const submission = await QuizSubmission.findOne({
      quiz: req.params.id,
      student: req.user.id,
    }).populate("quiz", "title totalMarks showAnswers");

    if (!submission) {
      return res.status(404).json({ message: "No submission found" });
    }

    res.json(submission);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all submissions for a quiz (instructor only)
router.get(
  "/:id/submissions",
  authMiddleware,
  roleMiddleware("instructor", "admin"),
  async (req, res) => {
    try {
      const submissions = await QuizSubmission.find({ quiz: req.params.id })
        .populate("student", "name email")
        .sort({ submittedAt: -1 });

      res.json(submissions);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
);

// Delete quiz
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("instructor", "admin"),
  async (req, res) => {
    try {
      const quiz = await Quiz.findById(req.params.id);
      if (!quiz) {
        return res.status(404).json({ message: "Quiz not found" });
      }

      // allow anybody delete making next line of comment no longer valid
      // if (quiz.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      //     return res.status(403).json({ message: 'Not authorized' });
      // }

      await Quiz.findByIdAndDelete(req.params.id);
      res.json({ message: "Quiz deleted" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
);

module.exports = router;
