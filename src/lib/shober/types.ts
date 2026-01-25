export interface ShoberConfig {
	baseColor: string; // Main fur color
	bellyColor: string; // Lighter belly/chest color
	eyeStyle: 'happy' | 'sleepy' | 'surprised' | 'heart' | 'wink';
	accessory: 'none' | 'hat' | 'bowtie' | 'glasses' | 'collar' | 'bandana' | 'flower';
	accessoryColor: string;
}

export interface ShoberData {
	id: string;
	name: string;
	userId: string;
	ownerName: string;
	positionX: number;
	positionY: number;
	config: ShoberConfig;
	totalPets?: number;
	totalGifts?: number;
	mood?: string;
}

export const DEFAULT_SHOBER_CONFIG: ShoberConfig = {
	baseColor: '#d4a574', // Classic shiba tan
	bellyColor: '#f5e6d3',
	eyeStyle: 'happy',
	accessory: 'none',
	accessoryColor: '#ff9800'
};

export const SHOBER_COLORS = [
	{ name: 'Classic Tan', base: '#d4a574', belly: '#f5e6d3' },
	{ name: 'Red Sesame', base: '#c67c4e', belly: '#e8d4c4' },
	{ name: 'Black & Tan', base: '#1a1a1a', belly: '#d4a574' },
	{ name: 'Cream', base: '#f5e6d3', belly: '#ffffff' },
	{ name: 'White', base: '#ffffff', belly: '#f5f5f5' }
];

export const EYE_STYLES = ['happy', 'sleepy', 'surprised', 'heart', 'wink'] as const;

export const ACCESSORIES = [
	{ id: 'none', name: 'None' },
	{ id: 'hat', name: 'Party Hat' },
	{ id: 'bowtie', name: 'Bowtie' },
	{ id: 'glasses', name: 'Glasses' },
	{ id: 'collar', name: 'Collar' },
	{ id: 'bandana', name: 'Bandana' },
	{ id: 'flower', name: 'Flower' }
] as const;

export const ACCESSORY_COLORS = [
	'#e91e63', // Pink
	'#9c27b0', // Purple
	'#2196f3', // Blue
	'#4caf50', // Green
	'#ff9800', // Orange
	'#f44336', // Red
	'#795548', // Brown
	'#333333' // Black
];
