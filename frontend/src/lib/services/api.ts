import type { User } from '$lib/stores/user';
import type { Photo, Session } from '$lib/stores/photos';
import { queuePhoto } from './offlineQueue';
import { get } from 'svelte/store';
import { isOnline } from '$lib/stores/offline';

const API_BASE = '/api';

// UUID generation for browser
function generateUUID(): string {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
		const r = (Math.random() * 16) | 0;
		const v = c === 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

/**
 * Upload a photo with offline support
 * If offline, queues the photo for later sync
 * If online, uploads immediately
 */
export async function uploadPhotoWithOfflineSupport(data: {
	user_id: string;
	session_id?: string;
	blob: Blob;
	captured_at: string;
	sequence_number?: number;
	facing_mode?: 'user' | 'environment';
}): Promise<{
	photo: {
		id: string;
		filename_web: string;
		filename_thumb: string;
	};
} | null> {
	// If offline, queue for later
	if (!get(isOnline)) {
		await queuePhoto({
			id: generateUUID(),
			userId: data.user_id,
			sessionId: data.session_id || null,
			blob: data.blob,
			capturedAt: data.captured_at,
			sequenceNumber: data.sequence_number || null
		});
		return null; // Photo queued, no immediate response
	}

	// If online, upload immediately
	return uploadPhoto(data);
}

/**
 * Create or lookup a user
 */
export async function createUser(data: {
	name: string;
	last_initial: string;
	email?: string;
	device_fingerprint: string;
}): Promise<{
	id: string;
	name: string;
	slug: string;
	email: string | null;
	is_new: boolean;
}> {
	const response = await fetch(`${API_BASE}/users`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(data)
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to create user');
	}

	return response.json();
}

/**
 * Send user's photos via email
 */
export async function sendEmail(slug: string): Promise<{
	sent: boolean;
	email: string;
	photo_count: number;
}> {
	const response = await fetch(`${API_BASE}/users/${slug}/send-email`, {
		method: 'POST'
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to send email');
	}

	return response.json();
}

/**
 * Admin API Functions
 */

/**
 * Verify admin password
 */
export async function verifyAdminPassword(password: string): Promise<{
	valid: boolean;
	token?: string;
}> {
	const response = await fetch(`${API_BASE}/admin/verify`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ password })
	});

	return response.json();
}

/**
 * Get all users (admin only)
 */
export async function getAdminUsers(token: string): Promise<{
	users: Array<{
		id: string;
		name: string;
		slug: string;
		email: string | null;
		photo_count: number;
		session_count: number;
		last_active: string;
	}>;
}> {
	const response = await fetch(`${API_BASE}/admin/users`, {
		headers: { Authorization: `Bearer ${token}` }
	});

	if (!response.ok) {
		throw new Error('Failed to fetch users');
	}

	return response.json();
}

/**
 * Get all photos (admin only)
 */
export async function getAdminPhotos(
	token: string,
	page: number = 1,
	perPage: number = 50
): Promise<{
	photos: Array<any>;
	pagination: any;
}> {
	const response = await fetch(`${API_BASE}/admin/photos?page=${page}&per_page=${perPage}`, {
		headers: { Authorization: `Bearer ${token}` }
	});

	if (!response.ok) {
		throw new Error('Failed to fetch photos');
	}

	return response.json();
}

/**
 * Get admin stats
 */
export async function getAdminStats(token: string): Promise<{
	total_users: number;
	total_photos: number;
	total_sessions: number;
	users_with_email: number;
}> {
	const response = await fetch(`${API_BASE}/admin/stats`, {
		headers: { Authorization: `Bearer ${token}` }
	});

	if (!response.ok) {
		throw new Error('Failed to fetch stats');
	}

	return response.json();
}

/**
 * Trigger bulk email send (admin only)
 */
export async function sendBulkEmails(token: string): Promise<{
	sent: number;
	failed: number;
	total: number;
	errors: string[];
}> {
	const response = await fetch(`${API_BASE}/admin/send-bulk-emails`, {
		method: 'POST',
		headers: { Authorization: `Bearer ${token}` }
	});

	if (!response.ok) {
		throw new Error('Failed to send bulk emails');
	}

	return response.json();
}

/**
 * Download all photos as ZIP (admin only)
 */
export function getDownloadUrl(token: string, quality: 'web' | 'original' = 'web'): string {
	return `${API_BASE}/admin/download?quality=${quality}&token=${token}`;
}

/**
 * Get user info by slug
 */
export async function getUserInfo(slug: string): Promise<{
	id: string;
	name: string;
	slug: string;
	photo_count: number;
	session_count: number;
}> {
	const response = await fetch(`${API_BASE}/users/${slug}`);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to get user info');
	}

	return response.json();
}

/**
 * Upload a photo
 */
export async function uploadPhoto(data: {
	user_id: string;
	session_id?: string;
	blob: Blob;
	captured_at: string;
	sequence_number?: number;
	facing_mode?: 'user' | 'environment';
}): Promise<{
	photo: {
		id: string;
		filename_web: string;
		filename_thumb: string;
	};
}> {
	const formData = new FormData();
	formData.append('user_id', data.user_id);
	formData.append('captured_at', data.captured_at);
	
	if (data.session_id) {
		formData.append('session_id', data.session_id);
	}
	
	if (data.sequence_number !== undefined) {
		formData.append('sequence_number', String(data.sequence_number));
	}
	
	if (data.facing_mode) {
		formData.append('facing_mode', data.facing_mode);
	}
	
	formData.append('file', data.blob, 'photo.jpg');

	const response = await fetch(`${API_BASE}/photos`, {
		method: 'POST',
		body: formData
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to upload photo');
	}

	return response.json();
}

/**
 * Get user's photos
 */
export async function getUserPhotos(slug: string, page: number = 1, perPage: number = 50): Promise<{
	photos: Photo[];
	sessions: Session[];
	pagination: {
		page: number;
		per_page: number;
		total: number;
	};
}> {
	const response = await fetch(`${API_BASE}/users/${slug}/photos?page=${page}&per_page=${perPage}`);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to get photos');
	}

	return response.json();
}

/**
 * Create a new photo booth session
 */
export async function createSession(data: {
	user_id: string;
	photo_count: number;
	settings: {
		initial_countdown: number;
		between_delay: number;
	};
}): Promise<{
	id: string;
	user_id: string;
	photo_count: number;
	settings: {
		initial_countdown: number;
		between_delay: number;
	};
}> {
	const response = await fetch(`${API_BASE}/sessions`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(data)
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to create session');
	}

	return response.json();
}

/**
 * Generate photo strip for a session
 */
export async function generateStrip(sessionId: string): Promise<{
	strip_filename: string;
}> {
	const response = await fetch(`${API_BASE}/sessions/${sessionId}/generate-strip`, {
		method: 'POST'
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to generate strip');
	}

	return response.json();
}

/**
 * Get session details
 */
export async function getSession(sessionId: string): Promise<{
	id: string;
	user_id: string;
	photo_count: number;
	strip_filename: string | null;
	settings: {
		initial_countdown: number;
		between_delay: number;
	};
	created_at: string;
}> {
	const response = await fetch(`${API_BASE}/sessions/${sessionId}`);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to get session');
	}

	return response.json();
}
