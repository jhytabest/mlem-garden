import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { breedShobers, canBreed, getBreedingCost } from '$lib/shober/breeding';
import { decodeDNA, dnaToConfig } from '$lib/shober/dna';

/**
 * GET /api/breeding - Get user's breeding requests (incoming and outgoing)
 */
export const GET: RequestHandler = async ({ locals, platform, url }) => {
	if (!locals.user) {
		throw error(401, 'Not authenticated');
	}

	if (!platform) {
		throw error(500, 'Server configuration error');
	}

	const type = url.searchParams.get('type') || 'all'; // 'incoming', 'outgoing', 'all'

	let query = `
    SELECT br.*,
           rs.name as requester_shober_name, rs.dna as requester_dna, rs.generation as requester_gen,
           ts.name as target_shober_name, ts.dna as target_dna, ts.generation as target_gen,
           ru.display_name as requester_name,
           tu.display_name as target_name
    FROM breeding_requests br
    JOIN shobers rs ON br.requester_shober_id = rs.id
    JOIN shobers ts ON br.target_shober_id = ts.id
    JOIN users ru ON br.requester_user_id = ru.id
    JOIN users tu ON br.target_user_id = tu.id
    WHERE br.status = 'pending'
  `;

	if (type === 'incoming') {
		query += ' AND br.target_user_id = ?';
	} else if (type === 'outgoing') {
		query += ' AND br.requester_user_id = ?';
	} else {
		query += ' AND (br.target_user_id = ? OR br.requester_user_id = ?)';
	}

	query += ' ORDER BY br.created_at DESC';

	const params =
		type === 'all' ? [locals.user.id, locals.user.id] : [locals.user.id];

	const currentUserId = locals.user.id;

	const results = await platform.env.DB.prepare(query)
		.bind(...params)
		.all();

	const requests = results.results.map((row) => ({
		id: row.id,
		status: row.status,
		studFee: row.stud_fee,
		babyGoesTo: row.baby_goes_to,
		createdAt: row.created_at,
		expiresAt: row.expires_at,
		isIncoming: row.target_user_id === currentUserId,
		requester: {
			userId: row.requester_user_id,
			userName: row.requester_name,
			shoberId: row.requester_shober_id,
			shoberName: row.requester_shober_name,
			dna: row.requester_dna,
			generation: row.requester_gen
		},
		target: {
			userId: row.target_user_id,
			userName: row.target_name,
			shoberId: row.target_shober_id,
			shoberName: row.target_shober_name,
			dna: row.target_dna,
			generation: row.target_gen
		}
	}));

	return json({ requests });
};

/**
 * POST /api/breeding - Breed two of your own shobers
 */
export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user) {
		throw error(401, 'Not authenticated');
	}

	if (!platform) {
		throw error(500, 'Server configuration error');
	}

	const body = await request.json() as { shober1Id: string; shober2Id: string };
	const { shober1Id, shober2Id } = body;

	if (!shober1Id || !shober2Id) {
		throw error(400, 'Both shober IDs are required');
	}

	if (shober1Id === shober2Id) {
		throw error(400, 'Cannot breed a shober with itself');
	}

	// Get both shobers
	const shobers = await platform.env.DB.prepare(
		`SELECT id, user_id, name, dna, generation, breeding_cooldown_until, is_for_sale
     FROM shobers WHERE id IN (?, ?) AND user_id = ?`
	)
		.bind(shober1Id, shober2Id, locals.user.id)
		.all();

	if (shobers.results.length !== 2) {
		throw error(400, 'Both shobers must belong to you');
	}

	const s1 = shobers.results.find((s) => s.id === shober1Id)!;
	const s2 = shobers.results.find((s) => s.id === shober2Id)!;

	// Check breeding eligibility
	const check1 = canBreed({
		breeding_cooldown_until: s1.breeding_cooldown_until as string | null,
		is_for_sale: s1.is_for_sale as number
	});
	const check2 = canBreed({
		breeding_cooldown_until: s2.breeding_cooldown_until as string | null,
		is_for_sale: s2.is_for_sale as number
	});

	if (!check1.canBreed) {
		throw error(400, `${s1.name}: ${check1.reason}`);
	}
	if (!check2.canBreed) {
		throw error(400, `${s2.name}: ${check2.reason}`);
	}

	// Check breeding cost
	const cost = getBreedingCost(s1.generation as number, s2.generation as number);
	const wallet = await platform.env.DB.prepare('SELECT mlem_coins FROM user_wallets WHERE user_id = ?')
		.bind(locals.user.id)
		.first();

	const coins = (wallet?.mlem_coins as number) || 0;
	if (coins < cost) {
		throw error(400, `Insufficient coins. Need ${cost}, have ${coins}`);
	}

	// Perform breeding
	const result = breedShobers(
		s1.dna as string,
		s2.dna as string,
		s1.generation as number,
		s2.generation as number
	);

	const decoded = decodeDNA(result.childDNA);
	const childConfig = dnaToConfig(result.childDNA);

	const babyId = crypto.randomUUID();
	const now = new Date().toISOString();
	const positionX = 20 + Math.random() * 60;
	const positionY = 40 + Math.random() * 40;

	await platform.env.DB.batch([
		// Create baby shober
		platform.env.DB.prepare(
			`INSERT INTO shobers (
        id, user_id, name, config, dna, generation, parent1_id, parent2_id,
        rarity_score, position_x, position_y, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
		).bind(
			babyId,
			locals.user.id,
			'Baby Shober',
			JSON.stringify(childConfig),
			result.childDNA,
			result.childGeneration,
			shober1Id,
			shober2Id,
			decoded.rarityScore,
			positionX,
			positionY,
			now,
			now
		),

		// Update parent cooldowns
		platform.env.DB.prepare(
			'UPDATE shobers SET breeding_cooldown_until = ?, breeding_count = breeding_count + 1 WHERE id = ?'
		).bind(result.cooldownEnd1, shober1Id),

		platform.env.DB.prepare(
			'UPDATE shobers SET breeding_cooldown_until = ?, breeding_count = breeding_count + 1 WHERE id = ?'
		).bind(result.cooldownEnd2, shober2Id),

		// Deduct breeding cost
		platform.env.DB.prepare(
			'UPDATE user_wallets SET mlem_coins = mlem_coins - ?, total_spent = total_spent + ? WHERE user_id = ?'
		).bind(cost, cost, locals.user.id),

		// Record transaction
		platform.env.DB.prepare(
			`INSERT INTO transactions (id, user_id, amount, type, reference_id, description, created_at)
       VALUES (?, ?, ?, 'breeding_cost', ?, ?, ?)`
		).bind(crypto.randomUUID(), locals.user.id, -cost, babyId, 'Breeding cost', now),

		// Record ownership
		platform.env.DB.prepare(
			`INSERT INTO ownership_history (id, shober_id, from_user_id, to_user_id, transfer_type, created_at)
       VALUES (?, ?, NULL, ?, 'breed', ?)`
		).bind(crypto.randomUUID(), babyId, locals.user.id, now)
	]);

	return json({
		success: true,
		baby: {
			id: babyId,
			name: 'Baby Shober',
			dna: result.childDNA,
			generation: result.childGeneration,
			config: childConfig,
			rarityScore: decoded.rarityScore,
			overallRarity: decoded.overallRarity,
			mutation: decoded.mutation.id,
			parent1Name: s1.name,
			parent2Name: s2.name
		},
		inheritedTraits: result.inheritedTraits,
		cost
	});
};
