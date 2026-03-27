<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { toast } from 'svelte-sonner';
	import type {
		BarcodeFormat,
		BarcodeDetector as BarcodeDetectorType,
		Point2D
	} from 'barcode-detector/pure';

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
	let autoScan = $state(false);
	let animationFrameId: number | null = null;
	let detector: BarcodeDetectorType | null = null;
	let flashVisible = $state(false);
	let audioCtx: AudioContext | null = null;
	// Auto モード: 検出スロットル (500ms) + 成功後クールダウン (4s) + 同一コード抑制 (10s)
	let lastDetectAttempt = 0;
	let lastScanTime = 0;
	const recentScans: Map<string, number> = new Map(); // value → timestamp

	const BARCODE_FORMATS: BarcodeFormat[] = [
		'ean_13',
		'ean_8',
		'upc_a',
		'upc_e',
		'code_128',
		'code_39',
		'code_93',
		'itf',
		'codabar'
	];

	const FORMAT_LABELS: Record<string, string> = {
		ean_13: 'EAN-13',
		ean_8: 'EAN-8',
		upc_a: 'UPC-A',
		upc_e: 'UPC-E',
		code_128: 'Code 128',
		code_39: 'Code 39',
		code_93: 'Code 93',
		itf: 'ITF',
		codabar: 'Codabar'
	};

	const initDetector = async () => {
		if ('BarcodeDetector' in globalThis) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const NativeBarcodeDetector = (globalThis as any).BarcodeDetector;
			detector = new NativeBarcodeDetector({ formats: BARCODE_FORMATS });
		} else {
			const { BarcodeDetector: Polyfill } = await import('barcode-detector/pure');
			detector = new Polyfill({ formats: BARCODE_FORMATS });
		}
	};

	onMount(async () => {
		dialog.showModal();
		try {
			await initDetector();
			startScan();
		} catch (err) {
			const error = err as Error;
			scanning = false;
			message = `Scanner init error: ${error.message}`;
		}
	});

	onDestroy(() => {
		stopScan();
	});

	const startScan = async () => {
		scanning = true;
		message = 'Starting camera...';

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

	// 認識エリアのオーバーレイ描画: 矩形外を暗くする
	const drawScanRegion = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
		const regionW = w * 0.8;
		const regionH = h * 0.2;
		const rx = (w - regionW) / 2;
		const ry = (h - regionH) / 2;

		// 外側を半透明黒で塗る
		ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
		ctx.fillRect(0, 0, w, ry); // 上
		ctx.fillRect(0, ry + regionH, w, h - ry - regionH); // 下
		ctx.fillRect(0, ry, rx, regionH); // 左
		ctx.fillRect(rx + regionW, ry, w - rx - regionW, regionH); // 右
	};

	const tick = async () => {
		if (!scanning || !video || !canvas || !detector) return;

		if (video.readyState === video.HAVE_ENOUGH_DATA) {
			canvas.height = video.videoHeight;
			canvas.width = video.videoWidth;
			const ctx = canvas.getContext('2d');
			if (ctx) {
				ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

				// Auto ON: 生フレームで検出してからオーバーレイ描画
				// 500msスロットル + 成功後4秒クールダウン + 同一コード10秒抑制
				if (autoScan) {
					const now = Date.now();
					if (now - lastDetectAttempt >= 500 && now - lastScanTime >= 4000) {
						lastDetectAttempt = now;
						try {
							const barcodes = await detector.detect(canvas);
							if (!scanning) return;
							if (barcodes.length > 0) {
								const barcode = barcodes[0];
								const lastSeen = recentScans.get(barcode.rawValue);
								if (!lastSeen || now - lastSeen >= 10000) {
									message = `${FORMAT_LABELS[barcode.format] || barcode.format}: ${barcode.rawValue}`;
									drawHighlight(ctx, barcode.cornerPoints);
									notifyDetection();
									onscanned(barcode.rawValue + '\n');
									toast.success(`${FORMAT_LABELS[barcode.format] || 'Barcode'}: ${barcode.rawValue}`);
									lastScanTime = now;
									recentScans.set(barcode.rawValue, now);
									// 古いエントリをパージ
									for (const [key, ts] of recentScans) {
										if (now - ts >= 10000) recentScans.delete(key);
									}
								}
							}
						} catch {
							message = 'Detection error';
						}
					}
				}

				drawScanRegion(ctx, canvas.width, canvas.height);
			}
		}
		animationFrameId = requestAnimationFrame(tick);
	};

	const drawHighlight = (ctx: CanvasRenderingContext2D, points: readonly Point2D[]) => {
		if (points.length < 2) return;
		ctx.lineWidth = 4;
		ctx.strokeStyle = '#FF3B58';
		ctx.beginPath();
		ctx.moveTo(points[0].x, points[0].y);
		for (let i = 1; i < points.length; i++) {
			ctx.lineTo(points[i].x, points[i].y);
		}
		ctx.closePath();
		ctx.stroke();
	};

	const notifyDetection = () => {
		try {
			if (!audioCtx) audioCtx = new AudioContext();
			const oscillator = audioCtx.createOscillator();
			const gainNode = audioCtx.createGain();
			oscillator.connect(gainNode);
			gainNode.connect(audioCtx.destination);
			oscillator.type = 'sine';
			oscillator.frequency.value = 1200;
			gainNode.gain.value = 0.3;
			oscillator.start();
			oscillator.stop(audioCtx.currentTime + 0.1);
		} catch {
			// AudioContext unavailable
		}

		if (navigator.vibrate) {
			navigator.vibrate(100);
		}

		flashVisible = true;
		setTimeout(() => {
			flashVisible = false;
		}, 200);
	};

	// Scan ボタン押下: 生フレームを再描画してから1回だけ detect
	const handleScan = async () => {
		if (!detector || !canvas || !video) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		// オーバーレイなしの生フレームで検出
		ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
		message = 'Detecting...';
		try {
			const barcodes = await detector.detect(canvas);
			if (barcodes.length > 0) {
				const barcode = barcodes[0];
				const label = FORMAT_LABELS[barcode.format] || barcode.format;
				message = `${label}: ${barcode.rawValue}`;
				drawHighlight(ctx, barcode.cornerPoints);
				notifyDetection();
				onscanned(barcode.rawValue + '\n');
				toast.success(`${label}: ${barcode.rawValue}`);
			} else {
				message = 'No barcode found';
			}
		} catch {
			message = 'Detection failed';
		}
		drawScanRegion(ctx, canvas.width, canvas.height);
	};

	const handleDialogClose = () => {
		stopScan();
		onclose();
	};

	const handleBackdropClick = (e: MouseEvent) => {
		if (e.target === dialog) {
			dialog.close();
		}
	};
</script>

<dialog
	bind:this={dialog}
	class="m-auto w-[90vw] max-w-md rounded-lg bg-slate-800 p-0 backdrop:bg-black/50"
	onclick={handleBackdropClick}
	onclose={handleDialogClose}
	data-annotate="dialog-barcode-scan"
>
	<div class="flex flex-col p-4">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-lg font-medium text-slate-100">Barcode Scanner</h2>
			<div class="flex items-center gap-3">
				<label class="flex items-center gap-1.5 text-sm text-slate-300">
					<span>Auto</span>
					<button
						type="button"
						role="switch"
						aria-checked={autoScan}
						class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors {autoScan
							? 'bg-blue-600'
							: 'bg-slate-600'}"
						onclick={() => (autoScan = !autoScan)}
						data-annotate="button-auto-scan-toggle"
						aria-label="Auto scan toggle"
					>
						<span
							class="inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform {autoScan
								? 'translate-x-4.5'
								: 'translate-x-0.5'}"
						></span>
					</button>
				</label>
				<button
					type="button"
					class="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-slate-100"
					onclick={() => dialog.close()}
					data-annotate="button-close-barcode-scan"
					aria-label="Close"
				>
					<i class="bi bi-x-lg"></i>
				</button>
			</div>
		</div>

		<div class="relative overflow-hidden rounded bg-black">
			<canvas bind:this={canvas} class="w-full"></canvas>
			{#if flashVisible}
				<div class="absolute inset-0 bg-white/60 transition-opacity duration-200"></div>
			{/if}
		</div>

		<div class="mt-3 text-center text-sm text-slate-300">{message}</div>

		{#if !autoScan}
			<button
				type="button"
				class="mt-3 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-600"
				onclick={handleScan}
				disabled={!scanning}
				data-annotate="button-scan-barcode"
			>
				<i class="bi bi-upc-scan"></i> Scan
			</button>
		{/if}
	</div>
</dialog>
