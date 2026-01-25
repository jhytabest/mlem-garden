<script lang="ts">
	import Garden from '$lib/components/Garden.svelte';
	import type { PageData } from './$types';
	import { onMount } from 'svelte';

	let { data }: { data: PageData } = $props();

	let mounted = $state(false);
	onMount(() => {
		mounted = true;
	});
</script>

<main class="home">
	{#if data.user && mounted}
		<Garden user={data.user} />
	{:else if data.user}
		<div class="loading">Loading Garden...</div>
	{:else}
		<section class="hero">
			<div class="hero-content">
				<h1>Welcome to Mlem Garden!</h1>
				<p class="tagline">Create your own adorable shober and join the cutest garden on the internet</p>

				<div class="features">
					<div class="feature">
						<span class="feature-icon">🐕</span>
						<h3>Create Your Shober</h3>
						<p>Customize colors, accessories, and expressions</p>
					</div>
					<div class="feature">
						<span class="feature-icon">🌸</span>
						<h3>Join the Garden</h3>
						<p>Hang out with shobers from around the world</p>
					</div>
					<div class="feature">
						<span class="feature-icon">💕</span>
						<h3>Make Friends</h3>
						<p>Pet other shobers, send gifts, and spread joy</p>
					</div>
				</div>

				<a href="/login" class="btn-primary login-btn">
					Sign in with Google to Start
				</a>
			</div>
		</section>
	{/if}
</main>

<style>
	.home {
		min-height: 100vh;
	}

	.hero {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #fef9f3 0%, #fff3e0 100%);
		padding: 40px 20px;
	}

	.hero-content {
		max-width: 800px;
		text-align: center;
	}

	h1 {
		font-size: 3rem;
		font-weight: 800;
		color: var(--color-text);
		margin-bottom: 16px;
	}

	.tagline {
		font-size: 1.25rem;
		color: var(--color-text-light);
		margin-bottom: 48px;
	}

	.features {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 32px;
		margin-bottom: 48px;
	}

	.feature {
		background: var(--color-white);
		padding: 24px;
		border-radius: var(--border-radius-lg);
		box-shadow: 0 4px 20px var(--color-shadow);
	}

	.feature-icon {
		font-size: 2.5rem;
		display: block;
		margin-bottom: 12px;
	}

	.feature h3 {
		font-size: 1.1rem;
		margin-bottom: 8px;
		color: var(--color-text);
	}

	.feature p {
		font-size: 0.9rem;
		color: var(--color-text-light);
	}

	.login-btn {
		display: inline-block;
		padding: 16px 32px;
		font-size: 1.1rem;
	}

	@media (max-width: 600px) {
		h1 {
			font-size: 2rem;
		}

		.tagline {
			font-size: 1rem;
		}

		.features {
			grid-template-columns: 1fr;
		}
	}
</style>
