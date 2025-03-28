const userProps = {
  username: { type: 'string', minLength: 3 },
  email: { type: 'string', format: 'email' },
  password: { type: 'string', minLength: 6 },
};

const registerSchema = {
  body: {
      type: 'object',
      required: ['username', 'email', 'password'],
      properties: userProps,
  },
  response: {
      201: {
          type: 'object',
          properties: {
              message: { type: 'string' },
              userId: { type: 'string' }, // Or return the full user without password
          },
      },
      // Add error responses 400, 409
  },
};

const loginSchema = {
  body: {
      type: 'object',
      required: ['username', 'password'],
      properties: {
          username: { type: 'string' },
          password: { type: 'string' },
      },
  },
  response: {
      200: {
          type: 'object',
          properties: {
              token: { type: 'string' },
          },
      },
      // Add error responses 400, 401
  },
};

module.exports = { registerSchema, loginSchema };