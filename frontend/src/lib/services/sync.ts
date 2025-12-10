// Background sync service for offline photo uploads
import {
	getPendingPhotos,
	removePendingPhoto,
	incrementRetry,
	initOfflineDB
} from './offlineQueue';
import { uploadPhoto } from './api';
import { isOnline, isSyncing } from '$lib/stores/offline';
import { get } from 'svelte/store';
import { browser } from '$app/environment';

const MAX_RETRIES = 5;
let syncInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Attempt to sync all pending photos
 */
export async function syncPendingPhotos(): Promise<{
	synced: number;
	failed: number;
	remaining: number;
}> {
	// Don't sync if offline or already syncing
	if (!get(isOnline) || get(isSyncing)) {
		return { synced: 0, failed: 0, remaining: 0 };
	}

	isSyncing.set(true);

	try {
		const pending = await getPendingPhotos();
		let syncedCount = 0;
		let failedCount = 0;

		for (const photo of pending) {
			// Skip photos that have exceeded retry limit
			if (photo.retryCount >= MAX_RETRIES) {
				console.warn(`Photo ${photo.id} has exceeded ${MAX_RETRIES} retries, skipping`);
				failedCount++;
				continue;
			}

			try {
				// Attempt upload
				await uploadPhoto({
					user_id: photo.userId,
					session_id: photo.sessionId || undefined,
					blob: photo.blob,
					captured_at: photo.capturedAt,
					sequence_number: photo.sequenceNumber || undefined
				});

				// Success! Remove from queue
				await removePendingPhoto(photo.id);
				syncedCount++;

				console.log(`Successfully synced photo ${photo.id}`);
			} catch (error) {
				console.error(`Failed to sync photo ${photo.id}:`, error);

				// Increment retry count
				await incrementRetry(photo.id);
				failedCount++;

				// Stop on first failure to avoid overwhelming the server
				// Will retry on next sync attempt
				break;
			}
		}

		const remaining = pending.length - syncedCount;

		return { synced: syncedCount, failed: failedCount, remaining };
	} finally {
		isSyncing.set(false);
	}
}

/**
 * Start automatic sync on connection restore
 */
export function startAutoSync(): void {
	if (!browser) return;

	// Initialize database
	initOfflineDB();

	// Sync immediately if online
	if (navigator.onLine) {
		syncPendingPhotos();
	}

	// Listen for online event
	window.addEventListener('online', () => {
		console.log('Connection restored, syncing pending photos...');
		syncPendingPhotos();
	});

	// Poll every 30 seconds if online (backup to online event)
	syncInterval = setInterval(
		() => {
			if (navigator.onLine) {
				syncPendingPhotos();
			}
		},
		30 * 1000
	);
}

/**
 * Stop automatic sync
 */
export function stopAutoSync(): void {
	if (syncInterval) {
		clearInterval(syncInterval);
		syncInterval = null;
	}
}

/**
 * Manual sync trigger (for UI button)
 */
export async function triggerManualSync(): Promise<void> {
	if (!get(isOnline)) {
		throw new Error('Cannot sync while offline');
	}

	await syncPendingPhotos();
}
