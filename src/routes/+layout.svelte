<script lang="ts">
	import './styles.css';

	import { themeStore } from './stores';
	import { onDestroy } from 'svelte';
	let themeName = '';
	const unsubscribe = themeStore.subscribe((value: string) => {
		themeName = value;
		localStorage.setItem('themeStore', value);
	});
	onDestroy(unsubscribe);
</script>

<div class="app" data-theme={themeName}>
	<main>
		<slot />
	</main>

	<footer />
</div>
