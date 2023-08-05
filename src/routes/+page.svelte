<script>
	import { exit } from '@tauri-apps/api/process';
	const routes = ['start'];
</script>

<svelte:head>
	<title>Home</title>
	<meta name="description" content="home page" />
</svelte:head>

<section class="">
	<p class="">Welcome to Audio Cutter App!</p>
	<div class="">
		{#each routes as route}
			<a href="/{route}" role="button" class="">{route}</a>
		{/each}
		<button
			class=""
			on:click={() => {
				exit(0);
			}}>Exit</button
		>
	</div>
</section>
