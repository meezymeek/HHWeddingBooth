<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { adminStore } from '$lib/stores/admin';
	import {
		getAdminUsers,
		getAdminPhotos,
		getAdminStats,
		sendBulkEmails as sendBulk
	} from '$lib/services/api';

	// State
	let loading = true;
	let stats = {
		total_users: 0,
		total_photos: 0,
		total_sessions: 0,
		users_with_email: 0
	};
	let users: any[] = [];
	let photos: any[] = [];
	let activeTab: 'overview' | 'users' | 'photos' = 'overview';
	
	// Bulk operations
	let sendingBulkEmail = false;
	let bulkEmailResult: any = null;
	let downloadQuality: 'web' | 'original' = 'web';

	onMount(async () => {
		// Check authentication
		if (!$adminStore.authenticated) {
			goto('/admin');
			return;
		}

		await loadData();
	});

	async function loadData() {
		loading = true;
		try {
			// Load stats
			stats = await getAdminStats($adminStore.token);
			
			// Load users
			const usersData = await getAdminUsers($adminStore.token);
			users = usersData.users;
			
			// Load recent photos
			const photosData = await getAdminPhotos($adminStore.token, 1, 20);
			photos = photosData.photos;
		} catch (error) {
			console.error('Failed to load admin data:', error);
		} finally {
			loading = false;
		}
	}

	async function handleBulkEmail() {
		if (!confirm(`Send emails to ${stats.users_with_email} users?`)) {
			return;
		}

		sendingBulkEmail = true;
		bulkEmailResult = null;

		try {
			bulkEmailResult = await sendBulk($adminStore.token);
		} catch (error) {
			console.error('Bulk email failed:', error);
			alert('Failed to send bulk emails: ' + (error instanceof Error ? error.message : 'Unknown error'));
		} finally {
			sendingBulkEmail = false;
		}
	}

	function handleDownload() {
		const url = `/api/admin/download?quality=${downloadQuality}`;
		const link = document.createElement('a');
		link.href = url;
		link.download = `photobooth-photos-${Date.now()}.zip`;
		
		// Add authorization header via fetch and blob download
		fetch(url, {
			headers: { Authorization: `Bearer ${$adminStore.token}` }
		})
			.then(res => res.blob())
			.then(blob => {
				const blobUrl = URL.createObjectURL(blob);
				link.href = blobUrl;
				link.click();
				URL.revokeObjectURL(blobUrl);
			})
			.catch(err => {
				console.error('Download failed:', err);
				alert('Failed to download photos');
			});
	}

	function handleLogout() {
		adminStore.logout();
		goto('/admin');
	}
</script>

<div class="min-h-screen p-6">
	<div class="max-w-7xl mx-auto">
		<!-- Header -->
		<div class="flex justify-between items-center mb-8">
			<div>
				<h1 class="text-display mb-2">Admin Dashboard</h1>
				<p class="text-lg opacity-70">Haven & Hayden Wedding Photo Booth</p>
			</div>
			<button on:click={handleLogout} class="btn">
				🚪 Logout
			</button>
		</div>

		{#if loading}
			<div class="text-center py-20">
				<div class="text-2xl opacity-50">Loading...</div>
			</div>
		{:else}
			<!-- Tabs -->
			<div class="tabs mb-8">
				<button
					class="tab"
					class:active={activeTab === 'overview'}
					on:click={() => (activeTab = 'overview')}
				>
					📊 Overview
				</button>
				<button
					class="tab"
					class:active={activeTab === 'users'}
					on:click={() => (activeTab = 'users')}
				>
					👥 Users ({stats.total_users})
				</button>
				<button
					class="tab"
					class:active={activeTab === 'photos'}
					on:click={() => (activeTab = 'photos')}
				>
					📸 Photos ({stats.total_photos})
				</button>
			</div>

			<!-- Overview Tab -->
			{#if activeTab === 'overview'}
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
					<div class="stat-card">
						<div class="stat-value">{stats.total_users}</div>
						<div class="stat-label">Total Users</div>
					</div>
					<div class="stat-card">
						<div class="stat-value">{stats.total_photos}</div>
						<div class="stat-label">Total Photos</div>
					</div>
					<div class="stat-card">
						<div class="stat-value">{stats.total_sessions}</div>
						<div class="stat-label">Photo Booth Sessions</div>
					</div>
					<div class="stat-card">
						<div class="stat-value">{stats.users_with_email}</div>
						<div class="stat-label">Users with Email</div>
					</div>
				</div>

				<!-- Bulk Operations -->
				<div class="card mb-8">
					<h2 class="text-2xl mb-6">Bulk Operations</h2>

					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<!-- Bulk Email -->
						<div>
							<h3 class="text-xl mb-4">📧 Email All Users</h3>
							<p class="opacity-70 mb-4 text-sm">
								Send photos to all {stats.users_with_email} users who provided email addresses
							</p>
							
							{#if bulkEmailResult}
								<div class="mb-4 p-4 bg-white/10 rounded">
									<div class="text-green-400">✅ Sent: {bulkEmailResult.sent}</div>
									{#if bulkEmailResult.failed > 0}
										<div class="text-red-400">❌ Failed: {bulkEmailResult.failed}</div>
									{/if}
								</div>
							{/if}

							<button
								on:click={handleBulkEmail}
								disabled={sendingBulkEmail || stats.users_with_email === 0}
								class="btn btn-primary w-full"
							>
								{sendingBulkEmail ? 'Sending...' : 'Send Bulk Emails'}
							</button>
						</div>

						<!-- Bulk Download -->
						<div>
							<h3 class="text-xl mb-4">📦 Download All Photos</h3>
							<p class="opacity-70 mb-4 text-sm">
								Download all photos and strips as a ZIP file
							</p>

							<div class="mb-4">
								<label class="block text-sm mb-2">Quality:</label>
								<select bind:value={downloadQuality} class="input-field w-full">
									<option value="web">Web (Compressed)</option>
									<option value="original">Original (Full Resolution)</option>
								</select>
							</div>

							<button on:click={handleDownload} class="btn w-full">
								💾 Download ZIP
							</button>
						</div>
					</div>
				</div>

				<!-- Recent Photos -->
				<div class="card">
					<h2 class="text-2xl mb-6">Recent Photos</h2>
					<div class="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4">
						{#each photos.slice(0, 12) as photo}
							<div class="photo-thumb">
								<img src={photo.filename_thumb} alt="Photo" class="w-full h-full object-cover" />
								<div class="photo-label">{photo.user_name}</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Users Tab -->
			{#if activeTab === 'users'}
				<div class="card">
					<h2 class="text-2xl mb-6">All Users</h2>
					<div class="overflow-x-auto">
						<table class="admin-table">
							<thead>
								<tr>
									<th>Name</th>
									<th>Email</th>
									<th>Photos</th>
									<th>Sessions</th>
									<th>Last Active</th>
									<th>Actions</th>
								</tr>
							</thead>
							<tbody>
								{#each users as user}
									<tr>
										<td>
											<a
												href="/gallery/{user.slug}"
												class="text-white hover:underline"
												target="_blank"
											>
												{user.name}
											</a>
										</td>
										<td class="text-sm opacity-70">{user.email || 'No email'}</td>
										<td class="text-center">{user.photo_count}</td>
										<td class="text-center">{user.session_count}</td>
										<td class="text-sm opacity-70">{new Date(user.last_active).toLocaleString()}</td>
										<td>
											<a
												href="/gallery/{user.slug}"
												class="btn-small"
												target="_blank"
											>
												View Gallery
											</a>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{/if}

			<!-- Photos Tab -->
			{#if activeTab === 'photos'}
				<div class="card">
					<h2 class="text-2xl mb-6">All Photos</h2>
					<div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
						{#each photos as photo}
							<div class="photo-card">
								<img
									src={photo.filename_thumb}
									alt="Photo"
									class="w-full h-full object-cover rounded"
								/>
								<div class="photo-info">
									<div class="text-sm font-bold">{photo.user_name}</div>
									<div class="text-xs opacity-70">
										{new Date(photo.captured_at).toLocaleDateString()}
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		{/if}
	</div>
</div>

<style>
	.tabs {
		display: flex;
		gap: 4px;
		background: rgba(255, 255, 255, 0.05);
		padding: 4px;
		border-radius: 12px;
	}

	.tab {
		flex: 1;
		padding: 12px 24px;
		background: transparent;
		border: none;
		color: rgba(255, 255, 255, 0.6);
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.3s;
		font-family: var(--font-body);
		font-size: 1rem;
	}

	.tab:hover {
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.9);
	}

	.tab.active {
		background: rgba(255, 255, 255, 0.2);
		color: white;
	}

	.stat-card {
		background: rgba(255, 255, 255, 0.1);
		border: 2px solid rgba(255, 255, 255, 0.2);
		border-radius: 12px;
		padding: 24px;
		text-align: center;
	}

	.stat-value {
		font-size: 3rem;
		font-weight: bold;
		margin-bottom: 8px;
	}

	.stat-label {
		opacity: 0.7;
		text-transform: uppercase;
		letter-spacing: 1px;
		font-size: 0.9rem;
	}

	.admin-table {
		width: 100%;
		border-collapse: collapse;
	}

	.admin-table th {
		text-align: left;
		padding: 12px;
		border-bottom: 2px solid rgba(255, 255, 255, 0.2);
		font-size: 0.9rem;
		text-transform: uppercase;
		letter-spacing: 1px;
		opacity: 0.7;
	}

	.admin-table td {
		padding: 12px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.admin-table tr:hover {
		background: rgba(255, 255, 255, 0.05);
	}

	.btn-small {
		display: inline-block;
		padding: 6px 12px;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.3);
		border-radius: 6px;
		color: white;
		text-decoration: none;
		font-size: 0.85rem;
		transition: all 0.2s;
	}

	.btn-small:hover {
		background: rgba(255, 255, 255, 0.2);
		border-color: rgba(255, 255, 255, 0.5);
	}

	.photo-thumb {
		position: relative;
		aspect-ratio: 3 / 4;
		overflow: hidden;
		border-radius: 8px;
		background: rgba(0, 0, 0, 0.5);
	}

	.photo-label {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		padding: 6px;
		background: rgba(0, 0, 0, 0.7);
		font-size: 0.75rem;
		text-align: center;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.photo-card {
		position: relative;
	}

	.photo-info {
		margin-top: 8px;
		padding: 6px;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 6px;
	}

	.input-field {
		background: rgba(255, 255, 255, 0.1);
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-radius: 8px;
		padding: 12px 16px;
		color: white;
		font-family: var(--font-body);
		font-size: 1rem;
		transition: all 0.3s;
	}

	.input-field:focus {
		outline: none;
		border-color: rgba(255, 255, 255, 0.6);
		background: rgba(255, 255, 255, 0.15);
	}
</style>
