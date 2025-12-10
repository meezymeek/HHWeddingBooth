<script lang="ts">
	import { isOnline, pendingPhotoCount, isSyncing } from '$lib/stores/offline';
	import { triggerManualSync } from '$lib/services/sync';

	let syncing = false;

	async function handleSyncClick() {
		if (syncing || !$isOnline) return;
		syncing = true;
		try {
			await triggerManualSync();
		} catch (error) {
			console.error('Manual sync failed:', error);
		} finally {
			syncing = false;
		}
	}
</script>

{#if !$isOnline}
	<div
		class="fixed top-0 left-0 right-0 z-50 bg-yellow-600 text-white text-center py-2 px-4 shadow-lg"
	>
		<div class="flex items-center justify-center gap-2">
			<svg
				class="w-5 h-5"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
				></path>
			</svg>
			<span class="font-body">
				📡 You're offline
				{#if $pendingPhotoCount > 0}
					— {$pendingPhotoCount} photo{$pendingPhotoCount !== 1 ? 's' : ''} will sync when connected
				{/if}
			</span>
		</div>
	</div>
{:else if $pendingPhotoCount > 0}
	<div
		class="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white text-center py-2 px-4 shadow-lg"
	>
		<div class="flex items-center justify-center gap-3">
			{#if $isSyncing || syncing}
				<svg
					class="animate-spin w-5 h-5"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
				>
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
					></circle>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					></path>
				</svg>
				<span class="font-body"> Syncing {$pendingPhotoCount} photo{$pendingPhotoCount !== 1 ? 's' : ''}... </span>
			{:else}
				<svg
					class="w-5 h-5"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
					></path>
				</svg>
				<span class="font-body">
					{$pendingPhotoCount} photo{$pendingPhotoCount !== 1 ? 's' : ''} waiting to sync
				</span>
				<button
					on:click={handleSyncClick}
					class="ml-2 px-3 py-1 bg-white text-blue-600 rounded hover:bg-blue-50 transition font-body text-sm font-bold"
				>
					Sync Now
				</button>
			{/if}
		</div>
	</div>
{/if}

<style>
	/* Add top padding to body when banner is visible */
	:global(body:has(.z-50)) {
		padding-top: 2.5rem;
	}
</style>
