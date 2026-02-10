import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { decodeDNA, dnaToConfig } from '$lib/shober/dna';

// Get all shobers in the garden
export const GET: RequestHandler = async ({ platform }) => {
	if (!platform) {
		throw error(500, 'Server configuration error');
	}

	const results = await platform.env.DB.prepare(
		`SELECT
      s.id, s.name, s.config, s.dna, s.generation, s.rarity_score,
      s.position_x, s.position_y,
      s.total_pets, s.total_gifts, s.mood, s.user_id,
      u.display_name as owner_name
     FROM shobers s
     JOIN users u ON s.user_id = u.id
     WHERE s.is_active = 1
     ORDER BY s.created_at DESC
     LIMIT 100`
	).all();

	const shobers = results.results.map((row) => {
		const dna = (row.dna as string) || '000000000000000000000000';
		// Use DNA-based config when available, fall back to stored config
		const config = dna !== '000000000000000000000000'
			? dnaToConfig(dna)
			: JSON.parse(row.config as string);

		return {
			id: row.id,
			name: row.name,
			userId: row.user_id,
			ownerName: row.owner_name || 'Anonymous',
			config,
			positionX: row.position_x,
			positionY: row.position_y,
			totalPets: row.total_pets,
			totalGifts: row.total_gifts,
			mood: row.mood,
			generation: row.generation || 0,
			rarityScore: row.rarity_score || 50
		};
	});

	return json({ shobers });
};
