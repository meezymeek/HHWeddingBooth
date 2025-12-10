<script lang="ts">
	import { onMount } from 'svelte';
	import { configStore } from '$lib/stores/config';

	export let trigger = false;
	export let soundEnabled = true;

	let visible = false;
	let shutterAudio: HTMLAudioElement | null = null;

	onMount(() => {
		// Preload shutter sound
		if (soundEnabled) {
			shutterAudio = new Audio('/sounds/shutter.mp3');
			shutterAudio.load();
		}
	});

	$: if (trigger) {
		flash();
	}

	function playShutter() {
		if (soundEnabled && shutterAudio) {
			shutterAudio.currentTime = 0;
			shutterAudio.play().catch(() => {});
		}
	}

	function flash() {
		playShutter();
		visible = true;
		setTimeout(() => {
			visible = false;
		}, 150);
	}
</script>

{#if visible}
	<div class="flash-overlay"></div>
{/if}

<style>
	.flash-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: white;
		z-index: 9999;
		pointer-events: none;
		animation: flash 150ms ease-out;
	}

	@keyframes flash {
		0% {
			opacity: 1;
		}
		100% {
			opacity: 0;
		}
	}
</style>
