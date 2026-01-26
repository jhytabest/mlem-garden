<script lang="ts">
	import { onMount } from 'svelte';
	import Shober from '$lib/components/Shober.svelte';
	import type { MarketplaceListing, UserWallet } from '$lib/shober/types';
	import { getRarityLabel, getRarityColor } from '$lib/shober/dna';

	let listings = $state<MarketplaceListing[]>([]);
	let wallet = $state<UserWallet | null>(null);
	let loading = $state(true);
	let total = $state(0);

	// Filters
	let sortBy = $state('listed_desc');
	let minPrice = $state<number | undefined>();
	let maxPrice = $state<number | undefined>();
	let generation = $state<number | undefined>();
	let rarity = $state<string | undefined>();

	// Pagination
	let offset = $state(0);
	const limit = 20;

	// Buy modal
	let showBuyModal = $state(false);
	let selectedListing = $state<MarketplaceListing | null>(null);
	let buying = $state(false);

	onMount(async () => {
		await Promise.all([loadListings(), loadWallet()]);
		loading = false;
	});

	async function loadListings() {
		try {
			const params = new URLSearchParams();
			params.set('limit', limit.toString());
			params.set('offset', offset.toString());
			params.set('sort', sortBy);
			if (minPrice) params.set('minPrice', minPrice.toString());
			if (maxPrice) params.set('maxPrice', maxPrice.toString());
			if (generation !== undefined) params.set('generation', generation.toString());
			if (rarity) params.set('rarity', rarity);

			const res = await fetch(`/api/marketplace?${params}`);
			if (!res.ok) throw new Error('Failed to load marketplace');
			const data = await res.json() as { listings: MarketplaceListing[]; total: number };
			listings = data.listings;
			total = data.total;
		} catch (e) {
			console.error('Failed to load listings:', e);
		}
	}

	async function loadWallet() {
		try {
			const res = await fetch('/api/wallet');
			if (!res.ok) return;
			const data = await res.json() as { wallet: UserWallet };
			wallet = data.wallet;
		} catch (e) {
			console.error('Failed to load wallet:', e);
		}
	}

	function applyFilters() {
		offset = 0;
		loadListings();
	}

	function clearFilters() {
		minPrice = undefined;
		maxPrice = undefined;
		generation = undefined;
		rarity = undefined;
		sortBy = 'listed_desc';
		offset = 0;
		loadListings();
	}

	function openBuyModal(listing: MarketplaceListing) {
		selectedListing = listing;
		showBuyModal = true;
	}

	async function buyShober() {
		if (!selectedListing || buying) return;

		buying = true;
		try {
			const res = await fetch(`/api/marketplace/${selectedListing.id}`, {
				method: 'POST'
			});

			if (!res.ok) {
				const data = await res.json() as { message?: string };
				throw new Error(data.message || 'Purchase failed');
			}

			showBuyModal = false;
			selectedListing = null;
			await Promise.all([loadListings(), loadWallet()]);
			alert('Purchase successful! Check your portfolio.');
		} catch (e) {
			alert((e as Error).message);
		} finally {
			buying = false;
		}
	}

	function canAfford(price: number): boolean {
		return (wallet?.mlemCoins || 0) >= price;
	}
</script>

<svelte:head>
	<title>Marketplace | Mlem Garden</title>
</svelte:head>

<div class="marketplace-page">
	<header class="page-header">
		<div class="header-left">
			<a href="/" class="back-link">← Back to Garden</a>
			<h1>Shober Marketplace</h1>
		</div>
		<div class="header-right">
			{#if wallet}
				<div class="wallet-display">
					<span class="coin-icon">🪙</span>
					<span class="coin-amount">{wallet.mlemCoins.toLocaleString()}</span>
				</div>
			{/if}
		</div>
	</header>

	<div class="marketplace-layout">
		<!-- Filters Sidebar -->
		<aside class="filters-sidebar">
			<h3>Filters</h3>

			<div class="filter-group">
				<label for="sort">Sort By</label>
				<select id="sort" bind:value={sortBy} onchange={applyFilters}>
					<option value="listed_desc">Newest First</option>
					<option value="listed_asc">Oldest First</option>
					<option value="price_asc">Price: Low to High</option>
					<option value="price_desc">Price: High to Low</option>
					<option value="rarity_desc">Rarity: High to Low</option>
					<option value="generation_asc">Generation: Low to High</option>
				</select>
			</div>

			<div class="filter-group">
				<span class="label-text">Price Range</span>
				<div class="price-range">
					<input type="number" placeholder="Min" bind:value={minPrice} />
					<span>-</span>
					<input type="number" placeholder="Max" bind:value={maxPrice} />
				</div>
			</div>

			<div class="filter-group">
				<label for="generation">Generation</label>
				<select id="generation" bind:value={generation}>
					<option value={undefined}>Any</option>
					<option value={0}>Gen 0</option>
					<option value={1}>Gen 1</option>
					<option value={2}>Gen 2</option>
					<option value={3}>Gen 3</option>
					<option value={4}>Gen 4+</option>
				</select>
			</div>

			<div class="filter-group">
				<label for="rarity">Rarity</label>
				<select id="rarity" bind:value={rarity}>
					<option value={undefined}>Any</option>
					<option value="legendary">Legendary</option>
					<option value="rare">Rare</option>
					<option value="uncommon">Uncommon</option>
					<option value="common">Common</option>
				</select>
			</div>

			<div class="filter-actions">
				<button class="btn-primary" onclick={applyFilters}>Apply Filters</button>
				<button class="btn-secondary" onclick={clearFilters}>Clear</button>
			</div>
		</aside>

		<!-- Listings Grid -->
		<main class="listings-content">
			{#if loading}
				<div class="loading">Loading marketplace...</div>
			{:else if listings.length === 0}
				<div class="empty-state">
					<p>No Shobers for sale right now.</p>
					<p>Check back later or list one of yours!</p>
				</div>
			{:else}
				<p class="results-count">{total} Shobers for sale</p>

				<div class="listings-grid">
					{#each listings as listing (listing.id)}
						<div class="listing-card">
							<div class="card-preview">
								<Shober config={listing.shober.config} size={100} animated />
							</div>

							<div class="card-info">
								<h3>{listing.shober.name}</h3>

								<div class="stats-row">
									<span
										class="rarity-badge"
										style="background: {getRarityColor(listing.shober.rarityScore)}"
									>
										{getRarityLabel(listing.shober.rarityScore)}
									</span>
									<span class="gen-tag">Gen {listing.shober.generation}</span>
								</div>

								<div class="seller-info">
									Seller: {listing.sellerName}
								</div>

								<div class="price-row">
									<span class="price">🪙 {listing.price.toLocaleString()}</span>
								</div>

								<button
									class="btn-buy"
									onclick={() => openBuyModal(listing)}
									disabled={!canAfford(listing.price)}
								>
									{canAfford(listing.price) ? 'Buy Now' : 'Not enough coins'}
								</button>
							</div>
						</div>
					{/each}
				</div>

				<!-- Pagination -->
				{#if total > limit}
					<div class="pagination">
						<button
							class="btn-secondary"
							disabled={offset === 0}
							onclick={() => {
								offset = Math.max(0, offset - limit);
								loadListings();
							}}
						>
							← Previous
						</button>
						<span>
							Page {Math.floor(offset / limit) + 1} of {Math.ceil(total / limit)}
						</span>
						<button
							class="btn-secondary"
							disabled={offset + limit >= total}
							onclick={() => {
								offset += limit;
								loadListings();
							}}
						>
							Next →
						</button>
					</div>
				{/if}
			{/if}
		</main>
	</div>
</div>

<!-- Buy Modal -->
{#if showBuyModal && selectedListing}
	<div
		class="modal-overlay"
		role="button"
		tabindex="0"
		onclick={() => (showBuyModal = false)}
		onkeydown={(e) => {
			if (e.key === 'Escape' || e.key === 'Enter') showBuyModal = false;
		}}
	>
		<div
			class="modal"
			role="button"
			tabindex="0"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<h2>Buy {selectedListing.shober.name}?</h2>

			<div class="modal-preview">
				<Shober config={selectedListing.shober.config} size={120} animated />
				<div class="modal-stats">
					<span
						class="rarity-badge"
						style="background: {getRarityColor(selectedListing.shober.rarityScore)}"
					>
						{getRarityLabel(selectedListing.shober.rarityScore)}
					</span>
					<span>Gen {selectedListing.shober.generation}</span>
				</div>
			</div>

			<div class="purchase-summary">
				<div class="summary-row">
					<span>Price:</span>
					<span class="price">🪙 {selectedListing.price.toLocaleString()}</span>
				</div>
				<div class="summary-row">
					<span>Your Balance:</span>
					<span>🪙 {wallet?.mlemCoins.toLocaleString() || 0}</span>
				</div>
				<hr />
				<div class="summary-row">
					<span>After Purchase:</span>
					<span
						class:insufficient={!canAfford(selectedListing.price)}
					>
						🪙 {((wallet?.mlemCoins || 0) - selectedListing.price).toLocaleString()}
					</span>
				</div>
			</div>

			<div class="modal-actions">
				<button class="btn-secondary" onclick={() => (showBuyModal = false)}>Cancel</button>
				<button
					class="btn-primary"
					onclick={buyShober}
					disabled={buying || !canAfford(selectedListing.price)}
				>
					{buying ? 'Purchasing...' : 'Confirm Purchase'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.marketplace-page {
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
	}

	.coin-icon {
		font-size: 1.5rem;
	}

	.coin-amount {
		font-size: 1.4rem;
		font-weight: 700;
		color: #333;
	}

	.marketplace-layout {
		display: flex;
		gap: 24px;
		padding: 24px;
		max-width: 1400px;
		margin: 0 auto;
	}

	.filters-sidebar {
		width: 280px;
		flex-shrink: 0;
		background: white;
		padding: 24px;
		border-radius: 16px;
		height: fit-content;
		position: sticky;
		top: 24px;
	}

	.filters-sidebar h3 {
		margin: 0 0 20px;
	}

	.filter-group {
		margin-bottom: 20px;
	}

	.filter-group label,
	.filter-group .label-text {
		display: block;
		margin-bottom: 8px;
		font-weight: 600;
		font-size: 0.9rem;
	}

	.filter-group select,
	.filter-group input {
		width: 100%;
		padding: 10px;
		border: 2px solid #e0e0e0;
		border-radius: 8px;
		font-size: 0.9rem;
	}

	.price-range {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.price-range input {
		width: 100%;
	}

	.filter-actions {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.listings-content {
		flex: 1;
	}

	.loading,
	.empty-state {
		text-align: center;
		padding: 60px;
		background: white;
		border-radius: 16px;
	}

	.results-count {
		margin-bottom: 16px;
		color: var(--color-text-light);
	}

	.listings-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: 20px;
	}

	.listing-card {
		background: white;
		border-radius: 16px;
		overflow: hidden;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
		transition: transform 0.2s;
	}

	.listing-card:hover {
		transform: translateY(-4px);
	}

	.card-preview {
		display: flex;
		justify-content: center;
		padding: 20px;
		background: linear-gradient(180deg, #e3f2fd 0%, #bbdefb 100%);
	}

	.card-info {
		padding: 16px;
	}

	.card-info h3 {
		margin: 0 0 8px;
		font-size: 1rem;
	}

	.stats-row {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 8px;
	}

	.rarity-badge {
		padding: 2px 8px;
		border-radius: 10px;
		font-size: 0.7rem;
		font-weight: 600;
		color: white;
	}

	.gen-tag {
		font-size: 0.75rem;
		color: var(--color-text-light);
		background: #f0f0f0;
		padding: 2px 8px;
		border-radius: 8px;
	}

	.seller-info {
		font-size: 0.8rem;
		color: var(--color-text-light);
		margin-bottom: 8px;
	}

	.price-row {
		margin-bottom: 12px;
	}

	.price {
		font-size: 1.2rem;
		font-weight: 700;
		color: #f9a825;
	}

	.btn-buy {
		width: 100%;
		padding: 10px;
		background: var(--color-primary);
		color: white;
		border: none;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
	}

	.btn-buy:hover:not(:disabled) {
		opacity: 0.9;
	}

	.btn-buy:disabled {
		background: #ccc;
		cursor: not-allowed;
	}

	.pagination {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 16px;
		margin-top: 32px;
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

	.purchase-summary {
		background: #f5f5f5;
		padding: 16px;
		border-radius: 12px;
		margin-bottom: 24px;
	}

	.summary-row {
		display: flex;
		justify-content: space-between;
		margin-bottom: 8px;
	}

	.summary-row:last-child {
		margin-bottom: 0;
	}

	.purchase-summary hr {
		width: 100%;
		border: none;
		border-top: 1px solid #ddd;
		margin: 8px 0;
	}

	.insufficient {
		color: #ef5350;
	}

	.modal-actions {
		display: flex;
		gap: 12px;
	}

	.modal-actions button {
		flex: 1;
	}

	@media (max-width: 900px) {
		.marketplace-layout {
			flex-direction: column;
		}

		.filters-sidebar {
			width: 100%;
			position: static;
		}
	}

	@media (max-width: 600px) {
		.page-header {
			flex-direction: column;
			gap: 16px;
		}

		.listings-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
