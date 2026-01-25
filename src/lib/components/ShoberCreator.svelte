<script lang="ts">
	import Shober from './Shober.svelte';
	import {
		type ShoberConfig,
		DEFAULT_SHOBER_CONFIG,
		SHOBER_COLORS,
		EYE_STYLES,
		ACCESSORIES,
		ACCESSORY_COLORS
	} from '$lib/shober/types';

	interface Props {
		initialConfig?: ShoberConfig;
		initialName?: string;
		onSave: (name: string, config: ShoberConfig) => void;
		saving?: boolean;
	}

	let { initialConfig, initialName = '', onSave, saving = false }: Props = $props();

	let name = $state(initialName || 'My Shober');
	let config = $state<ShoberConfig>({ ...DEFAULT_SHOBER_CONFIG, ...initialConfig });

	function setColor(base: string, belly: string) {
		config.baseColor = base;
		config.bellyColor = belly;
	}

	function handleSubmit() {
		if (name.trim() && !saving) {
			onSave(name.trim(), config);
		}
	}
</script>

<div class="creator">
	<div class="preview-section">
		<h2>Preview</h2>
		<div class="preview-container">
			<Shober {config} size={200} animated />
		</div>
		<input
			type="text"
			bind:value={name}
			placeholder="Name your shober..."
			class="name-input"
			maxlength="20"
		/>
	</div>

	<div class="options-section">
		<div class="option-group">
			<h3>Fur Color</h3>
			<div class="color-options">
				{#each SHOBER_COLORS as color}
					<button
						class="color-btn"
						class:selected={config.baseColor === color.base}
						onclick={() => setColor(color.base, color.belly)}
						title={color.name}
					>
						<span class="color-swatch" style="background: {color.base};"></span>
						<span class="color-name">{color.name}</span>
					</button>
				{/each}
			</div>
		</div>

		<div class="option-group">
			<h3>Eyes</h3>
			<div class="eye-options">
				{#each EYE_STYLES as eye}
					<button
						class="eye-btn"
						class:selected={config.eyeStyle === eye}
						onclick={() => (config.eyeStyle = eye)}
					>
						{#if eye === 'happy'}😊
						{:else if eye === 'sleepy'}😴
						{:else if eye === 'surprised'}😮
						{:else if eye === 'heart'}😍
						{:else if eye === 'wink'}😉
						{/if}
						<span>{eye}</span>
					</button>
				{/each}
			</div>
		</div>

		<div class="option-group">
			<h3>Accessory</h3>
			<div class="accessory-options">
				{#each ACCESSORIES as acc}
					<button
						class="accessory-btn"
						class:selected={config.accessory === acc.id}
						onclick={() => (config.accessory = acc.id as ShoberConfig['accessory'])}
					>
						{#if acc.id === 'none'}❌
						{:else if acc.id === 'hat'}🎉
						{:else if acc.id === 'bowtie'}🎀
						{:else if acc.id === 'glasses'}👓
						{:else if acc.id === 'collar'}📿
						{:else if acc.id === 'bandana'}🧣
						{:else if acc.id === 'flower'}🌸
						{/if}
						<span>{acc.name}</span>
					</button>
				{/each}
			</div>

			{#if config.accessory !== 'none'}
				<div class="accessory-colors">
					<h4>Accessory Color</h4>
					<div class="mini-colors">
						{#each ACCESSORY_COLORS as color}
							<button
								class="mini-color-btn"
								class:selected={config.accessoryColor === color}
								style="background: {color};"
								onclick={() => (config.accessoryColor = color)}
								aria-label="Select color {color}"
							></button>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		<button class="save-btn btn-primary" onclick={handleSubmit} disabled={saving || !name.trim()}>
			{saving ? 'Saving...' : 'Save & Join Garden'}
		</button>
	</div>
</div>

<style>
	.creator {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 40px;
		max-width: 900px;
		margin: 0 auto;
		padding: 40px 20px;
	}

	@media (max-width: 768px) {
		.creator {
			grid-template-columns: 1fr;
		}
	}

	.preview-section {
		text-align: center;
	}

	.preview-section h2 {
		margin-bottom: 20px;
		color: var(--color-text);
	}

	.preview-container {
		background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
		border-radius: var(--border-radius-lg);
		padding: 40px;
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 300px;
		box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.1);
	}

	.name-input {
		margin-top: 20px;
		padding: 12px 20px;
		font-size: 1.2rem;
		font-family: inherit;
		font-weight: 600;
		text-align: center;
		border: 2px solid #ddd;
		border-radius: var(--border-radius);
		width: 100%;
		max-width: 250px;
		transition: border-color 0.2s;
	}

	.name-input:focus {
		outline: none;
		border-color: var(--color-primary);
	}

	.options-section {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.option-group {
		background: var(--color-white);
		padding: 20px;
		border-radius: var(--border-radius);
		box-shadow: 0 2px 10px var(--color-shadow);
	}

	.option-group h3 {
		margin-bottom: 16px;
		font-size: 1rem;
		color: var(--color-text-light);
	}

	.option-group h4 {
		margin: 16px 0 12px;
		font-size: 0.9rem;
		color: var(--color-text-light);
	}

	.color-options {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.color-btn {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		background: #f5f5f5;
		border: 2px solid transparent;
		border-radius: 8px;
		font-size: 0.85rem;
	}

	.color-btn.selected {
		border-color: var(--color-primary);
		background: #fff3e0;
	}

	.color-swatch {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		border: 1px solid #ddd;
	}

	.eye-options,
	.accessory-options {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.eye-btn,
	.accessory-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		padding: 12px 16px;
		background: #f5f5f5;
		border: 2px solid transparent;
		border-radius: 8px;
		font-size: 1.5rem;
	}

	.eye-btn span,
	.accessory-btn span {
		font-size: 0.7rem;
		text-transform: capitalize;
	}

	.eye-btn.selected,
	.accessory-btn.selected {
		border-color: var(--color-primary);
		background: #fff3e0;
	}

	.mini-colors {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	.mini-color-btn {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		border: 3px solid transparent;
		padding: 0;
	}

	.mini-color-btn.selected {
		border-color: var(--color-text);
		transform: scale(1.1);
	}

	.save-btn {
		margin-top: 16px;
		padding: 16px 32px;
		font-size: 1.1rem;
		width: 100%;
	}

	.save-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
