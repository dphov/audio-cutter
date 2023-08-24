<script lang="ts">
	import { Command } from '@tauri-apps/api/shell';
	import { open, save } from '@tauri-apps/api/dialog';
	import { downloadDir } from '@tauri-apps/api/path';
	import { readBinaryFile } from '@tauri-apps/api/fs';
	import { writeText } from '@tauri-apps/api/clipboard';
	import WaveSurfer from 'wavesurfer.js';
	import RegionsPlugin, { type Region } from 'wavesurfer.js/dist/plugins/regions.js';
	import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline';
	import CutIcon from '$lib/images/cut.svg';
	import PlayIcon from '$lib/images/play.svg';
	import PauseIcon from '$lib/images/pause.svg';
	import Hover from 'wavesurfer.js/dist/plugins/hover';
	import {
		appProcessStatusReadableStore,
		appProcessStatusWritableStore,
		lastCuttedFileStore,
		regionStore,
		regionStoreInitValue,
		volumeStore,
		playerStore
	} from './stores';
	import { onDestroy, tick } from 'svelte';
	import { get } from 'svelte/store';

	let loop = true;
	let minPxPerSecBindValue = 100;
	let volumeBindValue = 1;
	let ws: WaveSurfer;
	let wsRegions: RegionsPlugin;

	let url: string | null;
	let binaryAudio;

	const audioExtensions = ['flac', 'wav', 'mp3', 'aac'];
	function getComputedStyle(varName: string): string {
		return (window.getComputedStyle(document.documentElement as any) as any).getPropertyValue(
			varName
		);
	}
	let text = getComputedStyle('--text');
	let background = getComputedStyle('--background');
	let primary = getComputedStyle('--primary');
	let secondary = getComputedStyle('--secondary');
	let accent = getComputedStyle('--accent');
	let cPlayedSection = getComputedStyle('--played-section');
	let cUnplayedSection = getComputedStyle('--unplayed-section');
	let cHoverOnWaveBar = getComputedStyle('--hover-on-wave-bar');
	let cSelectedRegion = getComputedStyle('--selected-region');
	let filename: string;

	async function createWaveSurfer(url: string) {
		/* read data into a Uint8Array */
		console.log('Begin blob reading');
		appProcessStatusWritableStore.set('Reading file...');

		binaryAudio = await readBinaryFile(url);
		appProcessStatusWritableStore.set('Reading is done.');

		console.log('Blob reading is done');

		if (ws !== undefined) {
			ws.destroy();
			regionStore.update((value) => {
				value.start = 0;
				value.end = 0;
				return value;
			});
		}

		const bottomTimeline = TimelinePlugin.create({
			height: 28,
			timeInterval: 1,
			primaryLabelInterval: 1,
			style: {
				fontSize: '12px',
				color: text
			}
		});
		const hover = Hover.create({
			lineColor: cHoverOnWaveBar,
			lineWidth: 2,
			labelBackground: background,
			labelColor: text,
			labelSize: '11px'
		});

		ws = WaveSurfer.create({
			container: '#waveform',
			waveColor: cUnplayedSection,
			progressColor: cPlayedSection,
			plugins: [bottomTimeline, hover],
			minPxPerSec: minPxPerSecBindValue
		});
		ws.getMediaElement().preload = 'auto';

		setTimeout(() => appProcessStatusWritableStore.set('😉'), 2000);
		await ws.loadBlob(new Blob([binaryAudio.buffer]));

		ws.on('load', (url) => {
			console.log('Load', url);
		});
		ws.on('loading', (percent) => {
			console.log('Loading', percent + '%');
		});
		/** When audio starts loading */
		ws.on('load', (url) => {
			console.log('Load', url);
		});

		/** During audio loading */
		ws.on('loading', (percent) => {
			console.log('Loading', percent + '%');
		});

		ws.once('decode', () => {
			console.log(ws);
		});
		/** When the audio has been decoded */
		ws.on('decode', (duration) => {
			console.log('Decode', duration + 's');
		});

		/** When the audio is both decoded and can play */
		ws.on('ready', (duration) => {
			console.log('Ready', duration + 's');
		});

		/** When a waveform is drawn */
		ws.on('redraw', () => {
			console.log('Redraw');
		});

		/** When the audio starts playing */
		ws.on('play', () => {
			appProcessStatusWritableStore.set('Playing.');
			playerStore.update((store) => ({ ...store, play: true }));
			console.log('Play');
		});

		/** When the audio pauses */
		ws.on('pause', () => {
			appProcessStatusWritableStore.set('Paused.');
			playerStore.update((store) => ({ ...store, play: false }));
			console.log('Pause');
		});

		ws.on('finish', () => {
			console.log('Finish');
			playerStore.update((store) => ({ ...store, play: false }));
			appProcessStatusWritableStore.set('Stopped.');
		});
		let timePrev;
		/** On audio position change, fires continuously during playback */
		ws.on('timeupdate', (currentTime) => {
			console.log('Time', currentTime + 's');
			if (currentTime === timePrev) {
				appProcessStatusWritableStore.set('Audio is buffering for play...');
			} else {
				appProcessStatusWritableStore.set('Playing audio.');
			}
			timePrev = currentTime;
		});

		/** When the user interacts with the waveform (i.g. clicks or drags on it) */
		ws.on('interaction', (newTime) => {
			activeRegion = null;

			console.log('Interaction', newTime + 's');
		});

		/** When the zoom level changes */
		ws.on('zoom', (minPxPerSecBindValue) => {
			console.log('Zoom', minPxPerSecBindValue + 'px/s');
		});

		/** Just before the waveform is destroyed so you can clean up your events */
		ws.on('destroy', () => {
			console.log('Destroy');
		});

		ws.on('seeking', (so) => {
			console.log('Seeking', so);
		});

		wsRegions = ws.registerPlugin(RegionsPlugin.create());

		wsRegions.on('region-created', (region) => {
			wsRegions.getRegions().forEach((r) => {
				if (r.id !== region.id) {
					r.remove();
				}
			});
			regionStore.update((value) => {
				value.start = region.start;
				value.end = region.end;
				return value;
			});
		});
		wsRegions.on('region-updated', (region) => {
			console.log('Updated region', region);
			regionStore.update((value) => {
				value.start = region.start;
				value.end = region.end;
				return value;
			});
		});

		wsRegions.enableDragSelection({
			color: cSelectedRegion
		});

		let activeRegion: Region | null = null;
		wsRegions.on('region-in', (region) => {
			activeRegion = region;
		});

		wsRegions.on('region-out', (region) => {
			if (activeRegion === region) {
				if (loop) {
					region.play();
				} else {
					activeRegion = null;
				}
			}
		});

		wsRegions.on('region-clicked', (region: Region, e: Event) => {
			e.stopPropagation();
			activeRegion = region;
			region.play();
		});
	}

	$: audioLoaded = null;

	function playPauseUI() {
		if (!ws.isPlaying()) {
			playerStore.update((store) => ({ ...store, play: true }));
			ws.playPause();
			tick();
		} else {
			playerStore.update((store) => ({ ...store, play: false }));
			ws.playPause();
			tick();
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
		const args = ['-i', `${url}`, '-ss', `${start}`, '-to', `${end}`, '-c', 'copy', filePathToSave];

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

	async function loadAudio() {
		if (ws !== undefined) ws.pause();

		let oldUrl = url;
		url = (await open({
			multiple: false,
			filters: [{ name: 'Audio', extensions: audioExtensions }],
			directory: false,
			defaultPath: await downloadDir()
		})) as string | null;
		audioLoaded = false;
		if (url === null) {
			//user canceled selection
			url = oldUrl;
			if (oldUrl == null) {
				audioLoaded = null;
			} else {
				audioLoaded = true;
			}
			return;
		}
		filename = url.split('/').pop() as string;

		lastCuttedFileStore.set('');
		appProcessStatusWritableStore.set('Loading...');

		await createWaveSurfer(url as string);
		audioLoaded = true;
	}

	const unsubscribe = appProcessStatusReadableStore.subscribe((value) => {
		console.log('storeupdate', value);
	});

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

	onDestroy(unsubscribe);
</script>

<svelte:head>
	<title>Choose your audio file</title>
	<meta name="description" content="start page" />
</svelte:head>

<section class="min-h-100vh flex-column flex justify-center">
	<div id="waveform-container">
		{#if audioLoaded === true}
			<div id="filename-text" class="flex">
				<div class="self-left">
					{filename}
				</div>
				<br />
			</div>
		{/if}
		<div class={audioLoaded ? '' : 'hidden'} id="waveform" />
	</div>
	{#if audioLoaded}
		<div class="margin-05rem flex-column flex items-center justify-center">
			<div>
				<div id="media-buttons-container" class="flex justify-center">
					{#if $playerStore.play}
						<button
							on:click={() => playPauseUI()}
							title="Pause"
							class="rounded-corners controls-button"
							><div class="svg-white-mono">
								<PauseIcon width={44} height={44} />
							</div>
						</button>
					{:else}
						<button
							on:click={() => playPauseUI()}
							title="Play"
							class="rounded-corners controls-button"
							><div class="svg-white-mono">
								<PlayIcon width={44} height={44} />
							</div>
						</button>
					{/if}
					<button
						class="rounded-corners controls-button"
						title="Cut"
						on:click={() => cutAudio(get(regionStore).start, get(regionStore).end, url)}
						><div class="svg-white-mono">
							<CutIcon width={50} height={44} />
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
	{/if}
	{#if $appProcessStatusReadableStore !== 'Reading file...'}
		<div class="flex items-center justify-center">
			<button class="regular-button" title="Select audio file" on:click={() => loadAudio()}>
				{#if audioLoaded === null}
					Load audio file
				{:else}
					Change audio file
				{/if}
			</button>
		</div>
	{/if}
	<footer class="footer-margin flex-column flex items-center justify-center">
		<div id="bottom-info">
			{#if $lastCuttedFileStore.length > 0}
				<a class="bottom-info-item" on:click={() => writeText($lastCuttedFileStore)}>
					(Click to copy in clipboard)<br /></a
				>
				<a class="bottom-info-item">Cut saved here: {$lastCuttedFileStore}</a>
			{/if}
			<div class="bottom-info-item" id="status-line">Status: {$appProcessStatusReadableStore}</div>
			<span class="bottom-info-item">Audio cutter v.0.0.1</span>
			<span class="bottom-info-item">Supported extensions: {audioExtensions.join(', ')}</span>
		</div>
	</footer>
</section>

<style>
	#waveform-container {
	}
	#filename-text {
		margin: 0.1rem 1rem;
	}
	#waveform {
		margin: 0.1rem 1rem;
		background-color: #333;
		border: 1px solid;
		border-color: black;
	}
	#scroll-elements-container {
		padding: 0.4rem;
	}
	.rounded-corners {
		border-radius: 6px;
	}
	.svg-white-mono {
		filter: invert(100%) sepia(0%) saturate(7480%) hue-rotate(100deg) brightness(106%) contrast(98%);
	}
	.title-margin {
		margin: 0.5rem;
	}
	.footer-margin {
		margin-top: 0.5rem;
		margin-bottom: 0.3rem;
	}
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
