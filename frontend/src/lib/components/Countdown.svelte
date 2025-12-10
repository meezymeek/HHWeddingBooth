<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { configStore } from '$lib/stores/config';

	export let seconds = 3;
	export let soundEnabled = true;

	const dispatch = createEventDispatcher();

	let current = seconds;
	let active = false;
	let beepAudio: HTMLAudioElement | null = null;

	onMount(() => {
		// Preload beep sound
		if (soundEnabled) {
			beepAudio = new Audio('/sounds/beep.mp3');
			beepAudio.load();
		}
	});

	export function start() {
		current = seconds;
		active = true;
		tick();
	}

	function playBeep() {
		if (soundEnabled && beepAudio) {
			beepAudio.currentTime = 0;
			beepAudio.play().catch(() => {});
		}
	}

	function tick() {
		if (current > 0) {
			playBeep();
			setTimeout(() => {
				current--;
				if (current > 0) {
					tick();
				} else {
					active = false;
					dispatch('complete');
				}
			}, 1000);
		}
	}
</script>

{#if active && current > 0}
	<div class="countdown-overlay">
		<span class="countdown-number">{current}</span>
	</div>
{/if}

<style>
	.countdown-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.5);
		z-index: 100;
		backdrop-filter: blur(5px);
	}

	.countdown-number {
		font-family: 'Great Vibes', cursive;
		font-size: 12rem;
		color: white;
		text-shadow: 0 0 40px rgba(255, 255, 255, 0.5);
		animation: pulse 1s ease-in-out;
	}

	@keyframes pulse {
		0% {
			transform: scale(0.5);
			opacity: 0;
		}
		50% {
			transform: scale(1.1);
			opacity: 1;
		}
		100% {
			transform: scale(1);
			opacity: 1;
		}
	}
</style>
