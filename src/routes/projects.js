// src/routes/projects.js
const Project = require('../models/Project');
const mongoose = require('mongoose');
const {
    getAllProjectsSchema,
    getProjectByIdSchema,
    createProjectSchema,
    updateProjectSchema,
    deleteProjectSchema,
    likeProjectSchema
} = require('../schemas/projectSchemas'); // Adjust path if needed

// Helper function to check if the current user is the owner
async function checkProjectOwnership(request, reply, projectId) {
    const project = await Project.findById(projectId);
    if (!project) {
        reply.code(404).send({ message: 'Project not found.' });
        return null; // Indicate not found
    }
    // IMPORTANT: Compare ObjectIds correctly
    if (!project.owner.equals(request.user.id)) {
         reply.code(403).send({ message: 'Forbidden: You are not the owner of this project.' });
         return null; // Indicate forbidden
    }
    return project; // Return the project if ownership is verified
}


async function projectRoutes(fastify, options) {
    const { models } = fastify;

    // 1. Get all projects (with pagination)
    fastify.get('/', async (request, reply) => {
        const page = parseInt(request.query.page) || 1;
        const limit = parseInt(request.query.limit) || 10;
        const skip = (page - 1) * limit;

        try {
            const projects = await Project.find()
                .populate('owner', 'username email') // Populate owner info
                .sort({ createdAt: -1 }) // Sort by newest
                .skip(skip)
                .limit(limit);

            const totalProjects = await Project.countDocuments();
            const totalPages = Math.ceil(totalProjects / limit);

            reply.send({
                data: projects,
                meta: {
                    currentPage: page,
                    totalPages,
                    totalProjects,
                    limit,
                },
            });
        } catch (err) {
            fastify.log.error(`Get projects error: ${err}`);
            reply.code(500).send({ message: 'Error fetching projects' });
        }
    });

    // 2. Get project details by ID
    fastify.get('/:id', async (request, reply) => {
        try {
            const projectId = request.params.id;
            if (!mongoose.Types.ObjectId.isValid(projectId)) {
                 return reply.code(400).send({ message: 'Invalid Project ID format.' });
            }

            const project = await Project.findById(projectId)
                                   .populate('owner', 'username email')
                                   .populate('likes', 'username'); // Populate who liked
            if (!project) {
                return reply.code(404).send({ message: 'Project not found.' });
            }
            reply.send(project);
        } catch (err) {
            fastify.log.error(`Get project/:id error: ${err}`);
            reply.code(500).send({ message: 'Error fetching project details' });
        }
    });

    // 3. Create a new project (Only you - Requires Auth + Ownership Check)
    // We assume 'owner' is the authenticated user creating it.
    fastify.post('/', { preHandler: [fastify.authenticate] /*, schema: createProjectSchema */ }, async (request, reply) => {
        try {
            const newProject = new Project({
                ...request.body,
                owner: request.user.id, // Set owner to the authenticated user's ID
                likes: [], // Initialize likes
            });
            await newProject.save();
            const populatedProject = await Project.findById(newProject._id).populate('owner', 'username email');
            reply.code(201).send(populatedProject);
        } catch (err) {
            fastify.log.error(`Create project error: ${err}`);
             if (err.name === 'ValidationError') {
                return reply.code(400).send({ message: 'Validation Error', errors: err.errors });
            }
            reply.code(500).send({ message: 'Error creating project' });
        }
    });

    // 4. Update a project (Only you - Requires Auth + Ownership Check)
    fastify.put('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
        try {
             const projectId = request.params.id;
             if (!mongoose.Types.ObjectId.isValid(projectId)) {
                 return reply.code(400).send({ message: 'Invalid Project ID format.' });
             }

             // Check ownership *before* attempting update
             const project = await checkProjectOwnership(request, reply, projectId);
             if (!project) return; // Error response sent by checkProjectOwnership

            // Update allowed fields (prevent owner field from being updated here)
            const allowedUpdates = ['title', 'description', 'tags', 'repoUrl', 'liveUrl'];
            const updates = {};
            for (const key of allowedUpdates) {
                if (request.body[key] !== undefined) {
                    updates[key] = request.body[key];
                }
            }

             // Use findByIdAndUpdate with new: true to get the updated doc
            const updatedProject = await Project.findByIdAndUpdate(
                projectId,
                { $set: updates },
                { new: true, runValidators: true } // Return updated doc, run schema validators
            ).populate('owner', 'username email');

            // findByIdAndUpdate returns null if not found, but we already checked.
            // Re-check just in case of race conditions, though unlikely here.
            if (!updatedProject) {
                return reply.code(404).send({ message: 'Project not found after update attempt.' });
            }

            reply.send(updatedProject);
        } catch (err) {
            fastify.log.error(`Update project error: ${err}`);
             if (err.name === 'ValidationError') {
                return reply.code(400).send({ message: 'Validation Error', errors: err.errors });
            }
            reply.code(500).send({ message: 'Error updating project' });
        }
    });

    // 5. Delete a project (Only you - Requires Auth + Ownership Check)
    fastify.delete('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
        try {
            const projectId = request.params.id;
             if (!mongoose.Types.ObjectId.isValid(projectId)) {
                 return reply.code(400).send({ message: 'Invalid Project ID format.' });
             }

            // Check ownership
            const project = await checkProjectOwnership(request, reply, projectId);
            if (!project) return; // Error response sent by checkProjectOwnership

            // TODO: Consider deleting associated comments when a project is deleted.
            // await fastify.models.Comment.deleteMany({ project: projectId });

            await Project.findByIdAndDelete(projectId);

            reply.code(204).send(); // No content on successful delete
        } catch (err) {
            fastify.log.error(`Delete project error: ${err}`);
            reply.code(500).send({ message: 'Error deleting project' });
        }
    });

    // LIKE a project
    fastify.post('/:id/like', { preHandler: [fastify.authenticate] }, async (request, reply) => {
        try {
            const projectId = request.params.id;
            const userId = request.user.id;

            if (!mongoose.Types.ObjectId.isValid(projectId)) {
                return reply.code(400).send({ message: 'Invalid Project ID format.' });
            }

            // Use $addToSet to add user ID if not present, $pull to remove if present (toggle like)
            const project = await Project.findById(projectId);
            if (!project) {
                 return reply.code(404).send({ message: 'Project not found.' });
            }

            const isLiked = project.likes.some(like => like.equals(userId));
            let updateOperation;

            if (isLiked) {
                // Unlike
                updateOperation = { $pull: { likes: userId } };
            } else {
                // Like
                updateOperation = { $addToSet: { likes: userId } };
            }

             const updatedProject = await Project.findByIdAndUpdate(
                 projectId,
                 updateOperation,
                 { new: true } // Return the updated document
             ).populate('likes', 'username'); // Optionally return updated likes list


            reply.send({
                message: isLiked ? 'Project unliked' : 'Project liked',
                likesCount: updatedProject.likes.length,
                // likes: updatedProject.likes // Optionally return who liked
            });

        } catch (err) {
             fastify.log.error(`Like project error: ${err}`);
             reply.code(500).send({ message: 'Error liking project' });
        }
    });

}

module.exports = projectRoutes;