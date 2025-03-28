// src/routes/auth.js
const User = require('../models/User');
const config = require('../config');
const { registerSchema, loginSchema } = require('../schemas/authSchemas'); // Adjust path if needed

async function authRoutes(fastify, options) {
    const { models } = fastify; // If models are decorated

    // 1. Register
    fastify.post('/register', { schema: registerSchema }, async (request, reply) => {
        const { username, email, password } = request.body;
        try {
            const existingUser = await User.findOne({ $or: [{ email }, { username }] });
            if (existingUser) {
                return reply.code(409).send({ message: 'Username or Email already exists.' });
            }
            const newUser = new User({ username, email, password });
            await newUser.save();
            reply.code(201).send({ message: 'User registered successfully.', userId: newUser._id });
        } catch (err) {
            fastify.log.error(`Registration error: ${err}`);
             if (err.name === 'ValidationError') {
                return reply.code(400).send({ message: 'Validation Error', errors: err.errors });
            }
            reply.code(500).send({ message: 'Error registering user', error: err.message });
        }
    });

    // 2. Login
    fastify.post('/login', { schema: loginSchema }, async (request, reply) => {
        const { username, password } = request.body;
        try {
            // Find user by username (case-insensitive) and select password explicitly
            const user = await User.findOne({ username: username.toLowerCase() }).select('+password');

            if (!user) {
                return reply.code(401).send({ message: 'Invalid credentials.' });
            }

            const isMatch = await user.comparePassword(password);
            if (!isMatch) {
                return reply.code(401).send({ message: 'Invalid credentials.' });
            }

            // Generate JWT - Payload should contain minimal necessary info (like user ID)
            const token = fastify.jwt.sign(
                { id: user._id, username: user.username }, // Payload
                { expiresIn: config.jwt.expiresIn } // Options
            );

            reply.send({ token });
        } catch (err) {
            fastify.log.error(`Login error: ${err}`);
            reply.code(500).send({ message: 'Error logging in', error: err.message });
        }
    });

    // 3. Logout (Stateless - Client Responsibility)
    // For stateless JWT, logout means the client discards the token.
    // There's no server-side action unless you implement a token blacklist (more complex).
    fastify.post('/logout', { preHandler: [fastify.authenticate] }, async (request, reply) => {
        // You could add the token JTI (JWT ID) to a blacklist here (e.g., in Redis or DB)
        // For simplicity, we assume client-side removal.
         reply.send({ message: 'Logged out successfully. Please discard your token.' });
    });


    // 4. Get Authenticated User Profile
    fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
        try {
            // request.user contains the JWT payload { id, username }
            const user = await User.findById(request.user.id); // Fetch full user data without password
            if (!user) {
                return reply.code(404).send({ message: 'User not found.' });
            }
            reply.send(user);
        } catch (err) {
            fastify.log.error(`Get /me error: ${err}`);
            reply.code(500).send({ message: 'Error fetching user profile', error: err.message });
        }
    });
}

module.exports = authRoutes;