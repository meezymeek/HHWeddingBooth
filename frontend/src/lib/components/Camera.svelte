<script lang="ts">
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { startCamera, stopCamera, capturePhoto, isCameraSupported } from '$lib/services/camera';
	import { configStore } from '$lib/stores/config';
	import Countdown from './Countdown.svelte';
	import FlashEffect from './FlashEffect.svelte';

	export let mirror = true;
	export let countdownSeconds = 3;
	export let showCountdownOverlay = true;
	export let initialFacingMode: 'user' | 'environment' | null = null; // Override for initial camera

	const dispatch = createEventDispatcher();
	const CAMERA_PREFERENCE_KEY = 'photobooth_camera_facing';

	let videoElement: HTMLVideoElement;
	let countdown: Countdown;
	let stream: MediaStream | null = null;
	let error = '';
	let capturing = false;
	let flashTrigger = false;
	let facingMode: 'user' | 'environment' = 'user';
	let switching = false;

	$: soundEnabled = $configStore.sound_enabled;
	// Auto-adjust mirroring based on facing mode
	$: effectiveMirror = facingMode === 'user' ? mirror : false;

	onMount(async () => {
		if (!isCameraSupported()) {
			error = 'Camera not supported on this device';
			return;
		}

		// Use initialFacingMode if provided, otherwise load saved preference
		if (initialFacingMode) {
			facingMode = initialFacingMode;
		} else {
			const savedFacing = localStorage.getItem(CAMERA_PREFERENCE_KEY);
			if (savedFacing === 'user' || savedFacing === 'environment') {
				facingMode = savedFacing;
			}
		}

		try {
			stream = await startCamera(facingMode);
			if (videoElement) {
				videoElement.srcObject = stream;
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to access camera';
			console.error('Camera error:', err);
		}
	});

	onDestroy(() => {
		stopCamera();
	});

	async function switchCamera() {
		if (switching || capturing) return;

		switching = true;
		try {
			// Switch facing mode
			facingMode = facingMode === 'user' ? 'environment' : 'user';
			
			// Save preference
			localStorage.setItem(CAMERA_PREFERENCE_KEY, facingMode);

			// Restart camera with new facing mode
			stream = await startCamera(facingMode);
			if (videoElement) {
				videoElement.srcObject = stream;
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to switch camera';
			console.error('Camera switch error:', err);
		} finally {
			switching = false;
		}
	}

	export async function capture() {
		if (capturing) return;
		
		capturing = true;
		
		// Start countdown
		countdown.start();
	}

	async function handleCountdownComplete() {
		try {
			// Trigger flash effect
			flashTrigger = true;
			setTimeout(() => flashTrigger = false, 200);

			// Capture photo WITHOUT mirroring
			// The preview is mirrored for front camera (good UX), but the saved photo should NOT be mirrored
			// This ensures photos look correct in final output (not backwards)
			const blob = await capturePhoto(videoElement, false);
			
			// Emit photo blob with facing mode info
			dispatch('capture', { blob, facingMode });
		} catch (err) {
			console.error('Capture error:', err);
			error = 'Failed to capture photo';
		} finally {
			capturing = false;
		}
	}
</script>

<div class="camera-container">
	{#if error}
		<div class="error-message">
			<p class="text-2xl mb-4">⚠️</p>
			<p>{error}</p>
		</div>
	{:else}
		<video
			bind:this={videoElement}
			autoplay
			playsinline
			muted
			class="video-preview"
			class:mirrored={effectiveMirror}
		></video>

		<!-- Camera Switch Button -->
		<button
			on:click={switchCamera}
			disabled={capturing || switching}
			class="btn-camera-switch"
			aria-label="Switch camera"
			title="Switch camera"
		>
			🔄
		</button>

		<div class="camera-controls">
			<button
				on:click={capture}
				disabled={capturing}
				class="btn-capture"
				aria-label="Capture photo"
			>
				<div class="capture-inner"></div>
			</button>
		</div>

		<Countdown 
			bind:this={countdown}
			seconds={countdownSeconds}
			{soundEnabled}
			showOverlay={showCountdownOverlay}
			on:complete={handleCountdownComplete}
		/>

		<FlashEffect trigger={flashTrigger} {soundEnabled} />
	{/if}
</div>

<style>
	.camera-container {
		position: relative;
		width: 100%;
		height: 100vh;
		background: #000;
		overflow: hidden;
	}

	.video-preview {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.video-preview.mirrored {
		transform: scaleX(-1);
	}

	.camera-controls {
		position: absolute;
		bottom: 40px;
		left: 0;
		right: 0;
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 10;
	}

	.btn-capture {
		width: 80px;
		height: 80px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.3);
		border: 4px solid white;
		cursor: pointer;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
		backdrop-filter: blur(10px);
	}

	.btn-capture:hover:not(:disabled) {
		transform: scale(1.1);
		background: rgba(255, 255, 255, 0.5);
	}

	.btn-capture:active:not(:disabled) {
		transform: scale(0.95);
	}

	.btn-capture:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-camera-switch {
		position: absolute;
		top: 20px;
		right: 20px;
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: rgba(0, 0, 0, 0.5);
		border: 2px solid rgba(255, 255, 255, 0.3);
		color: white;
		font-size: 24px;
		cursor: pointer;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
		backdrop-filter: blur(10px);
		z-index: 15;
	}

	.btn-camera-switch:hover:not(:disabled) {
		transform: scale(1.1) rotate(180deg);
		background: rgba(0, 0, 0, 0.7);
		border-color: rgba(255, 255, 255, 0.5);
	}

	.btn-camera-switch:active:not(:disabled) {
		transform: scale(0.95);
	}

	.btn-camera-switch:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.capture-inner {
		width: 60px;
		height: 60px;
		border-radius: 50%;
		background: white;
	}

	.error-message {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: white;
		padding: 20px;
		text-align: center;
	}
</style>
