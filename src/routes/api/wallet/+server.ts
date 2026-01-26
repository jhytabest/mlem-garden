import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * GET /api/wallet - Get user's wallet balance and recent transactions
 */
export const GET: RequestHandler = async ({ locals, platform, url }) => {
	if (!locals.user) {
		throw error(401, 'Not authenticated');
	}

	if (!platform) {
		throw error(500, 'Server configuration error');
	}

	// Get wallet
	let wallet = await platform.env.DB.prepare('SELECT * FROM user_wallets WHERE user_id = ?')
		.bind(locals.user.id)
		.first();

	// Create wallet if doesn't exist
	if (!wallet) {
		await platform.env.DB.prepare(
			`INSERT INTO user_wallets (user_id, mlem_coins, total_earned, total_spent, updated_at)
       VALUES (?, 1000, 0, 0, datetime('now'))`
		)
			.bind(locals.user.id)
			.run();

		// Record initial transaction
		await platform.env.DB.prepare(
			`INSERT INTO transactions (id, user_id, amount, type, description, created_at)
       VALUES (?, ?, 1000, 'initial', 'Welcome bonus', datetime('now'))`
		)
			.bind(crypto.randomUUID(), locals.user.id)
			.run();

		wallet = {
			user_id: locals.user.id,
			mlem_coins: 1000,
			total_earned: 0,
			total_spent: 0
		};
	}

	// Get recent transactions
	const limit = parseInt(url.searchParams.get('limit') || '10');
	const transactions = await platform.env.DB.prepare(
		`SELECT * FROM transactions
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ?`
	)
		.bind(locals.user.id, limit)
		.all();

	return json({
		wallet: {
			mlemCoins: wallet.mlem_coins,
			totalEarned: wallet.total_earned,
			totalSpent: wallet.total_spent
		},
		transactions: transactions.results.map((t) => ({
			id: t.id,
			amount: t.amount,
			type: t.type,
			referenceId: t.reference_id,
			description: t.description,
			createdAt: t.created_at
		}))
	});
};
