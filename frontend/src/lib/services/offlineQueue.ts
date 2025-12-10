// IndexedDB service for offline photo queue
import { openDB, type IDBPDatabase } from 'idb';
import { pendingPhotoCount } from '$lib/stores/offline';

const DB_NAME = 'photobooth-offline';
const STORE_NAME = 'pending-photos';
const DB_VERSION = 1;

export interface PendingPhoto {
	id: string;
	userId: string;
	sessionId: string | null;
	blob: Blob;
	capturedAt: string;
	sequenceNumber: number | null;
	retryCount: number;
	createdAt: string;
}

let db: IDBPDatabase | null = null;

/**
 * Initialize the IndexedDB database
 */
export async function initOfflineDB(): Promise<void> {
	if (db) return; // Already initialized

	db = await openDB(DB_NAME, DB_VERSION, {
		upgrade(database) {
			// Create object store if it doesn't exist
			if (!database.objectStoreNames.contains(STORE_NAME)) {
				const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
				// Index for sorting by creation time (FIFO)
				store.createIndex('createdAt', 'createdAt');
			}
		}
	});

	// Update pending count on init
	await updatePendingCount();
}

/**
 * Queue a photo for later upload
 */
export async function queuePhoto(
	photo: Omit<PendingPhoto, 'retryCount' | 'createdAt'>
): Promise<void> {
	await initOfflineDB();
	if (!db) throw new Error('Database not initialized');

	const pendingPhoto: PendingPhoto = {
		...photo,
		retryCount: 0,
		createdAt: new Date().toISOString()
	};

	await db.add(STORE_NAME, pendingPhoto);
	await updatePendingCount();
}

/**
 * Get all pending photos in FIFO order
 */
export async function getPendingPhotos(): Promise<PendingPhoto[]> {
	await initOfflineDB();
	if (!db) return [];

	const tx = db.transaction(STORE_NAME, 'readonly');
	const index = tx.store.index('createdAt');
	return await index.getAll();
}

/**
 * Remove a photo from the queue after successful upload
 */
export async function removePendingPhoto(id: string): Promise<void> {
	await initOfflineDB();
	if (!db) return;

	await db.delete(STORE_NAME, id);
	await updatePendingCount();
}

/**
 * Increment retry count for a failed upload
 */
export async function incrementRetry(id: string): Promise<void> {
	await initOfflineDB();
	if (!db) return;

	const photo = await db.get(STORE_NAME, id);
	if (photo) {
		photo.retryCount++;
		await db.put(STORE_NAME, photo);
	}
}

/**
 * Get count of pending photos
 */
export async function getPendingCount(): Promise<number> {
	await initOfflineDB();
	if (!db) return 0;

	return await db.count(STORE_NAME);
}

/**
 * Update the pending photo count store
 */
async function updatePendingCount(): Promise<void> {
	const count = await getPendingCount();
	pendingPhotoCount.set(count);
}

/**
 * Clear all pending photos (for testing/reset)
 */
export async function clearAllPending(): Promise<void> {
	await initOfflineDB();
	if (!db) return;

	await db.clear(STORE_NAME);
	await updatePendingCount();
}

/**
 * Get photos that have exceeded retry limit
 */
export async function getFailedPhotos(maxRetries = 5): Promise<PendingPhoto[]> {
	const allPending = await getPendingPhotos();
	return allPending.filter((photo) => photo.retryCount >= maxRetries);
}
