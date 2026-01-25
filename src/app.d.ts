/// <reference types="@cloudflare/workers-types" />

declare global {
	namespace App {
		interface Locals {
			user: {
				id: string;
				email: string;
				displayName: string | null;
				avatarUrl: string | null;
			} | null;
		}

		interface Platform {
			env: {
				DB: D1Database;
				SESSIONS: KVNamespace;
				GARDEN_ROOM?: DurableObjectNamespace; // Optional - will be added later for real-time
				GOOGLE_CLIENT_ID: string;
				GOOGLE_CLIENT_SECRET: string;
			};
			context: ExecutionContext;
			caches: CacheStorage & { default: Cache };
		}
	}
}

export {};
