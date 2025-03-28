// src/routes/forums.js
const Forum = require('../models/Forum');
const mongoose = require('mongoose');
const { // Import schemas for validation
    getAllForumsSchema,
    getForumByIdSchema,
    createForumSchema,
    updateForumSchema,
    deleteForumSchema,
    likeForumSchema
} = require('../schemas/forumSchemas'); // Adjust path if needed

// Helper function to check if the current user is the owner of the forum
async function checkForumOwnership(request, reply, forumId) {
    // Validate ID format early (even though schema might do it)
    if (!mongoose.Types.ObjectId.isValid(forumId)) {
        reply.code(400).send({ message: 'Invalid Forum ID format.' });
        return null;
    }

    const forum = await Forum.findById(forumId);
    if (!forum) {
        reply.code(404).send({ message: 'Forum not found.' });
        return null; // Indicate not found
    }
    // IMPORTANT: Compare ObjectIds correctly using .equals()
    if (!forum.owner || !forum.owner.equals(request.user.id)) {
         reply.code(403).send({ message: 'Forbidden: You are not the owner of this forum.' });
         return null; // Indicate forbidden
    }
    return forum; // Return the forum if ownership is verified
}


async function forumRoutes(fastify, options) {
    // Access models if decorated on fastify instance (optional)
    // const { Forum, Comment } = fastify.models;

    // 1. Get all forums (with pagination)
    fastify.get('/', { schema: getAllForumsSchema }, async (request, reply) => {
        // Extract pagination parameters from query string, validated by schema
        const page = request.query.page;
        const limit = request.query.limit;
        const skip = (page - 1) * limit;

        try {
            const forums = await Forum.find()
                .populate('owner', 'username email') // Populate owner info
                .sort({ createdAt: -1 }) // Sort by newest first
                .skip(skip)
                .limit(limit);

            const totalForums = await Forum.countDocuments();
            const totalPages = Math.ceil(totalForums / limit);

            reply.send({
                data: forums,
                meta: {
                    currentPage: page,
                    totalPages,
                    totalForums,
                    limit,
                },
            });
        } catch (err) {
            fastify.log.error(`Get forums error: ${err}`);
            reply.code(500).send({ message: 'Error fetching forums' });
        }
    });

    // 2. Get forum details by ID
    fastify.get('/:id', { schema: getForumByIdSchema }, async (request, reply) => {
        try {
            const forumId = request.params.id;
             // Basic ID format check (already handled by schema pattern but good defense)
             if (!mongoose.Types.ObjectId.isValid(forumId)) {
                 return reply.code(400).send({ message: 'Invalid Forum ID format.' });
             }

            const forum = await Forum.findById(forumId)
                                   .populate('owner', 'username email')
                                   .populate('likes', 'username'); // Populate who liked
            if (!forum) {
                return reply.code(404).send({ message: 'Forum not found.' });
            }
            reply.send(forum);
        } catch (err) {
            fastify.log.error(`Get forum/:id error: ${err}`);
            reply.code(500).send({ message: 'Error fetching forum details' });
        }
    });

    // 3. Create a new forum (Requires Auth)
    // Ownership is assigned to the authenticated user.
    fastify.post('/', { preHandler: [fastify.authenticate], schema: createForumSchema }, async (request, reply) => {
        try {
            // Body is validated by schema
            const newForum = new Forum({
                ...request.body, // Contains title, description
                owner: request.user.id, // Set owner to the authenticated user's ID
                likes: [], // Initialize likes array
            });
            await newForum.save();
            // Fetch again to populate owner for the response
            const populatedForum = await Forum.findById(newForum._id).populate('owner', 'username email');
            reply.code(201).send(populatedForum);
        } catch (err) {
            fastify.log.error(`Create forum error: ${err}`);
             if (err.name === 'ValidationError') {
                return reply.code(400).send({ message: 'Validation Error', errors: err.errors });
            }
            reply.code(500).send({ message: 'Error creating forum' });
        }
    });

    // 4. Update a forum (Requires Auth + Ownership Check)
    fastify.put('/:id', { preHandler: [fastify.authenticate], schema: updateForumSchema }, async (request, reply) => {
        try {
             const forumId = request.params.id;

             // Check ownership *before* attempting update
             const forum = await checkForumOwnership(request, reply, forumId);
             if (!forum) return; // Error response already sent by checkForumOwnership

            // Update allowed fields (validated by schema)
            const allowedUpdates = ['title', 'description'];
            const updates = {};
            for (const key of allowedUpdates) {
                // Only include fields that are actually present in the request body
                if (request.body[key] !== undefined) {
                    updates[key] = request.body[key];
                }
            }

             // Prevent updating owner or likes directly via this endpoint
             if (Object.keys(updates).length === 0) {
                 return reply.code(400).send({ message: 'No valid fields provided for update.' });
             }

            // Use findByIdAndUpdate with new: true to get the updated doc
            const updatedForum = await Forum.findByIdAndUpdate(
                forumId,
                { $set: updates },
                { new: true, runValidators: true } // Return updated doc, run schema validators
            ).populate('owner', 'username email'); // Repopulate owner

            // Should not happen if checkForumOwnership passed, but good practice
            if (!updatedForum) {
                return reply.code(404).send({ message: 'Forum not found after update attempt.' });
            }

            reply.send(updatedForum);
        } catch (err) {
            fastify.log.error(`Update forum error: ${err}`);
             if (err.name === 'ValidationError') {
                return reply.code(400).send({ message: 'Validation Error', errors: err.errors });
            }
            reply.code(500).send({ message: 'Error updating forum' });
        }
    });

    // 5. Delete a forum (Requires Auth + Ownership Check)
    fastify.delete('/:id', { preHandler: [fastify.authenticate], schema: deleteForumSchema }, async (request, reply) => {
        try {
            const forumId = request.params.id;

            // Check ownership
            const forum = await checkForumOwnership(request, reply, forumId);
            if (!forum) return; // Error response already sent by checkForumOwnership

            // TODO: Decide if deleting a forum should also delete its comments.
            // If so, uncomment the following lines (ensure Comment model is accessible)
            // const Comment = require('../models/Comment'); // Or access via fastify.models.Comment
            // await Comment.deleteMany({ forum: forumId });
            // fastify.log.info(`Deleted comments associated with forum ${forumId}`);

            await Forum.findByIdAndDelete(forumId);

            reply.code(204).send(); // No content on successful delete
        } catch (err) {
            fastify.log.error(`Delete forum error: ${err}`);
            reply.code(500).send({ message: 'Error deleting forum' });
        }
    });

    // 6. Like / Unlike a forum (Requires Auth)
    fastify.post('/:id/like', { preHandler: [fastify.authenticate], schema: likeForumSchema }, async (request, reply) => {
        try {
            const forumId = request.params.id;
            const userId = request.user.id; // ID of the user performing the action

            if (!mongoose.Types.ObjectId.isValid(forumId)) {
                return reply.code(400).send({ message: 'Invalid Forum ID format.' });
            }

            // Find the forum first to check if it exists and if user already liked it
            const forum = await Forum.findById(forumId);
            if (!forum) {
                 return reply.code(404).send({ message: 'Forum not found.' });
            }

            // Check if the user's ID is already in the likes array
            const isLiked = forum.likes.some(like => like.equals(userId));
            let updateOperation;
            let message;

            if (isLiked) {
                // User wants to unlike: $pull removes the userId from the array
                updateOperation = { $pull: { likes: userId } };
                message = 'Forum unliked successfully.';
            } else {
                // User wants to like: $addToSet adds the userId only if it's not already present
                updateOperation = { $addToSet: { likes: userId } };
                 message = 'Forum liked successfully.';
            }

            // Perform the update and get the updated like count
            const updatedForum = await Forum.findByIdAndUpdate(
                 forumId,
                 updateOperation,
                 { new: true } // Return the modified document
            );

            reply.send({
                message: message,
                likesCount: updatedForum.likes.length,
            });

        } catch (err) {
             fastify.log.error(`Like forum error: ${err}`);
             reply.code(500).send({ message: 'Error processing like for forum' });
        }
    });

}

module.exports = forumRoutes;