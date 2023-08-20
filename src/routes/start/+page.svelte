<script lang="ts">
	import { Command } from '@tauri-apps/api/shell';
	import { open } from '@tauri-apps/api/dialog';
	import { downloadDir } from '@tauri-apps/api/path';
	import { readBinaryFile } from '@tauri-apps/api/fs';
	import WaveSurfer from 'wavesurfer.js';
	import RegionsPlugin, { type Region } from 'wavesurfer.js/dist/plugins/regions.js';
	import MinimapPlugin from 'wavesurfer.js/dist/plugins/minimap';
	import { fade } from 'svelte/transition';
	import { info, debug, error } from 'tauri-plugin-log-api';
	let loop = true;
	let minPxPerSec = 10;
	let ws: WaveSurfer;
	let wsRegions: RegionsPlugin;
	let regionBegin = 0;
	let regionEnd = 0;
	let url;
	let binaryFile;
	async function createWaveSurfer(url: string) {
		/* read data into a Uint8Array */
		binaryFile = await readBinaryFile(url);
		if (ws !== undefined) {
			ws.destroy();
			regionBegin = 0;
			regionEnd = 0;
		}
		ws = WaveSurfer.create({
			container: '#waveform',
			waveColor: 'rgb(200, 0, 200)',
			progressColor: 'rgb(100, 0, 100)',
			plugins: [
				MinimapPlugin.create({
					height: 20,
					waveColor: '#ddd',
					progressColor: '#999'
				})
			]
		});
		await ws.loadBlob(new Blob([binaryFile.buffer]));

		wsRegions = ws.registerPlugin(RegionsPlugin.create());

		const random = (min, max) => Math.random() * (max - min) + min;
		const randomColor = () => `rgba(${random(0, 255)}, ${random(0, 255)}, ${random(0, 255)}, 0.5)`;

		//		ws.on('decode', () => {
		//		});
		wsRegions.on('region-created', (region) => {
			wsRegions.getRegions().forEach((r) => {
				if (r.id !== region.id) {
					r.remove();
				}
			});
			regionBegin = region.start;
			regionEnd = region.end;
		});
		wsRegions.on('region-updated', (region) => {
			console.log('Updated region', region);
			regionBegin = region.start;
			regionEnd = region.end;
		});

		wsRegions.enableDragSelection({
			color: 'rgba(255, 0, 0, 0.1)'
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
			region.setOptions({ color: randomColor() });
		});

		ws.on('interaction', () => {
			activeRegion = null;
		});

		ws.once('decode', () => {
			ws.zoom(minPxPerSec);
		});
	}
	// // Update the zoom level on slider change
	// function updateZoom(e: Event) {
	// 	minPxPerSec = Number(e.target.value);
	// 	ws.zoom(minPxPerSec);
	// }

	let showControls = false;
	async function cutAudio(start: number, end: number, url: string) {
		if (start > end || start === end) {
			debug(`cannot cut not valid interval start: ${start} end: ${end}`);
			return;
		}

		const urlSplitted = url.split('.');
		const extension = urlSplitted.pop();
		const outputUrl = `${urlSplitted.join('.')}.${Date.now()}-cut.${extension}`;
		const args = ['-i', `${url}`, '-ss', `${start}`, '-to', `${end}`, '-c', 'copy', outputUrl];
		debug(`ffmpeg args: ${args}`);

		const ffmpeg = Command.sidecar('binaries/ffmpeg', args);
		const output = await ffmpeg.execute();

		debug(`ffmpeg output info : ${output}`);

		if (output.code !== 0) {
			error(`ffmpeg error: ${output.stderr}`);
		}

		info(`was written to path ${outputUrl}`);
	}

	async function loadAudio() {
		const extensions = ['flac', 'wav', 'mp3', 'aac'];
		url = await open({
			multiple: false,
			filters: [{ name: 'Audio', extensions }],
			directory: false,
			defaultPath: await downloadDir()
		});

		if (url === null) {
			//user canceled
			return;
		}
		await createWaveSurfer(url as string);
		console.log('selectedAudioFileUrl', url);
		showControls = true;
	}
</script>

<svelte:head>
	<title>Choose your audio file</title>
	<meta name="description" content="start page" />
</svelte:head>

<section>
	<h1 class="title">Choose audio file</h1>
	<div id="waveform" transition:fade />
	{#if showControls}
		<button on:click={() => ws.playPause()}>Start/Pause</button>
		<label>Loop <input type="checkbox" bind:checked={loop} /></label>
		<input type="number" bind:value={regionBegin} />
		<input type="number" bind:value={regionEnd} />
		<button on:click={() => cutAudio(regionBegin, regionEnd, url)}>Cut</button>
	{/if}
	<button on:click={() => loadAudio()}> Load audio </button>
	<div class="">
		<a href="/" role="button" class="">Go to menu</a>
	</div>
</section>

<style>
	.title {
		border: 1px solid;
	}
</style>
