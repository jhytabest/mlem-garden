import type { ShoberConfig } from './types';

export function mixConfigs(parent1: ShoberConfig, parent2: ShoberConfig): ShoberConfig {
	// 50/50 chance for each trait from either parent
    // Small mutation chance? Maybe later.
    
    // For colors, we could average them or pick one. Let's pick one for now to keep the palette clean.
    const baseColor = Math.random() > 0.5 ? parent1.baseColor : parent2.baseColor;
    const bellyColor = Math.random() > 0.5 ? parent1.bellyColor : parent2.bellyColor;
    
    // Eyes
    const eyeStyle = Math.random() > 0.5 ? parent1.eyeStyle : parent2.eyeStyle;
    
    // Accessory: Maybe babies don't have accessories? Or they inherit?
    // Let's say babies are born naked (nature!) or maybe a small chance to inherit.
    // Prompt says "shobers can have children".
    // Let's give them a random accessory or none.
    // Actually, inheritance is cuter.
    const accessory = Math.random() > 0.5 ? parent1.accessory : parent2.accessory;
    const accessoryColor = Math.random() > 0.5 ? parent1.accessoryColor : parent2.accessoryColor;

	return {
		baseColor,
		bellyColor,
		eyeStyle,
		accessory,
		accessoryColor
	};
}
