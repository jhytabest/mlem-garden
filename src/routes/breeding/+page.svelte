<script lang="ts">
	import { onMount } from 'svelte';
	import Shober from '$lib/components/Shober.svelte';
	import type { ShoberData, UserWallet } from '$lib/shober/types';
	import { getRarityLabel, getRarityColor } from '$lib/shober/dna';
	import { getBreedingCost, formatCooldown } from '$lib/shober/breeding';

	let shobers = $state<ShoberData[]>([]);
	let wallet = $state<UserWallet | null>(null);
	let loading = $state(true);

	// Selection
	let parent1 = $state<ShoberData | null>(null);
	let parent2 = $state<ShoberData | null>(null);

	// Result
	let babyResult = $state<{
		baby: ShoberData;
		inheritedTraits: { baseColorFrom: string; eyeStyleFrom: string; accessoryFrom: string; hasMutation: boolean };
		cost: number;
	} | null>(null);
	let breeding = $state(false);
	let breedingError = $state<string | null>(null);

	onMount(async () => {
		await Promise.all([loadShobers(), loadWallet()]);
		loading = false;
	});

	async function loadShobers() {
		try {
			const res = await fetch('/api/shobers');
			if (!res.ok) throw new Error('Failed to load shobers');
			const data = await res.json() as { shobers: ShoberData[] };
			shobers = data.shobers;
		} catch (e) {
			console.error(e);
		}
	}

	async function loadWallet() {
		try {
			const res = await fetch('/api/wallet');
			if (!res.ok) return;
			const data = await res.json() as { wallet: UserWallet };
			wallet = data.wallet;
		} catch (e) {
			console.error(e);
		}
	}

	function canBreed(shober: ShoberData): boolean {
		if (shober.isForSale) return false;
		if (!shober.breedingCooldownUntil) return true;
		return new Date(shober.breedingCooldownUntil).getTime() <= Date.now();
	}

	function getCooldownRemaining(shober: ShoberData): string {
		if (!shober.breedingCooldownUntil) return 'Ready';
		const remaining = new Date(shober.breedingCooldownUntil).getTime() - Date.now();
		if (remaining <= 0) return 'Ready';
		return formatCooldown(remaining);
	}

	function selectParent(shober: ShoberData, slot: 1 | 2) {
		if (!canBreed(shober)) return;

		if (slot === 1) {
			if (parent2?.id === shober.id) parent2 = null;
			parent1 = shober;
		} else {
			if (parent1?.id === shober.id) parent1 = null;
			parent2 = shober;
		}
	}

	function getBreedingCostAmount(): number {
		if (!parent1 || !parent2) return 0;
		return getBreedingCost(parent1.generation || 0, parent2.generation || 0);
	}

	function canAffordBreeding(): boolean {
		return (wallet?.mlemCoins || 0) >= getBreedingCostAmount();
	}

	async function breed() {
		if (!parent1 || !parent2 || breeding) return;

		breeding = true;
		breedingError = null;
		babyResult = null;

		try {
			const res = await fetch('/api/breeding', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					shober1Id: parent1.id,
					shober2Id: parent2.id
				})
			});

			if (!res.ok) {
				const data = await res.json() as { message?: string };
				throw new Error(data.message || 'Breeding failed');
			}

			const data = await res.json() as {
				baby: ShoberData;
				inheritedTraits: { baseColorFrom: string; eyeStyleFrom: string; accessoryFrom: string; hasMutation: boolean };
				cost: number;
			};
			babyResult = {
				baby: data.baby,
				inheritedTraits: data.inheritedTraits,
				cost: data.cost
			};

			// Refresh data
			await Promise.all([loadShobers(), loadWallet()]);
			parent1 = null;
			parent2 = null;
		} catch (e) {
			breedingError = (e as Error).message;
		} finally {
			breeding = false;
		}
	}

	function clearResult() {
		babyResult = null;
	}
</script>

<svelte:head>
	<title>Breeding | Mlem Garden</title>
</svelte:head>

<div class="breeding-page">
	<header class="page-header">
		<div class="header-left">
			<a href="/portfolio" class="back-link">← Back to Portfolio</a>
			<h1>Shober Breeding</h1>
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

	<main class="breeding-content">
		{#if loading}
			<div class="loading">Loading...</div>
		{:else if babyResult}
			<!-- Baby Result -->
			<div class="result-container">
				<h2>Congratulations!</h2>
				<p>A new Shober has been born!</p>

				<div class="baby-reveal">
					<Shober config={babyResult.baby.config} size={160} animated />
				</div>

				<div class="baby-info">
					<h3>{babyResult.baby.name}</h3>
					<div class="stats-row">
						<span
							class="rarity-badge"
							style="background: {getRarityColor(babyResult.baby.rarityScore || 50)}"
						>
							{getRarityLabel(babyResult.baby.rarityScore || 50)}
						</span>
						<span class="gen-tag">Gen {babyResult.baby.generation}</span>
					</div>

					{#if babyResult.baby.mutation && babyResult.baby.mutation !== 'none'}
						<p class="mutation-alert">This Shober has a mutation: {babyResult.baby.mutation}!</p>
					{/if}

					<div class="inheritance-info">
						<p><strong>Inherited Traits:</strong></p>
						<ul>
							<li>Color from {babyResult.inheritedTraits.baseColorFrom}</li>
							<li>Eyes from {babyResult.inheritedTraits.eyeStyleFrom}</li>
							<li>Accessory from {babyResult.inheritedTraits.accessoryFrom}</li>
						</ul>
					</div>
				</div>

				<button class="btn-primary" onclick={clearResult}>Breed Another</button>
			</div>
		{:else}
			<!-- Breeding Selection -->
			<div class="breeding-station">
				<p class="instructions">Select two Shobers to breed together</p>

				<div class="parent-slots">
					<div class="parent-slot" class:selected={parent1 !== null}>
						<h3>Parent 1</h3>
						{#if parent1}
							<div class="slot-preview">
								<Shober config={parent1.config} size={100} animated />
								<span>{parent1.name}</span>
								<button class="btn-clear" onclick={() => (parent1 = null)}>×</button>
							</div>
						{:else}
							<div class="slot-empty">Select a Shober</div>
						{/if}
					</div>

					<div class="breed-arrow">+</div>

					<div class="parent-slot" class:selected={parent2 !== null}>
						<h3>Parent 2</h3>
						{#if parent2}
							<div class="slot-preview">
								<Shober config={parent2.config} size={100} animated />
								<span>{parent2.name}</span>
								<button class="btn-clear" onclick={() => (parent2 = null)}>×</button>
							</div>
						{:else}
							<div class="slot-empty">Select a Shober</div>
						{/if}
					</div>
				</div>

				{#if parent1 && parent2}
					<div class="breed-info">
						<p>Breeding Cost: <strong>🪙 {getBreedingCostAmount()}</strong></p>
						<p>Baby Generation: <strong>Gen {Math.max(parent1.generation || 0, parent2.generation || 0) + 1}</strong></p>

						{#if breedingError}
							<p class="error">{breedingError}</p>
						{/if}

						<button
							class="btn-breed"
							onclick={breed}
							disabled={breeding || !canAffordBreeding()}
						>
							{#if breeding}
								Breeding...
							{:else if !canAffordBreeding()}
								Not enough coins
							{:else}
								Breed!
							{/if}
						</button>
					</div>
				{/if}
			</div>

			<!-- Shober Selection Grid -->
			<div class="shober-selection">
				<h2>Your Shobers</h2>

				{#if shobers.length < 2}
					<p class="warning">You need at least 2 Shobers to breed. Create more!</p>
				{:else}
					<div class="shober-grid">
						{#each shobers as shober (shober.id)}
							{@const isSelected = parent1?.id === shober.id || parent2?.id === shober.id}
							{@const available = canBreed(shober)}

							<button
								class="shober-option"
								class:selected={isSelected}
								class:unavailable={!available}
								disabled={!available}
								onclick={() => {
									if (!available) return;
									if (!parent1 || isSelected) {
										selectParent(shober, 1);
									} else if (!parent2) {
										selectParent(shober, 2);
									} else {
										selectParent(shober, 1);
									}
								}}
							>
								<Shober config={shober.config} size={80} />
								<span class="option-name">{shober.name}</span>
								<span class="option-gen">Gen {shober.generation || 0}</span>

								{#if !available}
									<span class="cooldown-label">
										{shober.isForSale ? 'For Sale' : getCooldownRemaining(shober)}
									</span>
								{/if}
							</button>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</main>
</div>

<style>
	.breeding-page {
		min-height: 100vh;
		background: linear-gradient(135deg, #fce4ec 0%, #f3e5f5 100%);
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

	.breeding-content {
		padding: 32px;
		max-width: 1000px;
		margin: 0 auto;
	}

	.loading {
		text-align: center;
		padding: 60px;
		background: white;
		border-radius: 16px;
	}

	.instructions {
		text-align: center;
		color: var(--color-text-light);
		margin-bottom: 24px;
	}

	.breeding-station {
		background: white;
		border-radius: 16px;
		padding: 32px;
		margin-bottom: 32px;
	}

	.parent-slots {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 32px;
		margin-bottom: 24px;
	}

	.parent-slot {
		text-align: center;
	}

	.parent-slot h3 {
		margin: 0 0 12px;
		font-size: 1rem;
	}

	.slot-preview,
	.slot-empty {
		width: 150px;
		height: 180px;
		border: 3px dashed #ddd;
		border-radius: 16px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		position: relative;
	}

	.slot-preview {
		border-style: solid;
		border-color: var(--color-primary);
		background: #f9f9f9;
	}

	.slot-empty {
		color: var(--color-text-light);
	}

	.btn-clear {
		position: absolute;
		top: 8px;
		right: 8px;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: #ef5350;
		color: white;
		border: none;
		cursor: pointer;
		font-size: 1rem;
		line-height: 1;
	}

	.breed-arrow {
		font-size: 2rem;
		color: var(--color-primary);
	}

	.breed-info {
		text-align: center;
		padding-top: 24px;
		border-top: 1px solid #eee;
	}

	.breed-info p {
		margin: 8px 0;
	}

	.error {
		color: #ef5350;
	}

	.btn-breed {
		margin-top: 16px;
		padding: 16px 48px;
		font-size: 1.2rem;
		background: linear-gradient(135deg, #ff80ab, #f48fb1);
		color: white;
		border: none;
		border-radius: 24px;
		cursor: pointer;
		transition: transform 0.2s;
	}

	.btn-breed:hover:not(:disabled) {
		transform: scale(1.05);
	}

	.btn-breed:disabled {
		background: #ccc;
		cursor: not-allowed;
	}

	.shober-selection {
		background: white;
		border-radius: 16px;
		padding: 32px;
	}

	.shober-selection h2 {
		margin: 0 0 20px;
	}

	.warning {
		color: #ff9800;
		text-align: center;
	}

	.shober-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: 16px;
	}

	.shober-option {
		background: #f9f9f9;
		border: 3px solid transparent;
		border-radius: 16px;
		padding: 16px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		cursor: pointer;
		transition: all 0.2s;
		position: relative;
	}

	.shober-option:hover:not(:disabled) {
		border-color: var(--color-primary);
	}

	.shober-option.selected {
		border-color: var(--color-primary);
		background: #fff0f5;
	}

	.shober-option.unavailable {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.option-name {
		font-weight: 600;
		font-size: 0.9rem;
	}

	.option-gen {
		font-size: 0.75rem;
		color: var(--color-text-light);
	}

	.cooldown-label {
		position: absolute;
		bottom: 8px;
		background: #ff9800;
		color: white;
		padding: 2px 8px;
		border-radius: 8px;
		font-size: 0.7rem;
	}

	/* Result */
	.result-container {
		background: white;
		border-radius: 16px;
		padding: 48px;
		text-align: center;
	}

	.result-container h2 {
		color: var(--color-primary);
		margin: 0 0 8px;
	}

	.baby-reveal {
		margin: 32px 0;
		animation: pop-in 0.5s ease-out;
	}

	@keyframes pop-in {
		0% {
			transform: scale(0);
			opacity: 0;
		}
		70% {
			transform: scale(1.1);
		}
		100% {
			transform: scale(1);
			opacity: 1;
		}
	}

	.baby-info h3 {
		margin: 0 0 12px;
		font-size: 1.4rem;
	}

	.stats-row {
		display: flex;
		justify-content: center;
		gap: 12px;
		margin-bottom: 16px;
	}

	.rarity-badge {
		padding: 4px 12px;
		border-radius: 12px;
		font-size: 0.8rem;
		font-weight: 600;
		color: white;
	}

	.gen-tag {
		font-size: 0.85rem;
		color: var(--color-text-light);
		background: #f0f0f0;
		padding: 4px 12px;
		border-radius: 12px;
	}

	.mutation-alert {
		color: #9c27b0;
		font-weight: 600;
		margin: 16px 0;
	}

	.inheritance-info {
		background: #f5f5f5;
		padding: 16px;
		border-radius: 12px;
		margin: 24px 0;
		text-align: left;
		display: inline-block;
	}

	.inheritance-info ul {
		margin: 8px 0 0;
		padding-left: 20px;
	}

	@media (max-width: 600px) {
		.parent-slots {
			flex-direction: column;
		}

		.breed-arrow {
			transform: rotate(90deg);
		}
	}
</style>
