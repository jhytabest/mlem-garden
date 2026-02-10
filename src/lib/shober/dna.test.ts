import { describe, it, expect } from 'vitest';
import {
	encodeDNA,
	decodeDNA,
	dnaToConfig,
	generateRandomDNA,
	generateGen0DNA,
	calculateRarityScore,
	getOverallRarity,
	getRarityLabel,
	getRarityColor,
	BASE_COLORS,
	EYE_STYLES,
	ACCESSORIES,
	ACCESSORY_COLORS,
	MUTATIONS,
	RARITY_TIERS
} from './dna';

describe('DNA Encoding/Decoding', () => {
	it('encodes DNA as 24 hex characters', () => {
		const dna = encodeDNA({
			baseColorIndex: 0,
			eyeStyleIndex: 0,
			accessoryIndex: 0,
			accessoryColorIndex: 0,
			mutationIndex: 0
		});

		expect(dna).toHaveLength(24);
		expect(/^[0-9a-f]+$/.test(dna)).toBe(true);
	});

	it('encodes and decodes DNA consistently', () => {
		const traits = {
			baseColorIndex: 3,
			eyeStyleIndex: 2,
			accessoryIndex: 5,
			accessoryColorIndex: 7,
			mutationIndex: 1
		};

		const dna = encodeDNA(traits);
		const decoded = decodeDNA(dna);

		expect(decoded.baseColor).toBe(BASE_COLORS[traits.baseColorIndex]);
		expect(decoded.eyeStyle).toBe(EYE_STYLES[traits.eyeStyleIndex]);
		expect(decoded.accessory).toBe(ACCESSORIES[traits.accessoryIndex]);
		expect(decoded.accessoryColor).toBe(ACCESSORY_COLORS[traits.accessoryColorIndex]);
		expect(decoded.mutation).toBe(MUTATIONS[traits.mutationIndex]);
	});

	it('handles placeholder/invalid DNA gracefully', () => {
		const invalidDNAs = ['', '000000000000000000000000', 'invalid', '123'];

		for (const invalid of invalidDNAs) {
			const decoded = decodeDNA(invalid);
			expect(decoded.baseColor).toBeDefined();
			expect(decoded.eyeStyle).toBeDefined();
			expect(decoded.rarityScore).toBeGreaterThanOrEqual(0);
		}
	});

	it('wraps indices that exceed trait array length', () => {
		// Use index values that would exceed array bounds
		const dna = encodeDNA({
			baseColorIndex: 255, // Will be mod BASE_COLORS.length
			eyeStyleIndex: 255,
			accessoryIndex: 255,
			accessoryColorIndex: 255,
			mutationIndex: 255
		});

		const decoded = decodeDNA(dna);
		// Should not throw, should return valid traits
		expect(decoded.baseColor).toBeDefined();
		expect(decoded.baseColor.id).toBeDefined();
	});
});

describe('DNA to Config conversion', () => {
	it('converts DNA to renderable ShoberConfig', () => {
		const dna = generateRandomDNA();
		const config = dnaToConfig(dna);

		expect(config).toHaveProperty('baseColor');
		expect(config).toHaveProperty('bellyColor');
		expect(config).toHaveProperty('eyeStyle');
		expect(config).toHaveProperty('accessory');
		expect(config).toHaveProperty('accessoryColor');

		// Colors should be valid hex
		expect(config.baseColor).toMatch(/^#[0-9a-fA-F]{6}$/);
		expect(config.bellyColor).toMatch(/^#[0-9a-fA-F]{6}$/);
		expect(config.accessoryColor).toMatch(/^#[0-9a-fA-F]{6}$/);
	});
});

describe('Random DNA generation', () => {
	it('generates valid 24-char hex DNA', () => {
		for (let i = 0; i < 10; i++) {
			const dna = generateRandomDNA();
			expect(dna).toHaveLength(24);
			expect(/^[0-9a-f]+$/.test(dna)).toBe(true);
		}
	});

	it('generates decodable DNA', () => {
		for (let i = 0; i < 10; i++) {
			const dna = generateRandomDNA();
			const decoded = decodeDNA(dna);
			expect(decoded.baseColor).toBeDefined();
			expect(decoded.rarityScore).toBeGreaterThan(0);
		}
	});

	it('Gen0 DNA generation works', () => {
		for (let i = 0; i < 10; i++) {
			const dna = generateGen0DNA();
			expect(dna).toHaveLength(24);
			const decoded = decodeDNA(dna);
			expect(decoded.baseColor).toBeDefined();
		}
	});
});

describe('Rarity calculations', () => {
	it('calculates rarity score from traits', () => {
		const commonScore = calculateRarityScore({
			baseColorRarity: 'common',
			eyeStyleRarity: 'common',
			accessoryRarity: 'common',
			mutationRarity: 'common'
		});

		const legendaryScore = calculateRarityScore({
			baseColorRarity: 'legendary',
			eyeStyleRarity: 'legendary',
			accessoryRarity: 'legendary',
			mutationRarity: 'legendary'
		});

		expect(legendaryScore).toBeGreaterThan(commonScore);
	});

	it('returns correct overall rarity tier', () => {
		expect(getOverallRarity(50)).toBe('common');
		expect(getOverallRarity(100)).toBe('uncommon');
		expect(getOverallRarity(200)).toBe('rare');
		expect(getOverallRarity(400)).toBe('legendary');
	});

	it('returns formatted rarity label', () => {
		expect(getRarityLabel(50)).toBe('Common');
		expect(getRarityLabel(400)).toBe('Legendary');
	});

	it('returns rarity color', () => {
		const color = getRarityColor(400);
		expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
	});
});

describe('DNA encoding roundtrip edge cases', () => {
	it('all trait indices round-trip correctly', () => {
		for (let base = 0; base < BASE_COLORS.length; base++) {
			for (let eye = 0; eye < EYE_STYLES.length; eye++) {
				const dna = encodeDNA({
					baseColorIndex: base,
					eyeStyleIndex: eye,
					accessoryIndex: 0,
					accessoryColorIndex: 0,
					mutationIndex: 0
				});
				const decoded = decodeDNA(dna);
				expect(decoded.baseColor).toBe(BASE_COLORS[base]);
				expect(decoded.eyeStyle).toBe(EYE_STYLES[eye]);
			}
		}
	});

	it('all accessory and mutation indices round-trip correctly', () => {
		for (let acc = 0; acc < ACCESSORIES.length; acc++) {
			for (let mut = 0; mut < MUTATIONS.length; mut++) {
				const dna = encodeDNA({
					baseColorIndex: 0,
					eyeStyleIndex: 0,
					accessoryIndex: acc,
					accessoryColorIndex: 0,
					mutationIndex: mut
				});
				const decoded = decodeDNA(dna);
				expect(decoded.accessory).toBe(ACCESSORIES[acc]);
				expect(decoded.mutation).toBe(MUTATIONS[mut]);
			}
		}
	});

	it('all accessory color indices round-trip', () => {
		for (let i = 0; i < ACCESSORY_COLORS.length; i++) {
			const dna = encodeDNA({
				baseColorIndex: 0,
				eyeStyleIndex: 0,
				accessoryIndex: 0,
				accessoryColorIndex: i,
				mutationIndex: 0
			});
			const decoded = decodeDNA(dna);
			expect(decoded.accessoryColor).toBe(ACCESSORY_COLORS[i]);
		}
	});

	it('max index values (255) produce valid traits via modulo', () => {
		const dna = encodeDNA({
			baseColorIndex: 255,
			eyeStyleIndex: 255,
			accessoryIndex: 255,
			accessoryColorIndex: 255,
			mutationIndex: 255
		});
		const decoded = decodeDNA(dna);
		expect(decoded.baseColor).toBe(BASE_COLORS[255 % BASE_COLORS.length]);
		expect(decoded.eyeStyle).toBe(EYE_STYLES[255 % EYE_STYLES.length]);
		expect(decoded.accessory).toBe(ACCESSORIES[255 % ACCESSORIES.length]);
		expect(decoded.mutation).toBe(MUTATIONS[255 % MUTATIONS.length]);
	});

	it('dnaToConfig always produces valid hex colors', () => {
		// Test with every base color
		for (let i = 0; i < BASE_COLORS.length; i++) {
			const dna = encodeDNA({
				baseColorIndex: i,
				eyeStyleIndex: 0,
				accessoryIndex: 0,
				accessoryColorIndex: 0,
				mutationIndex: 0
			});
			const config = dnaToConfig(dna);
			expect(config.baseColor).toMatch(/^#[0-9a-fA-F]{6}$/);
			expect(config.bellyColor).toMatch(/^#[0-9a-fA-F]{6}$/);
		}
	});
});

describe('Trait definitions', () => {
	it('all base colors have required properties', () => {
		for (const color of BASE_COLORS) {
			expect(color.id).toBeDefined();
			expect(color.name).toBeDefined();
			expect(color.hex).toMatch(/^#[0-9a-fA-F]{6}$/);
			expect(color.rarity).toMatch(/^(common|uncommon|rare|legendary)$/);
		}
	});

	it('all eye styles have required properties', () => {
		for (const style of EYE_STYLES) {
			expect(style.id).toBeDefined();
			expect(style.name).toBeDefined();
			expect(style.rarity).toMatch(/^(common|uncommon|rare|legendary)$/);
		}
	});

	it('all accessories have required properties', () => {
		for (const acc of ACCESSORIES) {
			expect(acc.id).toBeDefined();
			expect(acc.name).toBeDefined();
			expect(acc.rarity).toMatch(/^(common|uncommon|rare|legendary)$/);
		}
	});

	it('rarity tiers have valid weights', () => {
		for (const tier of Object.values(RARITY_TIERS)) {
			expect(tier.weight).toBeGreaterThan(0);
			expect(tier.multiplier).toBeGreaterThan(0);
		}
	});
});
