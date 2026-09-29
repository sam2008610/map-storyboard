// 逐幀匯出：WebCodecs（VideoEncoder）編碼 + mediabunny 封裝成 MP4 / WebM。
// 每一幀以邏輯時間 t = i / fps 渲染，等地圖完全載入後才送進編碼器，並帶上精確的時間戳。
// 因此輸出與機器快慢、圖磚載入速度無關，不會掉幀或畫面落後。
// 瀏覽器不支援 WebCodecs 時，改走 recordWebM.ts 的即時錄製備援。
import type { VideoCodec } from "mediabunny";

export type ContainerFormat = "mp4" | "webm";

const CODEC_PREFERENCE: Record<ContainerFormat, VideoCodec[]> = {
  mp4: ["avc"],
  webm: ["vp9", "vp8"],
};

/** H.264 等編碼器要求寬高為偶數。 */
export function evenDimension(n: number): number {
  return Math.max(2, Math.round(n / 2) * 2);
}

/** 回傳此瀏覽器可逐幀編碼該容器的 codec；不支援 WebCodecs 或該格式時回傳 null。 */
export async function pickFrameCodec(
  format: ContainerFormat,
  width: number,
  height: number
): Promise<VideoCodec | null> {
  if (typeof VideoEncoder === "undefined") return null;
  let canEncodeVideo: typeof import("mediabunny").canEncodeVideo;
  try {
    ({ canEncodeVideo } = await import("mediabunny"));
  } catch {
    return null; // 編碼模組載入失敗(例如離線)就走即時錄製備援
  }
  for (const codec of CODEC_PREFERENCE[format]) {
    try {
      if (await canEncodeVideo(codec, { width, height })) return codec;
    } catch {
      // 個別 codec 探測失敗就試下一個
    }
  }
  return null;
}

/**
 * 逐幀渲染並編碼整段動畫。
 *
 * - renderFrame(t)：把場景定在時間 t，並等畫面完全就緒（圖磚、GeoJSON、標籤）。
 * - compose(ctx, w, h)：把地圖與疊加層畫進 w×h 的合成 canvas。
 * - signal aborted 時取消輸出並回傳 null。
 */
export async function encodeFrames(opts: {
  format: ContainerFormat;
  codec: VideoCodec;
  width: number;
  height: number;
  fps: number;
  durationSec: number;
  bitrate: number;
  renderFrame: (t: number) => Promise<void>;
  compose: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}): Promise<Blob | null> {
  const { BufferTarget, CanvasSource, Mp4OutputFormat, Output, Quality, WebMOutputFormat } =
    await import("mediabunny");
  const { width, height, fps, durationSec } = opts;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("無法建立 2D canvas");

  const target = new BufferTarget();
  const output = new Output({
    format: opts.format === "mp4" ? new Mp4OutputFormat({ fastStart: "in-memory" }) : new WebMOutputFormat(),
    target,
  });
  const source = new CanvasSource(canvas, {
    codec: opts.codec,
    quality: new Quality({ bitrate: opts.bitrate }),
  });
  output.addVideoTrack(source, { frameRate: fps });
  await output.start();

  // 最後一幀固定落在 durationSec，確保結尾畫面完整
  const lastFrame = Math.max(1, Math.round(durationSec * fps));
  const frameDur = 1 / fps;
  try {
    for (let i = 0; i <= lastFrame; i++) {
      if (opts.signal?.aborted) {
        await output.cancel();
        return null;
      }
      await opts.renderFrame(Math.min(i * frameDur, durationSec));
      ctx.clearRect(0, 0, width, height);
      opts.compose(ctx, width, height);
      await source.add(i * frameDur, frameDur);
      opts.onProgress?.((i + 1) / (lastFrame + 1));
    }
    await output.finalize();
  } catch (e) {
    if (output.state !== "finalized" && output.state !== "canceled") await output.cancel();
    throw e;
  }
  if (!target.buffer) throw new Error("編碼輸出為空");
  return new Blob([target.buffer], { type: output.format.mimeType });
}
