<script lang="ts">
	import './styles.css';

	import { appWindow } from '@tauri-apps/api/window';
</script>

<div data-tauri-drag-region class="titlebar">
	<div class="titlebar-button" on:click={() => appWindow.minimize()}>
		<svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24">
			<path fill="currentColor" d="M20 14H4v-4h16" />
		</svg>
	</div>
	<div class="titlebar-button" on:click={() => appWindow.toggleMaximize()}>
		<svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24">
			<path fill="currentColor" d="M4 4h16v16H4V4m2 4v10h12V8H6Z" />
		</svg>
	</div>
	<div class="titlebar-button" on:click={() => appWindow.close()}>
		<svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24">
			<path
				fill="currentColor"
				d="M13.46 12L19 17.54V19h-1.46L12 13.46L6.46 19H5v-1.46L10.54 12L5 6.46V5h1.46L12 10.54L17.54 5H19v1.46L13.46 12Z"
			/>
		</svg>
	</div>
</div>
<main class="app-background">
	<slot />
</main>

<style>
	:global(button) {
		background: none;
		border: none;
	}
	:global(div),
	:global(button) {
		color: var(--text);
	}
	.titlebar {
		height: 1.4rem;
		background: #333;
		user-select: none;
		display: flex;
		justify-content: flex-end;
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
	}

	.titlebar-button {
		margin: 0.2rem;

		display: inline-flex;
		justify-content: center;
		align-items: center;
		width: 1rem;
		height: 1rem;
	}

	.titlebar-button:hover {
		background: #444;
	}
</style>
