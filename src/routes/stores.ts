import { readonly, writable } from 'svelte/store';

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
