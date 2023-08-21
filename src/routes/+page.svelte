<script>
	import { goto } from '$app/navigation';
	import { exit } from '@tauri-apps/api/process';
	const routes = ['start'];

	const supportedExtensions = ['mp3'];

	import { listen } from '@tauri-apps/api/event';

	listen('tauri://file-drop', (event) => {
		console.log(event);
		goto('/start');
	});
</script>

<svelte:head>
	<title>Home</title>
	<meta name="description" content="home page" />
</svelte:head>

<section class="">
	<p class="">Audio cutter v.0.0.1</p>
	<p>Supported extensions: {supportedExtensions}</p>
	<div class="">
		{#each routes as route}
			<a href="/{route}" role="button" title={route}>{route}</a>
		{/each}
		<button
			class=""
			title="Exit"
			on:click={() => {
				exit(0);
			}}>Exit</button
		>
	</div>
</section>
