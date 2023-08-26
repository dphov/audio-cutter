<script lang="ts">
	import { get } from 'svelte/store';
	import {
		playerStore,
		volumeStore,
		regionStore,
		appProcessStatusWritableStore,
		lastCuttedFileStore,
		regionStoreInitValue
	} from '../routes/stores';
	import CutIcon from '$lib/images/cut.svg';
	import PlayIcon from '$lib/images/play.svg';
	import PauseIcon from '$lib/images/pause.svg';
	import type WaveSurfer from 'wavesurfer.js';
	import { save } from '@tauri-apps/api/dialog';
	import { Command } from '@tauri-apps/api/shell';
	import type RegionsPlugin from 'wavesurfer.js/dist/plugins/regions';

	export let ws: WaveSurfer;
	export let wsRegions: RegionsPlugin;
	export let url: string;

	let loop = true;
	let minPxPerSecBindValue = 100;
	let volumeBindValue = 1;

	function playPauseUI() {
		if (!ws.isPlaying()) {
			playerStore.update((store) => ({ ...store, play: true }));
			ws.playPause();
		} else {
			playerStore.update((store) => ({ ...store, play: false }));
			ws.playPause();
		}
	}
	async function cutAudio(start: number, end: number, originalFileUrl: string) {
		if (start > end || start === end) {
			return;
		}

		const originalFileSplittedByDot = originalFileUrl.split('.');
		const originalFileExtension = originalFileSplittedByDot.pop() as string;
		const uniqueNameMetadataPart = `${Date.now()}-audio-cutter`;
		originalFileSplittedByDot.push(uniqueNameMetadataPart, originalFileExtension);
		const uniqueNameWithMetadataPath = originalFileSplittedByDot.join('.');

		const filePathToSave = await save({
			title: 'Saving file cut',
			defaultPath: uniqueNameWithMetadataPath
		});
		if (filePathToSave == null) return;

		appProcessStatusWritableStore.set('Cut in process ✂️📼');
		const args = [
			'-i',
			`${originalFileUrl}`,
			'-ss',
			`${start}`,
			'-to',
			`${end}`,
			'-c',
			'copy',
			filePathToSave
		];

		const ffmpeg = Command.sidecar('binaries/ffmpeg', args);
		const output = await ffmpeg.execute();

		console.log(`ffmpeg output info : ${JSON.stringify(output)}`);

		if (output.code !== 0) {
			appProcessStatusWritableStore.set(output.stderr);
		}
		lastCuttedFileStore.set(filePathToSave);
		appProcessStatusWritableStore.set('Cut saved ✅');
	}
	function focusOnRegion() {
		if (ws.getCurrentTime() === get(regionStore).start) return;
		ws.setTime(get(regionStore).start as number);
	}
	async function removeRegion() {
		wsRegions.clearRegions();
		regionStore.set(regionStoreInitValue);
	}

	const updateZoom = (e: Event) => {
		e.stopPropagation();
		const newZoom = e.target.valueAsNumber;
		ws.zoom(newZoom);
	};
	const updateVolume = (e: Event) => {
		e.stopPropagation();
		const newVolume = e.target.valueAsNumber;
		volumeStore.update((value) => ({ ...value, volume: newVolume }));
		ws.setVolume(get(volumeStore).volume);
	};
	const muteUnmute = (e: Event) => {
		e.stopPropagation();
		if (ws.getMuted()) {
			volumeStore.update((value) => ({ ...value, muted: false }));
		} else {
			volumeStore.update((value) => ({ ...value, muted: true }));
		}
		ws.setMuted(get(volumeStore).muted);
	};
</script>

<div class="margin-05rem flex-column flex items-center justify-center">
	<div>
		<div id="media-buttons-container" class="flex justify-center">
			{#if $playerStore.play}
				<button on:click={() => playPauseUI()} title="Pause" class="rounded-corners controls-button"
					><div class="svg-white-mono">
						<PauseIcon />
					</div>
				</button>
			{:else}
				<button on:click={() => playPauseUI()} title="Play" class="rounded-corners controls-button"
					><div class="svg-white-mono">
						<PlayIcon />
					</div>
				</button>
			{/if}
			<button
				class="rounded-corners controls-button"
				title="Cut"
				on:click={() => cutAudio(get(regionStore).start, get(regionStore).end, url)}
				><div class="svg-white-mono">
					<CutIcon />
				</div>
			</button>
		</div>
		<div id="scroll-elements-container" class="flex justify-center">
			<label style="margin: 0 0.3rem">
				Zoom: <input
					id="zoom-input"
					on:input={(e) => updateZoom(e)}
					type="range"
					min="100"
					max="2000"
					bind:value={minPxPerSecBindValue}
				/>
			</label>
			<div>
				<button class="regular-button" on:click={(e) => muteUnmute(e)}>
					{#if !$volumeStore.muted}
						Mute
					{:else}
						Unmute
					{/if}
				</button>
				<label style="margin: 0 0.3rem">
					Volume: <input
						id="volume-input"
						on:input={(e) => updateVolume(e)}
						type="range"
						min="0"
						max="1"
						step="0.1"
						bind:value={volumeBindValue}
					/>
				</label>
			</div>
		</div>
	</div>
	<div>
		<button class="regular-button" on:click={() => focusOnRegion()}>Focus on region</button>

		<button class="regular-button" on:click={() => removeRegion()}>Remove region</button>
		<label class="regular-button" for="loop-play-on-region-id"
			><input
				title="Loop play on region"
				type="checkbox"
				bind:checked={loop}
				id="loop-play-on-region-id"
			/>
			Loop play on region</label
		>
	</div>
</div>

<style>
	#scroll-elements-container {
		padding: 0.4rem;
	}
	.rounded-corners {
		border-radius: 6px;
	}
	.svg-white-mono {
		filter: invert(100%) sepia(0%) saturate(7480%) hue-rotate(100deg) brightness(106%) contrast(98%);
	}
</style>
