// WebM 匯出：MediaRecorder + canvas.captureStream。
// ⚠️ 只會錄到 MapLibre WebGL canvas 上的內容；DOM 疊加層不會進影片。
// 因此所有要入鏡的地圖內容都以 GL layer 繪製（見 render/*）。

function pickMime(): string {
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  for (const m of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) return m;
  }
  return "video/webm";
}

/**
 * 自行以 requestAnimationFrame 從 0 播到 durationSec，期間 captureStream 錄製。
 * render(t) 為純函式（Scene.render），不依賴外部 clock，確保錄製時每幀都有畫面。
 *
 * 若提供 overlay，則改為合成模式：每幀把地圖 GL canvas 畫進一張 width×height 的
 * 2D canvas，再疊 overlay（圖例等），錄這張合成 canvas。如此圖例才會進影片。
 */
/**
 * 自行以 requestAnimationFrame 從 0 播到 durationSec，期間 captureStream 錄製。
 * render(t) 為純函式（Scene.render），不依賴外部 clock。
 *
 * - width/height：合成 canvas 目標解析度（縮小 = 720p/480p，檔案更小）。
 * - videoBitsPerSecond：位元率上限（畫質↔大小的主要槓桿）。
 * - onProgress(0..1)：給進度條/ETA。
 * - signal：AbortSignal，aborted 時停止並 resolve(null)（視為取消，不下載）。
 */
export function recordWebM(opts: {
  canvas: HTMLCanvasElement;
  durationSec: number;
  fps?: number;
  render: (t: number) => void;
  overlay?: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  width?: number;
  height?: number;
  videoBitsPerSecond?: number;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}): Promise<Blob | null> {
  const { canvas, durationSec, render, overlay, onProgress, signal } = opts;
  const fps = opts.fps ?? 30;
  const mimeType = pickMime();

  // 合成模式：建立目標解析度的 2D canvas，每幀 drawImage(gl) + overlay
  let composite: HTMLCanvasElement | null = null;
  let cctx: CanvasRenderingContext2D | null = null;
  const w = opts.width ?? canvas.width;
  const h = opts.height ?? canvas.height;
  if (overlay) {
    composite = document.createElement("canvas");
    composite.width = w;
    composite.height = h;
    cctx = composite.getContext("2d");
  }

  const drawFrame = () => {
    if (cctx && composite) {
      cctx.clearRect(0, 0, w, h);
      cctx.drawImage(canvas, 0, 0, w, h);
      overlay!(cctx, w, h);
    }
  };

  const captureTarget = composite ?? canvas;
  const stream = captureTarget.captureStream(fps);
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: opts.videoBitsPerSecond ?? 2_500_000,
  });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  return new Promise<Blob | null>((resolve, reject) => {
    let aborted = false;
    recorder.onerror = (e) => reject(e);
    recorder.onstop = () => resolve(aborted ? null : new Blob(chunks, { type: mimeType }));

    recorder.start();
    const start = performance.now();
    const step = (now: number) => {
      if (signal?.aborted) {
        aborted = true;
        recorder.stop();
        return;
      }
      const t = (now - start) / 1000;
      if (t >= durationSec) {
        render(durationSec);
        drawFrame();
        onProgress?.(1);
        requestAnimationFrame(() => recorder.stop()); // 多等一幀讓最後畫面進入 stream
        return;
      }
      render(t);
      drawFrame();
      onProgress?.(t / durationSec);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
