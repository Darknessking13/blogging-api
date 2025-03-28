// src/schemas/forumSchemas.js
const { objectIdSchema, paginationQuerySchema } = require('./projectSchemas'); // Reuse common parts

// Common properties for Forum responses
const forumResponseProperties = {
    _id: objectIdSchema,
    title: { type: 'string' },
    description: { type: 'string' },
    owner: {
        type: 'object',
        properties: {
            _id: objectIdSchema,
            username: { type: 'string' }
        }
    },
    likes: { type: 'array', items: objectIdSchema },
    likesCount: { type: 'integer' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
};

// Schema for getting a list of forums
const getAllForumsSchema = {
    querystring: paginationQuerySchema,
    response: {
        200: {
            type: 'object',
            properties: {
                data: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: forumResponseProperties
                    }
                },
                meta: {
                    type: 'object',
                    properties: {
                        currentPage: { type: 'integer' },
                        totalPages: { type: 'integer' },
                        totalForums: { type: 'integer' }, // Adjusted name
                        limit: { type: 'integer' },
                    },
                    required: ['currentPage', 'totalPages', 'totalForums', 'limit']
                }
            },
            required: ['data', 'meta']
        }
    }
};

// Schema for getting a single forum by ID
const getForumByIdSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: objectIdSchema
        }
    },
    response: {
        200: {
            type: 'object',
            properties: forumResponseProperties
        },
        404: { /* Not Found */ },
        400: { /* Invalid ID */ }
    }
};

// Schema for creating a new forum
const createForumSchema = {
    body: {
        type: 'object',
        required: ['title', 'description'],
        properties: {
            title: { type: 'string', minLength: 3 },
            description: { type: 'string', minLength: 10 }
        }
    },
    response: {
        201: {
            type: 'object',
            properties: forumResponseProperties
        },
        400: { /* Validation error */ }
    }
};

// Schema for updating a forum
const updateForumSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: objectIdSchema
        }
    },
    body: {
        type: 'object',
        minProperties: 1,
        properties: {
            title: { type: 'string', minLength: 3 },
            description: { type: 'string', minLength: 10 }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: forumResponseProperties
        },
        400: { /* Validation error */ },
        403: { /* Forbidden */ },
        404: { /* Not Found */ }
    }
};

// Schema for deleting a forum
const deleteForumSchema = {
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

// Schema for liking/unliking a forum
const likeForumSchema = {
     params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: objectIdSchema
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                message: { type: 'string' },
                likesCount: { type: 'integer' }
            },
             required: ['message', 'likesCount']
        },
        404: { /* Not Found */ }
    }
};

module.exports = {
    getAllForumsSchema,
    getForumByIdSchema,
    createForumSchema,
    updateForumSchema,
    deleteForumSchema,
    likeForumSchema
};