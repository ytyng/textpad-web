<script lang="ts">
	import { goto } from '$app/navigation';
	import textpadStore from '$lib/stores/textpad.svelte';
	import { toast } from 'svelte-sonner';

	const formatDate = (timestamp: number): string => {
		const date = new Date(timestamp);
		return date.toLocaleString('ja-JP', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		});
	};

	const handleOpen = (id: string) => {
		textpadStore.openFile(id);
		goto('/');
	};

	const handleDelete = (id: string, title: string) => {
		if (confirm(`Delete "${title}"?`)) {
			textpadStore.deleteFile(id);
			toast.success('File deleted');
		}
	};

	const sortedFiles = $derived(
		[...textpadStore.files].sort((a, b) => b.updatedAt - a.updatedAt)
	);
</script>

<div class="flex h-full flex-col bg-slate-800">
	<header class="flex items-center gap-2 bg-slate-700 px-3 py-2 text-slate-100">
		<a
			href="/"
			class="flex items-center gap-1 rounded px-2 py-1 hover:bg-slate-600"
			data-annotate="link-back"
			aria-label="Back"
		>
			<i class="bi bi-arrow-left text-xl"></i>
		</a>
		<h1 class="text-lg font-medium">Files</h1>
	</header>

	<main class="flex-1 overflow-auto p-3">
		{#if sortedFiles.length === 0}
			<div class="py-10 text-center text-slate-400">
				No files yet
			</div>
		{:else}
			<div class="flex flex-col gap-2">
				{#each sortedFiles as file (file.id)}
					<div
						class="flex items-center gap-2 rounded bg-slate-700 p-3"
						class:ring-2={file.id === textpadStore.currentFileId}
						class:ring-blue-500={file.id === textpadStore.currentFileId}
					>
						<button
							type="button"
							class="flex flex-1 flex-col items-start gap-1 text-left"
							onclick={() => handleOpen(file.id)}
							data-annotate="button-open-file"
						>
							<span class="font-medium text-slate-100">{file.title}</span>
							<span class="text-sm text-slate-400">{formatDate(file.updatedAt)}</span>
						</button>
						<button
							type="button"
							class="rounded p-2 text-slate-400 hover:bg-slate-600 hover:text-red-400"
							onclick={() => handleDelete(file.id, file.title)}
							data-annotate="button-delete-file"
							aria-label="Delete"
						>
							<i class="bi bi-trash"></i>
						</button>
					</div>
				{/each}
			</div>
		{/if}
	</main>
</div>
