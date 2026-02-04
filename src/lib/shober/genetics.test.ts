import { describe, it, expect } from 'vitest';
import { mixConfigs } from './genetics';
import type { ShoberConfig } from './types';

describe('Genetics - Config Mixing', () => {
	const parent1: ShoberConfig = {
		baseColor: '#ff0000',
		bellyColor: '#ffcccc',
		eyeStyle: 'happy',
		accessory: 'hat',
		accessoryColor: '#0000ff'
	};

	const parent2: ShoberConfig = {
		baseColor: '#00ff00',
		bellyColor: '#ccffcc',
		eyeStyle: 'sleepy',
		accessory: 'collar',
		accessoryColor: '#ff00ff'
	};

	it('returns a valid ShoberConfig', () => {
		const child = mixConfigs(parent1, parent2);

		expect(child).toHaveProperty('baseColor');
		expect(child).toHaveProperty('bellyColor');
		expect(child).toHaveProperty('eyeStyle');
		expect(child).toHaveProperty('accessory');
		expect(child).toHaveProperty('accessoryColor');
	});

	it('inherits base color from one parent', () => {
		const child = mixConfigs(parent1, parent2);

		expect([parent1.baseColor, parent2.baseColor]).toContain(child.baseColor);
	});

	it('inherits belly color from one parent', () => {
		const child = mixConfigs(parent1, parent2);

		expect([parent1.bellyColor, parent2.bellyColor]).toContain(child.bellyColor);
	});

	it('inherits eye style from one parent', () => {
		const child = mixConfigs(parent1, parent2);

		expect([parent1.eyeStyle, parent2.eyeStyle]).toContain(child.eyeStyle);
	});

	it('inherits accessory from one parent', () => {
		const child = mixConfigs(parent1, parent2);

		expect([parent1.accessory, parent2.accessory]).toContain(child.accessory);
	});

	it('inherits accessory color from one parent', () => {
		const child = mixConfigs(parent1, parent2);

		expect([parent1.accessoryColor, parent2.accessoryColor]).toContain(child.accessoryColor);
	});

	it('produces varied results over multiple calls', () => {
		const results = new Set<string>();

		// Run multiple times and collect unique results
		for (let i = 0; i < 100; i++) {
			const child = mixConfigs(parent1, parent2);
			results.add(JSON.stringify(child));
		}

		// Should have variety (statistically almost certain with 100 runs)
		expect(results.size).toBeGreaterThan(1);
	});
});
