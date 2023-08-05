import { writable } from 'svelte/store';

let themeStoreInitValue = localStorage.getItem('themeStore') || 'light';
export const themeStore = writable(themeStoreInitValue);
