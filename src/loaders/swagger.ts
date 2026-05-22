import swaggerUi from 'swagger-ui-express';
import express from 'express';

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'VitalWebsite Backend API',
    version: '1.0.0',
    description: 'API documentation for VitalWebsite Backend. Covers Auth, Chat History, and File (Image link) Storage.',
  },
  servers: [
    {
      url: '/api',
      description: 'API Server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  paths: {
    '/auth/signup': {
      post: {
        summary: 'Register a new user',
        tags: ['Auth'],
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  username: { type: 'string', example: 'ngocquy' },
                  email: { type: 'string', example: 'ngocquy@example.com' },
                  password: { type: 'string', example: 'password123' },
                  full_name: { type: 'string', example: 'Ngoc Quy' },
                },
                required: ['username', 'email', 'password'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { type: 'object' },
                    token: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/signin': {
      post: {
        summary: 'Login to user account',
        tags: ['Auth'],
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', example: 'ngocquy@example.com' },
                  password: { type: 'string', example: 'password123' },
                },
                required: ['email', 'password'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { type: 'object' },
                    token: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/verify-otp': {
      post: {
        summary: 'Verify user account with OTP',
        tags: ['Auth'],
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', example: 'ngocquy@example.com' },
                  otp: { type: 'string', example: '123456' },
                },
                required: ['email', 'otp'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Account verified successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Account verified successfully' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/chat/sessions': {
      get: {
        summary: 'Get all chat sessions for the current user',
        tags: ['Chat'],
        responses: {
          '200': {
            description: 'List of chat sessions',
          },
        },
      },
      post: {
        summary: 'Create a new chat session',
        tags: ['Chat'],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string', example: 'New Chat' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Chat session created',
          },
        },
      },
    },
    '/chat/sessions/{sessionId}/messages': {
      get: {
        summary: 'Get messages of a chat session',
        tags: ['Chat'],
        parameters: [
          {
            name: 'sessionId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'List of messages',
          },
        },
      },
      post: {
        summary: 'Save a new message to a chat session',
        tags: ['Chat'],
        parameters: [
          {
            name: 'sessionId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  sender_type: { type: 'string', example: 'USER', description: 'USER | BOT | ADMIN' },
                  message_type: { type: 'string', example: 'TEXT', description: 'TEXT | IMAGE | FILE' },
                  content: { type: 'string', example: 'Hello, how can I help you?' },
                },
                required: ['sender_type', 'content'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Message saved',
          },
        },
      },
    },
    '/files/image-link': {
      post: {
        summary: 'Save an image link to uploaded_files',
        tags: ['File'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  original_filename: { type: 'string', example: 'image.jpg' },
                  file_path: { type: 'string', example: 'https://example.com/image.jpg', description: 'The image link' },
                  session_id: { type: 'string', example: 'optional-session-id', nullable: true },
                },
                required: ['original_filename', 'file_path'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Image link saved',
          },
        },
      },
    },
  },
};

export default (app: express.Application) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
};
