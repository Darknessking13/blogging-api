// src/routes/searchTags.js
const Project = require('../models/Project');
const Forum = require('../models/Forum');
const mongoose = require('mongoose');

async function searchTagsRoutes(fastify, options) {

    // 1. Get all unique tags (from Projects)
    fastify.get('/tags', async (request, reply) => {
        try {
            // Fetch distinct tags directly from the database
            const tags = await Project.distinct('tags');
            reply.send(tags.sort()); // Send sorted tags
        } catch (err) {
            fastify.log.error(`Get tags error: ${err}`);
            reply.code(500).send({ message: 'Error fetching tags' });
        }
    });

    // 2. Search projects and forums
    fastify.get('/search', async (request, reply) => {
        const query = request.query.query;
        const page = parseInt(request.query.page) || 1;
        const limit = parseInt(request.query.limit) || 10;
        const skip = (page - 1) * limit;

        if (!query) {
            return reply.code(400).send({ message: 'Search query parameter is required.' });
        }

        try {
             // Option 1: Using $text search (Requires text indexes on models)
             // More efficient for natural language search across indexed fields
            const searchQuery = { $text: { $search: query } };
            const scoreProjection = { score: { $meta: "textScore" } }; // Project the relevance score
            const sortOption = { score: { $meta: "textScore" } }; // Sort by relevance

            const [projectResults, forumResults, totalProjects, totalForums] = await Promise.all([
                Project.find(searchQuery, scoreProjection)
                    .populate('owner', 'username')
                    .sort(sortOption)
                    .skip(skip) // Apply pagination *after* potential combined sorting if needed
                    .limit(limit),
                Forum.find(searchQuery, scoreProjection)
                     .populate('owner', 'username')
                     .sort(sortOption)
                     .skip(skip) // Apply pagination *after* potential combined sorting if needed
                     .limit(limit),
                Project.countDocuments(searchQuery),
                Forum.countDocuments(searchQuery)
            ]);


            // ---
            // Option 2: Using $regex (Simpler, doesn't require text index, potentially slower)
            // const regex = new RegExp(query, 'i'); // Case-insensitive search
            // const searchFilter = {
            //     $or: [
            //         { title: regex },
            //         { description: regex },
            //         // For Projects only:
            //         // { tags: regex } // Searching within array elements with regex
            //     ],
            // };
            // const projectResults = await Project.find(searchFilter).populate...
            // const forumResults = await Forum.find(searchFilter).populate...
            // ---

            const combinedResults = {
                projects: {
                     data: projectResults,
                     total: totalProjects
                },
                forums: {
                     data: forumResults,
                     total: totalForums
                }
            };
            const totalResults = totalProjects + totalForums; // Rough total
             // Note: Proper combined pagination is complex. This shows separate results.

            reply.send({
                query,
                results: combinedResults,
                meta: { // Pagination info is per-resource type here
                    requestedPage: page,
                    requestedLimit: limit,
                    totalApproximateResults: totalResults,
                    // Add more detailed pagination per type if needed
                }
            });

        } catch (err) {
            fastify.log.error(`Search error: ${err}`);
            reply.code(500).send({ message: 'Error performing search' });
        }
    });
}
module.exports = searchTagsRoutes;