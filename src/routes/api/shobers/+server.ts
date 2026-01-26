import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { ShoberConfig } from '$lib/shober/types';
import { generateGen0DNA, decodeDNA, dnaToConfig } from '$lib/shober/dna';

interface CreateShoberRequest {
	name: string;
	config?: ShoberConfig; // Optional - will generate from DNA if not provided
}

/**
 * GET /api/shobers - Get all shobers owned by the current user (portfolio)
 */
export const GET: RequestHandler = async ({ locals, platform }) => {
	if (!locals.user) {
		throw error(401, 'Not authenticated');
	}

	if (!platform) {
		throw error(500, 'Server configuration error');
	}

	const results = await platform.env.DB.prepare(
		`SELECT s.*,
            p1.name as parent1_name,
            p2.name as parent2_name
     FROM shobers s
     LEFT JOIN shobers p1 ON s.parent1_id = p1.id
     LEFT JOIN shobers p2 ON s.parent2_id = p2.id
     WHERE s.user_id = ?
     ORDER BY s.is_active DESC, s.created_at DESC`
	)
		.bind(locals.user.id)
		.all();

	const shobers = results.results.map((row) => {
		const dna = (row.dna as string) || '000000000000000000000000';
		const decoded = decodeDNA(dna);

		// Use DNA-based config or fallback to stored config
		let config: ShoberConfig;
		if (dna !== '000000000000000000000000') {
			config = dnaToConfig(dna);
		} else {
			config = JSON.parse((row.config as string) || '{}');
		}

		return {
			id: row.id,
			name: row.name,
			userId: row.user_id,
			config,
			positionX: row.position_x,
			positionY: row.position_y,
			totalPets: row.total_pets || 0,
			totalGifts: row.total_gifts || 0,
			mood: row.mood,

			// DNA & Genetics
			dna,
			generation: row.generation || 0,
			parent1Id: row.parent1_id,
			parent2Id: row.parent2_id,
			parent1Name: row.parent1_name,
			parent2Name: row.parent2_name,

			// Rarity
			rarityScore: row.rarity_score || decoded.rarityScore,
			overallRarity: decoded.overallRarity,
			mutation: decoded.mutation.id,

			// Collection
			isActive: row.is_active === 1,

			// Marketplace
			isForSale: row.is_for_sale === 1,
			salePrice: row.sale_price,

			// Breeding
			breedingCooldownUntil: row.breeding_cooldown_until,
			breedingCount: row.breeding_count || 0,

			// Timestamps
			createdAt: row.created_at,
			updatedAt: row.updated_at
		};
	});

	return json({ shobers });
};

/**
 * POST /api/shobers - Create a new Gen 0 shober
 */
export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user) {
		throw error(401, 'Not authenticated');
	}

	if (!platform) {
		throw error(500, 'Server configuration error');
	}

	const body: CreateShoberRequest = await request.json();

	// Validate name
	if (!body.name || body.name.length < 1 || body.name.length > 20) {
		throw error(400, 'Name must be 1-20 characters');
	}

	const userId = locals.user.id;
	const now = new Date().toISOString();

	// Generate Gen 0 DNA (slightly better odds)
	const dna = generateGen0DNA();
	const decoded = decodeDNA(dna);
	const config = dnaToConfig(dna);

	// Check if user already has an active shober
	const existingActive = await platform.env.DB.prepare(
		'SELECT id FROM shobers WHERE user_id = ? AND is_active = 1'
	)
		.bind(userId)
		.first();

	// New shober is active only if user has no other active shober
	const isActive = existingActive ? 0 : 1;

	// Create new Gen 0 shober
	const shoberId = crypto.randomUUID();
	const positionX = 20 + Math.random() * 60;
	const positionY = 40 + Math.random() * 40;

	await platform.env.DB.prepare(
		`INSERT INTO shobers (
      id, user_id, name, config, dna, generation, rarity_score,
      position_x, position_y, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`
	)
		.bind(
			shoberId,
			userId,
			body.name,
			JSON.stringify(config),
			dna,
			decoded.rarityScore,
			positionX,
			positionY,
			isActive,
			now,
			now
		)
		.run();

	// Record ownership history (mint)
	await platform.env.DB.prepare(
		`INSERT INTO ownership_history (id, shober_id, from_user_id, to_user_id, transfer_type, created_at)
     VALUES (?, ?, NULL, ?, 'mint', ?)`
	)
		.bind(crypto.randomUUID(), shoberId, userId, now)
		.run();

	return json({
		success: true,
		shober: {
			id: shoberId,
			name: body.name,
			dna,
			generation: 0,
			config,
			rarityScore: decoded.rarityScore,
			overallRarity: decoded.overallRarity,
			mutation: decoded.mutation.id,
			isActive: isActive === 1
		}
	});
};
