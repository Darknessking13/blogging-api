// src/plugins/db.js
const fastifyPlugin = require('fastify-plugin');
const mongoose = require('mongoose');
const config = require('../config');

async function dbConnector(fastify, options) {
    try {
        await mongoose.connect(config.mongoURI);
        fastify.log.info('MongoDB connected successfully.');

        // Make models accessible via fastify instance if needed, though importing directly is common
        fastify.decorate('models', {
            User: require('../models/User'),
            Project: require('../models/Project'),
            Forum: require('../models/Forum'),
            Comment: require('../models/Comment'),
        });

    } catch (err) {
        fastify.log.error('MongoDB connection error:', err);
        process.exit(1); // Exit if DB connection fails on startup
    }
}

module.exports = fastifyPlugin(dbConnector);