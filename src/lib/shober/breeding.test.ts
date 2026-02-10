import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	getBreedingCooldown,
	formatCooldown,
	canBreed,
	breedShobers,
	getBreedingCost,
	getSuggestedStudFee,
	BREEDING_COOLDOWNS
} from './breeding';
import { generateRandomDNA } from './dna';

describe('Breeding Cooldowns', () => {
	it('returns correct cooldown for each generation', () => {
		expect(getBreedingCooldown(0)).toBe(4 * 60 * 60 * 1000); // 4 hours
		expect(getBreedingCooldown(1)).toBe(3 * 60 * 60 * 1000); // 3 hours
		expect(getBreedingCooldown(2)).toBe(2 * 60 * 60 * 1000); // 2 hours
		expect(getBreedingCooldown(3)).toBe(1.5 * 60 * 60 * 1000); // 1.5 hours
		expect(getBreedingCooldown(10)).toBe(1 * 60 * 60 * 1000); // Default 1 hour
	});

	it('formats cooldown correctly', () => {
		expect(formatCooldown(2 * 60 * 60 * 1000)).toBe('2h 0m');
		expect(formatCooldown(1.5 * 60 * 60 * 1000)).toBe('1h 30m');
		expect(formatCooldown(45 * 60 * 1000)).toBe('45m');
	});
});

describe('Breeding Eligibility', () => {
	it('allows breeding when no restrictions', () => {
		const result = canBreed({
			breeding_cooldown_until: null,
			is_for_sale: 0
		});

		expect(result.canBreed).toBe(true);
		expect(result.reason).toBeUndefined();
	});

	it('prevents breeding when listed for sale', () => {
		const result = canBreed({
			breeding_cooldown_until: null,
			is_for_sale: 1
		});

		expect(result.canBreed).toBe(false);
		expect(result.reason).toContain('for sale');
	});

	it('prevents breeding during cooldown', () => {
		const futureDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();
		const result = canBreed({
			breeding_cooldown_until: futureDate,
			is_for_sale: 0
		});

		expect(result.canBreed).toBe(false);
		expect(result.reason).toContain('cooldown');
		expect(result.cooldownRemaining).toBeGreaterThan(0);
	});

	it('allows breeding after cooldown expires', () => {
		const pastDate = new Date(Date.now() - 60 * 1000).toISOString();
		const result = canBreed({
			breeding_cooldown_until: pastDate,
			is_for_sale: 0
		});

		expect(result.canBreed).toBe(true);
	});
});

describe('Shober Breeding', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('produces child with correct generation', () => {
		const parent1DNA = generateRandomDNA();
		const parent2DNA = generateRandomDNA();

		// Gen 0 + Gen 0 = Gen 1
		const result1 = breedShobers(parent1DNA, parent2DNA, 0, 0);
		expect(result1.childGeneration).toBe(1);

		// Gen 2 + Gen 3 = Gen 4
		const result2 = breedShobers(parent1DNA, parent2DNA, 2, 3);
		expect(result2.childGeneration).toBe(4);

		// Gen 0 + Gen 5 = Gen 6
		const result3 = breedShobers(parent1DNA, parent2DNA, 0, 5);
		expect(result3.childGeneration).toBe(6);
	});

	it('produces valid child DNA', () => {
		const parent1DNA = generateRandomDNA();
		const parent2DNA = generateRandomDNA();

		const result = breedShobers(parent1DNA, parent2DNA, 0, 0);

		expect(result.childDNA).toHaveLength(24);
		expect(/^[0-9a-f]+$/.test(result.childDNA)).toBe(true);
	});

	it('sets cooldown times correctly', () => {
		const parent1DNA = generateRandomDNA();
		const parent2DNA = generateRandomDNA();

		const result = breedShobers(parent1DNA, parent2DNA, 0, 1);

		// Parent 1 (Gen 0) gets 4 hour cooldown
		const cooldown1 = new Date(result.cooldownEnd1).getTime();
		expect(cooldown1).toBe(Date.now() + 4 * 60 * 60 * 1000);

		// Parent 2 (Gen 1) gets 3 hour cooldown
		const cooldown2 = new Date(result.cooldownEnd2).getTime();
		expect(cooldown2).toBe(Date.now() + 3 * 60 * 60 * 1000);
	});

	it('tracks trait inheritance', () => {
		const parent1DNA = generateRandomDNA();
		const parent2DNA = generateRandomDNA();

		const result = breedShobers(parent1DNA, parent2DNA, 0, 0);

		expect(result.inheritedTraits).toHaveProperty('baseColorFrom');
		expect(result.inheritedTraits).toHaveProperty('eyeStyleFrom');
		expect(result.inheritedTraits).toHaveProperty('accessoryFrom');
		expect(result.inheritedTraits).toHaveProperty('hasMutation');

		// Inheritance source should be valid
		expect(['parent1', 'parent2', 'mutation']).toContain(result.inheritedTraits.baseColorFrom);
	});
});

describe('Breeding Costs', () => {
	it('calculates cost based on generation', () => {
		// Lower generation = higher cost
		const highCost = getBreedingCost(0, 0);
		const lowCost = getBreedingCost(5, 5);

		expect(highCost).toBeGreaterThan(lowCost);
	});

	it('has minimum cost of 10', () => {
		const cost = getBreedingCost(100, 100);
		expect(cost).toBeGreaterThanOrEqual(10);
	});

	it('Gen 0 pair costs 100', () => {
		expect(getBreedingCost(0, 0)).toBe(100);
	});
});

describe('Breeding Mutation Edge Cases', () => {
	it('breeding two shobers with same DNA produces valid child', () => {
		const dna = generateRandomDNA();
		const result = breedShobers(dna, dna, 0, 0);

		expect(result.childDNA).toHaveLength(24);
		expect(/^[0-9a-f]+$/.test(result.childDNA)).toBe(true);
		expect(result.childGeneration).toBe(1);
	});

	it('high-generation breeding still works', () => {
		const dna1 = generateRandomDNA();
		const dna2 = generateRandomDNA();
		const result = breedShobers(dna1, dna2, 99, 100);

		expect(result.childGeneration).toBe(101);
		expect(result.childDNA).toHaveLength(24);
	});

	it('mutation flag is boolean', () => {
		const dna1 = generateRandomDNA();
		const dna2 = generateRandomDNA();

		for (let i = 0; i < 50; i++) {
			const result = breedShobers(dna1, dna2, 0, 0);
			expect(typeof result.inheritedTraits.hasMutation).toBe('boolean');
		}
	});

	it('breeding with placeholder DNA produces valid offspring', () => {
		const placeholder = '000000000000000000000000';
		const real = generateRandomDNA();
		const result = breedShobers(placeholder, real, 0, 0);

		expect(result.childDNA).toHaveLength(24);
		expect(result.childGeneration).toBe(1);
	});

	it('statistical: mutations occur in breeding over many trials', () => {
		const dna1 = generateRandomDNA();
		const dna2 = generateRandomDNA();
		let mutations = 0;

		for (let i = 0; i < 500; i++) {
			const result = breedShobers(dna1, dna2, 0, 0);
			if (result.inheritedTraits.hasMutation) mutations++;
		}

		// With 5% base mutation chance per gene, expect at least a few
		expect(mutations).toBeGreaterThan(0);
	});
});

describe('Stud Fee Suggestions', () => {
	it('calculates fee based on rarity', () => {
		const lowRarity = getSuggestedStudFee(50, 1);
		const highRarity = getSuggestedStudFee(200, 1);

		expect(highRarity).toBeGreaterThan(lowRarity);
	});

	it('applies Gen 0 premium', () => {
		const gen0Fee = getSuggestedStudFee(100, 0);
		const gen1Fee = getSuggestedStudFee(100, 1);

		expect(gen0Fee).toBe(gen1Fee * 2);
	});

	it('has minimum fee of 10', () => {
		const fee = getSuggestedStudFee(1, 10);
		expect(fee).toBeGreaterThanOrEqual(10);
	});
});
