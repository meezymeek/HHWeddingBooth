import type { User } from '$lib/stores/user';
import type { Photo, Session } from '$lib/stores/photos';

const API_BASE = '/api';

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
