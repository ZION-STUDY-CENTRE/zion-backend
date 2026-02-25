const mongoose = require('mongoose');

const FileResourceSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    program: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Program',
        required: true
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    fileUrl: {
        type: String,
        required: true
    },
    fileName: {
        type: String,
        required: true
    },
    fileType: {
        type: String, // pdf, doc, docx, ppt, etc
    },
    fileSize: {
        type: Number // in bytes
    },
    resourceType: {
        type: String,
        enum: ['study-material', 'lecture-notes', 'reference', 'other'],
        default: 'study-material'
    },
    visibility: {
        type: String,
        enum: ['public', 'private', 'specific-students'],
        default: 'public'
    },
    accessibleTo: [{ // for specific-students visibility
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    downloadCount: {
        type: Number,
        default: 0
    },
    extension: {
        type: String,
        required: true
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('FileResource', FileResourceSchema);