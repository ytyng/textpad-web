<script lang="ts">
	import { onMount } from 'svelte';
	import QRCode from 'qrcode';
	import { toast } from 'svelte-sonner';

	interface Props {
		content: string;
		onclose: () => void;
	}

	let { content, onclose }: Props = $props();

	let dialog: HTMLDialogElement;
	let canvas: HTMLCanvasElement;
	let qrGenerated = $state(false);

	onMount(() => {
		dialog.showModal();
		if (content.trim()) {
			generateQR();
		}
	});

	const generateQR = async () => {
		if (!content.trim()) {
			toast.error('No content to generate QR code');
			return;
		}
		try {
			await QRCode.toCanvas(canvas, content, {
				width: 280,
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

	const downloadQR = () => {
		if (!canvas) return;
		const link = document.createElement('a');
		link.download = 'qrcode.png';
		link.href = canvas.toDataURL('image/png');
		link.click();
		toast.success('QR code downloaded');
	};

	const handleBackdropClick = (e: MouseEvent) => {
		if (e.target === dialog) {
			dialog.close();
		}
	};
</script>

<dialog
	bind:this={dialog}
	class="m-auto rounded-lg bg-slate-800 p-0 backdrop:bg-black/50"
	onclick={handleBackdropClick}
	onclose={onclose}
	data-annotate="dialog-qr-create"
>
	<div class="flex flex-col p-4">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-lg font-medium text-slate-100">QR Code</h2>
			<button
				type="button"
				class="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-slate-100"
				onclick={() => dialog.close()}
				data-annotate="button-close-qr-create"
				aria-label="Close"
			>
				<i class="bi bi-x-lg"></i>
			</button>
		</div>

		<div class="flex justify-center rounded bg-white p-3">
			<canvas bind:this={canvas} class="block"></canvas>
		</div>

		{#if !content.trim()}
			<p class="mt-4 text-center text-slate-400">No content to display</p>
		{/if}

		{#if qrGenerated}
			<button
				type="button"
				class="mt-4 rounded bg-slate-700 px-4 py-2 text-slate-100 hover:bg-slate-600"
				onclick={downloadQR}
				data-annotate="button-download-qr"
			>
				<i class="bi bi-download"></i> Download
			</button>
		{/if}
	</div>
</dialog>
