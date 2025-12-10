<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { getUserPhotos } from '$lib/services/api';
	import type { Photo, Session } from '$lib/stores/photos';

	let slug = $page.params.slug;
	let photos: Photo[] = [];
	let sessions: Session[] = [];
	let loading = true;
	let error = '';
	let selectedPhoto: string | null = null;

	onMount(async () => {
		await loadPhotos();
	});

	async function loadPhotos() {
		loading = true;
		error = '';

		try {
			const data = await getUserPhotos(slug);
			photos = data.photos;
			sessions = data.sessions;
		} catch (err) {
			console.error('Error loading photos:', err);
			error = err instanceof Error ? err.message : 'Failed to load photos';
		} finally {
			loading = false;
		}
	}

	function viewPhoto(url: string) {
		selectedPhoto = url;
	}

	function closeViewer() {
		selectedPhoto = null;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			closeViewer();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="gallery-container">
	<div class="max-w-6xl mx-auto p-6">
		<div class="text-center mb-12">
			<h1 class="text-display mb-2">
				Haven <span class="ornament"></span> Hayden
			</h1>
			<p class="text-script mb-4">Photo Gallery</p>
			<div class="h-px bg-white/20 my-6 mx-auto w-1/2"></div>
			<h2 class="text-2xl">Your Photos</h2>
		</div>

		{#if loading}
			<div class="text-center py-20">
				<div class="text-2xl opacity-50">Loading photos...</div>
			</div>
		{:else if error}
			<div class="card text-center max-w-md mx-auto">
				<p class="text-xl mb-4">⚠️</p>
				<p>{error}</p>
				<a href="/booth" class="btn btn-primary mt-6 inline-block">
					← Back to Booth
				</a>
			</div>
		{:else if photos.length === 0 && sessions.length === 0}
			<div class="card text-center max-w-md mx-auto">
				<p class="text-xl mb-4">📸</p>
				<p class="text-lg mb-4">No photos yet!</p>
				<p class="opacity-70 mb-6">Start capturing some memories in the photo booth.</p>
				<a href="/booth" class="btn btn-primary inline-block">
					Go to Booth →
				</a>
			</div>
		{:else}
			<!-- Sessions (Photo Strips) -->
			{#if sessions.length > 0}
				<div class="mb-12">
					<h3 class="text-heading text-xl mb-6">Photo Booth Sessions 🎞️</h3>
					<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
						{#each sessions as session}
							{#if session.strip_filename}
								<button
									on:click={() => viewPhoto(session.strip_filename || '')}
									class="gallery-item group"
								>
									<img
										src={session.strip_filename}
										alt="Photo strip"
										class="gallery-image"
									/>
									<div class="gallery-overlay">
										<span class="text-sm">
											{session.photo_count} photos
										</span>
									</div>
								</button>
							{/if}
						{/each}
					</div>
				</div>
			{/if}

			<!-- Individual Photos -->
			{#if photos.filter(p => !p.session_id).length > 0}
				<div>
					<h3 class="text-heading text-xl mb-6">Individual Photos 📸</h3>
					<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
						{#each photos.filter(p => !p.session_id) as photo}
							<button
								on:click={() => viewPhoto(photo.filename_web)}
								class="gallery-item group"
							>
								<img
									src={photo.filename_thumb}
									alt="Photo"
									class="gallery-image"
								/>
								<div class="gallery-overlay">
									<span class="text-sm">View</span>
								</div>
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<div class="text-center mt-12">
				<a href="/booth" class="btn btn-primary btn-large">
					← Back to Booth
				</a>
			</div>
		{/if}
	</div>
</div>

<!-- Fullscreen Photo Viewer -->
{#if selectedPhoto}
	<div class="photo-viewer" on:click={closeViewer}>
		<button class="viewer-close" on:click={closeViewer}>
			✕
		</button>
		<img src={selectedPhoto} alt="Full size" class="viewer-image" />
		<p class="viewer-hint">Click anywhere to close</p>
	</div>
{/if}

<style>
	.gallery-container {
		min-height: 100vh;
		padding: 40px 0;
	}

	.gallery-item {
		position: relative;
		aspect-ratio: 3 / 4;
		overflow: hidden;
		border-radius: 8px;
		cursor: pointer;
		transition: transform 0.2s;
		background: rgba(0, 0, 0, 0.5);
	}

	.gallery-item:hover {
		transform: scale(1.05);
	}

	.gallery-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.gallery-overlay {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		padding: 8px;
		background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
		color: white;
		text-align: center;
		opacity: 0;
		transition: opacity 0.2s;
	}

	.gallery-item:hover .gallery-overlay {
		opacity: 1;
	}

	.photo-viewer {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.95);
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-direction: column;
		padding: 20px;
		backdrop-filter: blur(10px);
	}

	.viewer-close {
		position: absolute;
		top: 20px;
		right: 20px;
		width: 50px;
		height: 50px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.2);
		border: 2px solid white;
		color: white;
		font-size: 24px;
		cursor: pointer;
		transition: all 0.2s;
		z-index: 1001;
	}

	.viewer-close:hover {
		background: rgba(255, 255, 255, 0.4);
		transform: scale(1.1);
	}

	.viewer-image {
		max-width: 90%;
		max-height: 90vh;
		object-fit: contain;
		border-radius: 8px;
	}

	.viewer-hint {
		margin-top: 20px;
		opacity: 0.6;
		font-size: 0.9rem;
	}
</style>
