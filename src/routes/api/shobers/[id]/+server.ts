import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { decodeDNA, dnaToConfig } from '$lib/shober/dna';

/**
 * GET /api/shobers/[id] - Get a single shober with full details
 */
export const GET: RequestHandler = async ({ params, locals, platform }) => {
	if (!platform) {
		throw error(500, 'Server configuration error');
	}

	const result = await platform.env.DB.prepare(
		`SELECT s.*,
            u.display_name as owner_name,
            p1.name as parent1_name,
            p2.name as parent2_name
     FROM shobers s
     JOIN users u ON s.user_id = u.id
     LEFT JOIN shobers p1 ON s.parent1_id = p1.id
     LEFT JOIN shobers p2 ON s.parent2_id = p2.id
     WHERE s.id = ?`
	)
		.bind(params.id)
		.first();

	if (!result) {
		throw error(404, 'Shober not found');
	}

	const dna = (result.dna as string) || '000000000000000000000000';
	const decoded = decodeDNA(dna);
	const config = dna !== '000000000000000000000000' ? dnaToConfig(dna) : JSON.parse((result.config as string) || '{}');

	// Get ownership history
	const history = await platform.env.DB.prepare(
		`SELECT oh.*,
            u1.display_name as from_name,
            u2.display_name as to_name
     FROM ownership_history oh
     LEFT JOIN users u1 ON oh.from_user_id = u1.id
     JOIN users u2 ON oh.to_user_id = u2.id
     WHERE oh.shober_id = ?
     ORDER BY oh.created_at ASC`
	)
		.bind(params.id)
		.all();

	return json({
		shober: {
			id: result.id,
			name: result.name,
			userId: result.user_id,
			ownerName: result.owner_name,
			config,
			positionX: result.position_x,
			positionY: result.position_y,
			totalPets: result.total_pets || 0,
			totalGifts: result.total_gifts || 0,
			mood: result.mood,
			dna,
			generation: result.generation || 0,
			parent1Id: result.parent1_id,
			parent2Id: result.parent2_id,
			parent1Name: result.parent1_name,
			parent2Name: result.parent2_name,
			rarityScore: result.rarity_score || decoded.rarityScore,
			overallRarity: decoded.overallRarity,
			mutation: decoded.mutation.id,
			isActive: result.is_active === 1,
			isForSale: result.is_for_sale === 1,
			salePrice: result.sale_price,
			breedingCooldownUntil: result.breeding_cooldown_until,
			breedingCount: result.breeding_count || 0,
			createdAt: result.created_at,
			updatedAt: result.updated_at
		},
		ownershipHistory: history.results.map((h) => ({
			id: h.id,
			fromUserId: h.from_user_id,
			toUserId: h.to_user_id,
			fromUserName: h.from_name,
			toUserName: h.to_name,
			transferType: h.transfer_type,
			price: h.price,
			createdAt: h.created_at
		})),
		isOwner: locals.user?.id === result.user_id
	});
};

/**
 * PATCH /api/shobers/[id] - Update shober (name, set active, etc.)
 */
export const PATCH: RequestHandler = async ({ params, request, locals, platform }) => {
	if (!locals.user) {
		throw error(401, 'Not authenticated');
	}

	if (!platform) {
		throw error(500, 'Server configuration error');
	}

	// Verify ownership
	const shober = await platform.env.DB.prepare('SELECT user_id FROM shobers WHERE id = ?')
		.bind(params.id)
		.first();

	if (!shober) {
		throw error(404, 'Shober not found');
	}

	if (shober.user_id !== locals.user.id) {
		throw error(403, 'Not your shober');
	}

	const body = await request.json();
	const updates: string[] = [];
	const values: (string | number)[] = [];

	// Handle name update
	if (body.name !== undefined) {
		if (body.name.length < 1 || body.name.length > 20) {
			throw error(400, 'Name must be 1-20 characters');
		}
		updates.push('name = ?');
		values.push(body.name);
	}

	// Handle set active
	if (body.setActive === true) {
		// First, deactivate all other shobers for this user
		await platform.env.DB.prepare('UPDATE shobers SET is_active = 0 WHERE user_id = ?')
			.bind(locals.user.id)
			.run();

		updates.push('is_active = 1');
	}

	if (updates.length === 0) {
		throw error(400, 'No updates provided');
	}

	updates.push('updated_at = ?');
	values.push(new Date().toISOString());
	values.push(params.id);

	await platform.env.DB.prepare(`UPDATE shobers SET ${updates.join(', ')} WHERE id = ?`)
		.bind(...values)
		.run();

	return json({ success: true });
};
