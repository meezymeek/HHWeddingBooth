<script lang="ts">
	import { goto } from '$app/navigation';
	import { userStore } from '$lib/stores/user';
	import { configStore } from '$lib/stores/config';
	import { uploadPhotoWithOfflineSupport } from '$lib/services/api';
	import { isOnline } from '$lib/stores/offline';
	import Camera from '$lib/components/Camera.svelte';
	import { onMount } from 'svelte';

	let user: any = null;
	let camera: Camera;
	let capturedBlob: Blob | null = null;
	let previewUrl: string | null = null;
	let uploading = false;
	let error = '';
	let capturedWithFrontCamera = true; // Track which camera was used
	let capturedFacingMode: 'user' | 'environment' = 'user'; // Track facing mode for upload

	$: countdownSeconds = $configStore.countdown_initial;
	$: mirror = $configStore.mirror_preview;
	// Photos are already saved with correct orientation, no need to mirror in preview
	$: previewMirrored = false;

	onMount(() => {
		const storedUser = localStorage.getItem('photobooth_user');
		if (!storedUser) {
			goto('/');
			return;
		}
		user = JSON.parse(storedUser);
	});

	function handleCapture(event: CustomEvent<{ blob: Blob; facingMode: 'user' | 'environment' }>) {
		capturedBlob = event.detail.blob;
		capturedFacingMode = event.detail.facingMode;
		capturedWithFrontCamera = event.detail.facingMode === 'user';
		previewUrl = URL.createObjectURL(capturedBlob);
	}

	function retake() {
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
		}
		capturedBlob = null;
		previewUrl = null;
	}

	async function save() {
		if (!capturedBlob || !user) return;

		uploading = true;
		error = '';

		try {
			const result = await uploadPhotoWithOfflineSupport({
				user_id: user.id,
				blob: capturedBlob,
				captured_at: new Date().toISOString(),
				facing_mode: capturedFacingMode
			});

			// If offline, result will be null but photo is queued
			if (!result && !$isOnline) {
				console.log('Photo queued for offline sync');
			}

			// Success! Redirect back to booth menu
			goto('/booth');
		} catch (err) {
			console.error('Upload error:', err);
			error = err instanceof Error ? err.message : 'Failed to save photo';
			uploading = false;
		}
	}

	function cancel() {
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
		}
		goto('/booth');
	}
</script>

{#if !user}
	<div class="flex min-h-screen items-center justify-center">
		<div class="text-2xl opacity-50">Loading...</div>
	</div>
{:else if previewUrl}
	<!-- Preview Screen -->
	<div class="preview-container">
		<img src={previewUrl} alt="Captured photo" class="preview-image" class:mirrored={previewMirrored} />

		<div class="preview-controls">
			<h2 class="text-2xl mb-6 text-center">How's it look?</h2>

			{#if error}
				<div class="error-banner">
					{error}
				</div>
			{/if}

			<div class="flex gap-4 justify-center">
				<button
					on:click={retake}
					disabled={uploading}
					class="btn btn-large"
				>
					🔄 Retake
				</button>

				<button
					on:click={save}
					disabled={uploading}
					class="btn btn-primary btn-large"
				>
					{uploading ? 'Saving...' : '✨ Save Photo'}
				</button>
			</div>

			<button
				on:click={cancel}
				disabled={uploading}
				class="btn mt-4"
			>
				← Back to Menu
			</button>
		</div>
	</div>
{:else}
	<!-- Camera View -->
	<div class="relative">
		<Camera
			bind:this={camera}
			{mirror}
			{countdownSeconds}
			on:capture={handleCapture}
		/>

		<div class="top-bar">
			<button on:click={cancel} class="btn">
				← Cancel
			</button>
		</div>
	</div>
{/if}

<style>
	.preview-container {
		position: relative;
		width: 100%;
		min-height: 100vh;
		background: #000;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 20px;
	}

	.preview-image {
		max-width: 90%;
		max-height: 70vh;
		object-fit: contain;
		border-radius: 8px;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
		margin-bottom: 30px;
	}

	.preview-image.mirrored {
		transform: scaleX(-1);
	}

	.preview-controls {
		width: 100%;
		max-width: 600px;
	}

	.top-bar {
		position: absolute;
		top: 20px;
		left: 20px;
		z-index: 20;
	}

	.error-banner {
		background: rgba(239, 68, 68, 0.2);
		border: 2px solid rgba(239, 68, 68, 0.5);
		color: rgb(254, 202, 202);
		padding: 12px;
		border-radius: 8px;
		margin-bottom: 16px;
		text-align: center;
	}
</style>
