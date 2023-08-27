import { readable, readonly, writable } from 'svelte/store';
import type { WaveSurferOptions } from 'wavesurfer.js';

const themeStoreInitValue = localStorage.getItem('themeStore') || 'light';
export const themeStore = writable(themeStoreInitValue);

export const appProcessStatusWritableStore = writable('');
export const appProcessStatusReadableStore = readonly(appProcessStatusWritableStore);
export const rootStore = writable({
    audioFilePath: ''
});

export const lastCuttedFileStore = writable('');

export const audioProcessingStore = writable('');

export const regionStoreInitValue: { start: number | null; end: number | null } = {
    start: null,
    end: null
};
export const regionStore = writable(regionStoreInitValue);

export const volumeStoreInitValue = { volume: 1, muted: false };
export const volumeStore = writable(volumeStoreInitValue);

export const playerStoreInitValue = { play: false };
export const playerStore = writable(playerStoreInitValue);

export const audioExtensions: string[] = ['flac', 'wav', 'mp3', 'aac'];

export const durationStore = writable('');
export const currentTimeStore = writable('');

