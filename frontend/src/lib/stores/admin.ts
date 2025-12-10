// Admin authentication store
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

interface AdminSession {
	token: string;
	authenticated: boolean;
}

// Admin session (stored in sessionStorage for security)
function createAdminStore() {
	const stored = browser ? sessionStorage.getItem('admin_token') : null;
	const initial: AdminSession = {
		token: stored || '',
		authenticated: !!stored
	};

	const { subscribe, set, update } = writable<AdminSession>(initial);

	return {
		subscribe,
		login: (token: string) => {
			if (browser) {
				sessionStorage.setItem('admin_token', token);
			}
			set({ token, authenticated: true });
		},
		logout: () => {
			if (browser) {
				sessionStorage.removeItem('admin_token');
			}
			set({ token: '', authenticated: false });
		},
		checkAuth: () => {
			if (browser) {
				const token = sessionStorage.getItem('admin_token');
				if (token) {
					set({ token, authenticated: true });
				} else {
					set({ token: '', authenticated: false });
				}
			}
		}
	};
}

export const adminStore = createAdminStore();
