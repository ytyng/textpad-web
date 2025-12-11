<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import jsQR from 'jsqr';
	import textpadStore from '$lib/stores/textpad.svelte';
	import { toast } from 'svelte-sonner';

	let canvas: HTMLCanvasElement;
	let video: HTMLVideoElement | null = null;
	let scanning = $state(false);
	let message = $state('Press start to scan QR code');
	let scannedData = $state('');
	let animationFrameId: number | null = null;

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

	const copyToClipboard = async () => {
		await navigator.clipboard.writeText(scannedData);
		toast.success('Copied to clipboard');
	};

	const useAsText = () => {
		textpadStore.setContent(scannedData);
		toast.success('Set as text content');
		goto('/');
	};

	onDestroy(() => {
		stopScan();
	});
</script>

<div class="flex h-full flex-col bg-slate-900">
	<header class="flex items-center gap-2 bg-slate-700 px-3 py-2 text-slate-100">
		<a
			href="/"
			class="flex items-center gap-1 rounded px-2 py-1 hover:bg-slate-600"
			data-annotate="link-back"
			aria-label="Back"
		>
			<i class="bi bi-arrow-left text-xl"></i>
		</a>
		<h1 class="text-lg font-medium">QR Scan</h1>
	</header>

	<main class="flex flex-1 flex-col items-center overflow-auto p-3">
		<div class="w-full max-w-lg">
			<canvas
				bind:this={canvas}
				class="w-full rounded bg-black"
			></canvas>
		</div>

		<div class="mt-4 text-slate-300">{message}</div>

		{#if scannedData}
			<div class="mt-4 w-full max-w-lg rounded bg-slate-800 p-3">
				<pre class="whitespace-pre-wrap break-all text-slate-100">{scannedData}</pre>
				<div class="mt-3 flex gap-2">
					<button
						type="button"
						class="flex-1 rounded bg-slate-700 px-4 py-2 text-slate-100 hover:bg-slate-600"
						onclick={copyToClipboard}
						data-annotate="button-copy"
					>
						<i class="bi bi-clipboard"></i> Copy
					</button>
					<button
						type="button"
						class="flex-1 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500"
						onclick={useAsText}
						data-annotate="button-use-text"
					>
						<i class="bi bi-file-text"></i> Use
					</button>
				</div>
			</div>
		{/if}

		<div class="mt-4 w-full max-w-lg">
			{#if scanning}
				<button
					type="button"
					class="w-full rounded bg-red-600 px-4 py-3 text-white hover:bg-red-500"
					onclick={stopScan}
					data-annotate="button-stop-scan"
				>
					Stop
				</button>
			{:else}
				<button
					type="button"
					class="w-full rounded bg-slate-700 px-4 py-3 text-slate-100 hover:bg-slate-600"
					onclick={startScan}
					data-annotate="button-start-scan"
				>
					Start Scan
				</button>
			{/if}
		</div>
	</main>
</div>
