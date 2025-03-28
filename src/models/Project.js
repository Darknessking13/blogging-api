const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    tags: [{ type: String, trim: true, lowercase: true }],
    repoUrl: { type: String, trim: true },
    liveUrl: { type: String, trim: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Users who liked
    // Add other fields as needed (e.g., images, status)
}, { timestamps: true });

// Index for searching title and description
projectSchema.index({ title: 'text', description: 'text', tags: 1 });

module.exports = mongoose.model('Project', projectSchema);