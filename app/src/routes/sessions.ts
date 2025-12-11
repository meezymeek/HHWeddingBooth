import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { sessionQueries, userQueries, photoQueries } from '../services/database.js';
import { generateStrip } from '../services/imaging.js';
import { getPhotoPath, getPhotoUrl } from '../services/storage.js';

interface CreateSessionBody {
  user_id: string;
  photo_count: number;
  settings: {
    initial_countdown: number;
    between_delay: number;
  };
}

interface Session {
  id: string;
  user_id: string;
  photo_count: number;
  strip_filename: string | null;
  settings: string;
  created_at: string;
}

/**
 * Register session routes
 */
export async function sessionRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/sessions
   * Create a new photo booth session
   */
  fastify.post<{ Body: CreateSessionBody }>(
    '/sessions',
    async (request: FastifyRequest<{ Body: CreateSessionBody }>, reply: FastifyReply) => {
      const { user_id, photo_count, settings } = request.body;

      // Validate input
      if (!user_id || !photo_count || !settings) {
        return reply.code(400).send({
          error: 'missing_fields',
          message: 'user_id, photo_count, and settings are required',
        });
      }

      // Verify user exists
      const user = userQueries.findById.get(user_id);
      if (!user) {
        return reply.code(404).send({
          error: 'user_not_found',
          message: 'User does not exist',
        });
      }

      // Create session
      const sessionId = uuidv4();

      try {
        sessionQueries.create.run(
          sessionId,
          user_id,
          photo_count,
          JSON.stringify(settings)
        );

        return reply.code(201).send({
          id: sessionId,
          user_id,
          photo_count,
          settings,
        });
      } catch (error) {
        console.error('Error creating session:', error);
        return reply.code(500).send({
          error: 'creation_failed',
          message: 'Failed to create session',
        });
      }
    }
  );

  /**
   * POST /api/sessions/:id/generate-strip
   * Generate photo strip for a completed session
   */
  fastify.post<{ Params: { id: string } }>(
    '/sessions/:id/generate-strip',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;

      // Get session
      const session = sessionQueries.findById.get(id) as Session | undefined;
      if (!session) {
        return reply.code(404).send({
          error: 'session_not_found',
          message: 'Session not found',
        });
      }

      // Get user to get slug
      const user = userQueries.findById.get(session.user_id) as any;
      if (!user) {
        return reply.code(404).send({
          error: 'user_not_found',
          message: 'User not found',
        });
      }

      const userSlug = user.slug;

      // Get session photos
      const photos = photoQueries.findBySessionId.all(id) as any[];
      
      if (photos.length === 0) {
        return reply.code(400).send({
          error: 'no_photos',
          message: 'Session has no photos',
        });
      }

      // Get photo paths (web versions) with facing mode
      const photoPaths = photos.map(photo => ({
        path: getPhotoPath(userSlug, 'web', photo.filename_web),
        facingMode: photo.facing_mode || 'user'
      }));

      // Generate strip filename
      const stripFilename = `${id}.jpg`;
      const stripPath = getPhotoPath(userSlug, 'strips', stripFilename);

      try {
        // Generate strip
        await generateStrip(photoPaths, stripPath);

        // Update session with strip filename
        sessionQueries.updateStripFilename.run(stripFilename, id);

        return reply.send({
          strip_filename: getPhotoUrl(userSlug, 'strips', stripFilename),
        });
      } catch (error) {
        console.error('Error generating strip:', error);
        return reply.code(500).send({
          error: 'generation_failed',
          message: 'Failed to generate photo strip',
        });
      }
    }
  );

  /**
   * GET /api/sessions/:id
   * Get session details
   */
  fastify.get<{ Params: { id: string } }>(
    '/sessions/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;

      const session = sessionQueries.findById.get(id) as Session | undefined;
      if (!session) {
        return reply.code(404).send({
          error: 'session_not_found',
          message: 'Session not found',
        });
      }

      // Get user for slug
      const user = userQueries.findById.get(session.user_id) as any;
      const userSlug = user?.slug;

      return reply.send({
        id: session.id,
        user_id: session.user_id,
        photo_count: session.photo_count,
        strip_filename: session.strip_filename && userSlug
          ? getPhotoUrl(userSlug, 'strips', session.strip_filename)
          : null,
        settings: JSON.parse(session.settings),
        created_at: session.created_at,
      });
    }
  );
}
