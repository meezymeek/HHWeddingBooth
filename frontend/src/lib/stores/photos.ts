import { writable } from 'svelte/store';

export interface Photo {
	id: string;
	filename_web: string;
	filename_thumb: string;
	captured_at: string;
	session_id: string | null;
}

export interface Session {
	id: string;
	photo_count: number;
	strip_filename: string | null;
	created_at: string;
	photos: string[];
}

interface PhotosState {
	photos: Photo[];
	sessions: Session[];
	loading: boolean;
	error: string | null;
}

function createPhotosStore() {
	const { subscribe, set, update } = writable<PhotosState>({
		photos: [],
		sessions: [],
		loading: false,
		error: null
	});

	return {
		subscribe,
		set,
		update,
		addPhoto: (photo: Photo) => {
			update(state => ({
				...state,
				photos: [photo, ...state.photos]
			}));
		},
		addSession: (session: Session) => {
			update(state => ({
				...state,
				sessions: [session, ...state.sessions]
			}));
		},
		setLoading: (loading: boolean) => {
			update(state => ({ ...state, loading }));
		},
		setError: (error: string | null) => {
			update(state => ({ ...state, error }));
		},
		clear: () => {
			set({
				photos: [],
				sessions: [],
				loading: false,
				error: null
			});
		}
	};
}

export const photosStore = createPhotosStore();
