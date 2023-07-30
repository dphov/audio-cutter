/** @type {import('tailwindcss').Config} */
import daisyui from 'daisyui';
export default {
	mode: 'jit',
	content: ['./src/**/*.{js,ts,html,svelte}'],
	theme: {
		extend: {}
	},
	plugins: [daisyui]
};
