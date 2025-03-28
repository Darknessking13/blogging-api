// src/server.js
const Fastify = require('fastify');
const cors = require('@fastify/cors');
const config = require('./config');

// Import plugins
const dbPlugin = require('./plugins/db');
const authPlugin = require('./plugins/auth');

// Import routes
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const forumRoutes = require('./routes/forums'); // Assuming you created this
const commentRoutes = require('./routes/comments');
const searchTagsRoutes = require('./routes/searchTags');

const startServer = async () => {
    const fastify = Fastify({
        logger: true, // Enable built-in Pino logger
    });

    try {
        // Register CORS
        await fastify.register(cors, {
            // Configure CORS options if needed (e.g., origin: 'http://localhost:8080')
            origin: '*', // Allow all origins for now (adjust for production)
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        });

        // Register plugins
        await fastify.register(dbPlugin);
        await fastify.register(authPlugin);

        // Register routes with prefixes
        await fastify.register(authRoutes, { prefix: '/api/auth' });
        await fastify.register(projectRoutes, { prefix: '/api/projects' });
        await fastify.register(forumRoutes, { prefix: '/api/forums' }); // Register forum routes
        await fastify.register(commentRoutes, { prefix: '/api/comments' });
        await fastify.register(searchTagsRoutes, { prefix: '/api' }); // Routes like /api/tags, /api/search


        // Basic root route
        fastify.get('/', async (request, reply) => {
            return { hello: 'world - API is running!' };
        });

        // Add a basic error handler (optional, Fastify has defaults)
        fastify.setErrorHandler(function (error, request, reply) {
          fastify.log.error(error); // Log the error

          // Mongoose Validation Error
          if (error.name === 'ValidationError') {
            return reply.code(400).send({
              message: 'Validation Failed',
              errors: error.errors,
            });
          }

          // MongoDB Duplicate Key Error
          if (error.code === 11000) {
             return reply.code(409).send({
               message: 'Duplicate key error.',
               // You might want to parse error.message or error.keyValue to be more specific
               details: error.keyValue
             });
          }

          // Handle other specific errors or default
          if (!reply.sent) { // Check if response hasn't already been sent
             const statusCode = error.statusCode >= 400 ? error.statusCode : 500;
             reply.code(statusCode).send({
                 message: error.message || 'Internal Server Error',
                 // Avoid sending stack trace in production
                 // stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
             });
          }
        });


        // Start the server
        await fastify.listen({ port: config.port, host: '0.0.0.0' }); // Listen on all network interfaces
        fastify.log.info(`Server listening on port ${fastify.server.address().port}`);

    } catch (err) {
        fastify.log.error(err, 'Error starting server'); // Log the error object correctly
        process.exit(1);
    }
};

startServer();