const express = require("express");
const router = express.Router();
const StudentResult = require("../models/StudentResult");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/", authMiddleware, async (req, res) => {
  try {
    const {
      student,
      program,
      academicYear,
      term,
      assignmentAverage,
      quizAverage,
      projectAverage,
      overallScore,
      cgpa,
      status,
      remarks,
    } = req.body;

    if (!student || !program || !academicYear) {
      return res
        .status(400)
        .json({ message: "Student, program and academic year are required" });
    }

    const result = new StudentResult({
      student,
      program,
      instructor: req.user.id,
      academicYear,
      term,
      assignmentAverage: assignmentAverage || 0,
      quizAverage: quizAverage || 0,
      projectAverage: projectAverage || 0,
      overallScore: overallScore || 0,
      cgpa: cgpa || 0,
      status: status || "Pending",
      remarks: remarks || "",
    });

    await result.save();
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/student/:studentId", authMiddleware, async (req, res) => {
  try {
    const results = await StudentResult.find({ student: req.params.studentId })
      .populate("program", "title")
      .sort({ generatedAt: -1 });

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const result = await StudentResult.findById(req.params.id);

    if (!result) {
      return res.status(404).json({ message: "Result not found" });
    }

    const { status, remarks, academicYear, term } = req.body;

    if (status !== undefined) result.status = status;
    if (remarks !== undefined) result.remarks = remarks;
    if (academicYear !== undefined) result.academicYear = academicYear;
    if (term !== undefined) result.term = term;

    await result.save();
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const result = await StudentResult.findByIdAndDelete(req.params.id);

    if (!result) {
      return res.status(404).json({ message: "Result not found" });
    }

    res.json({ message: "Result deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/program/:programId", authMiddleware, async (req, res) => {
  try {
    const results = await StudentResult.find({ program: req.params.programId })
      .populate("student", "name email")
      .populate("program", "title")
      .sort({ generatedAt: -1 });

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const result = await StudentResult.findById(req.params.id)
      .populate("student", "name email")
      .populate("program", "title");

    if (!result) {
      return res.status(404).json({ message: "Result not found" });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
