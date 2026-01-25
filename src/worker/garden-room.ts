import { DurableObject } from 'cloudflare:workers';

interface Session {
	webSocket: WebSocket;
	userId: string;
	shoberId?: string;
	quit: boolean;
}

interface GardenMessage {
	type: 'join' | 'leave' | 'move' | 'pet' | 'gift' | 'emoji' | 'baby' | 'sync' | 'chat';
	userId?: string;
	shoberId?: string;
	data?: Record<string, unknown>;
}

export class GardenRoom extends DurableObject {
	sessions: Map<WebSocket, Session> = new Map();
	shoberStates: Map<string, { x: number; y: number }> = new Map();
	chatHistory: { userId: string; shoberId?: string; data: Record<string, unknown>; timestamp: number }[] = [];

	constructor(ctx: DurableObjectState, env: any) {
		super(ctx, env);
		// Restore state from storage
		this.ctx.blockConcurrencyWhile(async () => {
			const storedStates = await this.ctx.storage.get<Record<string, { x: number; y: number }>>('shoberStates');
			if (storedStates) {
				this.shoberStates = new Map(Object.entries(storedStates));
			}

			const storedChat = await this.ctx.storage.get<{ userId: string; shoberId?: string; data: Record<string, unknown>; timestamp: number }[]>('chatHistory');
			if (storedChat) {
				this.chatHistory = storedChat;
			}
		});
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);

		// Handle WebSocket upgrade
		if (request.headers.get('Upgrade') === 'websocket') {
			const userId = url.searchParams.get('userId');
			const shoberId = url.searchParams.get('shoberId');

			if (!userId) {
				return new Response('Missing userId', { status: 400 });
			}

			const pair = new WebSocketPair();
			const [client, server] = Object.values(pair);

			// Accept the WebSocket with hibernation
			this.ctx.acceptWebSocket(server);

			// Store session info
			this.sessions.set(server, {
				webSocket: server,
				userId,
				shoberId: shoberId || undefined,
				quit: false
			});

			// Notify others that someone joined
			this.broadcast(
				{
					type: 'join',
					userId,
					shoberId: shoberId || undefined
				},
				server
			);

			return new Response(null, { status: 101, webSocket: client });
		}

		return new Response('Expected WebSocket', { status: 400 });
	}

	// Called when a WebSocket receives a message
	async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
		const session = this.sessions.get(ws);
		if (!session) return;

		try {
			const data: GardenMessage =
				typeof message === 'string' ? JSON.parse(message) : JSON.parse(new TextDecoder().decode(message));

			switch (data.type) {
				case 'move':
					// Update state
					if (session.shoberId && data.data) {
						this.shoberStates.set(session.shoberId, {
							x: data.data.x as number,
							y: data.data.y as number
						});
						// Persist state (throttled/debounced in a real app, but directly here for simplicity or maybe save periodically)
						// For now, let's save it. Cloudflare storage is fast.
						// To avoid too many writes, maybe we only save periodically? 
						// But for now, direct write is safest for "persistence".
						// Converting Map to Object for storage
						const statesObj = Object.fromEntries(this.shoberStates);
						this.ctx.storage.put('shoberStates', statesObj);
					}

					// User moved their shober
					this.broadcast(
						{
							type: 'move',
							userId: session.userId,
							shoberId: session.shoberId,
							data: data.data
						},
						ws
					);
					break;

				case 'pet':
				case 'gift':
				case 'emoji':
				case 'baby':
					// Interaction with another shober
					this.broadcast(
						{
							type: data.type,
							userId: session.userId,
							shoberId: data.shoberId,
							data: data.data
						},
						ws
					);
					break;

				case 'chat':
					const chatMsg = {
						userId: session.userId,
						shoberId: session.shoberId,
						data: {
							...data.data,
							text: (data.data as any)?.text // Ensure text is preserved
						},
						timestamp: Date.now()
					};

					// Add to history
					this.chatHistory.push(chatMsg);
					if (this.chatHistory.length > 50) {
						this.chatHistory.shift();
					}
					
					// Persist history
					this.ctx.storage.put('chatHistory', this.chatHistory);

					this.broadcast(
						{
							type: 'chat',
							userId: session.userId,
							shoberId: session.shoberId,
							data: chatMsg.data
						},
						ws
					);
					break;

				case 'sync':
					// Request current state - could send list of connected users
					const connectedUsers = Array.from(this.sessions.values())
						.filter((s) => !s.quit)
						.map((s) => ({ userId: s.userId, shoberId: s.shoberId }));

					// Convert states map to object
					const states: Record<string, { x: number; y: number }> = {};
					for (const [id, pos] of this.shoberStates) {
						states[id] = pos;
					}

					ws.send(
						JSON.stringify({
							type: 'sync',
							data: { 
								connectedUsers, 
								states,
								chatHistory: this.chatHistory // Send history
							}
						})
					);
					break;
			}
		} catch (e) {
			console.error('Failed to handle WebSocket message:', e);
		}
	}

	// Called when a WebSocket is closed
	async webSocketClose(ws: WebSocket, code: number, reason: string) {
		const session = this.sessions.get(ws);
		if (session) {
			session.quit = true;

			// Notify others
			this.broadcast({
				type: 'leave',
				userId: session.userId,
				shoberId: session.shoberId
			});

			this.sessions.delete(ws);
		}
	}

	// Called when a WebSocket errors
	async webSocketError(ws: WebSocket, error: unknown) {
		const session = this.sessions.get(ws);
		if (session) {
			console.error(`WebSocket error for user ${session.userId}:`, error);
			session.quit = true;
			this.sessions.delete(ws);
		}
	}

	// Broadcast a message to all connected clients
	private broadcast(message: GardenMessage, except?: WebSocket) {
		const messageStr = JSON.stringify(message);

		for (const [ws, session] of this.sessions) {
			if (ws === except || session.quit) continue;

			try {
				ws.send(messageStr);
			} catch (e) {
				// WebSocket might be closed
				session.quit = true;
			}
		}
	}
}
