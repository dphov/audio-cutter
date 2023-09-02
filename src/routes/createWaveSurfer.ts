import { readBinaryFile } from '@tauri-apps/api/fs';
import {
    playerStore,
    durationStore,
    regionStore,
    appProcessStatusWritableStore,
    currentTimeStore,
    currentFileUrlStore,
    regionLoopStore
} from './stores';
import { get } from 'svelte/store';
import RegionsPlugin, { type Region } from 'wavesurfer.js/dist/plugins/regions.js';
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline';
import Hover from 'wavesurfer.js/dist/plugins/hover';
import WaveSurfer from 'wavesurfer.js';

export async function createWaveSurfer(ws: WaveSurfer, wsRegions: RegionsPlugin) {
    /* read data into a Uint8Array */
    console.log('Begin blob reading');

    appProcessStatusWritableStore.set('Reading file...');

    const binaryAudio = await readBinaryFile(get(currentFileUrlStore));
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
            color: 'var(--text)'
        }
    });
    const hover = Hover.create({
        lineColor: 'var(--hover-on-wave-bar)',
        lineWidth: 2,
        labelBackground: 'var(--background)',
        labelColor: 'var(--text)',
        labelSize: '11px'
    });

    ws = WaveSurfer.create({
        container: '#waveform',
        waveColor: 'var(--unplayed-section)',
        progressColor: 'var(--played-section)',
        plugins: [bottomTimeline, hover],
        minPxPerSec: 100
    });
    ws.getMediaElement().preload = 'auto';

    ws.getMediaElement().onloadedmetadata = () => {
        durationStore.set(String(ws.getMediaElement().duration));
    };

    setTimeout(() => appProcessStatusWritableStore.set('😉'), 2000);
    await ws.loadBlob(new Blob([binaryAudio.buffer]));

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

    /** On audio position change, fires continuously during playback */
    ws.on('timeupdate', (currentTime) => {
        currentTimeStore.set(String(currentTime));
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
        color: 'var(--selected-region)'
    });

    let activeRegion: Region | null = null;

    wsRegions.on('region-in', (region) => {
        activeRegion = region;
    });

    wsRegions.on('region-out', (region) => {
        if (activeRegion === region) {
            if (get(regionLoopStore)) {
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

    return { ws, wsRegions };
}
