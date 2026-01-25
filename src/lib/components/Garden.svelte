<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Shober from './Shober.svelte';
	import type { ShoberData } from '$lib/shober/types';
	import { shobers, gardenWS, loadShobers, connectionState, connectedUsers } from '$lib/stores/garden';

	interface User {
		id: string;
		email: string;
		displayName: string | null;
		avatarUrl: string | null;
	}

	interface Props {
		user: User;
	}

	let { user }: Props = $props();

	let selectedShober = $state<ShoberData | null>(null);
	let interactionAnimation = $state<{ shoberId: string; type: string; x: number; y: number } | null>(null);

	onMount(async () => {
		// Load shobers from API
		await loadShobers();

		// WebSocket disabled for now - real-time will be added later
		// gardenWS.connect();

		// Listen for interaction events
		window.addEventListener('garden-interaction', handleInteractionEvent as EventListener);
	});

	onDestroy(() => {
		// gardenWS.disconnect();
		window.removeEventListener('garden-interaction', handleInteractionEvent as EventListener);
	});

	function handleInteractionEvent(event: CustomEvent) {
		const { type, shoberId } = event.detail;

		// Find shober position for animation
		const shober = $shobers.find(s => s.id === shoberId);
		if (shober) {
			interactionAnimation = {
				shoberId,
				type,
				x: shober.positionX,
				y: shober.positionY
			};

			// Clear animation after delay
			setTimeout(() => {
				interactionAnimation = null;
			}, 1500);
		}
	}

	function handleShoberClick(shober: ShoberData) {
		if (shober.userId === user.id) {
			// Own shober - maybe open settings
			return;
		}
		selectedShober = shober;
	}

	async function handlePet() {
		if (!selectedShober) return;

		try {
			const response = await fetch('/api/garden/interact', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					shoberId: selectedShober.id,
					type: 'pet'
				})
			});

			if (response.ok) {
				// WebSocket disabled for now
				// gardenWS.interact('pet', selectedShober.id);

				// Show local animation
				interactionAnimation = {
					shoberId: selectedShober.id,
					type: 'pet',
					x: selectedShober.positionX,
					y: selectedShober.positionY
				};

				setTimeout(() => {
					interactionAnimation = null;
				}, 1500);
			}
		} catch (e) {
			console.error('Failed to pet:', e);
		}

		selectedShober = null;
	}

	async function handleGift(giftType: string) {
		if (!selectedShober) return;

		try {
			const response = await fetch('/api/garden/interact', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					shoberId: selectedShober.id,
					type: 'gift',
					data: { giftType }
				})
			});

			if (response.ok) {
				// WebSocket disabled for now
				// gardenWS.interact('gift', selectedShober.id, { giftType });

				interactionAnimation = {
					shoberId: selectedShober.id,
					type: 'gift',
					x: selectedShober.positionX,
					y: selectedShober.positionY
				};

				setTimeout(() => {
					interactionAnimation = null;
				}, 1500);
			}
		} catch (e) {
			console.error('Failed to gift:', e);
		}

		selectedShober = null;
	}

	function closeMenu() {
		selectedShober = null;
	}
</script>

<div class="garden-container">
	<header class="garden-header">
		<div class="header-left">
			<h1>Mlem Garden</h1>
			<span class="connection-status" class:connected={$connectionState === 'connected'}>
				{$connectionState === 'connected' ? 'Live' : 'Connecting...'}
			</span>
		</div>
		<div class="user-info">
			<span>Welcome, {user.displayName || user.email}!</span>
			<a href="/create" class="btn-primary">
				{$shobers.some((s) => s.userId === user.id) ? 'Edit Shober' : 'Create Shober'}
			</a>
			<a href="/api/auth/logout" class="btn-secondary">Logout</a>
		</div>
	</header>

	<div class="garden" role="application" aria-label="Shober Garden">
		<!-- Garden background elements -->
		<div class="garden-bg">
			<div class="grass"></div>
			<div class="flower flower-1">🌸</div>
			<div class="flower flower-2">🌼</div>
			<div class="flower flower-3">🌷</div>
			<div class="flower flower-4">🌻</div>
			<div class="tree tree-1">🌳</div>
			<div class="tree tree-2">🌲</div>
		</div>

		<!-- Shobers -->
		{#each $shobers as shober (shober.id)}
			<button
				class="shober-wrapper"
				class:online={$connectedUsers.has(shober.userId)}
				class:own={shober.userId === user.id}
				style="left: {shober.positionX}%; top: {shober.positionY}%;"
				onclick={() => handleShoberClick(shober)}
				aria-label="Shober named {shober.name}"
			>
				<Shober config={shober.config} size={80} animated />
				<span class="shober-name">
					{shober.name}
					{#if $connectedUsers.has(shober.userId)}
						<span class="online-dot"></span>
					{/if}
				</span>
			</button>
		{/each}

		<!-- Interaction animations -->
		{#if interactionAnimation}
			<div
				class="interaction-effect"
				class:pet={interactionAnimation.type === 'pet'}
				class:gift={interactionAnimation.type === 'gift'}
				style="left: {interactionAnimation.x}%; top: {interactionAnimation.y - 10}%;"
			>
				{#if interactionAnimation.type === 'pet'}
					💕
				{:else if interactionAnimation.type === 'gift'}
					🎁
				{/if}
			</div>
		{/if}

		<!-- Interaction menu -->
		{#if selectedShober}
			<div class="interaction-overlay" onclick={closeMenu} role="button" tabindex="-1"></div>
			<div
				class="interaction-menu"
				style="left: {selectedShober.positionX}%; top: {selectedShober.positionY - 15}%;"
			>
				<div class="menu-header">{selectedShober.name}</div>
				<div class="menu-stats">
					<span>💕 {selectedShober.totalPets || 0}</span>
					<span>🎁 {selectedShober.totalGifts || 0}</span>
				</div>
				<div class="menu-actions">
					<button onclick={handlePet} class="action-btn pet-btn">
						💕 Pet
					</button>
					<div class="gift-options">
						<button onclick={() => handleGift('flower')} class="gift-btn" title="Flower">🌸</button>
						<button onclick={() => handleGift('treat')} class="gift-btn" title="Treat">🍖</button>
						<button onclick={() => handleGift('toy')} class="gift-btn" title="Toy">🎾</button>
					</div>
				</div>
			</div>
		{/if}
	</div>

	<footer class="garden-footer">
		<p>{$shobers.length} shobers in the garden • {$connectedUsers.size} online</p>
	</footer>
</div>

<style>
	.garden-container {
		height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.garden-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px 24px;
		background: var(--color-white);
		box-shadow: 0 2px 10px var(--color-shadow);
		z-index: 10;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.garden-header h1 {
		font-size: 1.5rem;
		color: var(--color-primary);
	}

	.connection-status {
		font-size: 0.75rem;
		padding: 4px 8px;
		border-radius: 12px;
		background: #ffcc80;
		color: #e65100;
	}

	.connection-status.connected {
		background: #c8e6c9;
		color: #2e7d32;
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: 16px;
	}

	.user-info span {
		color: var(--color-text-light);
	}

	.user-info .btn-primary,
	.user-info .btn-secondary {
		padding: 8px 16px;
		font-size: 0.9rem;
	}

	.garden {
		flex: 1;
		position: relative;
		background: linear-gradient(180deg, #87ceeb 0%, #98fb98 30%, #90ee90 100%);
		overflow: hidden;
	}

	.garden-bg {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.grass {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 70%;
		background: linear-gradient(180deg, #7cb342 0%, #558b2f 100%);
		border-radius: 50% 50% 0 0 / 20% 20% 0 0;
	}

	.flower,
	.tree {
		position: absolute;
		font-size: 2rem;
		filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
	}

	.flower-1 { left: 10%; bottom: 15%; }
	.flower-2 { left: 85%; bottom: 25%; }
	.flower-3 { left: 30%; bottom: 10%; }
	.flower-4 { left: 70%; bottom: 20%; }
	.tree-1 { left: 5%; bottom: 30%; font-size: 4rem; }
	.tree-2 { right: 8%; bottom: 35%; font-size: 3.5rem; }

	.shober-wrapper {
		position: absolute;
		transform: translate(-50%, -50%);
		background: none;
		padding: 8px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		transition: transform 0.2s ease;
		opacity: 0.85;
	}

	.shober-wrapper.online {
		opacity: 1;
	}

	.shober-wrapper.own {
		cursor: default;
	}

	.shober-wrapper:hover {
		transform: translate(-50%, -50%) scale(1.1);
	}

	.shober-name {
		background: var(--color-white);
		padding: 4px 12px;
		border-radius: 12px;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-text);
		box-shadow: 0 2px 8px var(--color-shadow);
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.online-dot {
		width: 8px;
		height: 8px;
		background: #4caf50;
		border-radius: 50%;
		animation: pulse 2s infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	.interaction-overlay {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.2);
		z-index: 5;
	}

	.interaction-menu {
		position: absolute;
		transform: translate(-50%, -100%);
		background: var(--color-white);
		border-radius: var(--border-radius);
		padding: 12px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
		z-index: 10;
		min-width: 160px;
	}

	.menu-header {
		text-align: center;
		font-weight: 700;
		margin-bottom: 8px;
	}

	.menu-stats {
		display: flex;
		justify-content: center;
		gap: 16px;
		font-size: 0.85rem;
		color: var(--color-text-light);
		margin-bottom: 12px;
		padding-bottom: 8px;
		border-bottom: 1px solid #eee;
	}

	.menu-actions {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.action-btn {
		padding: 10px 16px;
		font-size: 1rem;
	}

	.pet-btn {
		background: #ff80ab;
		color: white;
	}

	.pet-btn:hover {
		background: #ff4081;
	}

	.gift-options {
		display: flex;
		gap: 8px;
		justify-content: center;
	}

	.gift-btn {
		width: 44px;
		height: 44px;
		font-size: 1.5rem;
		padding: 0;
		background: #e8f5e9;
		border-radius: 50%;
	}

	.gift-btn:hover {
		background: #c8e6c9;
	}

	.interaction-effect {
		position: absolute;
		transform: translate(-50%, -50%);
		font-size: 3rem;
		animation: float-up 1.5s ease-out forwards;
		pointer-events: none;
		z-index: 15;
	}

	@keyframes float-up {
		0% {
			opacity: 1;
			transform: translate(-50%, -50%) scale(1);
		}
		100% {
			opacity: 0;
			transform: translate(-50%, -150%) scale(1.5);
		}
	}

	.garden-footer {
		padding: 12px;
		text-align: center;
		background: var(--color-white);
		color: var(--color-text-light);
		font-size: 0.9rem;
	}

	@media (max-width: 600px) {
		.garden-header {
			flex-direction: column;
			gap: 12px;
		}

		.user-info {
			flex-wrap: wrap;
			justify-content: center;
		}

		.user-info span {
			width: 100%;
			text-align: center;
		}
	}
</style>
