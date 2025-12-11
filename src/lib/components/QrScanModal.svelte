<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import jsQR from 'jsqr';
	import { toast } from 'svelte-sonner';

	interface Props {
		onscanned: (data: string) => void;
		onclose: () => void;
	}

	let { onscanned, onclose }: Props = $props();

	let dialog: HTMLDialogElement;
	let canvas: HTMLCanvasElement;
	let video: HTMLVideoElement | null = null;
	let scanning = $state(false);
	let message = $state('Starting camera...');
	let scannedData = $state('');
	let animationFrameId: number | null = null;

	onMount(() => {
		dialog.showModal();
		startScan();
	});

	onDestroy(() => {
		stopScan();
	});

	const startScan = async () => {
		scanning = true;
		message = 'Starting camera...';
		scannedData = '';

		video = document.createElement('video');
		video.setAttribute('playsinline', 'true');
		video.muted = true;
		video.autoplay = true;

		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: false,
				video: { facingMode: 'environment' }
			});
			video.srcObject = stream;
			await video.play();
			message = 'Scanning...';
			tick();
		} catch (err) {
			const error = err as Error;
			message = `Camera error: ${error.message}`;
			scanning = false;
		}
	};

	const stopScan = () => {
		scanning = false;
		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}
		if (video?.srcObject) {
			const stream = video.srcObject as MediaStream;
			stream.getTracks().forEach((track) => track.stop());
			video.srcObject = null;
		}
		video = null;
	};

	const tick = () => {
		if (!scanning || !video || !canvas) return;

		if (video.readyState === video.HAVE_ENOUGH_DATA) {
			canvas.height = video.videoHeight;
			canvas.width = video.videoWidth;
			const ctx = canvas.getContext('2d');
			if (ctx) {
				ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
				const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
				const code = jsQR(imageData.data, imageData.width, imageData.height, {
					inversionAttempts: 'dontInvert'
				});
				if (code) {
					message = 'QR code detected!';
					scannedData = code.data;
					drawRect(ctx, code.location);
					stopScan();
					return;
				}
			}
		}
		animationFrameId = requestAnimationFrame(tick);
	};

	const drawRect = (
		ctx: CanvasRenderingContext2D,
		location: {
			topLeftCorner: { x: number; y: number };
			topRightCorner: { x: number; y: number };
			bottomRightCorner: { x: number; y: number };
			bottomLeftCorner: { x: number; y: number };
		}
	) => {
		ctx.lineWidth = 4;
		ctx.strokeStyle = '#FF3B58';
		ctx.beginPath();
		ctx.moveTo(location.topLeftCorner.x, location.topLeftCorner.y);
		ctx.lineTo(location.topRightCorner.x, location.topRightCorner.y);
		ctx.lineTo(location.bottomRightCorner.x, location.bottomRightCorner.y);
		ctx.lineTo(location.bottomLeftCorner.x, location.bottomLeftCorner.y);
		ctx.closePath();
		ctx.stroke();
	};

	const handleDialogClose = () => {
		stopScan();
		onclose();
	};

	const handleUse = () => {
		onscanned(scannedData);
		dialog.close();
		toast.success('Scanned content applied');
	};

	const handleBackdropClick = (e: MouseEvent) => {
		if (e.target === dialog) {
			dialog.close();
		}
	};

	const handleRescan = () => {
		scannedData = '';
		startScan();
	};
</script>

<dialog
	bind:this={dialog}
	class="m-auto w-[90vw] max-w-md rounded-lg bg-slate-800 p-0 backdrop:bg-black/50"
	onclick={handleBackdropClick}
	onclose={handleDialogClose}
	data-annotate="dialog-qr-scan"
>
	<div class="flex flex-col p-4">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-lg font-medium text-slate-100">QR Scan</h2>
			<button
				type="button"
				class="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-slate-100"
				onclick={() => dialog.close()}
				data-annotate="button-close-qr-scan"
				aria-label="Close"
			>
				<i class="bi bi-x-lg"></i>
			</button>
		</div>

		<div class="overflow-hidden rounded bg-black">
			<canvas bind:this={canvas} class="w-full"></canvas>
		</div>

		<div class="mt-3 text-center text-sm text-slate-300">{message}</div>

		{#if scannedData}
			<div class="mt-3 rounded bg-slate-900 p-3">
				<pre class="max-h-32 overflow-auto whitespace-pre-wrap break-all text-sm text-slate-100">{scannedData}</pre>
			</div>
			<div class="mt-3 flex gap-2">
				<button
					type="button"
					class="flex-1 rounded bg-slate-700 px-4 py-2 text-slate-100 hover:bg-slate-600"
					onclick={handleRescan}
					data-annotate="button-rescan"
				>
					<i class="bi bi-arrow-repeat"></i> Rescan
				</button>
				<button
					type="button"
					class="flex-1 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500"
					onclick={handleUse}
					data-annotate="button-use-scanned"
				>
					<i class="bi bi-check-lg"></i> Use
				</button>
			</div>
		{:else if !scanning}
			<button
				type="button"
				class="mt-3 rounded bg-slate-700 px-4 py-2 text-slate-100 hover:bg-slate-600"
				onclick={startScan}
				data-annotate="button-retry-scan"
			>
				Retry
			</button>
		{/if}
	</div>
</dialog>
