// src/schemas/projectSchemas.js

// Reusable ObjectId schema part
const objectIdSchema = { type: 'string', pattern: '^[0-9a-fA-F]{24}$' }; // Basic ObjectId format check

// Reusable pagination query schema part
const paginationQuerySchema = {
    type: 'object',
    properties: {
        page: { type: 'integer', minimum: 1, default: 1 },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
    }
};

// Common properties for Project responses
const projectResponseProperties = {
    _id: objectIdSchema,
    title: { type: 'string' },
    description: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    repoUrl: { type: ['string', 'null'], format: 'url' }, // Allow null or valid URL
    liveUrl: { type: ['string', 'null'], format: 'url' }, // Allow null or valid URL
    owner: { // Populated owner example
        type: 'object',
        properties: {
            _id: objectIdSchema,
            username: { type: 'string' }
            // email: { type: 'string', format: 'email' } // Optionally include email if needed
        }
    },
    likes: { type: 'array', items: objectIdSchema }, // Array of user IDs who liked
    likesCount: { type: 'integer' }, // Often useful to return count directly
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
};

// Schema for getting a list of projects
const getAllProjectsSchema = {
    querystring: paginationQuerySchema,
    response: {
        200: {
            type: 'object',
            properties: {
                data: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: projectResponseProperties
                    }
                },
                meta: {
                    type: 'object',
                    properties: {
                        currentPage: { type: 'integer' },
                        totalPages: { type: 'integer' },
                        totalProjects: { type: 'integer' },
                        limit: { type: 'integer' },
                    },
                    required: ['currentPage', 'totalPages', 'totalProjects', 'limit']
                }
            },
            required: ['data', 'meta']
        }
        // Add error responses (4xx, 5xx) if desired
    }
};

// Schema for getting a single project by ID
const getProjectByIdSchema = {
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
            properties: projectResponseProperties
        },
        404: {
             type: 'object',
             properties: { message: { type: 'string' } }
        },
        400: { // For invalid ID format
             type: 'object',
             properties: { message: { type: 'string' } }
        }
    }
};

// Schema for creating a new project
const createProjectSchema = {
    body: {
        type: 'object',
        required: ['title', 'description'],
        properties: {
            title: { type: 'string', minLength: 3 },
            description: { type: 'string', minLength: 10 },
            tags: { type: 'array', items: { type: 'string', minLength: 1 }, default: [] },
            repoUrl: { type: ['string', 'null'], format: 'url', default: null },
            liveUrl: { type: ['string', 'null'], format: 'url', default: null }
        }
    },
    response: {
        201: {
            type: 'object',
            properties: projectResponseProperties
        },
        400: { // Validation error
             type: 'object',
             properties: {
                 message: { type: 'string' },
                 errors: { type: 'object'} // Fastify/AJV often provides detailed errors
             }
        }
    }
};

// Schema for updating a project
const updateProjectSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: objectIdSchema
        }
    },
    body: {
        type: 'object',
        minProperties: 1, // Require at least one field to update
        properties: {
            // Make all updateable fields optional
            title: { type: 'string', minLength: 3 },
            description: { type: 'string', minLength: 10 },
            tags: { type: 'array', items: { type: 'string', minLength: 1 } },
            repoUrl: { type: ['string', 'null'], format: 'url' },
            liveUrl: { type: ['string', 'null'], format: 'url' }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: projectResponseProperties
        },
        400: { /* Validation error */ },
        403: { /* Forbidden */ },
        404: { /* Not Found */ }
    }
};

// Schema for deleting a project
const deleteProjectSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: objectIdSchema
        }
    },
    response: {
        204: {
            type: 'null' // No content on successful delete
        },
        403: { /* Forbidden */ },
        404: { /* Not Found */ }
    }
};

// Schema for liking/unliking a project
const likeProjectSchema = {
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
    objectIdSchema,
    paginationQuerySchema,
    getAllProjectsSchema,
    getProjectByIdSchema,
    createProjectSchema,
    updateProjectSchema,
    deleteProjectSchema,
    likeProjectSchema
};