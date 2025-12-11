import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { MultipartFile } from '@fastify/multipart';
import { v4 as uuidv4 } from 'uuid';
import { photoQueries, sessionQueries, userQueries } from '../services/database.js';
import { processPhoto } from '../services/imaging.js';
import { getPhotoUrl } from '../services/storage.js';

interface UploadPhotosBody {
  user_id: string;
  session_id?: string;
  captured_at: string[];
  sequence_numbers?: number[];
}

interface Photo {
  id: string;
  user_id: string;
  session_id: string | null;
  filename_original: string;
  filename_web: string;
  filename_thumb: string;
  captured_at: string;
  uploaded_at: string | null;
  is_synced: number;
  sequence_number: number | null;
}

/**
 * Register photo routes
 */
export async function photoRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/photos
   * Upload photos
   */
  fastify.post(
    '/photos',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const data = await request.file();
      
      if (!data) {
        return reply.code(400).send({
          error: 'no_file',
          message: 'No file uploaded',
        });
      }

      // Get form fields
      const userId = (data.fields.user_id as any)?.value as string;
      const sessionId = (data.fields.session_id as any)?.value as string | undefined;
      const capturedAt = (data.fields.captured_at as any)?.value as string;
      const sequenceNumber = (data.fields.sequence_number as any)?.value as string | undefined;
      const facingMode = (data.fields.facing_mode as any)?.value as string | undefined;

      // Validate required fields
      if (!userId || !capturedAt) {
        return reply.code(400).send({
          error: 'missing_fields',
          message: 'user_id and captured_at are required',
        });
      }

      // Verify user exists
      const user = userQueries.findById.get(userId);
      if (!user) {
        return reply.code(404).send({
          error: 'user_not_found',
          message: 'User does not exist',
        });
      }

      // Get user slug
      const userSlug = (user as any).slug;

      try {
        // Read file buffer
        const buffer = await data.toBuffer();

        // Generate photo ID
        const photoId = uuidv4();

        // Process photo (create web and thumb versions)
        const processedPaths = await processPhoto(buffer, userSlug, photoId);

        // Store in database
        const filename = `${photoId}.jpg`;
        photoQueries.create.run(
          photoId,
          userId,
          sessionId || null,
          filename,
          filename,
          filename,
          capturedAt,
          sequenceNumber ? parseInt(sequenceNumber) : null,
          facingMode || 'user'
        );

        // Generate URLs
        const photoUrls = {
          id: photoId,
          filename_web: getPhotoUrl(userSlug, 'web', filename),
          filename_thumb: getPhotoUrl(userSlug, 'thumb', filename),
        };

        return reply.code(201).send({
          photo: photoUrls,
        });
      } catch (error) {
        console.error('Error uploading photo:', error);
        return reply.code(500).send({
          error: 'upload_failed',
          message: 'Failed to process and save photo',
        });
      }
    }
  );

  /**
   * GET /api/users/:slug/photos
   * Get user's photos
   */
  fastify.get<{
    Params: { slug: string };
    Querystring: { page?: string; per_page?: string };
  }>(
    '/users/:slug/photos',
    async (request: FastifyRequest<{
      Params: { slug: string };
      Querystring: { page?: string; per_page?: string };
    }>, reply: FastifyReply) => {
      const { slug } = request.params;
      const page = parseInt(request.query.page || '1');
      const perPage = Math.min(parseInt(request.query.per_page || '50'), 100);
      const offset = (page - 1) * perPage;

      // Find user
      const user = userQueries.findBySlug.get(slug);
      if (!user) {
        return reply.code(404).send({
          error: 'user_not_found',
          message: 'User not found',
        });
      }

      const userId = (user as any).id;

      // Get photos
      const photos = photoQueries.findByUserId.all(userId, perPage, offset) as Photo[];
      const totalResult = photoQueries.countByUserId.get(userId) as { count: number };
      const total = totalResult.count;

      // Get sessions
      const sessions = sessionQueries.findByUserId.all(userId);

      // Transform photos with URLs
      const photosWithUrls = photos.map(photo => ({
        id: photo.id,
        filename_web: getPhotoUrl(slug, 'web', photo.filename_web),
        filename_thumb: getPhotoUrl(slug, 'thumb', photo.filename_thumb),
        captured_at: photo.captured_at,
        session_id: photo.session_id,
      }));

      // Transform sessions with URLs
      const sessionsWithUrls = (sessions as any[]).map(session => {
        const sessionPhotos = photoQueries.findBySessionId.all(session.id) as Photo[];
        
        return {
          id: session.id,
          photo_count: session.photo_count,
          strip_filename: session.strip_filename 
            ? getPhotoUrl(slug, 'strips', session.strip_filename)
            : null,
          created_at: session.created_at,
          photos: sessionPhotos.map(p => p.id),
        };
      });

      return reply.send({
        photos: photosWithUrls,
        sessions: sessionsWithUrls,
        pagination: {
          page,
          per_page: perPage,
          total,
        },
      });
    }
  );
}
