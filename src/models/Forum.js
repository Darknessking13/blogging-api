const mongoose = require('mongoose');

const forumSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Users who liked
}, { timestamps: true });

// Index for searching title and description
forumSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Forum', forumSchema);