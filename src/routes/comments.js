// src/routes/comments.js
const Comment = require('../models/Comment');
const Project = require('../models/Project'); // Needed to check if project exists
const Forum = require('../models/Forum'); // Needed to check if forum exists
const mongoose = require('mongoose');
const { 
    getCommentsSchema,
    createCommentSchema,
    updateCommentSchema,
    deleteCommentSchema 
} = require("../schemas/commentSchemas")

// Helper function to check comment authorship
async function checkCommentAuthorship(request, reply, commentId) {
    const comment = await Comment.findById(commentId);
    if (!comment) {
        reply.code(404).send({ message: 'Comment not found.' });
        return null;
    }
    if (!comment.author.equals(request.user.id)) {
        reply.code(403).send({ message: 'Forbidden: You are not the author of this comment.' });
        return null;
    }
    return comment;
}


async function commentRoutes(fastify, options) {

    // 1 & 2: Get comments for a project OR a forum
    fastify.get('/', async (request, reply) => {
        const { projectId, forumId } = request.query;

        if (!projectId && !forumId) {
            return reply.code(400).send({ message: 'Either projectId or forumId query parameter is required.' });
        }
        if (projectId && forumId) {
            return reply.code(400).send({ message: 'Provide either projectId or forumId, not both.' });
        }

        let filter = {};
        if (projectId) {
             if (!mongoose.Types.ObjectId.isValid(projectId)) {
                 return reply.code(400).send({ message: 'Invalid Project ID format.' });
             }
            filter = { project: projectId };
        } else { // forumId must exist
             if (!mongoose.Types.ObjectId.isValid(forumId)) {
                 return reply.code(400).send({ message: 'Invalid Forum ID format.' });
             }
            filter = { forum: forumId };
        }

        try {
            const comments = await Comment.find(filter)
                .populate('author', 'username') // Populate author username
                .sort({ createdAt: 'asc' }); // Sort by oldest first usually for comments
            reply.send(comments);
        } catch (err) {
            fastify.log.error(`Get comments error: ${err}`);
            reply.code(500).send({ message: 'Error fetching comments' });
        }
    });

    // 3. Add a comment (Anyone authenticated)
    fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
        const { projectId, forumId, content } = request.body;
        const authorId = request.user.id;

        if (!content) {
             return reply.code(400).send({ message: 'Comment content is required.' });
        }
        if (!projectId && !forumId) {
            return reply.code(400).send({ message: 'Either projectId or forumId is required in the body.' });
        }
         if (projectId && forumId) {
            return reply.code(400).send({ message: 'Provide either projectId or forumId, not both.' });
        }


        try {
            // Verify the referenced project or forum exists (optional but good practice)
            if (projectId) {
                if (!mongoose.Types.ObjectId.isValid(projectId)) return reply.code(400).send({ message: 'Invalid Project ID.' });
                const projectExists = await Project.findById(projectId, '_id'); // Check only existence
                if (!projectExists) return reply.code(404).send({ message: 'Project not found.' });
            } else { // forumId
                if (!mongoose.Types.ObjectId.isValid(forumId)) return reply.code(400).send({ message: 'Invalid Forum ID.' });
                const forumExists = await Forum.findById(forumId, '_id');
                if (!forumExists) return reply.code(404).send({ message: 'Forum not found.' });
            }


            const newComment = new Comment({
                content,
                author: authorId,
                project: projectId || undefined, // Set to undefined if not provided
                forum: forumId || undefined,   // Set to undefined if not provided
            });

            await newComment.save();
            // Populate author before sending back
            const populatedComment = await Comment.findById(newComment._id).populate('author', 'username');
            reply.code(201).send(populatedComment);
        } catch (err) {
            fastify.log.error(`Create comment error: ${err}`);
             if (err.name === 'ValidationError') {
                // Mongoose validation error (e.g., project AND forum provided)
                return reply.code(400).send({ message: err.message });
            }
            reply.code(500).send({ message: 'Error adding comment' });
        }
    });

    // 4. Update a comment (Only author)
    fastify.put('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
        try {
            const commentId = request.params.id;
            const { content } = request.body;

            if (!mongoose.Types.ObjectId.isValid(commentId)) {
                 return reply.code(400).send({ message: 'Invalid Comment ID format.' });
            }
            if (!content) {
                return reply.code(400).send({ message: 'Comment content is required for update.' });
            }

            // Check authorship
            const comment = await checkCommentAuthorship(request, reply, commentId);
            if (!comment) return; // Error response sent by helper

            comment.content = content;
            await comment.save(); // Use save to trigger potential middleware

             const updatedComment = await Comment.findById(comment._id).populate('author', 'username'); // Re-populate

            reply.send(updatedComment);
        } catch (err) {
            fastify.log.error(`Update comment error: ${err}`);
             if (err.name === 'ValidationError') {
                return reply.code(400).send({ message: 'Validation Error', errors: err.errors });
            }
            reply.code(500).send({ message: 'Error updating comment' });
        }
    });

    // 5. Delete a comment (Only author)
    fastify.delete('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
        try {
            const commentId = request.params.id;
             if (!mongoose.Types.ObjectId.isValid(commentId)) {
                 return reply.code(400).send({ message: 'Invalid Comment ID format.' });
             }

            // Check authorship
            const comment = await checkCommentAuthorship(request, reply, commentId);
            if (!comment) return; // Error response sent by helper

            await Comment.findByIdAndDelete(commentId);
            reply.code(204).send(); // No content
        } catch (err) {
            fastify.log.error(`Delete comment error: ${err}`);
            reply.code(500).send({ message: 'Error deleting comment' });
        }
    });
}

module.exports = commentRoutes;