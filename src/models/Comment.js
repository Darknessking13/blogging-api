const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    content: { type: String, required: true, trim: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true },
    forum: { type: mongoose.Schema.Types.ObjectId, ref: 'Forum', index: true },
}, { timestamps: true });

// Ensure a comment belongs to either a project OR a forum, but not both (optional validation)
commentSchema.pre('validate', function (next) {
    if (this.project && this.forum) {
        next(new Error('Comment cannot belong to both a project and a forum.'));
    } else if (!this.project && !this.forum) {
        next(new Error('Comment must belong to either a project or a forum.'));
    } else {
        next();
    }
});

module.exports = mongoose.model('Comment', commentSchema);