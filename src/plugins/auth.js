// src/plugins/auth.js
const fastifyPlugin = require('fastify-plugin');
const fastifyJwt = require('@fastify/jwt');
const config = require('../config');
const User = require('../models/User'); // Import User model directly

async function authPlugin(fastify, options) {
    fastify.register(fastifyJwt, {
        secret: config.jwt.secret,
    });

    fastify.decorate('authenticate', async function (request, reply) {
        try {
            await request.jwtVerify();
            // Optionally fetch the full user object - might be overkill for every request
            // const user = await User.findById(request.user.id);
            // if (!user) {
            //     throw new Error('User not found');
            // }
            // request.user = user; // Replace payload with full user object
        } catch (err) {
            fastify.log.warn(`JWT Authentication error: ${err.message}`);
            reply.code(401).send({ message: 'Authentication required.', error: err.message });
        }
    });

     // Decorator to check if the authenticated user is the owner ("you")
     // Assumes 'authenticate' has run first and request.user.id exists
    fastify.decorate('checkOwner', async function (request, reply) {
        // This needs context (e.g., the document being accessed)
        // It's better implemented directly within the route handler
        // where the document is fetched. This decorator is less useful here.
        // We will implement the owner check directly in PUT/DELETE routes.
        fastify.log.info('checkOwner decorator called - implement check in route handlers.');
    });

     // Decorator specifically for your owner ID (replace with your actual user ID after registration)
     // This is a simplification. In reality, you'd likely have roles (admin, owner).
     // Let's assume your user ID is known or stored in config (NOT recommended for secrets)
     // For now, we'll assume the FIRST registered user is "you" or use a specific role later.
     // A better approach is checking ownership against the `owner` field of the resource.
     // We will use the 'owner' field check instead of a hardcoded 'isYou' decorator.
}

module.exports = fastifyPlugin(authPlugin);