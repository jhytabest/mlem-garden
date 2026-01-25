<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { chatMessages, gardenWS, shobers } from '$lib/stores/garden';
	import type { ChatMessage } from '$lib/stores/garden';

	interface Props {
		userId: string;
	}

	let { userId }: Props = $props();

	let chatInput = $state('');
	let chatContainer: HTMLElement;
	let showChat = $state(true);

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!chatInput.trim()) return;

		gardenWS.sendChat(chatInput.trim());
		
		// Optimistic update for immediate feedback
		chatMessages.update(msgs => [...msgs, {
			id: crypto.randomUUID(),
			userId,
			text: chatInput.trim(),
			timestamp: Date.now()
		}].slice(-50));

		chatInput = '';
	}

	function getShoberName(shoberId?: string, msgUserId?: string): string {
		if (shoberId) {
			const shober = $shobers.find(s => s.id === shoberId);
			if (shober) return shober.name;
		}
		if (msgUserId) {
			const shober = $shobers.find(s => s.userId === msgUserId);
			if (shober) return shober.name;
			return 'Visitor';
		}
		return 'Unknown';
	}

	function formatTime(timestamp: number): string {
		return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	$effect(() => {
		if (chatContainer && $chatMessages.length) {
			chatContainer.scrollTop = chatContainer.scrollHeight;
		}
	});
</script>

<div class="chat-wrapper" class:collapsed={!showChat}>
	<button 
		class="toggle-btn" 
		onclick={() => showChat = !showChat}
		aria-label={showChat ? "Collapse chat" : "Expand chat"}
	>
		{showChat ? '▼' : '💬'}
	</button>

	{#if showChat}
		<div class="chat-box" transition:fly={{ y: 20, duration: 200 }}>
			<div class="messages" bind:this={chatContainer}>
				{#each $chatMessages as msg (msg.id)}
					<div 
						class="message" 
						class:own={msg.userId === userId}
						in:fade={{ duration: 150 }}
					>
						<span class="sender">{getShoberName(msg.shoberId, msg.userId)}</span>
						<p class="text">{msg.text}</p>
						<span class="time">{formatTime(msg.timestamp)}</span>
					</div>
				{/each}
				{#if $chatMessages.length === 0}
					<div class="empty-state">Say hello! 👋</div>
				{/if}
			</div>
			
			<form class="input-area" onsubmit={handleSubmit}>
				<input
					type="text"
					bind:value={chatInput}
					placeholder="Type a message..."
					maxlength="100"
				/>
				<button type="submit" disabled={!chatInput.trim()}>Send</button>
			</form>
		</div>
	{/if}
</div>

<style>
	.chat-wrapper {
		position: absolute;
		bottom: 20px;
		right: 20px;
		z-index: 50;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 8px;
	}

	.toggle-btn {
		background: var(--color-white, #fff);
		border: 1px solid var(--color-border, #eee);
		width: 32px;
		height: 32px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		box-shadow: 0 2px 8px rgba(0,0,0,0.1);
		font-size: 0.9rem;
	}

	.toggle-btn:hover {
		background: #f5f5f5;
	}

	.chat-box {
		width: 300px;
		height: 400px;
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(8px);
		border-radius: 12px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
		display: flex;
		flex-direction: column;
		overflow: hidden;
		border: 1px solid rgba(0,0,0,0.05);
	}

	.messages {
		flex: 1;
		overflow-y: auto;
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.message {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		max-width: 85%;
		background: #f0f2f5;
		padding: 6px 10px;
		border-radius: 12px;
		border-bottom-left-radius: 2px;
		font-size: 0.9rem;
	}

	.message.own {
		align-self: flex-end;
		background: #e3f2fd;
		border-bottom-left-radius: 12px;
		border-bottom-right-radius: 2px;
		align-items: flex-end;
	}

	.sender {
		font-size: 0.7rem;
		font-weight: 600;
		color: #666;
		margin-bottom: 2px;
	}

	.message.own .sender {
		color: #1976d2;
	}

	.text {
		margin: 0;
		word-break: break-word;
		line-height: 1.4;
	}

	.time {
		font-size: 0.65rem;
		color: #999;
		margin-top: 2px;
		align-self: flex-end;
	}

	.message.own .time {
		align-self: flex-start;
	}

	.empty-state {
		text-align: center;
		color: #999;
		margin-top: 20px;
		font-style: italic;
	}

	.input-area {
		padding: 10px;
		border-top: 1px solid #eee;
		display: flex;
		gap: 8px;
		background: #fff;
	}

	input {
		flex: 1;
		padding: 8px 12px;
		border: 1px solid #ddd;
		border-radius: 20px;
		outline: none;
		font-size: 0.9rem;
	}

	input:focus {
		border-color: #2196f3;
	}

	button[type="submit"] {
		padding: 6px 14px;
		background: #2196f3;
		color: white;
		border: none;
		border-radius: 18px;
		font-weight: 500;
		font-size: 0.85rem;
		cursor: pointer;
	}

	button[type="submit"]:disabled {
		background: #e0e0e0;
		color: #999;
		cursor: not-allowed;
	}

	@media (max-width: 480px) {
		.chat-wrapper {
			right: 10px;
			bottom: 10px;
		}
		
		.chat-box {
			width: 280px;
			height: 350px;
		}
	}
</style>
