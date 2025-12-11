<script lang="ts">
	import textpadStore from '$lib/stores/textpad.svelte';
	import { toast } from 'svelte-sonner';
	import QrCreateModal from '$lib/components/QrCreateModal.svelte';
	import QrScanModal from '$lib/components/QrScanModal.svelte';

	let showQrCreate = $state(false);
	let showQrScan = $state(false);

	const handleInput = (e: Event) => {
		const target = e.target as HTMLTextAreaElement;
		textpadStore.updateContent(target.value);
	};

	const handleNewFile = () => {
		textpadStore.createNewFile();
		toast.success('New file created');
	};

	const handleScanned = (data: string) => {
		textpadStore.setContent(data);
	};
</script>

<div class="flex h-[max(60vh,calc(100vh-300px))] flex-col">
	<header class="flex items-center gap-1 bg-slate-700 px-2 py-1 text-slate-100">
		<button
			type="button"
			class="flex flex-col items-center rounded px-2 py-1 hover:bg-slate-600"
			onclick={handleNewFile}
			data-annotate="button-new-file"
		>
			<i class="bi bi-file-plus text-lg"></i>
			<span class="text-[10px]">New</span>
		</button>
		<a
			href="/files"
			class="flex flex-col items-center rounded px-2 py-1 hover:bg-slate-600"
			data-annotate="link-file-list"
		>
			<i class="bi bi-folder2-open text-lg"></i>
			<span class="text-[10px]">Files</span>
		</a>
		<button
			type="button"
			class="flex flex-col items-center rounded px-2 py-1 hover:bg-slate-600"
			onclick={() => (showQrScan = true)}
			data-annotate="button-qr-scan"
		>
			<i class="bi bi-qr-code-scan text-lg"></i>
			<span class="text-[10px]">Scan</span>
		</button>
		<button
			type="button"
			class="flex flex-col items-center rounded px-2 py-1 hover:bg-slate-600"
			onclick={() => (showQrCreate = true)}
			data-annotate="button-qr-create"
		>
			<i class="bi bi-qr-code text-lg"></i>
			<span class="text-[10px]">Create</span>
		</button>
		<div class="flex-1"></div>
		<h1 class="text-sm font-medium">Textpad</h1>
	</header>

	<main class="flex-1 overflow-hidden">
		<textarea
			class="h-full w-full resize-none bg-neutral-900 p-2 text-base text-slate-100 outline-none font-mono"
			placeholder="Enter text here..."
			value={textpadStore.currentContent}
			oninput={handleInput}
			data-annotate="textarea-main"
		></textarea>
	</main>
</div>

{#if showQrCreate}
	<QrCreateModal content={textpadStore.currentContent} onclose={() => (showQrCreate = false)} />
{/if}

{#if showQrScan}
	<QrScanModal onscanned={handleScanned} onclose={() => (showQrScan = false)} />
{/if}
