import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import rateLimit from '@fastify/rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { config } from 'dotenv';

// Load environment variables
config();

// Import routes
import { userRoutes } from './routes/users.js';
import { photoRoutes } from './routes/photos.js';
import { sessionRoutes } from './routes/sessions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Photos path (must be absolute for @fastify/static)
const PHOTOS_PATH = process.env.PHOTOS_PATH 
  ? resolve(process.env.PHOTOS_PATH)
  : resolve(__dirname, '../../../data/photos');

// Initialize Fastify
const fastify = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  },
  bodyLimit: 52428800, // 50MB for photo uploads
});

// Register CORS
await fastify.register(cors, {
  origin: process.env.NODE_ENV === 'production'
    ? ['https://photobooth.meekthenilands.com']
    : ['http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
});

// Register multipart/form-data support for file uploads
await fastify.register(multipart, {
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB per file
    files: 1, // One file at a time
  },
});

// Register rate limiting
await fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  allowList: ['127.0.0.1'],
});

// Serve static photo files
await fastify.register(fastifyStatic, {
  root: PHOTOS_PATH,
  prefix: '/photos/',
  decorateReply: false
});

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// API routes
fastify.register(async (instance) => {
  // User routes
  await userRoutes(instance);
  
  // Photo routes
  await photoRoutes(instance);
  
  // Session routes
  await sessionRoutes(instance);
}, { prefix: '/api' });

// Error handler
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);
  
  reply.status(error.statusCode || 500).send({
    error: error.name || 'InternalServerError',
    message: error.message || 'An unexpected error occurred',
    statusCode: error.statusCode || 500,
  });
});

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000');
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    
    console.log('🚀 Photo Booth API Server Started');
    console.log(`📡 Listening on http://${host}:${port}`);
    console.log(`🗄️  Database: ${process.env.DATABASE_PATH || 'data/photobooth.db'}`);
    console.log(`📸 Photos: ${process.env.PHOTOS_PATH || 'data/photos'}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
