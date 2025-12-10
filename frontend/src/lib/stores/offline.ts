// Online/Offline detection store
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Track online/offline status
export const isOnline = writable(browser ? navigator.onLine : true);

// Track pending photos count
export const pendingPhotoCount = writable(0);

// Track sync status
export const isSyncing = writable(false);

// Initialize listeners in browser environment
if (browser) {
	// Listen for online/offline events
	window.addEventListener('online', () => {
		isOnline.set(true);
	});

	window.addEventListener('offline', () => {
		isOnline.set(false);
	});
}
