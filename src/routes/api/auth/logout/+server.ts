import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies, platform }) => {
	const sessionId = cookies.get('session');

	if (sessionId && platform) {
		// Delete session from KV
		await platform.env.SESSIONS.delete(sessionId);
	}

	// Clear session cookie
	cookies.delete('session', { path: '/' });

	redirect(302, '/');
};
