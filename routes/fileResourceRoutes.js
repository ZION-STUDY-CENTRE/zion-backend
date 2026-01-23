const express = require('express');
const router = express.Router();
const FileResource = require('../models/FileResource');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { createNotification } = require('../controllers/notificationController');
const { getIO } = require('../config/ioInstance');

// Get all files for a program
router.get('/program/:programId', authMiddleware, async (req, res) => {
  try {
    const files = await FileResource.find({ 
      program: req.params.programId,
      $or: [
        { visibility: 'public' },
        { visibility: 'private', uploadedBy: req.user.id },
        { visibility: 'specific-students', accessibleTo: req.user.id }
      ]
    })
      .populate('uploadedBy', 'name email')
      .sort({ uploadedAt: -1 });

    res.json(files);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single file resource
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const file = await FileResource.findById(req.params.id)
      .populate('uploadedBy', 'name email');

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Check access permissions
    if (file.visibility === 'private' && file.uploadedBy._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (file.visibility === 'specific-students' && 
        !file.accessibleTo.includes(req.user.id) && 
        file.uploadedBy._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(file);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Upload file resource (any authenticated user can upload)
router.post('/', authMiddleware, async (req, res) => {
  const { title, description, program, fileUrl, fileName, fileType, fileSize, resourceType, visibility, accessibleTo } = req.body;

  try {
    // Get the full user object to access name
    const uploader = await User.findById(req.user.id);
    
    const fileResource = new FileResource({
      title,
      description,
      program,
      uploadedBy: req.user.id,
      fileUrl,
      fileName,
      fileType,
      fileSize,
      resourceType: resourceType || 'study-material',
      visibility: visibility || 'public',
      accessibleTo: visibility === 'specific-students' ? accessibleTo : []
    });

    const saved = await fileResource.save();
    const populated = await saved.populate('uploadedBy', 'name email');
    
    // Get all students enrolled in this program if visibility is public
    let notificationRecipients = [];
    if (visibility === 'public' || visibility === 'private') {
      notificationRecipients = await User.find({ program: program, role: 'student' });
    } else if (visibility === 'specific-students' && accessibleTo.length > 0) {
      notificationRecipients = await User.find({ _id: { $in: accessibleTo }, role: 'student' });
    }
    
    console.log(`[File Notification] 📄 Uploaded "${title}" for ${notificationRecipients.length} students`);
    
    // Create notifications for all students
    for (const student of notificationRecipients) {
      await createNotification(
        student._id,
        'material',
        `New Study Material: ${title}`,
        `Mr. ${uploader.name} uploaded "${title}"`,
        {},
        req.user.id,
        saved._id,
        'FileResource'
      );
    }
    
    // Emit real-time notification via Socket.io
    const io = getIO();
    if (io && notificationRecipients.length > 0) {
      notificationRecipients.forEach(student => {
        io.to(`user:${student._id.toString()}`).emit('notification:material-shared', {
          materialId: saved._id,
          materialTitle: title,
          uploaderName: `Mr. ${uploader.name}`,
          programId: program,
          resourceType: resourceType || 'study-material'
        });
      });
    }
    
    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update file resource (owner or admin can update)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const file = await FileResource.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Check if user is the uploader or admin
    if (file.uploadedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { title, description, resourceType, visibility, accessibleTo } = req.body;
    
    if (title) file.title = title;
    if (description) file.description = description;
    if (resourceType) file.resourceType = resourceType;
    if (visibility) file.visibility = visibility;
    if (visibility === 'specific-students' && accessibleTo) file.accessibleTo = accessibleTo;

    const updated = await file.save();
    const populated = await updated.populate('uploadedBy', 'name email');
    res.json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Record download
router.post('/:id/download', authMiddleware, async (req, res) => {
  try {
    const file = await FileResource.findByIdAndUpdate(
      req.params.id,
      { $inc: { downloadCount: 1 } },
      { new: true }
    );
    res.json(file);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete file resource (owner or admin can delete)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const file = await FileResource.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    if (file.uploadedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await FileResource.findByIdAndDelete(req.params.id);
    res.json({ message: 'File deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
