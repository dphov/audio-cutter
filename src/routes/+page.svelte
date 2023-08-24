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
		regionStoreInitValue
	} from './stores';
	import { onDestroy } from 'svelte';
	import { get } from 'svelte/store';
	let loop = true;
	let minPxPerSec = 100;
	let ws: WaveSurfer;
	let wsRegions: RegionsPlugin;
	let regionBegin = 0;
	let regionEnd = 0;
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
			regionBegin = 0;
			regionEnd = 0;
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

		let audioNode;
		// await new Promise((resolve) => {
		// 	const reader = new FileReader();
		// 	reader.onload = (e: ProgressEvent) => {
		// 		appProcessStatusWritableStore.set('Processing file...');
		//
		// 		const arrayBuffer = (e.target as FileReader).result as ArrayBuffer;
		// 		const srcUrl = URL.createObjectURL(new Blob([arrayBuffer]));
		// 		audioNode = new Audio(srcUrl);
		// 	};
		// 	reader.readAsArrayBuffer(new Blob([binaryAudio.buffer]));
		// 	reader.onloadend = (e) => {
		// 		ws = WaveSurfer.create({
		// 			container: '#waveform',
		// 			waveColor: cUnplayedSection,
		// 			progressColor: cPlayedSection,
		// 			plugins: [bottomTimeline, hover],
		// 			minPxPerSec,
		// 			media: audioNode
		// 		});
		// 		appProcessStatusWritableStore.set('Audio file is ready.');
		//
		// 		resolve(reader.result);
		// 	};
		// });
		ws = WaveSurfer.create({
			container: '#waveform',
			waveColor: cUnplayedSection,
			progressColor: cPlayedSection,
			plugins: [bottomTimeline, hover]
		});
		setTimeout(() => appProcessStatusWritableStore.set('😉'), 2000);

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
			console.log('Play');
		});

		/** When the audio pauses */
		ws.on('pause', () => {
			appProcessStatusWritableStore.set('Paused.');
			console.log('Pause');
		});

		ws.on('finish', () => {
			console.log('Finish');

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
		ws.on('zoom', (minPxPerSec) => {
			ws.zoom(minPxPerSec);

			console.log('Zoom', minPxPerSec + 'px/s');
		});

		/** Just before the waveform is destroyed so you can clean up your events */
		ws.on('destroy', () => {
			console.log('Destroy');
		});

		ws.on('seeking', (so) => {
			console.log('Seeking', so);
		});

		await ws.loadBlob(new Blob([binaryAudio.buffer]));
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
			isAudioPlaying();
		});
	}

	function updateZoom(e: WheelEvent) {
		e.stopPropagation();
		console.log('updateZoom', e.deltaY * -0.01);
		minPxPerSec += e.deltaY * -0.01;
		minPxPerSec = Math.min(500, Math.max(minPxPerSec, 10));
		ws.zoom(minPxPerSec);
	}

	$: isAudioPlaying = () => {
		if (ws == null) {
			return false;
		} else {
			return !ws.getMediaElement().paused || false;
		}
	};
	$: audioLoaded = null;

	function playPauseUI() {
		if (ws.getMediaElement().paused) {
			ws.play();
			isAudioPlaying();
		} else {
			ws.pause();
			isAudioPlaying();
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
	}); // logs '0'
	onDestroy(unsubscribe);
</script>

<svelte:head>
	<title>Choose your audio file</title>
	<meta name="description" content="start page" />
</svelte:head>

<section class="min-h-100vh flex-column flex justify-center">
	{#if audioLoaded === true}
		<div class="flex">
			<div class="self-left">
				{filename}
			</div>
			<br />
		</div>
	{/if}
	<div id="waveform-container">
		<div class={audioLoaded ? '' : 'hidden'} id="waveform" />
	</div>
	{#if audioLoaded}
		<div class="margin-05rem flex-column flex items-center justify-center">
			<div>
				{#if isAudioPlaying()}
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
	{#if $appProcessStatusReadableStore === 'Reading file...'}{:else}
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
	<!-- {#if audioLoaded === null} -->
	<!-- {/if} -->
	<footer class="footer-margin flex-column flex items-center justify-center">
		<div id="bottom-info">
			{#if $lastCuttedFileStore.length > 0}
				<a class="bottom-info-item" on:click={() => writeText($lastCuttedFileStore)}>
					Cut saved here: {$lastCuttedFileStore}
				</a>
			{/if}
			<div class="bottom-info-item" id="status-line">Status: {$appProcessStatusReadableStore}</div>
			<span class="bottom-info-item">Audio cutter v.0.0.1</span>
			<span class="bottom-info-item">Supported extensions: {audioExtensions.join(', ')}</span>
		</div>
	</footer>
</section>

<style>
	#waveform-container {
		margin: 1rem;
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
