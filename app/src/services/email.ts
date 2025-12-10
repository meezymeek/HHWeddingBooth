// Email service using Nodemailer
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import path from 'path';

interface EmailOptions {
	to: string;
	name: string;
	slug: string;
	photoPaths: string[];  // Array of absolute paths to web-sized photos
	stripPath?: string;    // Optional path to photo strip
}

let transporter: Transporter | null = null;

/**
 * Initialize the email transporter
 */
function getTransporter(): Transporter {
	if (transporter) return transporter;

	const gmailUser = process.env.GMAIL_USER;
	const gmailPassword = process.env.GMAIL_APP_PASSWORD;

	if (!gmailUser || !gmailPassword) {
		throw new Error('Email configuration missing. Set GMAIL_USER and GMAIL_APP_PASSWORD in .env');
	}

	transporter = nodemailer.createTransport({
		service: 'gmail',
		auth: {
			user: gmailUser,
			pass: gmailPassword
		}
	});

	return transporter;
}

/**
 * Send photos to a guest via email
 */
export async function sendPhotosEmail(options: EmailOptions): Promise<void> {
	const { to, name, slug, photoPaths, stripPath } = options;

	if (!to) {
		throw new Error('Email address is required');
	}

	const transport = getTransporter();

	// Prepare attachments
	const attachments = photoPaths.map((photoPath, index) => ({
		filename: `photo-${index + 1}.jpg`,
		path: photoPath
	}));

	// Add strip if available
	if (stripPath) {
		attachments.push({
			filename: 'photo-strip.jpg',
			path: stripPath
		});
	}

	// Gallery URL
	const galleryUrl = `${process.env.PUBLIC_URL || 'http://localhost:3001'}/gallery/${slug}`;

	// Send email
	await transport.sendMail({
		from: '"Haven & Hayden Photo Booth" <photobooth@meekthenilands.com>',
		to,
		subject: "Your photos from Haven & Hayden's wedding! 📸",
		html: `
			<!DOCTYPE html>
			<html>
			<head>
				<meta charset="utf-8">
				<style>
					body {
						font-family: Georgia, serif;
						max-width: 600px;
						margin: 0 auto;
						padding: 20px;
						background-color: #f5f5f5;
					}
					.container {
						background-color: white;
						border-radius: 8px;
						padding: 40px;
						box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
					}
					h1 {
						font-family: 'Great Vibes', cursive;
						font-size: 2.5em;
						text-align: center;
						margin-bottom: 10px;
						color: #1a1a2e;
					}
					.subtitle {
						text-align: center;
						color: #666;
						font-style: italic;
						margin-bottom: 30px;
					}
					p {
						line-height: 1.6;
						color: #333;
					}
					.button {
						display: inline-block;
						background-color: #1a1a2e;
						color: white;
						padding: 12px 24px;
						text-decoration: none;
						border-radius: 4px;
						margin: 20px 0;
					}
					.footer {
						color: #888;
						font-size: 0.9em;
						margin-top: 40px;
						text-align: center;
						padding-top: 20px;
						border-top: 1px solid #eee;
					}
					.ornament {
						color: #999;
						margin: 0 10px;
					}
				</style>
			</head>
			<body>
				<div class="container">
					<h1>Haven & Hayden</h1>
					<p class="subtitle">New Year's Eve 2025</p>
					
					<p>Hey ${name}!</p>
					
					<p>Thanks so much for celebrating with us! Here are your photos from the booth.</p>
					
					<p>
						<strong>View all your photos anytime:</strong><br>
						<a href="${galleryUrl}" class="button">View My Gallery</a>
					</p>
					
					<p>
						Your photos are attached to this email, and you can always access them at:<br>
						<a href="${galleryUrl}">${galleryUrl}</a>
					</p>
					
					<p style="margin-top: 30px;">
						Love,<br>
						Haven & Hayden 💍
					</p>
					
					<div class="footer">
						<span class="ornament">◆</span> New Year's Eve 2025 <span class="ornament">◆</span>
					</div>
				</div>
			</body>
			</html>
		`,
		attachments
	});
}

/**
 * Send bulk emails to all users with photos
 */
export async function sendBulkEmails(users: Array<{
	email: string;
	name: string;
	slug: string;
	photoPaths: string[];
	stripPath?: string;
}>): Promise<{ sent: number; failed: number; errors: string[] }> {
	let sent = 0;
	let failed = 0;
	const errors: string[] = [];

	for (const user of users) {
		try {
			await sendPhotosEmail({
				to: user.email,
				name: user.name,
				slug: user.slug,
				photoPaths: user.photoPaths,
				stripPath: user.stripPath
			});
			sent++;
		} catch (error) {
			failed++;
			const errorMsg = error instanceof Error ? error.message : 'Unknown error';
			errors.push(`${user.email}: ${errorMsg}`);
			console.error(`Failed to send email to ${user.email}:`, error);
		}
	}

	return { sent, failed, errors };
}

/**
 * Verify email configuration
 */
export async function verifyEmailConfig(): Promise<boolean> {
	try {
		const transport = getTransporter();
		await transport.verify();
		return true;
	} catch (error) {
		console.error('Email configuration verification failed:', error);
		return false;
	}
}
