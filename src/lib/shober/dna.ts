/**
 * DNA Encoding/Decoding System for Shobers
 *
 * DNA Structure: 24 hex characters = 12 bytes = 96 bits
 *
 * Layout:
 * [00-01] Base Color Gene (2 hex = 8 bits, 0-255)
 * [02-03] Belly Color Gene (2 hex = 8 bits)
 * [04-05] Eye Style Gene (2 hex = 8 bits)
 * [06-07] Accessory Gene (2 hex = 8 bits)
 * [08-09] Accessory Color Gene (2 hex = 8 bits)
 * [10-11] Pattern Gene (2 hex = 8 bits) - Future use
 * [12-13] Mutation Gene (2 hex = 8 bits)
 * [14-23] Reserved for future traits (10 hex = 40 bits)
 */

import type { ShoberConfig } from './types';

// ============================================
// RARITY SYSTEM
// ============================================

export type RarityTier = 'common' | 'uncommon' | 'rare' | 'legendary';

export interface RarityConfig {
	name: RarityTier;
	weight: number; // Higher = more common
	multiplier: number; // Rarity score multiplier
	color: string; // Display color
}

export const RARITY_TIERS: Record<RarityTier, RarityConfig> = {
	common: { name: 'common', weight: 60, multiplier: 1, color: '#9e9e9e' },
	uncommon: { name: 'uncommon', weight: 25, multiplier: 2, color: '#4caf50' },
	rare: { name: 'rare', weight: 12, multiplier: 5, color: '#2196f3' },
	legendary: { name: 'legendary', weight: 3, multiplier: 20, color: '#ffd700' }
};

// ============================================
// TRAIT DEFINITIONS WITH RARITY
// ============================================

export interface TraitDefinition {
	id: string;
	name: string;
	rarity: RarityTier;
	hex?: string;
	belly?: string;
}

// Base colors with rarity
export const BASE_COLORS: TraitDefinition[] = [
	// Common (60%)
	{ id: 'classic_tan', name: 'Classic Tan', hex: '#d4a574', belly: '#f5e6d3', rarity: 'common' },
	{ id: 'red_sesame', name: 'Red Sesame', hex: '#c67c4e', belly: '#e8d4c4', rarity: 'common' },
	{ id: 'brown', name: 'Chocolate', hex: '#8b5a2b', belly: '#d4a574', rarity: 'common' },
	// Uncommon (25%)
	{ id: 'cream', name: 'Cream', hex: '#f5e6d3', belly: '#ffffff', rarity: 'uncommon' },
	{ id: 'black_tan', name: 'Black & Tan', hex: '#1a1a1a', belly: '#d4a574', rarity: 'uncommon' },
	{ id: 'grey', name: 'Silver Grey', hex: '#a0a0a0', belly: '#d0d0d0', rarity: 'uncommon' },
	// Rare (12%)
	{ id: 'pure_white', name: 'Pure White', hex: '#ffffff', belly: '#f5f5f5', rarity: 'rare' },
	{ id: 'midnight', name: 'Midnight', hex: '#1a1a2e', belly: '#16213e', rarity: 'rare' },
	// Legendary (3%)
	{ id: 'galaxy', name: 'Galaxy', hex: '#1a0533', belly: '#4a0080', rarity: 'legendary' },
	{ id: 'golden', name: 'Golden', hex: '#ffd700', belly: '#fff4b3', rarity: 'legendary' },
	{ id: 'rose_gold', name: 'Rose Gold', hex: '#e8b4b8', belly: '#ffd5d5', rarity: 'legendary' }
];

// Eye styles with rarity
export const EYE_STYLES: TraitDefinition[] = [
	// Common
	{ id: 'happy', name: 'Happy', rarity: 'common' },
	{ id: 'sleepy', name: 'Sleepy', rarity: 'common' },
	// Uncommon
	{ id: 'surprised', name: 'Surprised', rarity: 'uncommon' },
	{ id: 'wink', name: 'Wink', rarity: 'uncommon' },
	// Rare
	{ id: 'heart', name: 'Heart Eyes', rarity: 'rare' },
	{ id: 'star', name: 'Star Eyes', rarity: 'rare' },
	// Legendary
	{ id: 'rainbow', name: 'Rainbow', rarity: 'legendary' },
	{ id: 'galaxy', name: 'Galaxy Eyes', rarity: 'legendary' }
];

// Accessories with rarity
export const ACCESSORIES: TraitDefinition[] = [
	// Common
	{ id: 'none', name: 'None', rarity: 'common' },
	{ id: 'collar', name: 'Collar', rarity: 'common' },
	{ id: 'bandana', name: 'Bandana', rarity: 'common' },
	// Uncommon
	{ id: 'bowtie', name: 'Bowtie', rarity: 'uncommon' },
	{ id: 'glasses', name: 'Glasses', rarity: 'uncommon' },
	// Rare
	{ id: 'hat', name: 'Party Hat', rarity: 'rare' },
	{ id: 'flower', name: 'Flower', rarity: 'rare' },
	{ id: 'headphones', name: 'Headphones', rarity: 'rare' },
	// Legendary
	{ id: 'crown', name: 'Crown', rarity: 'legendary' },
	{ id: 'halo', name: 'Halo', rarity: 'legendary' },
	{ id: 'wizard_hat', name: 'Wizard Hat', rarity: 'legendary' }
];

// Accessory colors (all equally common)
export const ACCESSORY_COLORS: string[] = [
	'#e91e63', // Pink
	'#9c27b0', // Purple
	'#2196f3', // Blue
	'#4caf50', // Green
	'#ff9800', // Orange
	'#f44336', // Red
	'#795548', // Brown
	'#333333', // Black
	'#ffd700', // Gold
	'#00bcd4' // Cyan
];

// Mutations (special effects)
export const MUTATIONS: TraitDefinition[] = [
	{ id: 'none', name: 'None', rarity: 'common' },
	{ id: 'sparkle', name: 'Sparkle', rarity: 'rare' },
	{ id: 'glow', name: 'Glow', rarity: 'legendary' },
	{ id: 'rainbow_shimmer', name: 'Rainbow Shimmer', rarity: 'legendary' }
];

// ============================================
// DNA ENCODING/DECODING
// ============================================

export interface DecodedDNA {
	baseColor: TraitDefinition;
	bellyColor: string;
	eyeStyle: TraitDefinition;
	accessory: TraitDefinition;
	accessoryColor: string;
	mutation: TraitDefinition;
	rarityScore: number;
	overallRarity: RarityTier;
}

/**
 * Encode trait indices into a 24-character hex DNA string
 */
export function encodeDNA(traits: {
	baseColorIndex: number;
	eyeStyleIndex: number;
	accessoryIndex: number;
	accessoryColorIndex: number;
	mutationIndex: number;
}): string {
	const parts = [
		traits.baseColorIndex.toString(16).padStart(2, '0'),
		traits.baseColorIndex.toString(16).padStart(2, '0'), // Belly derived from base
		traits.eyeStyleIndex.toString(16).padStart(2, '0'),
		traits.accessoryIndex.toString(16).padStart(2, '0'),
		traits.accessoryColorIndex.toString(16).padStart(2, '0'),
		'00', // Pattern (reserved)
		traits.mutationIndex.toString(16).padStart(2, '0'),
		'0000000000' // Reserved
	];
	return parts.join('');
}

/**
 * Decode a 24-character hex DNA string into traits
 */
export function decodeDNA(dna: string): DecodedDNA {
	// Handle invalid or placeholder DNA
	if (!dna || dna.length !== 24 || dna === '000000000000000000000000') {
		// Return default traits for placeholder DNA
		const baseColor = BASE_COLORS[0];
		return {
			baseColor,
			bellyColor: baseColor.belly || '#f5e6d3',
			eyeStyle: EYE_STYLES[0],
			accessory: ACCESSORIES[0],
			accessoryColor: ACCESSORY_COLORS[0],
			mutation: MUTATIONS[0],
			rarityScore: 50,
			overallRarity: 'common'
		};
	}

	const baseColorIndex = parseInt(dna.slice(0, 2), 16) % BASE_COLORS.length;
	const eyeStyleIndex = parseInt(dna.slice(4, 6), 16) % EYE_STYLES.length;
	const accessoryIndex = parseInt(dna.slice(6, 8), 16) % ACCESSORIES.length;
	const accessoryColorIndex = parseInt(dna.slice(8, 10), 16) % ACCESSORY_COLORS.length;
	const mutationIndex = parseInt(dna.slice(12, 14), 16) % MUTATIONS.length;

	const baseColor = BASE_COLORS[baseColorIndex];
	const eyeStyle = EYE_STYLES[eyeStyleIndex];
	const accessory = ACCESSORIES[accessoryIndex];
	const mutation = MUTATIONS[mutationIndex];

	const rarityScore = calculateRarityScore({
		baseColorRarity: baseColor.rarity,
		eyeStyleRarity: eyeStyle.rarity,
		accessoryRarity: accessory.rarity,
		mutationRarity: mutation.rarity
	});

	return {
		baseColor,
		bellyColor: baseColor.belly || '#f5e6d3',
		eyeStyle,
		accessory,
		accessoryColor: ACCESSORY_COLORS[accessoryColorIndex],
		mutation,
		rarityScore,
		overallRarity: getOverallRarity(rarityScore)
	};
}

/**
 * Convert decoded DNA to ShoberConfig for rendering
 */
export function dnaToConfig(dna: string): ShoberConfig {
	const decoded = decodeDNA(dna);
	return {
		baseColor: decoded.baseColor.hex || '#d4a574',
		bellyColor: decoded.bellyColor,
		eyeStyle: decoded.eyeStyle.id as ShoberConfig['eyeStyle'],
		accessory: decoded.accessory.id as ShoberConfig['accessory'],
		accessoryColor: decoded.accessoryColor
	};
}

/**
 * Calculate rarity score from trait rarities (0-100 scale)
 */
export function calculateRarityScore(traits: {
	baseColorRarity: RarityTier;
	eyeStyleRarity: RarityTier;
	accessoryRarity: RarityTier;
	mutationRarity: RarityTier;
}): number {
	// Weights for each trait category
	const weights = {
		baseColor: 30,
		eyeStyle: 20,
		accessory: 15,
		mutation: 35
	};

	let score = 0;
	score += RARITY_TIERS[traits.baseColorRarity].multiplier * weights.baseColor;
	score += RARITY_TIERS[traits.eyeStyleRarity].multiplier * weights.eyeStyle;
	score += RARITY_TIERS[traits.accessoryRarity].multiplier * weights.accessory;
	score += RARITY_TIERS[traits.mutationRarity].multiplier * weights.mutation;

	// Normalize to roughly 0-100 (base common = ~100, all legendary = ~2000)
	// We'll cap at 500 for display purposes
	return Math.min(Math.round(score), 500);
}

/**
 * Get overall rarity tier based on score
 */
export function getOverallRarity(score: number): RarityTier {
	if (score >= 300) return 'legendary';
	if (score >= 150) return 'rare';
	if (score >= 80) return 'uncommon';
	return 'common';
}

/**
 * Get display label for rarity
 */
export function getRarityLabel(score: number): string {
	const rarity = getOverallRarity(score);
	return rarity.charAt(0).toUpperCase() + rarity.slice(1);
}

/**
 * Get rarity color for display
 */
export function getRarityColor(score: number): string {
	return RARITY_TIERS[getOverallRarity(score)].color;
}

// ============================================
// RANDOM DNA GENERATION
// ============================================

/**
 * Select a random index from a trait array using weighted rarity
 */
function selectByRarity<T extends { rarity: RarityTier }>(items: T[]): number {
	const totalWeight = items.reduce((sum, item) => sum + RARITY_TIERS[item.rarity].weight, 0);
	let random = Math.random() * totalWeight;

	for (let i = 0; i < items.length; i++) {
		random -= RARITY_TIERS[items[i].rarity].weight;
		if (random <= 0) return i;
	}
	return 0;
}

/**
 * Generate random DNA with weighted rarity
 */
export function generateRandomDNA(): string {
	return encodeDNA({
		baseColorIndex: selectByRarity(BASE_COLORS),
		eyeStyleIndex: selectByRarity(EYE_STYLES),
		accessoryIndex: selectByRarity(ACCESSORIES),
		accessoryColorIndex: Math.floor(Math.random() * ACCESSORY_COLORS.length),
		mutationIndex: selectByRarity(MUTATIONS)
	});
}

/**
 * Generate DNA for Gen 0 shobers (slightly higher chance of good traits)
 */
export function generateGen0DNA(): string {
	// Gen 0 has 2x chance of uncommon+ traits
	const boostedSelect = <T extends { rarity: RarityTier }>(items: T[]): number => {
		const boostedItems = items.map((item) => ({
			...item,
			rarity:
				item.rarity === 'common'
					? item.rarity
					: item.rarity === 'uncommon'
						? 'uncommon'
						: item.rarity
		}));

		// Boost non-common weights by 1.5x
		const totalWeight = items.reduce((sum, item) => {
			const boost = item.rarity !== 'common' ? 1.5 : 1;
			return sum + RARITY_TIERS[item.rarity].weight * boost;
		}, 0);

		let random = Math.random() * totalWeight;

		for (let i = 0; i < items.length; i++) {
			const boost = items[i].rarity !== 'common' ? 1.5 : 1;
			random -= RARITY_TIERS[items[i].rarity].weight * boost;
			if (random <= 0) return i;
		}
		return 0;
	};

	return encodeDNA({
		baseColorIndex: boostedSelect(BASE_COLORS),
		eyeStyleIndex: boostedSelect(EYE_STYLES),
		accessoryIndex: boostedSelect(ACCESSORIES),
		accessoryColorIndex: Math.floor(Math.random() * ACCESSORY_COLORS.length),
		mutationIndex: boostedSelect(MUTATIONS)
	});
}
