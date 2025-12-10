<script lang="ts">
	import { goto } from '$app/navigation';
	import { userStore } from '$lib/stores/user';
	import { onMount } from 'svelte';

	let user: any = null;

	onMount(() => {
		// Check if user is logged in
		const storedUser = localStorage.getItem('photobooth_user');
		if (!storedUser) {
			goto('/');
			return;
		}

		user = JSON.parse(storedUser);
		userStore.set(user);
	});

	function handleLogout() {
		userStore.logout();
		goto('/');
	}
</script>

{#if user}
	<div class="flex min-h-screen items-center justify-center p-6">
		<div class="card max-w-2xl w-full text-center">
			<h1 class="text-display mb-2">
				Haven <span class="ornament"></span> Hayden
			</h1>
			
			<p class="text-script mb-6">Photo Booth</p>
			
			<div class="h-px bg-white/20 my-8 mx-auto w-3/4"></div>
			
			<h2 class="text-2xl mb-2">Welcome back, {user.name}! 👋</h2>
			
			<p class="text-lg mb-10 opacity-80">Choose your photo mode:</p>
			
			<div class="grid md:grid-cols-2 gap-6 mb-10">
				<!-- Single Photo Mode -->
				<a href="/booth/single" class="card hover:scale-105 transition-transform cursor-pointer group">
					<div class="text-6xl mb-4">📸</div>
					<h3 class="text-heading text-xl mb-3">Single Photo</h3>
					<p class="opacity-70 text-sm">
						Quick capture with a countdown. Perfect for a single moment!
					</p>
					<div class="mt-6">
						<span class="btn btn-primary">Take Photo</span>
					</div>
				</a>
				
				<!-- Photo Booth Mode -->
				<a href="/booth/multi" class="card hover:scale-105 transition-transform cursor-pointer group">
					<div class="text-6xl mb-4">🎞️</div>
					<h3 class="text-heading text-xl mb-3">Photo Booth</h3>
					<p class="opacity-70 text-sm">
						Classic multi-shot sequence with a photo strip. Strike your poses!
					</p>
					<div class="mt-6">
						<span class="btn btn-primary">Start Booth</span>
					</div>
				</a>
			</div>
			
			<div class="grid md:grid-cols-2 gap-4 mt-8">
				<a href="/gallery/{user.slug}" class="btn">
					🖼️ My Gallery
				</a>
				
				<button on:click={handleLogout} class="btn">
					👋 Switch User
				</button>
			</div>
			
			<p class="mt-8 text-sm opacity-60">
				All your photos are automatically saved to your gallery
			</p>
		</div>
	</div>
{:else}
	<div class="flex min-h-screen items-center justify-center">
		<div class="text-2xl opacity-50">Loading...</div>
	</div>
{/if}
