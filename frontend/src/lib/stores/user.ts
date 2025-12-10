import { writable } from 'svelte/store';

export interface User {
	id: string;
	name: string;
	slug: string;
	email: string | null;
}

function createUserStore() {
	const { subscribe, set, update } = writable<User | null>(null);

	return {
		subscribe,
		set,
		update,
		logout: () => {
			set(null);
			if (typeof localStorage !== 'undefined') {
				localStorage.removeItem('photobooth_user');
			}
		}
	};
}

export const userStore = createUserStore();
