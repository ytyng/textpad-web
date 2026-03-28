/** カメラスキャン系モーダル共通ユーティリティ */

/** 背面カメラでビデオストリームを開始する */
export async function startCameraStream(): Promise<HTMLVideoElement> {
  const video = document.createElement('video');
  video.setAttribute('playsinline', 'true');
  video.muted = true;
  video.autoplay = true;

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: 'environment' }
  });
  video.srcObject = stream;
  await video.play();
  return video;
}

/** ビデオストリームとアニメーションフレームを停止する */
export function stopCameraStream(
  video: HTMLVideoElement | null,
  animationFrameId: number | null
): void {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
  }
  if (video?.srcObject) {
    const stream = video.srcObject as MediaStream;
    stream.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
  }
}

/** 検出成功時のフィードバック (beep + vibrate + flash) */
export function notifyDetection(
  audioCtx: AudioContext | null,
  onAudioCtxCreated: (ctx: AudioContext) => void,
  onFlash: () => void
): void {
  try {
    if (!audioCtx) {
      audioCtx = new AudioContext();
      onAudioCtxCreated(audioCtx);
    }
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

  onFlash();
}
