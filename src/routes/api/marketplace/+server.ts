import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { decodeDNA, dnaToConfig } from '$lib/shober/dna';

/**
 * GET /api/marketplace - Browse marketplace listings
 */
export const GET: RequestHandler = async ({ platform, url }) => {
	if (!platform) {
		throw error(500, 'Server configuration error');
	}

	// Parse query params
	const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
	const offset = parseInt(url.searchParams.get('offset') || '0');
	const sortBy = url.searchParams.get('sort') || 'listed_desc';
	const minPrice = url.searchParams.get('minPrice');
	const maxPrice = url.searchParams.get('maxPrice');
	const generation = url.searchParams.get('generation');
	const rarity = url.searchParams.get('rarity');

	// Build query
	let query = `
    SELECT ml.*, s.name as shober_name, s.dna, s.generation, s.rarity_score, s.config,
           u.display_name as seller_name
    FROM marketplace_listings ml
    JOIN shobers s ON ml.shober_id = s.id
    JOIN users u ON ml.seller_id = u.id
    WHERE 1=1
  `;
	const params: (string | number)[] = [];

	if (minPrice) {
		query += ' AND ml.price >= ?';
		params.push(parseInt(minPrice));
	}
	if (maxPrice) {
		query += ' AND ml.price <= ?';
		params.push(parseInt(maxPrice));
	}
	if (generation) {
		query += ' AND s.generation = ?';
		params.push(parseInt(generation));
	}
	if (rarity) {
		// Rarity score ranges
		const rarityRanges: Record<string, [number, number]> = {
			legendary: [300, 999],
			rare: [150, 299],
			uncommon: [80, 149],
			common: [0, 79]
		};
		const range = rarityRanges[rarity];
		if (range) {
			query += ' AND s.rarity_score >= ? AND s.rarity_score <= ?';
			params.push(range[0], range[1]);
		}
	}

	// Sort
	const sortOptions: Record<string, string> = {
		price_asc: 'ml.price ASC',
		price_desc: 'ml.price DESC',
		listed_desc: 'ml.listed_at DESC',
		listed_asc: 'ml.listed_at ASC',
		rarity_desc: 's.rarity_score DESC',
		generation_asc: 's.generation ASC'
	};
	query += ` ORDER BY ${sortOptions[sortBy] || sortOptions.listed_desc}`;
	query += ' LIMIT ? OFFSET ?';
	params.push(limit, offset);

	const results = await platform.env.DB.prepare(query)
		.bind(...params)
		.all();

	// Get total count for pagination
	let countQuery = `
    SELECT COUNT(*) as total
    FROM marketplace_listings ml
    JOIN shobers s ON ml.shober_id = s.id
    WHERE 1=1
  `;
	// Reuse filter params (without limit/offset)
	const countParams = params.slice(0, -2);
	const countResult = await platform.env.DB.prepare(countQuery)
		.bind(...countParams)
		.first();

	const listings = results.results.map((row) => {
		const dna = (row.dna as string) || '000000000000000000000000';
		const decoded = decodeDNA(dna);
		const config = dna !== '000000000000000000000000' ? dnaToConfig(dna) : JSON.parse((row.config as string) || '{}');

		return {
			id: row.id,
			shoberId: row.shober_id,
			sellerId: row.seller_id,
			sellerName: row.seller_name,
			price: row.price,
			listedAt: row.listed_at,
			expiresAt: row.expires_at,
			shober: {
				name: row.shober_name,
				dna,
				generation: row.generation,
				rarityScore: row.rarity_score,
				overallRarity: decoded.overallRarity,
				config
			}
		};
	});

	return json({
		listings,
		total: (countResult?.total as number) || 0,
		limit,
		offset
	});
};

/**
 * POST /api/marketplace - List a shober for sale
 */
export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user) {
		throw error(401, 'Not authenticated');
	}

	if (!platform) {
		throw error(500, 'Server configuration error');
	}

	const body = await request.json();
	const { shoberId, price } = body;

	if (!shoberId || !price) {
		throw error(400, 'shoberId and price are required');
	}

	if (price < 1 || price > 1000000) {
		throw error(400, 'Price must be between 1 and 1,000,000');
	}

	// Verify ownership
	const shober = await platform.env.DB.prepare(
		'SELECT user_id, is_for_sale, is_active FROM shobers WHERE id = ?'
	)
		.bind(shoberId)
		.first();

	if (!shober) {
		throw error(404, 'Shober not found');
	}

	if (shober.user_id !== locals.user.id) {
		throw error(403, 'Not your shober');
	}

	if (shober.is_for_sale === 1) {
		throw error(400, 'Shober is already listed');
	}

	// Can't sell active shober if it's the only one
	if (shober.is_active === 1) {
		const otherShobers = await platform.env.DB.prepare(
			'SELECT COUNT(*) as count FROM shobers WHERE user_id = ? AND id != ?'
		)
			.bind(locals.user.id, shoberId)
			.first();

		if ((otherShobers?.count as number) === 0) {
			throw error(400, "Can't sell your only shober");
		}
	}

	const listingId = crypto.randomUUID();
	const now = new Date().toISOString();

	await platform.env.DB.batch([
		platform.env.DB.prepare(
			`INSERT INTO marketplace_listings (id, shober_id, seller_id, price, listed_at)
       VALUES (?, ?, ?, ?, ?)`
		).bind(listingId, shoberId, locals.user.id, price, now),

		platform.env.DB.prepare('UPDATE shobers SET is_for_sale = 1, sale_price = ? WHERE id = ?').bind(
			price,
			shoberId
		)
	]);

	return json({ success: true, listingId });
};
