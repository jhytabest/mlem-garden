<script lang="ts">
	import ShoberCreator from '$lib/components/ShoberCreator.svelte';
	import type { ShoberConfig } from '$lib/shober/types';
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	let saving = $state(false);
	let error = $state<string | null>(null);

	async function handleSave(name: string, config: ShoberConfig) {
		saving = true;
		error = null;

		try {
			const response = await fetch('/api/shober', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, config })
			});

			if (!response.ok) {
				const errorData = (await response.json()) as { error?: string };
				throw new Error(errorData.error || 'Failed to save shober');
			}

			// Redirect to garden
			goto('/');
		} catch (e) {
			error = e instanceof Error ? e.message : 'Something went wrong';
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>Create Your Shober - Mlem Garden</title>
</svelte:head>

<main class="create-page">
	<header class="page-header">
		<a href="/" class="back-link">&larr; Back to Garden</a>
		<h1>Create Your Shober</h1>
		<p>Customize your adorable companion</p>
	</header>

	{#if !data.user}
		<div class="auth-required">
			<p>You need to be logged in to create a shober.</p>
			<a href="/login" class="btn-primary">Sign In</a>
		</div>
	{:else}
		{#if error}
			<div class="error-message">
				{error}
			</div>
		{/if}

		<ShoberCreator
			initialConfig={data.existingShober?.config}
			initialName={data.existingShober?.name}
			onSave={handleSave}
			{saving}
		/>
	{/if}
</main>

<style>
	.create-page {
		min-height: 100vh;
		background: var(--color-bg);
	}

	.page-header {
		text-align: center;
		padding: 40px 20px 20px;
	}

	.back-link {
		display: inline-block;
		margin-bottom: 16px;
		color: var(--color-text-light);
	}

	.page-header h1 {
		font-size: 2rem;
		margin-bottom: 8px;
	}

	.page-header p {
		color: var(--color-text-light);
	}

	.auth-required {
		text-align: center;
		padding: 60px 20px;
	}

	.auth-required p {
		margin-bottom: 20px;
		color: var(--color-text-light);
	}

	.error-message {
		max-width: 600px;
		margin: 0 auto 20px;
		padding: 12px 20px;
		background: #ffebee;
		color: #c62828;
		border-radius: var(--border-radius);
		text-align: center;
	}
</style>
