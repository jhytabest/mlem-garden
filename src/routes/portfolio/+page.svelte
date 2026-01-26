<script lang="ts">
	import { onMount } from 'svelte';
	import Shober from '$lib/components/Shober.svelte';
	import type { ShoberData, UserWallet } from '$lib/shober/types';
	import { getRarityLabel, getRarityColor } from '$lib/shober/dna';

	let shobers = $state<ShoberData[]>([]);
	let wallet = $state<UserWallet | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Modals
	let showListModal = $state(false);
	let selectedShober = $state<ShoberData | null>(null);
	let listPrice = $state(100);

	onMount(async () => {
		await Promise.all([loadShobers(), loadWallet()]);
		loading = false;
	});

	async function loadShobers() {
		try {
			const res = await fetch('/api/shobers');
			if (!res.ok) throw new Error('Failed to load shobers');
			const data = await res.json();
			shobers = data.shobers;
		} catch (e) {
			error = (e as Error).message;
		}
	}

	async function loadWallet() {
		try {
			const res = await fetch('/api/wallet');
			if (!res.ok) throw new Error('Failed to load wallet');
			const data = await res.json();
			wallet = data.wallet;
		} catch (e) {
			console.error('Failed to load wallet:', e);
		}
	}

	async function setActive(shoberId: string) {
		try {
			const res = await fetch(`/api/shobers/${shoberId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ setActive: true })
			});
			if (!res.ok) throw new Error('Failed to set active');
			await loadShobers();
		} catch (e) {
			alert((e as Error).message);
		}
	}

	function openListModal(shober: ShoberData) {
		selectedShober = shober;
		listPrice = Math.max(50, (shober.rarityScore || 50) * 2);
		showListModal = true;
	}

	async function listForSale() {
		if (!selectedShober) return;

		try {
			const res = await fetch('/api/marketplace', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					shoberId: selectedShober.id,
					price: listPrice
				})
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.message || 'Failed to list');
			}

			showListModal = false;
			selectedShober = null;
			await loadShobers();
		} catch (e) {
			alert((e as Error).message);
		}
	}

	async function cancelListing(shoberId: string) {
		// Find the listing ID first
		const shober = shobers.find((s) => s.id === shoberId);
		if (!shober?.isForSale) return;

		try {
			// We need to get the listing ID - for now, we'll use a direct approach
			const res = await fetch(`/api/marketplace`);
			const data = await res.json();
			const listing = data.listings?.find((l: { shoberId: string }) => l.shoberId === shoberId);

			if (listing) {
				await fetch(`/api/marketplace/${listing.id}`, { method: 'DELETE' });
				await loadShobers();
			}
		} catch (e) {
			alert((e as Error).message);
		}
	}

	function formatCooldown(until: string): string {
		const remaining = new Date(until).getTime() - Date.now();
		if (remaining <= 0) return 'Ready';
		const hours = Math.floor(remaining / (1000 * 60 * 60));
		const mins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
		return `${hours}h ${mins}m`;
	}
</script>

<svelte:head>
	<title>My Shobers | Mlem Garden</title>
</svelte:head>

<div class="portfolio-page">
	<header class="page-header">
		<div class="header-left">
			<a href="/" class="back-link">← Back to Garden</a>
			<h1>My Shobers</h1>
		</div>
		<div class="header-right">
			{#if wallet}
				<div class="wallet-display">
					<span class="coin-icon">🪙</span>
					<span class="coin-amount">{wallet.mlemCoins.toLocaleString()}</span>
					<span class="coin-label">Mlem Coins</span>
				</div>
			{/if}
		</div>
	</header>

	<main class="portfolio-content">
		{#if loading}
			<div class="loading">Loading your collection...</div>
		{:else if error}
			<div class="error">{error}</div>
		{:else if shobers.length === 0}
			<div class="empty-state">
				<p>You don't have any Shobers yet!</p>
				<a href="/create" class="btn-primary">Create Your First Shober</a>
			</div>
		{:else}
			<div class="shober-grid">
				{#each shobers as shober (shober.id)}
					<div
						class="shober-card"
						class:active={shober.isActive}
						class:for-sale={shober.isForSale}
					>
						<div class="card-preview">
							<Shober config={shober.config} size={120} animated />

							{#if shober.isActive}
								<span class="badge active-badge">Active</span>
							{/if}
							{#if shober.isForSale}
								<span class="badge sale-badge">🪙 {shober.salePrice}</span>
							{/if}
						</div>

						<div class="card-info">
							<h3>{shober.name}</h3>

							<div class="stats-row">
								<span
									class="rarity-badge"
									style="background: {getRarityColor(shober.rarityScore || 50)}"
								>
									{getRarityLabel(shober.rarityScore || 50)}
								</span>
								<span class="gen-tag">Gen {shober.generation || 0}</span>
							</div>

							<div class="stats-row secondary">
								<span>💕 {shober.totalPets || 0}</span>
								<span>🎁 {shober.totalGifts || 0}</span>
								<span>Score: {shober.rarityScore || 50}</span>
							</div>

							{#if shober.parent1Name || shober.parent2Name}
								<p class="lineage">
									Parents: {shober.parent1Name || '?'} × {shober.parent2Name || '?'}
								</p>
							{/if}

							{#if shober.breedingCooldownUntil}
								<p class="cooldown">
									Breeding: {formatCooldown(shober.breedingCooldownUntil)}
								</p>
							{/if}

							<div class="card-actions">
								{#if !shober.isActive && !shober.isForSale}
									<button class="btn-small" onclick={() => setActive(shober.id)}>
										Set Active
									</button>
								{/if}

								{#if shober.isForSale}
									<button class="btn-small btn-cancel" onclick={() => cancelListing(shober.id)}>
										Cancel Listing
									</button>
								{:else if !shober.isActive}
									<button class="btn-small btn-sell" onclick={() => openListModal(shober)}>
										Sell
									</button>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>

			<div class="breeding-section">
				<h2>Breeding</h2>
				<p>Select two of your Shobers to breed and create a new one!</p>
				<a href="/breeding" class="btn-primary">Go to Breeding</a>
			</div>
		{/if}
	</main>
</div>

<!-- List for Sale Modal -->
{#if showListModal && selectedShober}
	<div class="modal-overlay" onclick={() => (showListModal = false)}>
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<h2>List {selectedShober.name} for Sale</h2>

			<div class="modal-preview">
				<Shober config={selectedShober.config} size={100} />
				<div class="modal-stats">
					<span class="rarity-badge" style="background: {getRarityColor(selectedShober.rarityScore || 50)}">
						{getRarityLabel(selectedShober.rarityScore || 50)}
					</span>
					<span>Gen {selectedShober.generation || 0}</span>
				</div>
			</div>

			<div class="price-input">
				<label for="price">Price (Mlem Coins)</label>
				<input type="number" id="price" bind:value={listPrice} min="1" max="1000000" />
			</div>

			<div class="modal-actions">
				<button class="btn-secondary" onclick={() => (showListModal = false)}>Cancel</button>
				<button class="btn-primary" onclick={listForSale}>List for Sale</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.portfolio-page {
		min-height: 100vh;
		background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 20px 32px;
		background: white;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
	}

	.header-left {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.back-link {
		font-size: 0.85rem;
		color: var(--color-text-light);
		text-decoration: none;
	}

	.back-link:hover {
		color: var(--color-primary);
	}

	.page-header h1 {
		font-size: 1.8rem;
		color: var(--color-primary);
		margin: 0;
	}

	.wallet-display {
		display: flex;
		align-items: center;
		gap: 8px;
		background: linear-gradient(135deg, #ffd700, #ffb700);
		padding: 12px 20px;
		border-radius: 24px;
		box-shadow: 0 4px 12px rgba(255, 183, 0, 0.3);
	}

	.coin-icon {
		font-size: 1.5rem;
	}

	.coin-amount {
		font-size: 1.4rem;
		font-weight: 700;
		color: #333;
	}

	.coin-label {
		font-size: 0.8rem;
		color: #666;
	}

	.portfolio-content {
		padding: 32px;
		max-width: 1200px;
		margin: 0 auto;
	}

	.loading,
	.error,
	.empty-state {
		text-align: center;
		padding: 60px;
		background: white;
		border-radius: 16px;
	}

	.shober-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 24px;
	}

	.shober-card {
		background: white;
		border-radius: 16px;
		overflow: hidden;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
		transition: transform 0.2s, box-shadow 0.2s;
	}

	.shober-card:hover {
		transform: translateY(-4px);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
	}

	.shober-card.active {
		border: 3px solid var(--color-primary);
	}

	.shober-card.for-sale {
		border: 3px solid #ffd700;
	}

	.card-preview {
		position: relative;
		display: flex;
		justify-content: center;
		padding: 24px;
		background: linear-gradient(180deg, #e8f5e9 0%, #c8e6c9 100%);
	}

	.badge {
		position: absolute;
		top: 12px;
		padding: 4px 12px;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.active-badge {
		left: 12px;
		background: var(--color-primary);
		color: white;
	}

	.sale-badge {
		right: 12px;
		background: #ffd700;
		color: #333;
	}

	.card-info {
		padding: 16px;
	}

	.card-info h3 {
		margin: 0 0 8px;
		font-size: 1.1rem;
	}

	.stats-row {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 8px;
	}

	.stats-row.secondary {
		font-size: 0.85rem;
		color: var(--color-text-light);
	}

	.rarity-badge {
		padding: 2px 8px;
		border-radius: 10px;
		font-size: 0.75rem;
		font-weight: 600;
		color: white;
	}

	.gen-tag {
		font-size: 0.8rem;
		color: var(--color-text-light);
		background: #f0f0f0;
		padding: 2px 8px;
		border-radius: 8px;
	}

	.lineage,
	.cooldown {
		font-size: 0.8rem;
		color: var(--color-text-light);
		margin: 8px 0;
	}

	.cooldown {
		color: #ff9800;
	}

	.card-actions {
		display: flex;
		gap: 8px;
		margin-top: 12px;
	}

	.btn-small {
		flex: 1;
		padding: 8px 12px;
		font-size: 0.85rem;
		border-radius: 8px;
		background: var(--color-primary);
		color: white;
		border: none;
		cursor: pointer;
	}

	.btn-small:hover {
		opacity: 0.9;
	}

	.btn-sell {
		background: #ffd700;
		color: #333;
	}

	.btn-cancel {
		background: #ef5350;
	}

	.breeding-section {
		margin-top: 48px;
		padding: 32px;
		background: white;
		border-radius: 16px;
		text-align: center;
	}

	.breeding-section h2 {
		margin: 0 0 8px;
	}

	.breeding-section p {
		color: var(--color-text-light);
		margin-bottom: 16px;
	}

	/* Modal */
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}

	.modal {
		background: white;
		padding: 32px;
		border-radius: 16px;
		max-width: 400px;
		width: 90%;
	}

	.modal h2 {
		margin: 0 0 20px;
		text-align: center;
	}

	.modal-preview {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		margin-bottom: 24px;
	}

	.modal-stats {
		display: flex;
		gap: 12px;
	}

	.price-input {
		margin-bottom: 24px;
	}

	.price-input label {
		display: block;
		margin-bottom: 8px;
		font-weight: 600;
	}

	.price-input input {
		width: 100%;
		padding: 12px;
		font-size: 1.1rem;
		border: 2px solid #ddd;
		border-radius: 8px;
	}

	.modal-actions {
		display: flex;
		gap: 12px;
	}

	.modal-actions button {
		flex: 1;
	}

	@media (max-width: 600px) {
		.page-header {
			flex-direction: column;
			gap: 16px;
			text-align: center;
		}

		.portfolio-content {
			padding: 16px;
		}

		.shober-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
