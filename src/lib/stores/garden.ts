import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import type { ShoberData } from '$lib/shober/types';

// Store for all shobers in the garden
export const shobers = writable<ShoberData[]>([]);

// Store for connected users (online indicators)
export const connectedUsers = writable<Set<string>>(new Set());

// WebSocket connection state
export const connectionState = writable<'disconnected' | 'connecting' | 'connected'>('disconnected');

// Garden WebSocket manager
class GardenWebSocket {
	private ws: WebSocket | null = null;
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	private reconnectAttempts = 0;
	private maxReconnectAttempts = 5;

	connect() {
		if (!browser) return;
		if (this.ws?.readyState === WebSocket.OPEN) return;

		connectionState.set('connecting');

		const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
		const wsUrl = `${protocol}//${window.location.host}/api/garden/ws`;

		this.ws = new WebSocket(wsUrl);

		this.ws.onopen = () => {
			connectionState.set('connected');
			this.reconnectAttempts = 0;

			// Request sync of current state
			this.send({ type: 'sync' });
		};

		this.ws.onmessage = (event) => {
			try {
				const message = JSON.parse(event.data);
				this.handleMessage(message);
			} catch (e) {
				console.error('Failed to parse WebSocket message:', e);
			}
		};

		this.ws.onclose = () => {
			connectionState.set('disconnected');
			this.ws = null;
			this.scheduleReconnect();
		};

		this.ws.onerror = (error) => {
			console.error('WebSocket error:', error);
		};
	}

	disconnect() {
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}
		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
		connectionState.set('disconnected');
	}

	private scheduleReconnect() {
		if (this.reconnectAttempts >= this.maxReconnectAttempts) {
			console.log('Max reconnect attempts reached');
			return;
		}

		const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
		this.reconnectAttempts++;

		this.reconnectTimer = setTimeout(() => {
			this.connect();
		}, delay);
	}

	private handleMessage(message: {
		type: string;
		userId?: string;
		shoberId?: string;
		data?: Record<string, unknown>;
	}) {
		switch (message.type) {
			case 'join':
				if (message.userId) {
					connectedUsers.update((users) => {
						users.add(message.userId!);
						return new Set(users);
					});
				}
				break;

			case 'leave':
				if (message.userId) {
					connectedUsers.update((users) => {
						users.delete(message.userId!);
						return new Set(users);
					});
				}
				break;

			case 'move':
				if (message.shoberId && message.data) {
					shobers.update((list) =>
						list.map((s) =>
							s.id === message.shoberId
								? {
										...s,
										positionX: message.data?.x as number,
										positionY: message.data?.y as number
									}
								: s
						)
					);
				}
				break;

			case 'pet':
			case 'gift':
			case 'emoji':
				// Emit custom event for animation handling
				if (browser) {
					window.dispatchEvent(
						new CustomEvent('garden-interaction', {
							detail: message
						})
					);
				}
				break;

			case 'sync':
				if (message.data?.connectedUsers) {
					connectedUsers.set(
						new Set((message.data.connectedUsers as { userId: string }[]).map((u) => u.userId))
					);
				}
				if (message.data?.states) {
					const states = message.data.states as Record<string, { x: number; y: number }>;
					shobers.update((list) =>
						list.map((s) => {
							if (states[s.id]) {
								return {
									...s,
									positionX: states[s.id].x,
									positionY: states[s.id].y
								};
							}
							return s;
						})
					);
				}
				break;
		}
	}

	send(message: Record<string, unknown>) {
		if (this.ws?.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify(message));
		}
	}

	// Send shober position update
	moveShober(x: number, y: number) {
		this.send({ type: 'move', data: { x, y } });
	}

	// Send interaction
	interact(type: 'pet' | 'gift' | 'emoji', shoberId: string, data?: Record<string, unknown>) {
		this.send({ type, shoberId, data });
	}
}

export const gardenWS = new GardenWebSocket();

// Derived store to check if a user is online
export const isUserOnline = (userId: string) =>
	derived(connectedUsers, ($users) => $users.has(userId));

// Load initial shobers from API
export async function loadShobers() {
	try {
		const response = await fetch('/api/garden');
		if (response.ok) {
			const data = (await response.json()) as { shobers: ShoberData[] };
			shobers.set(data.shobers);
		}
	} catch (e) {
		console.error('Failed to load shobers:', e);
	}
}
