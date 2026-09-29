import { useEffect, useRef, useState } from "react";
import type { ExportFormat, ExportOptions } from "../map/stageController";
import { canRecordMp4 } from "../export/recordWebM";
import { pickFrameCodec } from "../export/encodeVideo";

type Quality = "low" | "mid" | "high";
type Res = "1080" | "720" | "480";

const QUALITY: { id: Quality; label: string; bps: number }[] = [
  { id: "low", label: "低（省空間）", bps: 1_200_000 },
  { id: "mid", label: "中（推薦）", bps: 2_500_000 },
  { id: "high", label: "高", bps: 5_000_000 },
];
const RES: { id: Res; label: string; scale: number }[] = [
  { id: "1080", label: "1080p（原始）", scale: 1 },
  { id: "720", label: "720p", scale: 720 / 1080 },
  { id: "480", label: "480p", scale: 480 / 1080 },
];

interface Props {
  open: boolean;
  durationSec: number;
  exporting: boolean;
  progress: number; // 0..1
  onStart: (opts: ExportOptions) => void;
  onCancel: () => void;
  onClose: () => void;
}

function fmtSec(s: number) {
  if (!isFinite(s) || s < 0) return "—";
  if (s < 60) return `${Math.ceil(s)} 秒`;
  return `${Math.floor(s / 60)} 分 ${Math.ceil(s % 60)} 秒`;
}

interface Support {
  mp4: boolean; // 能輸出 MP4(逐幀或即時錄製任一)
  frameAccurate: Record<ExportFormat, boolean>; // 能否逐幀編碼(WebCodecs)
}

// 以 1080p 探測一次即可(較低解析度必然也支援);結果快取供之後開啟視窗使用
let supportPromise: Promise<Support> | null = null;
function detectSupport(): Promise<Support> {
  supportPromise ??= Promise.all([
    pickFrameCodec("mp4", 1920, 1080),
    pickFrameCodec("webm", 1920, 1080),
  ]).then(([mp4Codec, webmCodec]) => ({
    mp4: !!mp4Codec || canRecordMp4(),
    frameAccurate: { mp4: !!mp4Codec, webm: !!webmCodec },
  }));
  return supportPromise;
}

export default function ExportDialog(p: Props) {
  const [support, setSupport] = useState<Support | null>(null);
  const [format, setFormat] = useState<ExportFormat>("mp4");
  const [quality, setQuality] = useState<Quality>("mid");
  const [res, setRes] = useState<Res>("720");
  const startedAt = useRef(0);

  useEffect(() => {
    if (!p.open || support) return;
    let alive = true;
    detectSupport().then((s) => {
      if (!alive) return;
      setSupport(s);
      // 預設選可逐幀編碼的格式(MP4 優先);兩者皆不行時,MP4 也無法錄製才退 WebM
      if (!s.frameAccurate.mp4 && (s.frameAccurate.webm || !s.mp4)) setFormat("webm");
    });
    return () => {
      alive = false;
    };
  }, [p.open, support]);

  useEffect(() => {
    if (p.exporting) startedAt.current = performance.now();
  }, [p.exporting]);

  if (!p.open) return null;

  const mp4Ok = support?.mp4 ?? false;
  const frameAccurate = support?.frameAccurate[format] ?? false;

  const q = QUALITY.find((x) => x.id === quality)!;
  const r = RES.find((x) => x.id === res)!;
  const durLabel = fmtSec(p.durationSec);
  const estMaxMB = Math.max(1, Math.round((q.bps * p.durationSec) / 8 / 1e6));
  const pct = Math.round(Math.max(0, Math.min(1, p.progress)) * 100);
  // 依實際耗時推算剩餘時間(逐幀編碼的速度取決於機器與圖磚載入,不一定等於片長)
  const elapsedSec = (performance.now() - startedAt.current) / 1000;
  const remain = p.progress > 0.02 ? fmtSec((elapsedSec * (1 - p.progress)) / p.progress) : "估算中…";

  return (
    <div className="modal-backdrop" onClick={p.exporting ? undefined : p.onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>匯出影片</h3>

        {!p.exporting ? (
          <>
            <div className="field">
              <label>格式</label>
              <div className="seg">
                <button
                  className={"chip" + (format === "mp4" ? " active" : "")}
                  onClick={() => mp4Ok && setFormat("mp4")}
                  disabled={!mp4Ok}
                  title={mp4Ok || !support ? "" : "此瀏覽器不支援 MP4 編碼"}
                >
                  MP4（好分享）
                </button>
                <button
                  className={"chip" + (format === "webm" ? " active" : "")}
                  onClick={() => setFormat("webm")}
                >
                  WebM
                </button>
              </div>
            </div>
            <div className="field">
              <label>畫質</label>
              <div className="seg">
                {QUALITY.map((x) => (
                  <button
                    key={x.id}
                    className={"chip" + (x.id === quality ? " active" : "")}
                    onClick={() => setQuality(x.id)}
                  >
                    {x.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>解析度</label>
              <div className="seg">
                {RES.map((x) => (
                  <button
                    key={x.id}
                    className={"chip" + (x.id === res ? " active" : "")}
                    onClick={() => setRes(x.id)}
                  >
                    {x.label}
                  </button>
                ))}
              </div>
            </div>

            <p className="est">
              位元率上限 {(q.bps / 1e6).toFixed(1)} Mbps → 預估 <b>≤ {estMaxMB} MB</b> · 時長 {durLabel}
            </p>
            <p className="modal-note">
              {!support ? (
                "偵測瀏覽器編碼能力中…"
              ) : frameAccurate ? (
                <>
                  匯出為<b>逐幀渲染</b>(直接編碼成 {format.toUpperCase()}):每幀等地圖載入完成才編碼,不會掉幀;
                  耗時視機器與圖磚載入速度而定。
                </>
              ) : (
                <>
                  此瀏覽器無法逐幀編碼 {format.toUpperCase()},改用<b>即時錄製</b>,需約 {durLabel}
                  （與影片等長）,機器忙碌時可能掉幀。
                  {format === "mp4" && support.frameAccurate.webm && " 改選 WebM 即可逐幀渲染。"}
                </>
              )}
            </p>

            <div className="modal-actions">
              <button className="ghost" onClick={p.onClose}>
                取消
              </button>
              <button
                className="primary"
                disabled={!support}
                onClick={() =>
                  p.onStart({
                    format,
                    videoBitsPerSecond: q.bps,
                    resolutionScale: r.scale,
                  })
                }
              >
                開始匯出
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="progress-track">
              <div className="progress-bar" style={{ width: `${pct}%` }} />
            </div>
            <p className="est">
              匯出中 <b>{pct}%</b> · 剩餘約 {remain}
            </p>
            <p className="modal-note">
              {frameAccurate
                ? "逐幀渲染不受分頁切換影響,但留在前景速度較快。"
                : "請保持此分頁在前景,以免錄製掉幀。"}
            </p>
            <div className="modal-actions">
              <button className="ghost danger" onClick={p.onCancel}>
                取消匯出
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
