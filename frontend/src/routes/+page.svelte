<script lang="ts">
	import { goto } from '$app/navigation';
	import { userStore } from '$lib/stores/user';
	import { generateFingerprint } from '$lib/utils/fingerprint';
	import { onMount } from 'svelte';

	let firstName = '';
	let lastInitial = '';
	let email = '';
	let loading = false;
	let error = '';

	let existingUser: any = null;
	let conflictData: any = null;
	
	onMount(async () => {
		// Check if user already exists in localStorage
		const stored = localStorage.getItem('photobooth_user');
		if (stored) {
			existingUser = JSON.parse(stored);
			// Don't auto-redirect - give them option to continue or switch
		}
	});
	
	function continueAsExisting() {
		if (existingUser) {
			userStore.set(existingUser);
			goto('/booth');
		}
	}
	
	function switchUser() {
		localStorage.removeItem('photobooth_user');
		existingUser = null;
		userStore.set(null);
	}

	// When user confirms they're the same person
	function claimExistingAccount() {
		if (conflictData?.existing_user) {
			const user = {
				id: conflictData.existing_user.id,
				name: conflictData.existing_user.name,
				slug: conflictData.existing_user.slug,
				email: conflictData.existing_user.email
			};
			
			userStore.set(user);
			localStorage.setItem('photobooth_user', JSON.stringify(user));
			goto('/booth');
		}
	}

	// When user confirms they're a different person
	async function createNewAccount() {
		if (!conflictData) return;

		loading = true;
		error = '';

		try {
			const fingerprint = await generateFingerprint();
			const suggestedSlug = conflictData.suggestion; // e.g., "hayden-m-2"
			
			// Extract the number from suggestion
			const match = suggestedSlug.match(/-(\d+)$/);
			const suffix = match ? match[1] : '2';
			
			const response = await fetch('/api/users', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: firstName.trim(),
					last_initial: `${lastInitial.trim()}${suffix}`, // Add number to initial
					email: email.trim() || undefined,
					device_fingerprint: fingerprint
				})
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || 'Failed to create new user');
			}

			// Save user to store and localStorage
			const user = {
				id: data.id,
				name: data.name,
				slug: data.slug,
				email: data.email
			};
			
			userStore.set(user);
			localStorage.setItem('photobooth_user', JSON.stringify(user));
			goto('/booth');
		} catch (err) {
			console.error('Error creating user:', err);
			error = err instanceof Error ? err.message : 'Failed to create account';
			loading = false;
		}
	}

	function cancelConflict() {
		conflictData = null;
		error = '';
	}

	async function handleSubmit() {
		if (!firstName.trim() || !lastInitial.trim()) {
			error = 'Please enter your first name and last initial';
			return;
		}

		loading = true;
		error = '';

		try {
			const fingerprint = await generateFingerprint();
			
			const response = await fetch('/api/users', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: firstName.trim(),
					last_initial: lastInitial.trim(),
					email: email.trim() || undefined,
					device_fingerprint: fingerprint
				})
			});

			let data;
			try {
				data = await response.json();
			} catch (e) {
				console.error('Failed to parse response:', response.status, response.statusText);
				throw new Error(`Server error: ${response.status} ${response.statusText}`);
			}

			if (response.status === 409) {
				// Slug conflict - show resolution options
				conflictData = data;
				loading = false;
				return;
			}

			if (!response.ok) {
				console.error('API error:', data);
				const errorMessage = data.message 
					|| (typeof data.error === 'string' ? data.error : JSON.stringify(data.error))
					|| 'Failed to create user';
				throw new Error(errorMessage);
			}

			// Save user to store and localStorage
			const user = {
				id: data.id,
				name: data.name,
				slug: data.slug,
				email: data.email
			};
			
			userStore.set(user);
			localStorage.setItem('photobooth_user', JSON.stringify(user));

			// Redirect to booth
			goto('/booth');
		} catch (err) {
			console.error('Error creating user:', err);
			error = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
			loading = false;
		}
	}
</script>

<div class="flex min-h-screen items-center justify-center p-6">
	<div class="card max-w-md w-full text-center">
		{#if existingUser}
			<!-- Returning User Option -->
			<h2 class="text-2xl mb-6">Welcome back!</h2>
			<p class="text-lg mb-8">Continue as <strong>{existingUser.name}</strong>?</p>
			
			<div class="space-y-4">
				<button
					on:click={continueAsExisting}
					class="btn btn-primary btn-large w-full"
				>
					Continue as {existingUser.name} →
				</button>
				
				<button
					on:click={switchUser}
					class="btn w-full"
				>
					Switch to Different User
				</button>
			</div>
			
			<div class="h-px bg-white/20 my-8"></div>
		{/if}
		
		{#if conflictData}
			<!-- Name Conflict Resolution -->
			<h2 class="text-2xl mb-4">Wait a moment...</h2>
			<p class="text-lg mb-2">We found an existing account for <strong>{conflictData.existing_user.name}</strong></p>
			<p class="opacity-70 mb-8">Is this you from earlier, or are you someone different?</p>
			
			<div class="space-y-4">
				<button
					on:click={claimExistingAccount}
					disabled={loading}
					class="btn btn-primary btn-large w-full"
				>
					👋 Yes, that's me! (Continue with my photos)
				</button>
				
				<button
					on:click={createNewAccount}
					disabled={loading}
					class="btn btn-large w-full"
				>
					🆕 No, I'm someone different (Start fresh)
				</button>
			</div>

			{#if error}
				<div class="p-4 rounded-lg bg-red-500/20 border-2 border-red-500/50 text-red-200 mt-4">
					{error}
				</div>
			{/if}
			
			<button
				on:click={cancelConflict}
				class="btn mt-6"
			>
				← Go Back
			</button>
		{:else if !existingUser}
			<!-- New User Form -->
			<h1 class="text-display mb-4">
				Haven + Hayden
			</h1>
			
			<p class="text-script mb-2">New Year's Eve 2025</p>
			
			<div class="h-px bg-white/20 my-8 mx-auto w-3/4"></div>
			
			<h2 class="text-heading mb-6">Photo Booth</h2>
			
			<p class="text-lg mb-8">Welcome! Let's capture some memories together ✨</p>
			
			<form on:submit|preventDefault={handleSubmit} class="space-y-6">
				<div class="text-left">
					<label for="firstName" class="block text-label mb-2">
						What's your first name?
					</label>
					<input
						id="firstName"
						type="text"
						bind:value={firstName}
						disabled={loading}
						class="w-full px-4 py-3 rounded-lg bg-white/10 border-2 border-white/30 text-white placeholder-white/50 focus:outline-none focus:border-white/60 transition-colors"
						placeholder="Sarah"
						maxlength="50"
						required
					/>
				</div>
				
				<div class="text-left">
					<label for="lastInitial" class="block text-label mb-2">
						What's your last initial?
					</label>
					<input
						id="lastInitial"
						type="text"
						bind:value={lastInitial}
						disabled={loading}
						class="w-full px-4 py-3 rounded-lg bg-white/10 border-2 border-white/30 text-white placeholder-white/50 focus:outline-none focus:border-white/60 transition-colors uppercase"
						placeholder="M"
						maxlength="1"
						required
					/>
				</div>
				
				<div class="text-left">
					<label for="email" class="block text-label mb-2">
						Email <span class="text-sm normal-case opacity-60">(optional - to receive your photos)</span>
					</label>
					<input
						id="email"
						type="email"
						bind:value={email}
						disabled={loading}
						class="w-full px-4 py-3 rounded-lg bg-white/10 border-2 border-white/30 text-white placeholder-white/50 focus:outline-none focus:border-white/60 transition-colors"
						placeholder="sarah@example.com"
					/>
				</div>
				
				{#if error}
					<div class="p-4 rounded-lg bg-red-500/20 border-2 border-red-500/50 text-red-200">
						{error}
					</div>
				{/if}
				
				<button
					type="submit"
					disabled={loading}
					class="btn btn-primary btn-large w-full disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{loading ? 'Setting up...' : 'Let\'s Go! 📸'}
				</button>
			</form>
			
			<p class="mt-8 text-sm opacity-60">
				Your photos will be saved to your personal gallery
			</p>
		{/if}
	</div>
</div>
