<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	import StarryBackground from '$lib/components/StarryBackground.svelte';
	import OfflineIndicator from '$lib/components/OfflineIndicator.svelte';
	import { startAutoSync } from '$lib/services/sync';

	// Initialize offline sync on app start
	onMount(() => {
		startAutoSync();
	});
</script>

<StarryBackground />
<OfflineIndicator />

<main class="relative z-10 min-h-screen w-full">
	<slot />
</main>

<style>
	main {
		animation: fadeIn 1.5s ease-in;
	}
</style>
