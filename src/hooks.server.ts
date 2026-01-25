import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	// Initialize user as null
	event.locals.user = null;

	// Check for session cookie
	const sessionId = event.cookies.get('session');

	if (sessionId && event.platform) {
		try {
			// Get session from KV
			const sessionData = await event.platform.env.SESSIONS.get(sessionId, 'json');

			if (sessionData) {
				event.locals.user = sessionData as App.Locals['user'];
			}
		} catch (e) {
			console.error('Failed to get session:', e);
			// Clear invalid session cookie
			event.cookies.delete('session', { path: '/' });
		}
	}

	return resolve(event);
};
