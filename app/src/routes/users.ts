import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { userQueries, photoQueries, sessionQueries } from '../services/database.js';
import { generateSlug, sanitizeName } from '../utils/slug.js';
import { ensureUserDirectories } from '../services/storage.js';
import { sendPhotosEmail } from '../services/email.js';
import path from 'path';
import { resolve } from 'path';

interface CreateUserBody {
  name: string;
  last_initial: string;
  email?: string;
  device_fingerprint: string;
}

interface User {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  device_fingerprint: string;
  created_at: string;
  last_active: string;
}

/**
 * Register user routes
 */
export async function userRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/users
   * Create or lookup user
   */
  fastify.post<{ Body: CreateUserBody }>(
    '/users',
    async (request: FastifyRequest<{ Body: CreateUserBody }>, reply: FastifyReply) => {
      const { name, last_initial, email, device_fingerprint } = request.body;

      // Validate input
      if (!name || !last_initial || !device_fingerprint) {
        return reply.code(400).send({
          error: 'missing_fields',
          message: 'name, last_initial, and device_fingerprint are required',
        });
      }

      // Sanitize inputs
      const sanitizedFirstName = sanitizeName(name);
      const sanitizedLastInitial = last_initial.trim().substring(0, 1);

      if (!sanitizedFirstName || !sanitizedLastInitial) {
        return reply.code(400).send({
          error: 'invalid_input',
          message: 'name and last_initial must contain valid characters',
        });
      }

      // Generate slug
      const slug = generateSlug(sanitizedFirstName, sanitizedLastInitial);
      
      // Check if slug already exists from a different device
      const slugExists = userQueries.findBySlug.get(slug) as User | undefined;

      if (slugExists) {
        // Slug conflict - return existing user data so they can claim it or create new
        return reply.code(409).send({
          error: 'slug_exists',
          existing_user: {
            id: slugExists.id,
            name: slugExists.name,
            slug: slugExists.slug,
            email: slugExists.email
          },
          suggestion: `${slug}-2`,
          message: `Is this the same ${slugExists.name} from earlier, or someone new?`,
        });
      }

      // Create new user
      const userId = uuidv4();
      const displayName = `${sanitizedFirstName} ${sanitizedLastInitial.toUpperCase()}`;

      try {
        userQueries.create.run(
          userId,
          displayName,
          slug,
          email || null,
          device_fingerprint
        );

        // Ensure storage directories exist
        ensureUserDirectories(slug);

        return reply.code(201).send({
          id: userId,
          name: displayName,
          slug,
          email: email || null,
          is_new: true,
        });
      } catch (error) {
        console.error('Error creating user:', error);
        return reply.code(500).send({
          error: 'creation_failed',
          message: 'Failed to create user',
        });
      }
    }
  );

  /**
   * GET /api/users/:slug
   * Get user info
   */
  fastify.get<{ Params: { slug: string } }>(
    '/users/:slug',
    async (request: FastifyRequest<{ Params: { slug: string } }>, reply: FastifyReply) => {
      const { slug } = request.params;

      const user = userQueries.getWithPhotoCounts.get(slug) as (User & {
        photo_count: number;
        session_count: number;
      }) | undefined;

      if (!user) {
        return reply.code(404).send({
          error: 'not_found',
          message: 'User not found',
        });
      }

      return reply.send({
        id: user.id,
        name: user.name,
        slug: user.slug,
        photo_count: user.photo_count,
        session_count: user.session_count,
      });
    }
  );

  /**
   * POST /api/users/:slug/send-email
   * Send user's photos via email
   */
  fastify.post<{ Params: { slug: string } }>(
    '/users/:slug/send-email',
    async (request: FastifyRequest<{ Params: { slug: string } }>, reply: FastifyReply) => {
      const { slug } = request.params;

      // Get user
      const user = userQueries.findBySlug.get(slug) as User | undefined;
      if (!user) {
        return reply.code(404).send({
          error: 'not_found',
          message: 'User not found',
        });
      }

      // Check if user has email
      if (!user.email) {
        return reply.code(400).send({
          error: 'no_email',
          message: 'User has no email address on file',
        });
      }

      // Get all user's photos
      const photos = photoQueries.findByUserId.all(user.id, 100, 0) as Array<{
        id: string;
        filename_web: string;
        filename_original: string;
        session_id: string | null;
      }>;

      if (photos.length === 0) {
        return reply.code(400).send({
          error: 'no_photos',
          message: 'User has no photos to send',
        });
      }

      // Get photos base path
      const photosBasePath = process.env.PHOTOS_PATH || resolve('./data/photos');

      // Build absolute paths to web versions
      const photoPaths = photos
        .filter(p => !p.session_id) // Individual photos only
        .map(p => path.join(photosBasePath, slug, 'web', `${p.id}.jpg`));

      // Get user's sessions with strips
      const sessions = sessionQueries.findByUserId.all(user.id) as Array<{
        id: string;
        strip_filename: string | null;
      }>;

      // Get strip path if exists
      let stripPath: string | undefined;
      if (sessions.length > 0 && sessions[0].strip_filename) {
        stripPath = path.join(photosBasePath, slug, 'strips', `${sessions[0].id}.jpg`);
      }

      try {
        // Send email
        await sendPhotosEmail({
          to: user.email,
          name: user.name,
          slug: user.slug,
          photoPaths,
          stripPath,
        });

        return reply.send({
          sent: true,
          email: user.email,
          photo_count: photoPaths.length,
        });
      } catch (error) {
        console.error('Failed to send email:', error);
        return reply.code(500).send({
          error: 'email_failed',
          message: error instanceof Error ? error.message : 'Failed to send email',
        });
      }
    }
  );
}
