import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * POST /api/marketplace/[id] - Buy a listed shober
 */
export const POST: RequestHandler = async ({ params, locals, platform }) => {
	if (!locals.user) {
		throw error(401, 'Not authenticated');
	}

	if (!platform) {
		throw error(500, 'Server configuration error');
	}

	// Get listing
	const listing = await platform.env.DB.prepare(
		`SELECT ml.*, s.name as shober_name, s.user_id as seller_id
     FROM marketplace_listings ml
     JOIN shobers s ON ml.shober_id = s.id
     WHERE ml.id = ?`
	)
		.bind(params.id)
		.first();

	if (!listing) {
		throw error(404, 'Listing not found');
	}

	if (listing.seller_id === locals.user.id) {
		throw error(400, 'Cannot buy your own shober');
	}

	// Check buyer's wallet
	const wallet = await platform.env.DB.prepare('SELECT mlem_coins FROM user_wallets WHERE user_id = ?')
		.bind(locals.user.id)
		.first();

	const buyerCoins = (wallet?.mlem_coins as number) || 0;
	const price = listing.price as number;

	if (buyerCoins < price) {
		throw error(400, `Insufficient Mlem Coins. You have ${buyerCoins}, need ${price}`);
	}

	const now = new Date().toISOString();
	const sellerId = listing.seller_id as string;

	// Perform transaction
	await platform.env.DB.batch([
		// Transfer shober ownership
		platform.env.DB.prepare(
			'UPDATE shobers SET user_id = ?, is_for_sale = 0, sale_price = NULL, is_active = 0 WHERE id = ?'
		).bind(locals.user.id, listing.shober_id),

		// Remove listing
		platform.env.DB.prepare('DELETE FROM marketplace_listings WHERE id = ?').bind(params.id),

		// Debit buyer
		platform.env.DB.prepare(
			'UPDATE user_wallets SET mlem_coins = mlem_coins - ?, total_spent = total_spent + ?, updated_at = ? WHERE user_id = ?'
		).bind(price, price, now, locals.user.id),

		// Credit seller
		platform.env.DB.prepare(
			'UPDATE user_wallets SET mlem_coins = mlem_coins + ?, total_earned = total_earned + ?, updated_at = ? WHERE user_id = ?'
		).bind(price, price, now, sellerId),

		// Record ownership transfer
		platform.env.DB.prepare(
			`INSERT INTO ownership_history (id, shober_id, from_user_id, to_user_id, transfer_type, price, created_at)
       VALUES (?, ?, ?, ?, 'sale', ?, ?)`
		).bind(crypto.randomUUID(), listing.shober_id, sellerId, locals.user.id, price, now),

		// Record buyer transaction
		platform.env.DB.prepare(
			`INSERT INTO transactions (id, user_id, amount, type, reference_id, description, created_at)
       VALUES (?, ?, ?, 'purchase', ?, ?, ?)`
		).bind(crypto.randomUUID(), locals.user.id, -price, listing.shober_id, `Purchased ${listing.shober_name}`, now),

		// Record seller transaction
		platform.env.DB.prepare(
			`INSERT INTO transactions (id, user_id, amount, type, reference_id, description, created_at)
       VALUES (?, ?, ?, 'sale', ?, ?, ?)`
		).bind(crypto.randomUUID(), sellerId, price, listing.shober_id, `Sold ${listing.shober_name}`, now)
	]);

	return json({
		success: true,
		shoberId: listing.shober_id,
		price
	});
};

/**
 * DELETE /api/marketplace/[id] - Cancel a listing
 */
export const DELETE: RequestHandler = async ({ params, locals, platform }) => {
	if (!locals.user) {
		throw error(401, 'Not authenticated');
	}

	if (!platform) {
		throw error(500, 'Server configuration error');
	}

	// Get listing
	const listing = await platform.env.DB.prepare(
		'SELECT * FROM marketplace_listings WHERE id = ?'
	)
		.bind(params.id)
		.first();

	if (!listing) {
		throw error(404, 'Listing not found');
	}

	if (listing.seller_id !== locals.user.id) {
		throw error(403, 'Not your listing');
	}

	// Remove listing
	await platform.env.DB.batch([
		platform.env.DB.prepare('DELETE FROM marketplace_listings WHERE id = ?').bind(params.id),
		platform.env.DB.prepare('UPDATE shobers SET is_for_sale = 0, sale_price = NULL WHERE id = ?').bind(
			listing.shober_id
		)
	]);

	return json({ success: true });
};
