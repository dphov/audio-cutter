import adapter from '@sveltejs/adapter-static'; // <-- adapter-static replaces adapter-auto
import { vitePreprocess } from '@sveltejs/kit/vite';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: [vitePreprocess({})],

	kit: {
		// some settings for adapter-static:
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: 'index.html'
		})
	}
};

export default config;
