import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { userQueries } from '../services/database.js';
import { generateSlug, sanitizeName } from '../utils/slug.js';
import { ensureUserDirectories } from '../services/storage.js';

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
}
