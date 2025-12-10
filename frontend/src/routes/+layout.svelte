<script lang="ts">
	import '../app.css';
	import StarryBackground from '$lib/components/StarryBackground.svelte';
</script>

<StarryBackground />

<main class="relative z-10 min-h-screen w-full">
	<slot />
</main>

<style>
	main {
		animation: fadeIn 1.5s ease-in;
	}
</style>
