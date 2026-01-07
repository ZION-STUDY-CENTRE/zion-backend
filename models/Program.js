const mongoose = require('mongoose');

const ModuleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true }
});

const KeyStatsSchema = new mongoose.Schema({
  duration: { type: String, default: '' },
  studyMode: { type: String, default: '' },
  intakes: [{ type: String }],
  certification: { type: String, default: '' }
});

const ProgramSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    unique: true
  },
  code: { // URL friendly ID (e.g., 'web-dev')
    type: String, 
    unique: true,
    sparse: true 
  },
  category: {
    type: String,
    required: true,
    enum: ['Technology', 'International Exams', 'Secondary School', 'Other'],
    default: 'Other'
  },
  heroImage: { type: String, default: '' }, // URL from Cloudinary
  imageUrl: { type: String, default: '' },  // Fallback or secondary URL
  
  shortDescription: { type: String, required: true },
  description: { type: String }, // Longer description
  overview: { type: String },    // Detailed Overview text
  
  keyStats: { type: KeyStatsSchema, default: () => ({}) },
  
  schedule: { type: String },
  students: { type: Number, default: 0 },
  
  modules: [ModuleSchema],
  
  entryRequirements: [{ type: String }],
  careerOpportunities: [{ type: String }],

  // Legacy fields (kept for backward compatibility if needed)
  instructors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  materials: [{
    title: String,
    type: { type: String, enum: ['pdf', 'video', 'link'] },
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Program', ProgramSchema);
