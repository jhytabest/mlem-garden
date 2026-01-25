import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user || !platform) {
		return { existingShober: null };
	}

	try {
		const result = await platform.env.DB.prepare(
			'SELECT id, name, config FROM shobers WHERE user_id = ?'
		)
			.bind(locals.user.id)
			.first();

		if (result) {
			return {
				existingShober: {
					id: result.id as string,
					name: result.name as string,
					config: JSON.parse(result.config as string)
				}
			};
		}
	} catch (e) {
		console.error('Failed to load existing shober:', e);
	}

	return { existingShober: null };
};
