<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { createSession, uploadPhotoWithOfflineSupport, generateStrip } from '$lib/services/api';
	import { isOnline } from '$lib/stores/offline';
	import Camera from '$lib/components/Camera.svelte';

	// User state
	let user: any = null;

	// Screen states: 'config', 'capturing', 'preview'
	let screen: 'config' | 'capturing' | 'preview' = 'config';

	// Configuration
	let photoCount = 4;
	let initialCountdown = 3;
	let betweenDelay = 3;
	let selectedCamera: 'user' | 'environment' = 'user'; // Default to front camera

	// Capture state
	let camera: Camera;
	let currentPhotoIndex = 0;
	let capturedPhotos: Array<{ blob: Blob; url: string; facingMode: 'user' | 'environment' }> = [];
	let sessionId: string | null = null;
	let delayCountdown = 0;
	let isWaitingBetweenShots = false;

	// Preview state
	let stripUrl: string | null = null;
	let uploading = false;
	let error = '';

	onMount(() => {
		const storedUser = localStorage.getItem('photobooth_user');
		if (!storedUser) {
			goto('/');
			return;
		}
		user = JSON.parse(storedUser);
	});

	async function startSession() {
		if (!user) return;

		try {
			error = '';
			// Create session
			const session = await createSession({
				user_id: user.id,
				photo_count: photoCount,
				settings: {
					initial_countdown: initialCountdown,
					between_delay: betweenDelay
				}
			});

			sessionId = session.id;
			screen = 'capturing';
			currentPhotoIndex = 0;
			capturedPhotos = [];

			// Start first photo - Camera's countdown will handle it
			setTimeout(() => {
				if (camera) {
					camera.capture();
				}
			}, 100);
		} catch (err) {
			console.error('Session creation error:', err);
			error = err instanceof Error ? err.message : 'Failed to start session';
		}
	}

	function handleCapture(event: CustomEvent<{ blob: Blob; facingMode: 'user' | 'environment' }>) {
		const { blob, facingMode } = event.detail;
		const url = URL.createObjectURL(blob);
		
		capturedPhotos = [...capturedPhotos, { blob, url, facingMode }];
		currentPhotoIndex++;

		// Check if we need more photos
		if (currentPhotoIndex < photoCount) {
			// Small delay to let Svelte update the component with new countdownSeconds
			setTimeout(() => {
				if (camera) {
					camera.capture();
				}
			}, 100);
		} else {
			// All photos captured, move to preview
			screen = 'preview';
			uploadAndGenerateStrip();
		}
	}

	async function uploadAndGenerateStrip() {
		if (!sessionId || !user) return;

		uploading = true;
		error = '';

		try {
			// Upload all photos with session_id, sequence_number, and facing_mode
			let allUploaded = true;
			for (let i = 0; i < capturedPhotos.length; i++) {
				const result = await uploadPhotoWithOfflineSupport({
					user_id: user.id,
					session_id: sessionId,
					blob: capturedPhotos[i].blob,
					captured_at: new Date().toISOString(),
					sequence_number: i + 1,
					facing_mode: capturedPhotos[i].facingMode
				});
				
				// If offline, photos are queued but result is null
				if (!result && !$isOnline) {
					allUploaded = false;
				}
			}

			// Only generate strip if all photos were uploaded successfully (online)
			if (allUploaded && $isOnline) {
				const stripResult = await generateStrip(sessionId);
				stripUrl = stripResult.strip_filename;
			} else if (!$isOnline) {
				// Offline - photos queued, skip strip generation for now
				console.log('Photos queued for offline sync. Strip will be generated when synced.');
			}
		} catch (err) {
			console.error('Upload/strip generation error:', err);
			error = err instanceof Error ? err.message : 'Failed to process photos';
		} finally {
			uploading = false;
		}
	}

	function retakeAll() {
		// Clean up URLs
		capturedPhotos.forEach(photo => URL.revokeObjectURL(photo.url));
		if (stripUrl) {
			stripUrl = null;
		}
		
		// Reset state and go back to config
		capturedPhotos = [];
		currentPhotoIndex = 0;
		sessionId = null;
		screen = 'config';
		error = '';
	}

	function saveAndFinish() {
		// Clean up URLs
		capturedPhotos.forEach(photo => URL.revokeObjectURL(photo.url));
		
		// Redirect to booth menu
		goto('/booth');
	}

	function cancel() {
		// Clean up URLs
		capturedPhotos.forEach(photo => URL.revokeObjectURL(photo.url));
		
		goto('/booth');
	}
</script>

{#if !user}
	<div class="flex min-h-screen items-center justify-center">
		<div class="text-2xl opacity-50">Loading...</div>
	</div>
{:else if screen === 'config'}
	<!-- Configuration Screen -->
	<div class="flex min-h-screen items-center justify-center p-6">
		<div class="card max-w-2xl w-full">
			<h1 class="text-display mb-2 text-center">
				Photo Booth Setup
			</h1>
			
			<p class="text-center text-lg mb-8 opacity-80">
				Customize your photo booth experience
			</p>

			{#if error}
				<div class="error-banner mb-6">
					{error}
				</div>
			{/if}

			<!-- Photo Count -->
			<div class="config-section">
				<div class="flex justify-between items-center mb-3">
					<label class="text-lg font-medium">Number of Photos</label>
					<span class="text-2xl font-bold">{photoCount}</span>
				</div>
				<input
					type="range"
					min="2"
					max="10"
					bind:value={photoCount}
					class="slider"
				/>
				<p class="text-sm opacity-60 mt-2">How many poses do you want?</p>
			</div>

			<!-- Initial Countdown -->
			<div class="config-section">
				<div class="flex justify-between items-center mb-3">
					<label class="text-lg font-medium">First Photo Countdown</label>
					<span class="text-2xl font-bold">{initialCountdown}s</span>
				</div>
				<input
					type="range"
					min="1"
					max="10"
					bind:value={initialCountdown}
					class="slider"
				/>
				<p class="text-sm opacity-60 mt-2">Time before the first photo</p>
			</div>

			<!-- Between-Shot Delay -->
			<div class="config-section">
				<div class="flex justify-between items-center mb-3">
					<label class="text-lg font-medium">Between-Shot Delay</label>
					<span class="text-2xl font-bold">{betweenDelay}s</span>
				</div>
				<input
					type="range"
					min="0.5"
					max="5"
					step="0.5"
					bind:value={betweenDelay}
					class="slider"
				/>
				<p class="text-sm opacity-60 mt-2">Time between each photo</p>
			</div>

			<!-- Camera Selection -->
			<div class="config-section">
				<label class="text-lg font-medium mb-3 block">Camera</label>
				<div class="camera-options">
					<button
						class="camera-option"
						class:selected={selectedCamera === 'user'}
						on:click={() => selectedCamera = 'user'}
					>
						<div class="camera-icon">🤳</div>
						<div class="camera-label">Front Camera</div>
						<div class="camera-desc">Selfie mode</div>
					</button>
					<button
						class="camera-option"
						class:selected={selectedCamera === 'environment'}
						on:click={() => selectedCamera = 'environment'}
					>
						<div class="camera-icon">📷</div>
						<div class="camera-label">Back Camera</div>
						<div class="camera-desc">Rear-facing</div>
					</button>
				</div>
			</div>

			<div class="flex gap-4 mt-8">
				<button on:click={cancel} class="btn flex-1">
					← Cancel
				</button>
				<button on:click={startSession} class="btn btn-primary flex-1">
					🎬 Start Booth
				</button>
			</div>
		</div>
	</div>
{:else if screen === 'capturing'}
	<!-- Capture Screen -->
	<div class="relative">
		<Camera
			bind:this={camera}
			mirror={true}
			countdownSeconds={currentPhotoIndex === 0 ? initialCountdown : Math.ceil(betweenDelay)}
			showCountdownOverlay={false}
			initialFacingMode={selectedCamera}
			on:capture={handleCapture}
		/>

		<!-- Progress Indicator -->
		<div class="progress-bar">
			<div class="progress-content">
				<div class="text-xl font-bold mb-2">
					Photo {currentPhotoIndex + 1} of {photoCount}
				</div>
				<div class="progress-dots">
					{#each Array(photoCount) as _, i}
						<div 
							class="dot" 
							class:completed={i < currentPhotoIndex}
							class:active={i === currentPhotoIndex}
						></div>
					{/each}
				</div>
				
			</div>
		</div>

		<!-- Thumbnail Preview Strip -->
		{#if capturedPhotos.length > 0}
			<div class="thumbnail-strip">
				{#each capturedPhotos as photo}
					<img src={photo.url} alt="Captured" class="thumbnail" />
				{/each}
			</div>
		{/if}
	</div>
{:else if screen === 'preview'}
	<!-- Preview Screen -->
	<div class="preview-container">
		<div class="preview-content">
			<h2 class="text-3xl mb-6 text-center">Your Photo Booth Strip!</h2>

			{#if error}
				<div class="error-banner mb-6">
					{error}
				</div>
			{/if}

			{#if uploading}
				<div class="text-center mb-8">
					<div class="text-xl mb-4">✨ Creating your photo strip...</div>
					<div class="loading-spinner"></div>
				</div>
			{:else if stripUrl}
				<!-- Photo Strip Preview -->
				<div class="strip-preview-section">
					<div class="strip-container">
						<img src={stripUrl} alt="Photo strip" class="strip-image" />
					</div>
				</div>

				<!-- Individual Photos Grid -->
				<div class="mt-8">
					<h3 class="text-xl mb-4 text-center opacity-80">Individual Photos:</h3>
					<div class="photo-grid">
						{#each capturedPhotos as photo}
							<img 
								src={photo.url} 
								alt="Individual photo" 
								class="grid-photo"
							/>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Action Buttons -->
			<div class="flex gap-4 mt-8 justify-center">
				<button
					on:click={retakeAll}
					disabled={uploading}
					class="btn btn-large"
				>
					🔄 Retake All
				</button>

				<button
					on:click={saveAndFinish}
					disabled={uploading || !stripUrl}
					class="btn btn-primary btn-large"
				>
					✨ Save to Gallery
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
{/if}

<style>
	/* Configuration Screen */
	.config-section {
		margin-bottom: 32px;
		padding: 24px;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 12px;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.slider {
		width: 100%;
		height: 8px;
		border-radius: 4px;
		background: rgba(255, 255, 255, 0.2);
		outline: none;
		cursor: pointer;
	}

	.slider::-webkit-slider-thumb {
		appearance: none;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: white;
		cursor: pointer;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
	}

	.slider::-moz-range-thumb {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: white;
		cursor: pointer;
		border: none;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
	}

	.camera-options {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
	}

	.camera-option {
		background: rgba(255, 255, 255, 0.05);
		border: 2px solid rgba(255, 255, 255, 0.2);
		border-radius: 12px;
		padding: 20px;
		cursor: pointer;
		transition: all 0.2s;
		text-align: center;
	}

	.camera-option:hover {
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.3);
	}

	.camera-option.selected {
		background: rgba(59, 130, 246, 0.2);
		border-color: rgb(59, 130, 246);
		box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
	}

	.camera-icon {
		font-size: 48px;
		margin-bottom: 8px;
	}

	.camera-label {
		font-size: 18px;
		font-weight: 600;
		margin-bottom: 4px;
	}

	.camera-desc {
		font-size: 14px;
		opacity: 0.7;
	}

	/* Capture Screen */
	.progress-bar {
		position: absolute;
		top: 20px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 20;
		background: rgba(0, 0, 0, 0.7);
		backdrop-filter: blur(10px);
		padding: 16px 32px;
		border-radius: 16px;
		border: 2px solid rgba(255, 255, 255, 0.2);
	}

	.progress-content {
		text-align: center;
		color: white;
	}

	.progress-dots {
		display: flex;
		gap: 12px;
		justify-content: center;
		align-items: center;
	}

	.dot {
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.3);
		transition: all 0.3s;
	}

	.dot.completed {
		background: #10b981;
		box-shadow: 0 0 12px rgba(16, 185, 129, 0.5);
	}

	.dot.active {
		background: white;
		box-shadow: 0 0 12px rgba(255, 255, 255, 0.8);
		animation: pulse 1s infinite;
	}

	@keyframes pulse {
		0%, 100% { transform: scale(1); }
		50% { transform: scale(1.2); }
	}

	.thumbnail-strip {
		position: absolute;
		bottom: 20px;
		left: 20px;
		display: flex;
		gap: 8px;
		z-index: 20;
	}

	.thumbnail {
		width: 60px;
		height: 80px;
		object-fit: cover;
		border-radius: 8px;
		border: 2px solid white;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
	}

	/* Preview Screen */
	.preview-container {
		min-height: 100vh;
		background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
		padding: 40px 20px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.preview-content {
		width: 100%;
		max-width: 1200px;
		color: white;
	}

	.strip-preview-section {
		display: flex;
		justify-content: center;
		margin-bottom: 20px;
	}

	.strip-container {
		background: white;
		padding: 8px;
		border-radius: 12px;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
	}

	.strip-image {
		max-height: 90vh;
		max-width: 100%;
		display: block;
		border-radius: 8px;
		object-fit: contain;
	}

	.photo-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 16px;
		max-width: 800px;
		margin: 0 auto;
	}

	.grid-photo {
		width: 100%;
		aspect-ratio: 3/4;
		object-fit: cover;
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		transition: transform 0.2s;
	}

	.grid-photo:hover {
		transform: scale(1.05);
	}

	.loading-spinner {
		width: 60px;
		height: 60px;
		border: 4px solid rgba(255, 255, 255, 0.3);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin: 0 auto;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.error-banner {
		background: rgba(239, 68, 68, 0.2);
		border: 2px solid rgba(239, 68, 68, 0.5);
		color: rgb(254, 202, 202);
		padding: 12px;
		border-radius: 8px;
		text-align: center;
	}
</style>
