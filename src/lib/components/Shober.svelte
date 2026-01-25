<script lang="ts">
	import type { ShoberConfig } from '$lib/shober/types';

	interface Props {
		config: ShoberConfig;
		size?: number;
		animated?: boolean;
	}

	let { config, size = 100, animated = false }: Props = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 100 100"
	class="shober"
	class:animated
	xmlns="http://www.w3.org/2000/svg"
>
	<!-- Body -->
	<ellipse cx="50" cy="65" rx="28" ry="25" fill={config.baseColor} />
	<ellipse cx="50" cy="70" rx="20" ry="18" fill={config.bellyColor} />

	<!-- Head -->
	<circle cx="50" cy="38" r="28" fill={config.baseColor} />

	<!-- Face mask (lighter area) -->
	<ellipse cx="50" cy="45" rx="18" ry="15" fill={config.bellyColor} />

	<!-- Ears -->
	<polygon points="25,30 32,10 42,28" fill={config.baseColor} />
	<polygon points="75,30 68,10 58,28" fill={config.baseColor} />
	<polygon points="28,28 33,15 40,27" fill="#ffb6c1" />
	<polygon points="72,28 67,15 60,27" fill="#ffb6c1" />

	<!-- Eyes -->
	{#if config.eyeStyle === 'happy'}
		<path d="M38,38 Q42,42 46,38" stroke="#1a1a1a" stroke-width="2.5" fill="none" stroke-linecap="round" />
		<path d="M54,38 Q58,42 62,38" stroke="#1a1a1a" stroke-width="2.5" fill="none" stroke-linecap="round" />
	{:else if config.eyeStyle === 'sleepy'}
		<line x1="37" y1="40" x2="47" y2="40" stroke="#1a1a1a" stroke-width="2.5" stroke-linecap="round" />
		<line x1="53" y1="40" x2="63" y2="40" stroke="#1a1a1a" stroke-width="2.5" stroke-linecap="round" />
	{:else if config.eyeStyle === 'surprised'}
		<circle cx="42" cy="38" r="5" fill="#1a1a1a" />
		<circle cx="58" cy="38" r="5" fill="#1a1a1a" />
		<circle cx="43" cy="36" r="1.5" fill="white" />
		<circle cx="59" cy="36" r="1.5" fill="white" />
	{:else if config.eyeStyle === 'heart'}
		<path d="M39,38 L42,42 L45,38 Q45,34 42,34 Q39,34 39,38" fill="#e91e63" />
		<path d="M55,38 L58,42 L61,38 Q61,34 58,34 Q55,34 55,38" fill="#e91e63" />
	{:else if config.eyeStyle === 'wink'}
		<path d="M38,38 Q42,42 46,38" stroke="#1a1a1a" stroke-width="2.5" fill="none" stroke-linecap="round" />
		<circle cx="58" cy="38" r="4" fill="#1a1a1a" />
		<circle cx="59" cy="36" r="1.2" fill="white" />
	{/if}

	<!-- Nose -->
	<ellipse cx="50" cy="48" rx="4" ry="3" fill="#1a1a1a" />

	<!-- Mouth -->
	<path d="M46,52 Q50,56 54,52" stroke="#1a1a1a" stroke-width="1.5" fill="none" stroke-linecap="round" />

	<!-- Tongue (only for happy/surprised) -->
	{#if config.eyeStyle === 'happy' || config.eyeStyle === 'surprised'}
		<ellipse cx="50" cy="55" rx="3" ry="4" fill="#ff6b6b" />
	{/if}

	<!-- Blush marks -->
	<circle cx="32" cy="45" r="4" fill="#ffb6c1" opacity="0.6" />
	<circle cx="68" cy="45" r="4" fill="#ffb6c1" opacity="0.6" />

	<!-- Tail -->
	<path
		d="M78,65 Q95,50 85,40 Q82,55 78,60"
		fill={config.baseColor}
		class="tail"
		class:animated
	/>

	<!-- Legs -->
	<ellipse cx="35" cy="88" rx="8" ry="6" fill={config.baseColor} />
	<ellipse cx="65" cy="88" rx="8" ry="6" fill={config.baseColor} />

	<!-- Accessories -->
	{#if config.accessory === 'hat'}
		<polygon points="50,2 35,22 65,22" fill={config.accessoryColor} />
		<circle cx="50" cy="2" r="3" fill={config.accessoryColor} />
	{:else if config.accessory === 'bowtie'}
		<polygon points="50,58 40,52 40,64 50,58 60,52 60,64" fill={config.accessoryColor} />
		<circle cx="50" cy="58" r="3" fill={config.accessoryColor} />
	{:else if config.accessory === 'glasses'}
		<circle cx="42" cy="38" r="7" fill="none" stroke={config.accessoryColor} stroke-width="2" />
		<circle cx="58" cy="38" r="7" fill="none" stroke={config.accessoryColor} stroke-width="2" />
		<line x1="49" y1="38" x2="51" y2="38" stroke={config.accessoryColor} stroke-width="2" />
		<line x1="35" y1="38" x2="28" y2="35" stroke={config.accessoryColor} stroke-width="2" />
		<line x1="65" y1="38" x2="72" y2="35" stroke={config.accessoryColor} stroke-width="2" />
	{:else if config.accessory === 'collar'}
		<ellipse cx="50" cy="58" rx="22" ry="5" fill={config.accessoryColor} />
		<circle cx="50" cy="62" r="4" fill="gold" />
	{:else if config.accessory === 'bandana'}
		<path d="M30,50 Q50,60 70,50 L65,58 Q50,65 35,58 Z" fill={config.accessoryColor} />
	{:else if config.accessory === 'flower'}
		<circle cx="28" cy="20" r="4" fill={config.accessoryColor} />
		<circle cx="24" cy="16" r="3" fill={config.accessoryColor} opacity="0.8" />
		<circle cx="32" cy="16" r="3" fill={config.accessoryColor} opacity="0.8" />
		<circle cx="28" cy="20" r="2" fill="#ffeb3b" />
	{/if}
</svg>

<style>
	.shober {
		filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15));
	}

	.animated {
		animation: breathe 3s ease-in-out infinite;
	}

	.tail.animated {
		animation: wag 0.5s ease-in-out infinite;
		transform-origin: 78px 65px;
	}

	@keyframes breathe {
		0%, 100% {
			transform: scaleY(1);
		}
		50% {
			transform: scaleY(1.02);
		}
	}

	@keyframes wag {
		0%, 100% {
			transform: rotate(-5deg);
		}
		50% {
			transform: rotate(5deg);
		}
	}
</style>
