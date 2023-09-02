<script lang="ts">
	import type WaveSurfer from 'wavesurfer.js';
	import type RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js';
	import {
		appProcessStatusReadableStore,
		currentTimeStore,
		durationStore,
		currentFileUrlStore,
		isAudioSelectedStore
	} from './stores';
	import { onDestroy } from 'svelte';
	import Footer from '../components/Footer.svelte';
	import AudioCutterControls from '../components/AudioCutterControls.svelte';

	import { loadAudio } from './loadAudio';
	import { get } from 'svelte/store';
	import { createWaveSurfer } from './createWaveSurfer';
	let ws: WaveSurfer;
	let wsRegions: RegionsPlugin;
	let waveformDiv: HTMLElement;

	function formatTime(seconds: number) {
		if (seconds === undefined) return '0:00';
		let minutes = Math.floor(seconds / 60);
		let secs = Math.floor(seconds % 60);

		return `${minutes}:${secs > 10 ? secs : `0${secs}`}`;
	}

	$: currentTime = '';
	$: duration = '';

	const unsubscribe = appProcessStatusReadableStore.subscribe((value) => {
		console.log('storeupdate', value);
	});

	const currentTimeStoreUnsubscribe = currentTimeStore.subscribe((v) => {
		currentTime = v;
	});
	const durationStoreUnsubscribe = durationStore.subscribe((v) => {
		duration = v;
	});

	onDestroy(currentTimeStoreUnsubscribe);
	onDestroy(durationStoreUnsubscribe);
	onDestroy(unsubscribe);
</script>

<svelte:head>
	<title>Choose your audio file</title>
	<meta name="description" content="start page" />
</svelte:head>

<section class="min-h-100vh flex-column flex justify-center">
	<div>
		{#if $isAudioSelectedStore === true}
			<div id="filename-text" class="flex justify-center">
				<div class="self-left">
					{get(currentFileUrlStore).split('/').pop()}
				</div>
				<br />
			</div>
		{/if}
		<div>
			<div id="waveform" class={$isAudioSelectedStore ? '' : 'hidden'} />

			<div class={currentTime || duration ? 'flex' : 'hidden'} id="time-and-duration">
				<div id="time">{formatTime(Number(currentTime))}</div>

				<div id="duration">{formatTime(Number(duration))}</div>
			</div>
		</div>
		{#if $isAudioSelectedStore === true}
			<AudioCutterControls {ws} {wsRegions} />
		{/if}
		{#if $appProcessStatusReadableStore !== 'Reading file...'}
			<div class="flex items-center justify-center">
				<button
					class="regular-button"
					title="Select audio file"
					on:click={async () => {
						const shouldLoadAudio = await loadAudio(ws);
						if (!shouldLoadAudio) {
							return;
						}
						let wsAndWsRegions = await createWaveSurfer(ws, wsRegions);
						ws = wsAndWsRegions.ws;
						wsRegions = wsAndWsRegions.wsRegions;
						isAudioSelectedStore.set(true);
					}}
				>
					{#if $isAudioSelectedStore === null}
						Load audio file
					{:else}
						Change audio file
					{/if}
				</button>
			</div>
		{/if}
		<Footer />
	</div>
</section>

<style>
	#time-and-duration {
		justify-content: space-between;
		margin-left: 1rem;
		margin-right: 1rem;
	}
	#time,
	#duration {
		font-size: 11px;
		background: rgba(0, 0, 0, 0.75);
		padding: 2px;
		color: #ddd;
	}
	#filename-text {
		font-size: large;
		margin: 0.1rem 1rem;
	}
	#waveform {
		overflow: scroll;
		margin-top: 0.5rem;
		margin-left: 1rem;
		margin-right: 1rem;
		background-color: #333;
		border: 1px solid;
		border-color: black;
	}
</style>
