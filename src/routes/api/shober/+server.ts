import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { ShoberConfig } from '$lib/shober/types';

interface CreateShoberRequest {
	name: string;
	config: ShoberConfig;
}

// Create or update shober
export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user) {
		throw error(401, 'Not authenticated');
	}

	if (!platform) {
		throw error(500, 'Server configuration error');
	}

	const body: CreateShoberRequest = await request.json();

	// Validate input
	if (!body.name || body.name.length < 1 || body.name.length > 20) {
		throw error(400, 'Name must be 1-20 characters');
	}

	if (!body.config) {
		throw error(400, 'Config is required');
	}

	const userId = locals.user.id;
	const now = new Date().toISOString();

	// Check if user already has a shober
	const existing = await platform.env.DB.prepare('SELECT id FROM shobers WHERE user_id = ?')
		.bind(userId)
		.first();

	if (existing) {
		// Update existing shober
		await platform.env.DB.prepare(
			'UPDATE shobers SET name = ?, config = ?, updated_at = ? WHERE user_id = ?'
		)
			.bind(body.name, JSON.stringify(body.config), now, userId)
			.run();

		return json({ success: true, id: existing.id, updated: true });
	} else {
		// Create new shober with random position in garden
		const shoberId = crypto.randomUUID();
		const positionX = 20 + Math.random() * 60; // 20-80% of garden width
		const positionY = 40 + Math.random() * 40; // 40-80% of garden height

		await platform.env.DB.prepare(
			`INSERT INTO shobers (id, user_id, name, config, position_x, position_y, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
		)
			.bind(shoberId, userId, body.name, JSON.stringify(body.config), positionX, positionY, now, now)
			.run();

		return json({ success: true, id: shoberId, created: true });
	}
};

// Get current user's shober
export const GET: RequestHandler = async ({ locals, platform }) => {
	if (!locals.user) {
		throw error(401, 'Not authenticated');
	}

	if (!platform) {
		throw error(500, 'Server configuration error');
	}

	const result = await platform.env.DB.prepare(
		'SELECT * FROM shobers WHERE user_id = ?'
	)
		.bind(locals.user.id)
		.first();

	if (!result) {
		return json({ shober: null });
	}

	return json({
		shober: {
			id: result.id,
			name: result.name,
			config: JSON.parse(result.config as string),
			positionX: result.position_x,
			positionY: result.position_y,
			totalPets: result.total_pets,
			totalGifts: result.total_gifts,
			mood: result.mood
		}
	});
};
