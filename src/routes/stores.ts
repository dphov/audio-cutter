import { readonly, writable } from 'svelte/store';

const themeStoreInitValue = localStorage.getItem('themeStore') || 'light';
export const themeStore = writable(themeStoreInitValue);

export const appProcessStatusWritableStore = writable('');
export const appProcessStatusReadableStore = readonly(appProcessStatusWritableStore);
export const rootStore = writable({
    audioFilePath: ''
});

export const lastCuttedFileStore = writable('');
