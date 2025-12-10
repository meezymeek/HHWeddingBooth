<script lang="ts">
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { startCamera, stopCamera, capturePhoto, isCameraSupported } from '$lib/services/camera';
	import { configStore } from '$lib/stores/config';
	import Countdown from './Countdown.svelte';
	import FlashEffect from './FlashEffect.svelte';

	export let mirror = true;
	export let countdownSeconds = 3;

	const dispatch = createEventDispatcher();

	let videoElement: HTMLVideoElement;
	let countdown: Countdown;
	let stream: MediaStream | null = null;
	let error = '';
	let capturing = false;
	let flashTrigger = false;

	$: soundEnabled = $configStore.sound_enabled;

	onMount(async () => {
		if (!isCameraSupported()) {
			error = 'Camera not supported on this device';
			return;
		}

		try {
			stream = await startCamera('user');
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

			// Capture photo
			const blob = await capturePhoto(videoElement, mirror);
			
			// Emit photo blob
			dispatch('capture', { blob });
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
			class:mirrored={mirror}
		></video>

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
