import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface InteractionRequest {
	shoberId: string;
	type: 'pet' | 'gift' | 'emoji' | 'baby';
	data?: {
		giftType?: string;
		emojiType?: string;
		babyConfig?: unknown;
	};
}

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user) {
		throw error(401, 'Not authenticated');
	}

	if (!platform) {
		throw error(500, 'Server configuration error');
	}

	const body: InteractionRequest = await request.json();

	// Validate
	if (!body.shoberId || !body.type) {
		throw error(400, 'Missing shoberId or type');
	}

	if (!['pet', 'gift', 'emoji', 'baby'].includes(body.type)) {
		throw error(400, 'Invalid interaction type');
	}

	// Get target shober
	const shober = await platform.env.DB.prepare('SELECT id, user_id, total_pets, total_gifts FROM shobers WHERE id = ?')
		.bind(body.shoberId)
		.first();

	if (!shober) {
		throw error(404, 'Shober not found');
	}

	// Can't interact with own shober
	if (shober.user_id === locals.user.id) {
		throw error(400, "You can't pet your own shober!");
	}

	const now = new Date().toISOString();
	const interactionId = crypto.randomUUID();

	// Record interaction
	await platform.env.DB.prepare(
		'INSERT INTO interactions (id, from_user_id, to_shober_id, type, data, created_at) VALUES (?, ?, ?, ?, ?, ?)'
	)
		.bind(interactionId, locals.user.id, body.shoberId, body.type, JSON.stringify(body.data || {}), now)
		.run();

	// Update shober stats
	if (body.type === 'pet') {
		await platform.env.DB.prepare('UPDATE shobers SET total_pets = total_pets + 1 WHERE id = ?')
			.bind(body.shoberId)
			.run();
	} else if (body.type === 'gift' && body.data?.giftType) {
		await platform.env.DB.prepare('UPDATE shobers SET total_gifts = total_gifts + 1 WHERE id = ?')
			.bind(body.shoberId)
			.run();

		// Add gift to shober's inventory
		const giftId = crypto.randomUUID();
		await platform.env.DB.prepare(
			'INSERT INTO gifts (id, shober_id, gift_type, from_user_id, received_at) VALUES (?, ?, ?, ?, ?)'
		)
			.bind(giftId, body.shoberId, body.data.giftType, locals.user.id, now)
			.run();
	}

	return json({
		success: true,
		interaction: {
			id: interactionId,
			type: body.type,
			shoberId: body.shoberId
		}
	});
};
