// src/schemas/commentSchemas.js
const { objectIdSchema } = require('./projectSchemas'); // Reuse common parts

// Common properties for Comment responses
const commentResponseProperties = {
    _id: objectIdSchema,
    content: { type: 'string' },
    author: {
        type: 'object',
        properties: {
            _id: objectIdSchema,
            username: { type: 'string' }
        }
    },
    // Include project/forum IDs in response
    project: { type: ['string', 'null'], pattern: '^[0-9a-fA-F]{24}$' },
    forum: { type: ['string', 'null'], pattern: '^[0-9a-fA-F]{24}$' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
};

// Schema for getting comments (for project or forum)
const getCommentsSchema = {
    querystring: {
        type: 'object',
        properties: {
            projectId: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' }, // Optional ObjectId string
            forumId: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' }    // Optional ObjectId string
            // Add pagination here if needed: page, limit
        }
        // Note: Logic for *requiring one* and *disallowing both* is in the route handler
    },
    response: {
        200: {
            type: 'array',
            items: {
                type: 'object',
                properties: commentResponseProperties
            }
        },
        400: { /* Missing or invalid query params */ }
    }
};

// Schema for creating a new comment
const createCommentSchema = {
    body: {
        type: 'object',
        required: ['content'],
        properties: {
            content: { type: 'string', minLength: 1 },
            projectId: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' }, // Optional ObjectId string
            forumId: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' }    // Optional ObjectId string
        }
        // Note: Logic for requiring *exactly one* of projectId/forumId is in the route handler
    },
    response: {
        201: {
            type: 'object',
            properties: commentResponseProperties
        },
        400: { /* Validation error, or missing/both project/forum ID */ },
        404: { /* Project or Forum not found */ }
    }
};

// Schema for updating a comment
const updateCommentSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: objectIdSchema
        }
    },
    body: {
        type: 'object',
        required: ['content'],
        properties: {
            content: { type: 'string', minLength: 1 }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: commentResponseProperties
        },
        400: { /* Validation error */ },
        403: { /* Forbidden */ },
        404: { /* Not Found */ }
    }
};

// Schema for deleting a comment
const deleteCommentSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: objectIdSchema
        }
    },
    response: {
        204: { type: 'null' },
        403: { /* Forbidden */ },
        404: { /* Not Found */ }
    }
};

module.exports = {
    getCommentsSchema,
    createCommentSchema,
    updateCommentSchema,
    deleteCommentSchema
};