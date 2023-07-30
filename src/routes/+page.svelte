<script>
	import { exit } from '@tauri-apps/api/process';
</script>

<svelte:head>
	<title>Home</title>
	<meta name="description" content="home page" />
</svelte:head>

<section class="grid h-screen place-items-center">
	<p class="text-black-100 mb-5 text-center text-3xl font-bold">Welcome to Karaoke App!</p>
	<div class="mx-auto flex flex-col items-center justify-center">
		<a href="/start" role="button" class="btn btn-outline btn-sm btn-wide mb-1 mt-1">Start</a>
		<a href="/about" role="button" class="btn btn-outline btn-sm btn-wide mb-1 mt-1">About</a>
		<button
			class="btn btn-outline btn-sm btn-wide mb-1 mt-1"
			on:click={() => {
				exit(0);
			}}>Exit</button
		>
	</div>
</section>
