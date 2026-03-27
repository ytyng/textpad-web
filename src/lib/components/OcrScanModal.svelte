<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { createWorker, type Worker as TesseractWorker } from 'tesseract.js';
	import { toast } from 'svelte-sonner';
	import {
		startCameraStream,
		stopCameraStream,
		notifyDetection as notify
	} from '$lib/utils/camera';

	interface Props {
		onscanned: (data: string) => void;
		onclose: () => void;
	}

	let { onscanned, onclose }: Props = $props();

	let dialog: HTMLDialogElement;
	let canvas: HTMLCanvasElement;
	let video: HTMLVideoElement | null = null;
	let scanning = $state(false);
	let message = $state('Initializing OCR engine...');
	let progress = $state(0);
	let showProgress = $state(true);
	let autoScan = $state(false);
	let recognizing = $state(false);
	let recognizedText = $state('');
	let selectedLang = $state(loadLangPreference());
	let animationFrameId: number | null = null;
	let worker: TesseractWorker | null = null;
	let workerReady = $state(false);
	let flashVisible = $state(false);
	let audioCtx: AudioContext | null = null;
	let flashTimeoutId: ReturnType<typeof setTimeout> | null = null;
	let lastDetectAttempt = 0;

	const LANG_OPTIONS: { value: string; label: string }[] = [
		{ value: 'eng+jpn', label: 'EN+JP' },
		{ value: 'eng', label: 'EN' },
		{ value: 'jpn', label: 'JP' }
	];

	// スキャン領域の割合 (幅90%, 高さ60%)
	const REGION_W_RATIO = 0.9;
	const REGION_H_RATIO = 0.6;
	// 自動認識のスロットル間隔 (ms)
	const AUTO_SCAN_INTERVAL = 3000;

	// CJK文字間の不要スペースを除去する正規表現
	// Tesseract は日本語認識時に文字間にスペースを挿入してしまう
	const CJK_CHAR = String.raw`[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\u3000-\u303F\uFF00-\uFFEF]`;
	const CJK_SPACE_RE = new RegExp(`(${CJK_CHAR})\\s+(${CJK_CHAR})`, 'gu');

	/** CJK文字間のスペースを除去。連続する場合があるため繰り返し適用 */
	function removeCjkSpaces(text: string): string {
		let prev = text;
		// eslint-disable-next-line no-constant-condition
		while (true) {
			const next = prev.replace(CJK_SPACE_RE, '$1$2');
			if (next === prev) return next;
			prev = next;
		}
	}

	function loadLangPreference(): string {
		if (typeof localStorage === 'undefined') return 'eng+jpn';
		return localStorage.getItem('ocr-lang') || 'eng+jpn';
	}

	function saveLangPreference(lang: string) {
		localStorage.setItem('ocr-lang', lang);
	}

	const initWorker = async (lang: string) => {
		workerReady = false;
		showProgress = true;
		progress = 0;
		message = 'Loading OCR engine...';

		const langs = lang.split('+');
		worker = await createWorker(langs, 1, {
			logger: (m: { status: string; progress: number }) => {
				if (m.status === 'loading tesseract core') {
					message = 'Loading OCR core...';
				} else if (m.status === 'initializing tesseract') {
					message = 'Initializing...';
				} else if (m.status === 'loading language traineddata') {
					message = `Loading language data... ${Math.round(m.progress * 100)}%`;
				}
				progress = m.progress;
			}
		});

		// 日本語テキストの文字間スペース挿入を抑制
		await worker.setParameters({
			preserve_interword_spaces: '0'
		});

		workerReady = true;
		showProgress = false;
		message = 'Ready to scan';
	};

	onMount(async () => {
		dialog.showModal();
		try {
			await initWorker(selectedLang);
			await startScan();
		} catch (err) {
			const error = err as Error;
			message = `OCR init error: ${error.message}`;
		}
	});

	onDestroy(() => {
		stopScan();
		if (flashTimeoutId) clearTimeout(flashTimeoutId);
		if (audioCtx) {
			audioCtx.close();
			audioCtx = null;
		}
		if (worker) {
			worker.terminate();
			worker = null;
		}
	});

	const startScan = async () => {
		scanning = true;
		message = 'Starting camera...';
		recognizedText = '';

		try {
			video = await startCameraStream();
			message = workerReady ? 'Ready to scan' : message;
			tick();
		} catch (err) {
			const error = err as Error;
			message = `Camera error: ${error.message}`;
			scanning = false;
		}
	};

	const stopScan = () => {
		scanning = false;
		stopCameraStream(video, animationFrameId);
		animationFrameId = null;
		video = null;
	};

	// 認識エリアのオーバーレイ描画: 矩形外を暗くする
	const drawScanRegion = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
		const regionW = w * REGION_W_RATIO;
		const regionH = h * REGION_H_RATIO;
		const rx = (w - regionW) / 2;
		const ry = (h - regionH) / 2;

		ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
		ctx.fillRect(0, 0, w, ry); // 上
		ctx.fillRect(0, ry + regionH, w, h - ry - regionH); // 下
		ctx.fillRect(0, ry, rx, regionH); // 左
		ctx.fillRect(rx + regionW, ry, w - rx - regionW, regionH); // 右

		// 認識エリア枠線
		ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
		ctx.lineWidth = 2;
		ctx.strokeRect(rx, ry, regionW, regionH);
	};

	const tick = () => {
		if (!scanning || !video || !canvas) return;

		if (video.readyState === video.HAVE_ENOUGH_DATA) {
			canvas.height = video.videoHeight;
			canvas.width = video.videoWidth;
			const ctx = canvas.getContext('2d');
			if (ctx) {
				ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

				// Auto scan: workerReady かつ認識中でなければスロットル間隔で認識
				if (autoScan && workerReady && !recognizing) {
					const now = Date.now();
					if (now - lastDetectAttempt >= AUTO_SCAN_INTERVAL) {
						lastDetectAttempt = now;
						performOcr();
					}
				}

				drawScanRegion(ctx, canvas.width, canvas.height);
			}
		}
		animationFrameId = requestAnimationFrame(tick);
	};

	// スキャン領域のみ切り出して OCR
	const performOcr = async () => {
		if (!worker || !canvas) return;
		if (!canvas.getContext('2d')) return;

		recognizing = true;
		message = 'Recognizing...';

		const w = canvas.width;
		const h = canvas.height;
		const regionW = Math.round(w * REGION_W_RATIO);
		const regionH = Math.round(h * REGION_H_RATIO);
		const rx = Math.round((w - regionW) / 2);
		const ry = Math.round((h - regionH) / 2);

		// スキャン領域を切り出して一時 canvas に描画
		const tempCanvas = document.createElement('canvas');
		tempCanvas.width = regionW;
		tempCanvas.height = regionH;
		const tempCtx = tempCanvas.getContext('2d');
		if (!tempCtx) {
			recognizing = false;
			return;
		}
		tempCtx.drawImage(canvas, rx, ry, regionW, regionH, 0, 0, regionW, regionH);

		try {
			const {
				data: { text }
			} = await worker.recognize(tempCanvas);
			const trimmed = removeCjkSpaces(text.trim());
			if (trimmed) {
				recognizedText = trimmed;
				notifyDetection();
				message = 'Text recognized';
			} else {
				message = 'No text found';
			}
		} catch {
			message = 'Recognition failed';
		}

		recognizing = false;
	};

	// 手動 Scan ボタン: 現在のフレームから認識
	const handleScan = async () => {
		if (!worker || !canvas || !video) return;
		if (!video.videoWidth || !video.videoHeight) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;
		ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
		await performOcr();
		if (canvas) {
			const ctx2 = canvas.getContext('2d');
			if (ctx2) drawScanRegion(ctx2, canvas.width, canvas.height);
		}
	};

	const handleUse = () => {
		onscanned(recognizedText);
		dialog.close();
		toast.success('OCR text applied');
	};

	const handleRescan = () => {
		recognizedText = '';
		message = 'Ready to scan';
	};

	const handleLangChange = async (e: Event) => {
		const lang = (e.target as HTMLSelectElement).value;
		selectedLang = lang;
		saveLangPreference(lang);
		if (worker) {
			await worker.terminate();
			worker = null;
		}
		try {
			await initWorker(lang);
			message = scanning ? 'Ready to scan' : message;
		} catch (err) {
			const error = err as Error;
			message = `Language load error: ${error.message}`;
		}
	};

	const notifyDetection = () => {
		notify(
			audioCtx,
			(ctx) => (audioCtx = ctx),
			() => {
				flashVisible = true;
				flashTimeoutId = setTimeout(() => {
					flashVisible = false;
					flashTimeoutId = null;
				}, 200);
			}
		);
	};

	const handleDialogClose = () => {
		stopScan();
		onclose();
	};
</script>

<dialog
	bind:this={dialog}
	class="m-auto w-[90vw] max-w-md rounded-lg bg-slate-800 p-0 backdrop:bg-black/50"
	onclick={(e: MouseEvent) => { if (e.target === dialog) dialog.close(); }}
	onclose={handleDialogClose}
	data-annotate="dialog-ocr-scan"
>
	<div class="flex flex-col p-4">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-lg font-medium text-slate-100">OCR</h2>
			<div class="flex items-center gap-3">
				<select
					class="rounded bg-slate-700 px-2 py-1 text-sm text-slate-200"
					value={selectedLang}
					onchange={handleLangChange}
					data-annotate="select-ocr-language"
				>
					{#each LANG_OPTIONS as opt}
						<option value={opt.value}>{opt.label}</option>
					{/each}
				</select>
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
						data-annotate="button-auto-ocr-toggle"
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
					data-annotate="button-close-ocr-scan"
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

		{#if showProgress}
			<div class="mt-3">
				<div class="h-2 w-full overflow-hidden rounded-full bg-slate-700">
					<div
						class="h-full rounded-full bg-blue-500 transition-all duration-300"
						style="width: {Math.round(progress * 100)}%"
					></div>
				</div>
			</div>
		{/if}

		<div class="mt-3 text-center text-sm text-slate-300">
			{message}
			{#if recognizing}
				<span class="ml-1 inline-block animate-spin">&#9696;</span>
			{/if}
		</div>

		{#if recognizedText}
			<div class="mt-3 rounded bg-slate-900 p-3">
				<pre
					class="max-h-48 overflow-auto whitespace-pre-wrap break-all text-sm text-slate-100">{recognizedText}</pre>
			</div>
			<div class="mt-3 flex gap-2">
				<button
					type="button"
					class="flex-1 rounded bg-slate-700 px-4 py-2 text-slate-100 hover:bg-slate-600"
					onclick={handleRescan}
					data-annotate="button-rescan-ocr"
				>
					<i class="bi bi-arrow-repeat"></i> Rescan
				</button>
				<button
					type="button"
					class="flex-1 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500"
					onclick={handleUse}
					data-annotate="button-use-ocr"
				>
					<i class="bi bi-check-lg"></i> Use
				</button>
			</div>
		{:else if !autoScan && workerReady}
			<button
				type="button"
				class="mt-3 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-600"
				onclick={handleScan}
				disabled={!scanning || recognizing}
				data-annotate="button-scan-ocr"
			>
				<i class="bi bi-body-text"></i> Scan
			</button>
		{/if}
	</div>
</dialog>
