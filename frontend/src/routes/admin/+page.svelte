<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { adminStore } from '$lib/stores/admin';
	import { verifyAdminPassword } from '$lib/services/api';

	let password = '';
	let error = '';
	let loading = false;

	onMount(() => {
		// If already authenticated, redirect to dashboard
		if ($adminStore.authenticated) {
			goto('/admin/dashboard');
		}
	});

	async function handleLogin(e: Event) {
		e.preventDefault();
		
		if (!password) {
			error = 'Please enter the admin password';
			return;
		}

		loading = true;
		error = '';

		try {
			const result = await verifyAdminPassword(password);
			
			if (result.valid && result.token) {
				adminStore.login(result.token);
				goto('/admin/dashboard');
			} else {
				error = 'Invalid password';
				password = '';
			}
		} catch (err) {
			console.error('Login error:', err);
			error = 'Failed to verify password';
		} finally {
			loading = false;
		}
	}
</script>

<div class="min-h-screen flex items-center justify-center p-6">
	<div class="card max-w-md w-full">
		<h1 class="text-display text-center mb-2">
			Admin Access
		</h1>
		<p class="text-center text-lg mb-8 opacity-70">
			Wedding Photo Booth Dashboard
		</p>

		<form on:submit={handleLogin} class="space-y-6">
			{#if error}
				<div class="error-banner">
					{error}
				</div>
			{/if}

			<div>
				<label for="password" class="block text-lg mb-2">
					Admin Password
				</label>
				<input
					id="password"
					type="password"
					bind:value={password}
					disabled={loading}
					placeholder="Enter admin password"
					class="input-field w-full"
					autocomplete="current-password"
				/>
			</div>

			<button
				type="submit"
				disabled={loading}
				class="btn btn-primary btn-large w-full"
			>
				{loading ? 'Verifying...' : '🔐 Login'}
			</button>

			<div class="text-center">
				<a href="/" class="text-sm opacity-60 hover:opacity-100 transition">
					← Back to Photo Booth
				</a>
			</div>
		</form>
	</div>
</div>

<style>
	.input-field {
		background: rgba(255, 255, 255, 0.1);
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-radius: 8px;
		padding: 12px 16px;
		color: white;
		font-family: var(--font-body);
		font-size: 1.1rem;
		transition: all 0.3s;
	}

	.input-field:focus {
		outline: none;
		border-color: rgba(255, 255, 255, 0.6);
		background: rgba(255, 255, 255, 0.15);
	}

	.input-field::placeholder {
		color: rgba(255, 255, 255, 0.4);
	}

	.input-field:disabled {
		opacity: 0.5;
		cursor: not-allowed;
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
