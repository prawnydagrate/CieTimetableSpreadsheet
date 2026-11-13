<script>
	import favicon from '#lib/assets/favicon.png';
	import Footer from '#lib/assets/Footer.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<title>ciett👌</title>
	<link rel="icon" href={favicon} />
</svelte:head>

<main>
	{@render children()}
</main>

<Footer />
