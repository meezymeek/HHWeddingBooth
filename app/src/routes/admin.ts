import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { userQueries, photoQueries, sessionQueries } from '../services/database.js';
import { sendBulkEmails } from '../services/email.js';
import archiver from 'archiver';
import { createReadStream, existsSync } from 'fs';
import path from 'path';
import { resolve } from 'path';

/**
 * Admin authentication middleware
 */
async function adminAuth(request: FastifyRequest, reply: FastifyReply) {
	const adminPassword = process.env.ADMIN_PASSWORD;

	if (!adminPassword) {
		return reply.code(500).send({
			error: 'config_missing',
			message: 'Admin password not configured'
		});
	}

	// Check Authorization header
	const authHeader = request.headers.authorization;
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return reply.code(401).send({
			error: 'unauthorized',
			message: 'Admin authentication required'
		});
	}

	const token = authHeader.substring(7);
	if (token !== adminPassword) {
		return reply.code(403).send({
			error: 'forbidden',
			message: 'Invalid admin password'
		});
	}
}

/**
 * Register admin routes
 */
export async function adminRoutes(fastify: FastifyInstance) {
	// Add admin auth hook to all admin routes
	fastify.addHook('onRequest', adminAuth);

	/**
	 * GET /api/admin/users
	 * List all users with photo counts
	 */
	fastify.get('/users', async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			const users = userQueries.getAll.all() as Array<{
				id: string;
				name: string;
				slug: string;
				email: string | null;
				photo_count: number;
				session_count: number;
				last_active: string;
				created_at: string;
			}>;

			return reply.send({ users });
		} catch (error) {
			console.error('Failed to fetch users:', error);
			return reply.code(500).send({
				error: 'fetch_failed',
				message: 'Failed to fetch users'
			});
		}
	});

	/**
	 * GET /api/admin/photos
	 * List all photos across all users
	 */
	fastify.get<{
		Querystring: { page?: string; per_page?: string; user_id?: string };
	}>('/photos', async (request, reply: FastifyReply) => {
		try {
			const page = parseInt(request.query.page || '1');
			const perPage = parseInt(request.query.per_page || '50');
			const offset = (page - 1) * perPage;

			// Get total count
			const countResult = photoQueries.getAllCount.get() as { count: number };
			const total = countResult.count;

			// Get photos
			const photos = photoQueries.getAll.all(perPage, offset) as Array<{
				id: string;
				user_id: string;
				user_name: string;
				user_slug: string;
				session_id: string | null;
				filename_web: string;
				filename_thumb: string;
				captured_at: string;
				sequence_number: number | null;
			}>;

			return reply.send({
				photos,
				pagination: {
					page,
					per_page: perPage,
					total,
					total_pages: Math.ceil(total / perPage)
				}
			});
		} catch (error) {
			console.error('Failed to fetch photos:', error);
			return reply.code(500).send({
				error: 'fetch_failed',
				message: 'Failed to fetch photos'
			});
		}
	});

	/**
	 * GET /api/admin/download
	 * Bulk download all photos as ZIP
	 */
	fastify.get<{
		Querystring: { user_id?: string; quality?: string };
	}>('/download', async (request, reply: FastifyReply) => {
		try {
			const quality = request.query.quality || 'web'; // 'web' or 'original'
			const photosBasePath = process.env.PHOTOS_PATH || resolve('./data/photos');

			// Create ZIP archive
			const archive = archiver('zip', { zlib: { level: 9 } });

			// Set response headers
			reply.raw.writeHead(200, {
				'Content-Type': 'application/zip',
				'Content-Disposition': `attachment; filename="photobooth-photos-${Date.now()}.zip"`
			});

			// Pipe archive to response
			archive.pipe(reply.raw);

			// Get all photos
			const photos = photoQueries.getAll.all(10000, 0) as Array<{
				id: string;
				user_slug: string;
				user_name: string;
				filename_web: string;
				filename_original: string;
				session_id: string | null;
				captured_at: string;
			}>;

			// Add each photo to archive
			for (const photo of photos) {
				const fileName = quality === 'original' ? photo.filename_original : photo.filename_web;
				const filePath = path.join(
					photosBasePath,
					photo.user_slug,
					quality === 'original' ? 'original' : 'web',
					`${photo.id}.jpg`
				);

				if (existsSync(filePath)) {
					// Add file with organized path: user-name/photo-id.jpg
					const zipPath = `${photo.user_slug}/${photo.id}.jpg`;
					archive.append(createReadStream(filePath), { name: zipPath });
				}
			}

			// Get all strips
			const sessions = sessionQueries.findByUserId.all('') as Array<{
				id: string;
				user_id: string;
			}>;

			// Actually get all sessions properly
			const allUsers = userQueries.getAll.all() as Array<{ id: string; slug: string }>;
			
			for (const user of allUsers) {
				const userSessions = sessionQueries.findByUserId.all(user.id) as Array<{
					id: string;
					strip_filename: string | null;
				}>;

				for (const session of userSessions) {
					if (session.strip_filename) {
						const stripPath = path.join(photosBasePath, user.slug, 'strips', `${session.id}.jpg`);
						if (existsSync(stripPath)) {
							const zipPath = `${user.slug}/strips/${session.id}.jpg`;
							archive.append(createReadStream(stripPath), { name: zipPath });
						}
					}
				}
			}

			// Finalize archive
			await archive.finalize();

		} catch (error) {
			console.error('Failed to create ZIP:', error);
			return reply.code(500).send({
				error: 'zip_failed',
				message: 'Failed to create ZIP archive'
			});
		}
	});

	/**
	 * POST /api/admin/send-bulk-emails
	 * Send emails to all users with email addresses
	 */
	fastify.post('/send-bulk-emails', async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			const photosBasePath = process.env.PHOTOS_PATH || resolve('./data/photos');

			// Get all users with emails
			const allUsers = userQueries.getAll.all() as Array<{
				id: string;
				name: string;
				slug: string;
				email: string | null;
			}>;

			const usersWithEmail = allUsers.filter(u => u.email);

			if (usersWithEmail.length === 0) {
				return reply.code(400).send({
					error: 'no_emails',
					message: 'No users have email addresses on file'
				});
			}

			// Prepare email data for each user
			const emailData = usersWithEmail.map(user => {
				// Get user's photos
				const photos = photoQueries.findByUserId.all(user.id, 100, 0) as Array<{
					id: string;
					session_id: string | null;
				}>;

				// Build photo paths
				const photoPaths = photos
					.filter(p => !p.session_id)
					.map(p => path.join(photosBasePath, user.slug, 'web', `${p.id}.jpg`));

				// Get strip path
				const sessions = sessionQueries.findByUserId.all(user.id) as Array<{
					id: string;
					strip_filename: string | null;
				}>;

				let stripPath: string | undefined;
				if (sessions.length > 0 && sessions[0].strip_filename) {
					stripPath = path.join(photosBasePath, user.slug, 'strips', `${sessions[0].id}.jpg`);
				}

				return {
					email: user.email!,
					name: user.name,
					slug: user.slug,
					photoPaths,
					stripPath
				};
			});

			// Send bulk emails
			const result = await sendBulkEmails(emailData);

			return reply.send({
				sent: result.sent,
				failed: result.failed,
				total: usersWithEmail.length,
				errors: result.errors
			});

		} catch (error) {
			console.error('Bulk email failed:', error);
			return reply.code(500).send({
				error: 'bulk_email_failed',
				message: error instanceof Error ? error.message : 'Failed to send bulk emails'
			});
		}
	});

	/**
	 * GET /api/admin/stats
	 * Get overall statistics
	 */
	fastify.get('/stats', async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			const users = userQueries.getAll.all() as Array<{
				photo_count: number;
				session_count: number;
			}>;

			const totalPhotoCount = photoQueries.getAllCount.get() as { count: number };

			const stats = {
				total_users: users.length,
				total_photos: totalPhotoCount.count,
				total_sessions: users.reduce((sum, u) => sum + u.session_count, 0),
				users_with_email: users.filter((u: any) => u.email).length
			};

			return reply.send(stats);
		} catch (error) {
			console.error('Failed to fetch stats:', error);
			return reply.code(500).send({
				error: 'stats_failed',
				message: 'Failed to fetch statistics'
			});
		}
	});

	/**
	 * POST /api/admin/verify
	 * Verify admin password (for login)
	 */
	fastify.post<{ Body: { password: string } }>(
		'/verify',
		{ onRequest: [] }, // Skip auth for this route
		async (request: FastifyRequest<{ Body: { password: string } }>, reply: FastifyReply) => {
			const { password } = request.body;
			const adminPassword = process.env.ADMIN_PASSWORD;

			if (!adminPassword) {
				return reply.code(500).send({
					error: 'config_missing',
					message: 'Admin password not configured'
				});
			}

			if (password === adminPassword) {
				return reply.send({ valid: true, token: adminPassword });
			} else {
				return reply.code(401).send({ valid: false });
			}
		}
	);
}
