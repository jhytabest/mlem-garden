import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, platform }) => {
	if (!platform) {
		redirect(302, '/login?error=Server+configuration+error');
	}

	const clientId = platform.env.GOOGLE_CLIENT_ID;

	if (!clientId) {
		redirect(302, '/login?error=Google+OAuth+not+configured');
	}

	// Build Google OAuth URL
	const redirectUri = `${url.origin}/api/auth/callback`;
	const scope = 'openid email profile';
	const state = crypto.randomUUID(); // In production, store this in KV for CSRF protection

	const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
	authUrl.searchParams.set('client_id', clientId);
	authUrl.searchParams.set('redirect_uri', redirectUri);
	authUrl.searchParams.set('response_type', 'code');
	authUrl.searchParams.set('scope', scope);
	authUrl.searchParams.set('state', state);
	authUrl.searchParams.set('access_type', 'offline');
	authUrl.searchParams.set('prompt', 'consent');

	redirect(302, authUrl.toString());
};
