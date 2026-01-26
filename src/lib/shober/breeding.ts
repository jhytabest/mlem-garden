/**
 * Breeding Mechanics for Shobers
 *
 * Handles:
 * - Gene mixing from two parents
 * - Mutation chances
 * - Breeding cooldowns
 * - Generation calculation
 */

import {
	encodeDNA,
	decodeDNA,
	BASE_COLORS,
	EYE_STYLES,
	ACCESSORIES,
	ACCESSORY_COLORS,
	MUTATIONS,
	RARITY_TIERS,
	type RarityTier
} from './dna';

// ============================================
// BREEDING COOLDOWNS
// ============================================

// Cooldowns in milliseconds based on generation
export const BREEDING_COOLDOWNS: Record<number | 'default', number> = {
	0: 4 * 60 * 60 * 1000, // Gen 0: 4 hours
	1: 3 * 60 * 60 * 1000, // Gen 1: 3 hours
	2: 2 * 60 * 60 * 1000, // Gen 2: 2 hours
	3: 1.5 * 60 * 60 * 1000, // Gen 3: 1.5 hours
	default: 1 * 60 * 60 * 1000 // Gen 4+: 1 hour
};

/**
 * Get breeding cooldown duration for a generation
 */
export function getBreedingCooldown(generation: number): number {
	return BREEDING_COOLDOWNS[generation as keyof typeof BREEDING_COOLDOWNS] || BREEDING_COOLDOWNS.default;
}

/**
 * Format cooldown for display
 */
export function formatCooldown(ms: number): string {
	const hours = Math.floor(ms / (60 * 60 * 1000));
	const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));

	if (hours > 0) {
		return `${hours}h ${minutes}m`;
	}
	return `${minutes}m`;
}

// ============================================
// BREEDING ELIGIBILITY
// ============================================

export interface BreedingCheck {
	canBreed: boolean;
	reason?: string;
	cooldownRemaining?: number;
}

/**
 * Check if a shober can breed
 */
export function canBreed(shober: {
	breeding_cooldown_until: string | null;
	is_for_sale: number | boolean;
}): BreedingCheck {
	// Can't breed if listed for sale
	if (shober.is_for_sale) {
		return { canBreed: false, reason: 'Shober is listed for sale' };
	}

	// Check cooldown
	if (shober.breeding_cooldown_until) {
		const cooldownEnd = new Date(shober.breeding_cooldown_until).getTime();
		const now = Date.now();
		if (cooldownEnd > now) {
			return {
				canBreed: false,
				reason: 'Breeding cooldown active',
				cooldownRemaining: cooldownEnd - now
			};
		}
	}

	return { canBreed: true };
}

// ============================================
// GENE MIXING
// ============================================

/**
 * Mix a single gene from two parents
 * Returns the index of the selected trait
 */
function mixGene(parent1Gene: number, parent2Gene: number): number {
	// 50/50 chance from either parent
	return Math.random() > 0.5 ? parent1Gene : parent2Gene;
}

/**
 * Mix a gene with a chance of mutation
 */
function mixGeneWithMutation<T extends { rarity: RarityTier }>(
	parent1Gene: number,
	parent2Gene: number,
	traitList: T[],
	mutationChance: number = 0.05
): number {
	// First, inherit from a parent
	let result = mixGene(parent1Gene, parent2Gene);

	// Chance of mutation to a random trait
	if (Math.random() < mutationChance) {
		// Weighted random selection for mutation
		const totalWeight = traitList.reduce((sum, t) => sum + RARITY_TIERS[t.rarity].weight, 0);
		let random = Math.random() * totalWeight;

		for (let i = 0; i < traitList.length; i++) {
			random -= RARITY_TIERS[traitList[i].rarity].weight;
			if (random <= 0) {
				result = i;
				break;
			}
		}
	}

	return result;
}

/**
 * Calculate mutation gene for child
 * Higher chance if parents have mutations
 */
function calculateChildMutation(parent1MutationIndex: number, parent2MutationIndex: number): number {
	// Base mutation chance: 5%
	let mutationChance = 0.05;

	// If either parent has a mutation (index > 0), increase chance
	if (parent1MutationIndex > 0 || parent2MutationIndex > 0) {
		mutationChance = 0.15;
	}

	// If both parents have mutations, even higher
	if (parent1MutationIndex > 0 && parent2MutationIndex > 0) {
		mutationChance = 0.30;

		// 50% chance to inherit one of the parent's mutations directly
		if (Math.random() < 0.5) {
			return Math.random() > 0.5 ? parent1MutationIndex : parent2MutationIndex;
		}
	}

	// Roll for new mutation
	if (Math.random() < mutationChance) {
		// Weighted selection (excluding 'none')
		const mutationsWithChance = MUTATIONS.slice(1); // Skip 'none'
		const totalWeight = mutationsWithChance.reduce((sum, m) => sum + RARITY_TIERS[m.rarity].weight, 0);
		let random = Math.random() * totalWeight;

		for (let i = 0; i < mutationsWithChance.length; i++) {
			random -= RARITY_TIERS[mutationsWithChance[i].rarity].weight;
			if (random <= 0) {
				return i + 1; // +1 because we skipped 'none'
			}
		}
	}

	return 0; // No mutation
}

// ============================================
// BREEDING RESULT
// ============================================

export interface BreedingResult {
	childDNA: string;
	childGeneration: number;
	cooldownEnd1: string;
	cooldownEnd2: string;
	inheritedTraits: {
		baseColorFrom: 'parent1' | 'parent2' | 'mutation';
		eyeStyleFrom: 'parent1' | 'parent2' | 'mutation';
		accessoryFrom: 'parent1' | 'parent2' | 'mutation';
		hasMutation: boolean;
	};
}

/**
 * Breed two shobers to create offspring
 */
export function breedShobers(
	parent1DNA: string,
	parent2DNA: string,
	parent1Gen: number,
	parent2Gen: number
): BreedingResult {
	// Child generation = max(parent1, parent2) + 1
	const childGeneration = Math.max(parent1Gen, parent2Gen) + 1;

	// Parse parent genes
	const p1BaseColor = parseInt(parent1DNA.slice(0, 2), 16) % BASE_COLORS.length;
	const p2BaseColor = parseInt(parent2DNA.slice(0, 2), 16) % BASE_COLORS.length;

	const p1EyeStyle = parseInt(parent1DNA.slice(4, 6), 16) % EYE_STYLES.length;
	const p2EyeStyle = parseInt(parent2DNA.slice(4, 6), 16) % EYE_STYLES.length;

	const p1Accessory = parseInt(parent1DNA.slice(6, 8), 16) % ACCESSORIES.length;
	const p2Accessory = parseInt(parent2DNA.slice(6, 8), 16) % ACCESSORIES.length;

	const p1AccessoryColor = parseInt(parent1DNA.slice(8, 10), 16) % ACCESSORY_COLORS.length;
	const p2AccessoryColor = parseInt(parent2DNA.slice(8, 10), 16) % ACCESSORY_COLORS.length;

	const p1Mutation = parseInt(parent1DNA.slice(12, 14), 16) % MUTATIONS.length;
	const p2Mutation = parseInt(parent2DNA.slice(12, 14), 16) % MUTATIONS.length;

	// Mix genes
	const childBaseColor = mixGeneWithMutation(p1BaseColor, p2BaseColor, BASE_COLORS, 0.03);
	const childEyeStyle = mixGeneWithMutation(p1EyeStyle, p2EyeStyle, EYE_STYLES, 0.05);
	const childAccessory = mixGeneWithMutation(p1Accessory, p2Accessory, ACCESSORIES, 0.05);
	const childAccessoryColor = mixGene(p1AccessoryColor, p2AccessoryColor);
	const childMutation = calculateChildMutation(p1Mutation, p2Mutation);

	// Encode child DNA
	const childDNA = encodeDNA({
		baseColorIndex: childBaseColor,
		eyeStyleIndex: childEyeStyle,
		accessoryIndex: childAccessory,
		accessoryColorIndex: childAccessoryColor,
		mutationIndex: childMutation
	});

	// Calculate cooldowns
	const now = Date.now();
	const cooldown1 = getBreedingCooldown(parent1Gen);
	const cooldown2 = getBreedingCooldown(parent2Gen);

	// Track inheritance for UI
	const inheritedTraits = {
		baseColorFrom:
			childBaseColor === p1BaseColor
				? ('parent1' as const)
				: childBaseColor === p2BaseColor
					? ('parent2' as const)
					: ('mutation' as const),
		eyeStyleFrom:
			childEyeStyle === p1EyeStyle
				? ('parent1' as const)
				: childEyeStyle === p2EyeStyle
					? ('parent2' as const)
					: ('mutation' as const),
		accessoryFrom:
			childAccessory === p1Accessory
				? ('parent1' as const)
				: childAccessory === p2Accessory
					? ('parent2' as const)
					: ('mutation' as const),
		hasMutation: childMutation > 0
	};

	return {
		childDNA,
		childGeneration,
		cooldownEnd1: new Date(now + cooldown1).toISOString(),
		cooldownEnd2: new Date(now + cooldown2).toISOString(),
		inheritedTraits
	};
}

// ============================================
// BREEDING COST
// ============================================

/**
 * Calculate breeding cost in Mlem Coins
 * Higher generations are cheaper to breed
 */
export function getBreedingCost(parent1Gen: number, parent2Gen: number): number {
	const avgGen = (parent1Gen + parent2Gen) / 2;

	// Base cost decreases with generation
	// Gen 0 pair: 100 coins
	// Gen 5+ pair: 10 coins
	const baseCost = Math.max(10, 100 - avgGen * 15);

	return Math.round(baseCost);
}

/**
 * Suggested stud fee based on shober rarity
 */
export function getSuggestedStudFee(rarityScore: number, generation: number): number {
	// Base fee from rarity
	let fee = Math.round(rarityScore * 0.5);

	// Gen 0 premium
	if (generation === 0) {
		fee *= 2;
	}

	// Minimum fee
	return Math.max(10, fee);
}
