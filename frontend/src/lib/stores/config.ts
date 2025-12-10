import { writable } from 'svelte/store';

export interface Config {
	countdown_initial: number;
	countdown_between: number;
	max_photos: number;
	mirror_preview: boolean;
	overlay_enabled: boolean;
	email_auto_send: boolean;
	sound_enabled: boolean;
}

const defaultConfig: Config = {
	countdown_initial: 3,
	countdown_between: 1,
	max_photos: 10,
	mirror_preview: true,
	overlay_enabled: false,
	email_auto_send: false,
	sound_enabled: true
};

function createConfigStore() {
	const { subscribe, set, update } = writable<Config>(defaultConfig);

	return {
		subscribe,
		set,
		update,
		reset: () => set(defaultConfig)
	};
}

export const configStore = createConfigStore();
