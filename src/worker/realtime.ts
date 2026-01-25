// Real-time worker for Mlem Garden
// This worker handles WebSocket connections via Durable Objects

export { GardenRoom } from './garden-room';

export default {
	async fetch(request: Request, env: { GARDEN_ROOM: DurableObjectNamespace }): Promise<Response> {
		const url = new URL(request.url);

		// Route WebSocket connections to the Durable Object
		if (url.pathname === '/ws' || url.pathname === '/') {
			// Use a single global garden room
			const id = env.GARDEN_ROOM.idFromName('global-garden');
			const stub = env.GARDEN_ROOM.get(id);
			return stub.fetch(request);
		}

		return new Response('Mlem Garden Real-time Service', { status: 200 });
	}
};
