<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { get } from 'svelte/store';
	import Shober from './Shober.svelte';
	import ChatBox from './ChatBox.svelte';
	import type { ShoberData, ShoberConfig } from '$lib/shober/types';
	import { mixConfigs } from '$lib/shober/genetics';
	import { getRarityColor, getOverallRarity } from '$lib/shober/dna';
	import { shobers, gardenWS, loadShobers, connectionState, connectedUsers } from '$lib/stores/garden';

	interface User {
		id: string;
		email: string;
		displayName: string | null;
		avatarUrl: string | null;
	}

	interface Baby {
		id: string;
		x: number;
		y: number;
		vx: number;
		vy: number;
		config: ShoberConfig;
		state: 'wandering' | 'leaving';
		spawnTime: number;
	}

	interface Props {
		user: User;
	}

	let { user }: Props = $props();

	let selectedShober = $state<ShoberData | null>(null);
	let interactionAnimation = $state<{ shoberId: string; type: string; x: number; y: number } | null>(null);
	let babies = $state<Baby[]>([]);
	
	// Movement state
	let activeKeys = new Set<string>();
	let lastUpdate = 0;
	let animationFrame: number;

	onMount(async () => {
		// Load shobers from API
		await loadShobers();

		// Find my shober
		const allShobers = get(shobers);
		const myShober = allShobers.find(s => s.userId === user.id);

		// Connect to real-time WebSocket
		gardenWS.connect(user.id, myShober?.id);

		// Listen for interaction events
		window.addEventListener('garden-interaction', handleInteractionEvent as EventListener);
		
		// Movement listeners
		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);
		
		// Start movement loop
		updateMovement();
	});

	onDestroy(() => {
		gardenWS.disconnect();
		window.removeEventListener('garden-interaction', handleInteractionEvent as EventListener);
		window.removeEventListener('keydown', handleKeyDown);
		window.removeEventListener('keyup', handleKeyUp);
		cancelAnimationFrame(animationFrame);
	});

	function handleKeyDown(e: KeyboardEvent) {
		if (e.repeat) return;
		// Don't move if typing in an input (though we don't have inputs yet)
		if ((e.target as HTMLElement).tagName === 'INPUT') return;
		activeKeys.add(e.key.toLowerCase());
	}

	function handleKeyUp(e: KeyboardEvent) {
		activeKeys.delete(e.key.toLowerCase());
	}

	function updateBabies() {
		const now = Date.now();
		babies = babies.filter(baby => {
			// Update position
			baby.x += baby.vx;
			baby.y += baby.vy;

			// Logic
			const age = now - baby.spawnTime;

			if (baby.state === 'wandering') {
				// Change direction randomly
				if (Math.random() < 0.05) {
					baby.vx += (Math.random() - 0.5) * 0.1;
					baby.vy += (Math.random() - 0.5) * 0.1;
				}
				// Friction
				baby.vx *= 0.99;
				baby.vy *= 0.99;

				// Keep somewhat near center or bounce? Let's just wander.
				
				// Switch to leaving after 5-8 seconds
				if (age > 5000 + Math.random() * 3000) {
					baby.state = 'leaving';
					// Pick a direction away from center (50, 50)
					const dx = baby.x - 50;
					const dy = baby.y - 50;
					const mag = Math.sqrt(dx * dx + dy * dy) || 1;
					baby.vx = (dx / mag) * 0.5;
					baby.vy = (dy / mag) * 0.5;
				}
			} else if (baby.state === 'leaving') {
				// Accelerate slightly
				baby.vx *= 1.05;
				baby.vy *= 1.05;
			}

			// Remove if far off screen
			if (baby.x < -20 || baby.x > 120 || baby.y < -20 || baby.y > 120) {
				return false;
			}
			return true;
		});
	}

	function updateMovement() {
		updateBabies();

		if (activeKeys.size > 0) {
			const myShober = $shobers.find((s) => s.userId === user.id);
			if (myShober) {
				let dx = 0;
				let dy = 0;
				const speed = 0.5; // percent per frame

				if (activeKeys.has('w') || activeKeys.has('arrowup')) dy -= speed;
				if (activeKeys.has('s') || activeKeys.has('arrowdown')) dy += speed;
				if (activeKeys.has('a') || activeKeys.has('arrowleft')) dx -= speed;
				if (activeKeys.has('d') || activeKeys.has('arrowright')) dx += speed;

				if (dx !== 0 || dy !== 0) {
					// Update locally
					const newX = Math.max(0, Math.min(100, myShober.positionX + dx));
					const newY = Math.max(0, Math.min(100, myShober.positionY + dy));

					shobers.update((list) =>
						list.map((s) =>
							s.id === myShober.id
								? {
										...s,
										positionX: newX,
										positionY: newY
									}
								: s
						)
					);

					// Throttle network updates
					const now = Date.now();
					if (now - lastUpdate > 50) {
						gardenWS.moveShober(newX, newY);
						lastUpdate = now;
					}
				}
			}
		}
		animationFrame = requestAnimationFrame(updateMovement);
	}

	function handleInteractionEvent(event: CustomEvent) {
		const { type, shoberId, data } = event.detail;

		// Find shober position for animation
		const shober = $shobers.find(s => s.id === shoberId);
		if (shober) {
			if (type === 'baby' && data?.babyConfig) {
				// Spawn a baby!
				const baby: Baby = {
					id: crypto.randomUUID(),
					x: shober.positionX,
					y: shober.positionY,
					vx: (Math.random() - 0.5) * 0.5,
					vy: (Math.random() - 0.5) * 0.5,
					config: data.babyConfig as ShoberConfig,
					state: 'wandering',
					spawnTime: Date.now()
				};
				babies.push(baby);
				
				// Interaction effect for the birth
				interactionAnimation = {
					shoberId,
					type: 'baby',
					x: shober.positionX,
					y: shober.positionY
				};
			} else {
				interactionAnimation = {
					shoberId,
					type,
					x: shober.positionX,
					y: shober.positionY
				};
			}

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
				// Broadcast via WebSocket
				gardenWS.interact('pet', selectedShober.id);

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
				// Broadcast via WebSocket
				gardenWS.interact('gift', selectedShober.id, { giftType });

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

	async function handleBaby() {
		if (!selectedShober) return;

		const myShober = $shobers.find(s => s.userId === user.id);
		if (!myShober) return;

		const babyConfig = mixConfigs(myShober.config, selectedShober.config);

		try {
			const response = await fetch('/api/garden/interact', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					shoberId: selectedShober.id,
					type: 'baby',
					data: { babyConfig }
				})
			});

			if (response.ok) {
				// Broadcast via WebSocket
				gardenWS.interact('baby', selectedShober.id, { babyConfig });

				// Spawn baby locally (sender doesn't receive their own broadcast)
				const baby: Baby = {
					id: crypto.randomUUID(),
					x: selectedShober.positionX,
					y: selectedShober.positionY,
					vx: (Math.random() - 0.5) * 0.5,
					vy: (Math.random() - 0.5) * 0.5,
					config: babyConfig,
					state: 'wandering',
					spawnTime: Date.now()
				};
				babies = [...babies, baby];

				// Show birth animation
				interactionAnimation = {
					shoberId: selectedShober.id,
					type: 'baby',
					x: selectedShober.positionX,
					y: selectedShober.positionY
				};

				setTimeout(() => {
					interactionAnimation = null;
				}, 1500);
			}
		} catch (e) {
			console.error('Failed to make baby:', e);
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
			<a href="/portfolio" class="btn-nav">My Shobers</a>
			<a href="/marketplace" class="btn-nav">Marketplace</a>
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

		<!-- Babies -->
		{#each babies as baby (baby.id)}
			<div
				class="baby-wrapper"
				style="left: {baby.x}%; top: {baby.y}%;"
			>
				<Shober config={baby.config} size={40} animated />
			</div>
		{/each}

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
					{#if shober.generation !== undefined}
						<span class="gen-badge" style="background: {getRarityColor(shober.rarityScore || 50)}">
							G{shober.generation}
						</span>
					{/if}
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
				{:else if interactionAnimation.type === 'baby'}
					👶
				{/if}
			</div>
		{/if}

		<!-- Interaction menu -->
		{#if selectedShober}
			<div
				class="interaction-overlay"
				onclick={closeMenu}
				role="button"
				tabindex="0"
				onkeydown={(e) => {
					if (e.key === 'Escape') closeMenu();
				}}
			></div>
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
					<button onclick={handleBaby} class="action-btn baby-btn">
						👶 Make Baby
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

	<ChatBox userId={user.id} />

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
	.user-info .btn-secondary,
	.user-info .btn-nav {
		padding: 8px 16px;
		font-size: 0.9rem;
	}

	.btn-nav {
		background: var(--color-secondary);
		color: white;
		border-radius: var(--border-radius);
		text-decoration: none;
		transition: background 0.2s;
	}

	.btn-nav:hover {
		background: #7b1fa2;
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
		transition: transform 0.2s ease, left 0.2s linear, top 0.2s linear;
		opacity: 0.85;
		will-change: left, top;
	}

	.shober-wrapper.online {
		opacity: 1;
	}

	.shober-wrapper.own {
		cursor: default;
		transition: transform 0.2s ease; /* No position smoothing for own shober */
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

	.gen-badge {
		font-size: 0.65rem;
		padding: 2px 6px;
		border-radius: 8px;
		color: white;
		font-weight: 700;
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

	.baby-btn {
		background: #4fc3f7;
		color: white;
	}

	.baby-btn:hover {
		background: #039be5;
	}

	.baby-wrapper {
		position: absolute;
		transform: translate(-50%, -50%);
		pointer-events: none;
		z-index: 5;
		/* No transition for smooth random movement per frame, or small one? */
		/* Linear transition matches the update frequency */
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
