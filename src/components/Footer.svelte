<script>
	import { writeText } from '@tauri-apps/api/clipboard';
	import {
		lastCuttedFileStore,
		appProcessStatusReadableStore,
		audioExtensions
	} from '../routes/stores';
</script>

<footer class=" flex-column flex items-center justify-center">
	<div id="bottom-info">
		{#if $lastCuttedFileStore.length > 0}
			<a class="bottom-info-item" on:click={() => writeText($lastCuttedFileStore)}>
				(Click to copy in clipboard)<br /></a
			>

			<a class="bottom-info-item">Cut saved here: {$lastCuttedFileStore}</a>
		{/if}
		<div id="status-line-container" class="flex items-center justify-center">
			{#if $appProcessStatusReadableStore.length > 0}
				<div class="bottom-info-item" id="status-line">
					Status: {$appProcessStatusReadableStore}
				</div>
			{/if}
		</div>
		<div class="flex justify-center">
			<span class="bottom-info-item">Audio cutter v.0.0.1</span>
			<span class="bottom-info-item">Supported extensions: {audioExtensions.join(', ')}</span>
		</div>
	</div>
</footer>

<style>
	#bottom-info {
		margin-top: 3rem;
		margin-left: 1rem;
		margin-right: 1rem;
		margin-bottom: 2rem;
	}
	.bottom-info-item {
		margin: 0.3rem;
	}
</style>
