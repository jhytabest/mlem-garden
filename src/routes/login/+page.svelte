<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Sign In - Mlem Garden</title>
</svelte:head>

<main class="login-page">
	<div class="login-card">
		<h1>Welcome to Mlem Garden!</h1>
		<p>Sign in to create your shober and join the fun</p>

		{#if data.error}
			<div class="error-message">
				{data.error}
			</div>
		{/if}

		<a href="/api/auth/google" class="google-btn">
			<svg viewBox="0 0 24 24" width="24" height="24">
				<path
					fill="#4285F4"
					d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
				/>
				<path
					fill="#34A853"
					d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
				/>
				<path
					fill="#FBBC05"
					d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
				/>
				<path
					fill="#EA4335"
					d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
				/>
			</svg>
			Continue with Google
		</a>

		<p class="terms">
			By signing in, you agree to be nice to all shobers
		</p>
	</div>
</main>

<style>
	.login-page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #fef9f3 0%, #fff3e0 100%);
		padding: 20px;
	}

	.login-card {
		background: var(--color-white);
		padding: 48px;
		border-radius: var(--border-radius-lg);
		box-shadow: 0 8px 32px var(--color-shadow);
		text-align: center;
		max-width: 400px;
		width: 100%;
	}

	h1 {
		font-size: 1.8rem;
		margin-bottom: 8px;
		color: var(--color-text);
	}

	.login-card > p {
		color: var(--color-text-light);
		margin-bottom: 32px;
	}

	.error-message {
		padding: 12px;
		background: #ffebee;
		color: #c62828;
		border-radius: var(--border-radius);
		margin-bottom: 20px;
	}

	.google-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		width: 100%;
		padding: 14px 24px;
		background: var(--color-white);
		border: 2px solid #ddd;
		border-radius: var(--border-radius);
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-text);
		text-decoration: none;
		transition: all 0.2s;
	}

	.google-btn:hover {
		background: #f5f5f5;
		border-color: #bbb;
		text-decoration: none;
	}

	.terms {
		margin-top: 24px;
		font-size: 0.8rem;
		color: #999;
	}
</style>
