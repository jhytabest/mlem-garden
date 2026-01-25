import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface GoogleTokenResponse {
	access_token: string;
	id_token: string;
	token_type: string;
	expires_in: number;
}

interface GoogleUserInfo {
	sub: string;
	email: string;
	name?: string;
	picture?: string;
}

export const GET: RequestHandler = async ({ url, cookies, platform }) => {
	if (!platform) {
		redirect(302, '/login?error=Server+configuration+error');
	}

	const code = url.searchParams.get('code');
	const error = url.searchParams.get('error');

	if (error) {
		redirect(302, `/login?error=${encodeURIComponent(error)}`);
	}

	if (!code) {
		redirect(302, '/login?error=No+authorization+code');
	}

	const clientId = platform.env.GOOGLE_CLIENT_ID;
	const clientSecret = platform.env.GOOGLE_CLIENT_SECRET;

	if (!clientId || !clientSecret) {
		redirect(302, '/login?error=OAuth+not+configured');
	}

	try {
		// Exchange code for tokens
		const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				client_id: clientId,
				client_secret: clientSecret,
				code,
				grant_type: 'authorization_code',
				redirect_uri: `${url.origin}/api/auth/callback`
			})
		});

		if (!tokenResponse.ok) {
			const errorData = await tokenResponse.text();
			console.error('Token exchange failed:', errorData);
			redirect(302, '/login?error=Authentication+failed');
		}

		const tokens: GoogleTokenResponse = await tokenResponse.json();

		// Get user info
		const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
			headers: { Authorization: `Bearer ${tokens.access_token}` }
		});

		if (!userInfoResponse.ok) {
			redirect(302, '/login?error=Failed+to+get+user+info');
		}

		const googleUser: GoogleUserInfo = await userInfoResponse.json();

		// Create or update user in database
		const userId = crypto.randomUUID();
		const now = new Date().toISOString();

		// Check if user exists
		const existingUser = await platform.env.DB.prepare(
			'SELECT id FROM users WHERE google_id = ?'
		)
			.bind(googleUser.sub)
			.first();

		let finalUserId: string;

		if (existingUser) {
			finalUserId = existingUser.id as string;
			// Update last seen
			await platform.env.DB.prepare(
				'UPDATE users SET last_seen_at = ?, display_name = ?, avatar_url = ? WHERE id = ?'
			)
				.bind(now, googleUser.name || null, googleUser.picture || null, finalUserId)
				.run();
		} else {
			finalUserId = userId;
			// Create new user
			await platform.env.DB.prepare(
				'INSERT INTO users (id, google_id, email, display_name, avatar_url, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
			)
				.bind(
					userId,
					googleUser.sub,
					googleUser.email,
					googleUser.name || null,
					googleUser.picture || null,
					now,
					now
				)
				.run();
		}

		// Create session
		const sessionId = crypto.randomUUID();
		const sessionData = {
			id: finalUserId,
			email: googleUser.email,
			displayName: googleUser.name || null,
			avatarUrl: googleUser.picture || null
		};

		// Store session in KV (expires in 7 days)
		await platform.env.SESSIONS.put(sessionId, JSON.stringify(sessionData), {
			expirationTtl: 60 * 60 * 24 * 7
		});

		// Set session cookie
		cookies.set('session', sessionId, {
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 7 // 7 days
		});

		// Check if user has a shober, if not redirect to create
		const shober = await platform.env.DB.prepare(
			'SELECT id FROM shobers WHERE user_id = ?'
		)
			.bind(finalUserId)
			.first();

		if (!shober) {
			redirect(302, '/create');
		}

		redirect(302, '/');
	} catch (e) {
		console.error('Auth callback error:', e);
		if (e instanceof Response) throw e; // Re-throw redirects
		redirect(302, '/login?error=Authentication+failed');
	}
};
