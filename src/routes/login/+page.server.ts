import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	// If already logged in, redirect to home
	if (locals.user) {
		redirect(302, '/');
	}

	// Check for error from OAuth callback
	const error = url.searchParams.get('error');

	return {
		error: error ? decodeURIComponent(error) : null
	};
};
