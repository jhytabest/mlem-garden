import type { RarityTier } from './dna';

// ============================================
// SHOBER CONFIG (Visual appearance)
// ============================================

export interface ShoberConfig {
	baseColor: string; // Main fur color
	bellyColor: string; // Lighter belly/chest color
	eyeStyle: EyeStyleType;
	accessory: AccessoryType;
	accessoryColor: string;
}

// Expanded eye styles including rare/legendary
export type EyeStyleType =
	| 'happy'
	| 'sleepy'
	| 'surprised'
	| 'wink'
	| 'heart'
	| 'star'
	| 'rainbow'
	| 'galaxy';

// Expanded accessories including rare/legendary
export type AccessoryType =
	| 'none'
	| 'collar'
	| 'bandana'
	| 'bowtie'
	| 'glasses'
	| 'hat'
	| 'flower'
	| 'headphones'
	| 'crown'
	| 'halo'
	| 'wizard_hat';

// ============================================
// SHOBER DATA (Full shober with metadata)
// ============================================

export interface ShoberData {
	id: string;
	name: string;
	userId: string;
	ownerName: string;
	positionX: number;
	positionY: number;
	config: ShoberConfig;

	// Stats
	totalPets?: number;
	totalGifts?: number;
	mood?: string;

	// NEW: DNA & Genetics
	dna?: string;
	generation?: number;
	parent1Id?: string | null;
	parent2Id?: string | null;
	parent1Name?: string | null;
	parent2Name?: string | null;

	// NEW: Rarity
	rarityScore?: number;
	overallRarity?: RarityTier;
	mutation?: string;

	// NEW: Collection
	isActive?: boolean;

	// NEW: Marketplace
	isForSale?: boolean;
	salePrice?: number | null;

	// NEW: Breeding
	breedingCooldownUntil?: string | null;
	breedingCount?: number;

	// Timestamps
	createdAt?: string;
	updatedAt?: string;
}

// ============================================
// MARKETPLACE TYPES
// ============================================

export interface MarketplaceListing {
	id: string;
	shoberId: string;
	sellerId: string;
	sellerName: string;
	price: number;
	listedAt: string;
	expiresAt?: string | null;

	// Shober preview data
	shober: {
		name: string;
		dna: string;
		generation: number;
		rarityScore: number;
		config: ShoberConfig;
	};
}

// ============================================
// BREEDING TYPES
// ============================================

export type BreedingRequestStatus = 'pending' | 'accepted' | 'rejected' | 'expired' | 'completed';

export interface BreedingRequest {
	id: string;
	requesterShoberId: string;
	targetShoberId: string;
	requesterUserId: string;
	targetUserId: string;
	status: BreedingRequestStatus;
	studFee: number;
	babyGoesTo: 'requester' | 'target';
	createdAt: string;
	expiresAt: string;

	// Preview data
	requesterShober?: {
		name: string;
		dna: string;
		generation: number;
	};
	targetShober?: {
		name: string;
		dna: string;
		generation: number;
	};
}

// ============================================
// WALLET & TRANSACTIONS
// ============================================

export interface UserWallet {
	userId: string;
	mlemCoins: number;
	totalEarned: number;
	totalSpent: number;
}

export type TransactionType =
	| 'initial'
	| 'daily_bonus'
	| 'sale'
	| 'purchase'
	| 'stud_fee_earned'
	| 'stud_fee_paid'
	| 'breeding_cost';

export interface Transaction {
	id: string;
	userId: string;
	amount: number; // Positive = credit, Negative = debit
	type: TransactionType;
	referenceId?: string;
	description?: string;
	createdAt: string;
}

// ============================================
// OWNERSHIP HISTORY (for provenance)
// ============================================

export type TransferType = 'mint' | 'breed' | 'sale' | 'gift';

export interface OwnershipRecord {
	id: string;
	shoberId: string;
	fromUserId: string | null;
	toUserId: string;
	fromUserName?: string | null;
	toUserName: string;
	transferType: TransferType;
	price?: number | null;
	transactionHash?: string | null;
	createdAt: string;
}

// ============================================
// DEFAULTS & CONSTANTS (Legacy support)
// ============================================

export const DEFAULT_SHOBER_CONFIG: ShoberConfig = {
	baseColor: '#d4a574', // Classic shiba tan
	bellyColor: '#f5e6d3',
	eyeStyle: 'happy',
	accessory: 'none',
	accessoryColor: '#ff9800'
};

// Legacy color definitions (kept for backward compatibility)
export const SHOBER_COLORS = [
	{ name: 'Classic Tan', base: '#d4a574', belly: '#f5e6d3' },
	{ name: 'Red Sesame', base: '#c67c4e', belly: '#e8d4c4' },
	{ name: 'Black & Tan', base: '#1a1a1a', belly: '#d4a574' },
	{ name: 'Cream', base: '#f5e6d3', belly: '#ffffff' },
	{ name: 'White', base: '#ffffff', belly: '#f5f5f5' }
];

// Legacy eye styles (kept for backward compatibility)
export const EYE_STYLES = ['happy', 'sleepy', 'surprised', 'heart', 'wink'] as const;

// Legacy accessories (kept for backward compatibility)
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
