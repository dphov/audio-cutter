<script lang="ts">
	import { open } from '@tauri-apps/api/dialog';
	import { downloadDir } from '@tauri-apps/api/path';
	import { readBinaryFile } from '@tauri-apps/api/fs';
	import WaveSurfer from 'wavesurfer.js';
	import RegionsPlugin, { type Region } from 'wavesurfer.js/dist/plugins/regions.js';
	import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline';
	import Hover from 'wavesurfer.js/dist/plugins/hover';
	import {
		appProcessStatusReadableStore,
		appProcessStatusWritableStore,
		lastCuttedFileStore,
		regionStore,
		playerStore,
		audioExtensions
	} from './stores';
	import { onDestroy } from 'svelte';
	import Footer from '../components/Footer.svelte';
	import AudioCutterControls from '../components/AudioCutterControls.svelte';

	let loop = true;
	let ws: WaveSurfer;
	let wsRegions: RegionsPlugin;

	let url: string | null;
	let binaryAudio;

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
			minPxPerSec: 100
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

	onDestroy(unsubscribe);
</script>

<svelte:head>
	<title>Choose your audio file</title>
	<meta name="description" content="start page" />
</svelte:head>

<section class="min-h-100vh flex-column flex justify-center">
	<div id="waveform-container">
		{#if audioLoaded === true}
			<div id="filename-text" class="flex justify-center">
				<div class="self-left">
					{filename}
				</div>
				<br />
			</div>
		{/if}
		<div class={audioLoaded ? '' : 'hidden'} id="waveform" />
	</div>
	{#if audioLoaded}
		<AudioCutterControls {ws} {wsRegions} {url} />
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
	<Footer />
</section>

<style>
	#waveform-container {
	}
	#filename-text {
		font-size: large;
		margin: 0.1rem 1rem;
	}
	#waveform {
		margin-top: 0.5rem;
		margin-left: 1rem;
		margin-right: 1rem;
		background-color: #333;
		border: 1px solid;
		border-color: black;
	}
</style>
