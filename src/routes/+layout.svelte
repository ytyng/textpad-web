<script lang="ts">
	import './layout.css';
	import { Toaster } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import textpadStore from '$lib/stores/textpad.svelte';

	let { children } = $props();

	onMount(() => {
		textpadStore.initialize();
	});
</script>

<svelte:head>
	<title>Textpad</title>
</svelte:head>

{@render children()}

<Toaster richColors duration={5000} />
