<script lang="ts">
	import { Command } from '@tauri-apps/api/shell';
	import { open } from '@tauri-apps/api/dialog';
	import { downloadDir } from '@tauri-apps/api/path';
	import { readBinaryFile } from '@tauri-apps/api/fs';
	import WaveSurfer from 'wavesurfer.js';
	import RegionsPlugin, { type Region } from 'wavesurfer.js/dist/plugins/regions.js';
	import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline';
	import CutIcon from '$lib/images/cut.svg';
	import RegionLoopIcon from '$lib/images/loop-region.svg';
	import PlayIcon from '$lib/images/play.svg';
	import PauseIcon from '$lib/images/pause.svg';
	import Hover from 'wavesurfer.js/dist/plugins/hover';
	let loop = true;
	let minPxPerSec = 100;
	let ws: WaveSurfer;
	let wsRegions: RegionsPlugin;
	let regionBegin = 0;
	let regionEnd = 0;
	let url: string | null;
	let filename: string;
	let binaryFile;

	async function createWaveSurfer(url: string) {
		/* read data into a Uint8Array */
		console.log('Begin reading');
		binaryFile = await readBinaryFile(url);
		console.log('Reading is done');
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
				color: '#6A3274'
			}
		});
		const hover = Hover.create({
			lineColor: '#ff0000',
			lineWidth: 2,
			labelBackground: '#555',
			labelColor: '#fff',
			labelSize: '11px'
		});
		ws = WaveSurfer.create({
			container: '#waveform',
			waveColor: 'rgb(200, 0, 200)',
			progressColor: 'rgb(100, 0, 100)',
			plugins: [bottomTimeline, hover],
			minPxPerSec
		});
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
			console.log('Play');
		});

		/** When the audio pauses */
		ws.on('pause', () => {
			console.log('Pause');
		});

		/** When the audio finishes playing */
		ws.on('finish', () => {
			console.log('Finish');
		});

		/** On audio position change, fires continuously during playback */
		ws.on('timeupdate', (currentTime) => {
			console.log('Time', currentTime + 's');
		});

		/** When the user seeks to a new position */
		ws.on('seeking', (currentTime) => {
			console.log('Seeking', currentTime + 's');
		});

		/** When the user interacts with the waveform (i.g. clicks or drags on it) */
		ws.on('interaction', (newTime) => {
			activeRegion = null;

			console.log('Interaction', newTime + 's');
		});

		/** When the user clicks on the waveform */
		ws.on('click', (relativeX) => {
			console.log('Click', relativeX);
		});

		/** When the user drags the cursor */
		ws.on('drag', (relativeX) => {
			console.log('Drag', relativeX);
		});

		/** When the waveform is scrolled (panned) */
		ws.on('scroll', (visibleStartTime, visibleEndTime) => {
			console.log('Scroll', visibleStartTime + 's', visibleEndTime + 's');
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

		await ws.loadBlob(new Blob([binaryFile.buffer]));
		wsRegions = ws.registerPlugin(RegionsPlugin.create());

		const random = (min: number, max: number) => Math.random() * (max - min) + min;
		const randomColor = () => `rgba(${random(0, 255)}, ${random(0, 255)}, ${random(0, 255)}, 0.5)`;

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
			isAudioPlaying();
			region.setOptions({ color: randomColor() });
		});
	}
	// // Update the zoom level on slider change
	function updateZoom(e: WheelEvent) {
		e.stopPropagation();
		console.log('updateZoom', e.deltaY * -0.01);
		minPxPerSec += e.deltaY * -0.01;
		minPxPerSec = Math.min(500, Math.max(minPxPerSec, 10));
		console.log(minPxPerSec);
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

	async function cutAudio(start: number, end: number, url: string) {
		if (start > end || start === end) {
			//		debug(`cannot cut not valid interval start: ${start} end: ${end}`);
			return;
		}
		console.log('url', url);
		const urlSplitted = url.split('.');
		const extension = urlSplitted.pop();
		const outputUrl = `${urlSplitted.join('.')}.${Date.now()}-cut.${extension}`;
		const args = ['-i', `${url}`, '-ss', `${start}`, '-to', `${end}`, '-c', 'copy', outputUrl];
		//	debug(`ffmpeg args: ${args}`);

		const ffmpeg = Command.sidecar('binaries/ffmpeg', args);
		const output = await ffmpeg.execute();

		console.log(`ffmpeg output info : ${JSON.stringify(output)}`);

		if (output.code !== 0) {
			//		error(`ffmpeg error: ${output.stderr}`);
		}

		//	info(`was written to path ${outputUrl}`);
	}
	async function loadAudio() {
		const extensions = ['flac', 'wav', 'mp3', 'aac'];
		let oldUrl = url;
		url = (await open({
			multiple: false,
			filters: [{ name: 'Audio', extensions }],
			directory: false,
			defaultPath: await downloadDir()
		})) as string | null;
		audioLoaded = false;
		if (url === null) {
			//user canceled
			url = oldUrl;
			if (oldUrl == null) {
				audioLoaded = null;
			} else {
				audioLoaded = true;
			}
			return;
		}
		filename = url.split('/').pop() as string;
		await createWaveSurfer(url as string);
		//ws.zoom(100);
		console.log('selectedAudioFileUrl', url);
		audioLoaded = true;
	}
</script>

<svelte:head>
	<title>Choose your audio file</title>
	<meta name="description" content="start page" />
</svelte:head>

<section class="min-h-100vh flex-column flex justify-center">
	{#if audioLoaded === true}
		<div class="self-left title-margin">{filename}</div>
	{:else if audioLoaded === false}
		<div class="self-center">Loading audio...</div>
	{/if}
	<div class={audioLoaded ? '' : 'hidden'} id="waveform" />
	{#if audioLoaded}
		<div class="margin-05rem flex-column flex items-center justify-center">
			<div>
				{#if isAudioPlaying()}
					<button on:click={() => playPauseUI()} title="Pause">
						<PauseIcon width={44} height={44} />
					</button>
				{:else}
					<button on:click={() => playPauseUI()} title="Play">
						<PlayIcon width={44} height={44} />
					</button>
				{/if}
				<button title="Cut" on:click={() => cutAudio(regionBegin, regionEnd, url)}
					><CutIcon />
				</button>
			</div>
			<label
				>Loop play on region <input
					title="Loop play on region"
					type="checkbox"
					bind:checked={loop}
				/>
				<!-- <RegionLoopIcon /> -->
			</label>
			<!-- <input type="number" bind:value={regionBegin} /> -->
			<!-- <input type="number" bind:value={regionEnd} /> -->
		</div>
	{/if}
	<!-- {#if audioLoaded === null} -->
	<!-- {/if} -->
	<footer class="footer-margin flex-column flex items-center justify-center">
		<div class="">
			<button title="Select audio file" on:click={() => loadAudio()}>
				{#if audioLoaded === null}
					Load audio file
				{:else}
					Change audio file
				{/if}
			</button>
		</div>
		<div id="bottom-info">
			<span class="bottom-info-item">Audio cutter v.0.0.1</span>
			<span class="bottom-info-item">Supported extensions: mp3</span>
		</div>
	</footer>
</section>

<style>
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
