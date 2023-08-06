<script lang="ts">
	import WaveSurfer from 'wavesurfer.js';
	import RegionsPlugin, { type Region } from 'wavesurfer.js/dist/plugins/regions.js';
	import MinimapPlugin from 'wavesurfer.js/dist/plugins/minimap';

	let loop = true;
	let minPxPerSec = 10;
	let ws: WaveSurfer;
	let wsRegions: RegionsPlugin;
	let regionBegin = 0;
	let regionEnd = 0;
	const createWaveSurfer = (url: string) => {
		// Create an instance of WaveSurfer
		ws = WaveSurfer.create({
			container: '#waveform',
			waveColor: 'rgb(200, 0, 200)',
			progressColor: 'rgb(100, 0, 100)',
			url,
			plugins: [
				MinimapPlugin.create({
					height: 20,
					waveColor: '#ddd',
					progressColor: '#999'
				})
			]
		});
		console.log(ws);
		// Initialize the Regions plugin
		wsRegions = ws.registerPlugin(RegionsPlugin.create());

		// Give regions a random color when they are created
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
	};
	// // Update the zoom level on slider change
	// function updateZoom(e: Event) {
	// 	minPxPerSec = Number(e.target.value);
	// 	ws.zoom(minPxPerSec);
	// }

	let files: FileList;
	$: files && createWaveSurfer(URL.createObjectURL(files[0]));
	$: wsRegions && console.log(wsRegions);

	function cutAudio(start: number, end: number) {
		console.log('cutAudio');
	}
</script>

<svelte:head>
	<title>Choose your audio file</title>
	<meta name="description" content="start page" />
</svelte:head>

<section>
	<h1 class="title">Choose audio file</h1>
	<div id="waveform" />
	{#if files && files[0]}
		<button on:click={() => ws.playPause()}>Start/Pause</button>
		<label>Loop <input type="checkbox" bind:checked={loop} /></label>
		<p>
			{files[0].name}
		</p>
		<input type="number" bind:value={regionBegin} />
		<input type="number" bind:value={regionEnd} />
		<button on:click={() => cutAudio(regionBegin, regionEnd)}>Cut</button>
	{/if}
	<input bind:files type="file" accept="audio/*" class="" />

	<div class="">
		<a href="/" role="button" class="">Go to menu</a>
	</div>
</section>

<style>
	.title {
		border: 1px solid;
	}
</style>
