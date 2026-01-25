import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, locals, platform, url }) => {
	if (!locals.user) {
		throw error(401, 'Not authenticated');
	}

	if (!platform) {
		throw error(500, 'Server configuration error');
	}

	// Check if this is a WebSocket upgrade request
	const upgradeHeader = request.headers.get('Upgrade');
	if (upgradeHeader !== 'websocket') {
		throw error(400, 'Expected WebSocket request');
	}

	// Get user's shober ID
	const shober = await platform.env.DB.prepare('SELECT id FROM shobers WHERE user_id = ?')
		.bind(locals.user.id)
		.first();

	// Get the GardenRoom Durable Object
	// Use a fixed name for the single shared garden
	const gardenId = platform.env.GARDEN_ROOM.idFromName('main-garden');
	const gardenStub = platform.env.GARDEN_ROOM.get(gardenId);

	// Forward the WebSocket request to the Durable Object
	const wsUrl = new URL(request.url);
	wsUrl.searchParams.set('userId', locals.user.id);
	if (shober) {
		wsUrl.searchParams.set('shoberId', shober.id as string);
	}

	const newRequest = new Request(wsUrl.toString(), {
		method: request.method,
		headers: request.headers
	});

	return gardenStub.fetch(newRequest);
};
