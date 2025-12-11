<script lang="ts">
	import { onMount } from 'svelte';
	import QRCode from 'qrcode';
	import textpadStore from '$lib/stores/textpad.svelte';
	import { toast } from 'svelte-sonner';

	let canvas: HTMLCanvasElement;
	let inputText = $state('');
	let qrGenerated = $state(false);

	onMount(() => {
		inputText = textpadStore.currentContent;
		if (inputText) {
			generateQR();
		}
	});

	const generateQR = async () => {
		if (!inputText.trim()) {
			toast.error('Please enter text to generate QR code');
			return;
		}
		try {
			await QRCode.toCanvas(canvas, inputText, {
				width: 300,
				margin: 2,
				color: {
					dark: '#000000',
					light: '#ffffff'
				}
			});
			qrGenerated = true;
		} catch (err) {
			const error = err as Error;
			toast.error(`QR generation failed: ${error.message}`);
		}
	};

	const handleInput = (e: Event) => {
		const target = e.target as HTMLTextAreaElement;
		inputText = target.value;
	};

	const downloadQR = () => {
		if (!canvas) return;
		const link = document.createElement('a');
		link.download = 'qrcode.png';
		link.href = canvas.toDataURL('image/png');
		link.click();
		toast.success('QR code downloaded');
	};
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
		<h1 class="text-lg font-medium">QR Create</h1>
	</header>

	<main class="flex flex-1 flex-col items-center overflow-auto p-3">
		<div class="w-full max-w-lg">
			<label for="qr-content" class="mb-1 block text-sm text-slate-400">Content</label>
			<textarea
				id="qr-content"
				class="w-full rounded border border-slate-600 bg-slate-900 p-3 text-slate-100 outline-none focus:border-blue-500"
				rows="4"
				placeholder="Enter text to generate QR code..."
				value={inputText}
				oninput={handleInput}
				data-annotate="textarea-qr-content"
			></textarea>
		</div>

		<div class="mt-4">
			<button
				type="button"
				class="rounded bg-blue-600 px-6 py-2 text-white hover:bg-blue-500"
				onclick={generateQR}
				data-annotate="button-generate-qr"
			>
				Generate QR
			</button>
		</div>

		<div class="mt-6 rounded bg-white p-4">
			<canvas bind:this={canvas} class="block"></canvas>
		</div>

		{#if qrGenerated}
			<div class="mt-4">
				<button
					type="button"
					class="rounded bg-slate-700 px-6 py-2 text-slate-100 hover:bg-slate-600"
					onclick={downloadQR}
					data-annotate="button-download-qr"
				>
					<i class="bi bi-download"></i> Download
				</button>
			</div>
		{/if}
	</main>
</div>
