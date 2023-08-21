import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import svelteSVG from 'vite-plugin-svelte-svg';
export default defineConfig({
    clearScreen: false,
    envPrefix: ['VITE_', 'TAURI_'],
    plugins: [
        sveltekit(),
        svelteSVG({
            svgoConfig: {}, // See https://github.com/svg/svgo#configuration
            requireSuffix: false // Set false to accept '.svg' without the '?component'
        })
    ],

    test: {
        include: ['src/**/*.{test,spec}.{js,ts}']
    }
});
