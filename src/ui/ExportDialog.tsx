import { useState } from "react";
import type { ExportFormat, ExportOptions } from "../map/stageController";
import { canRecordMp4 } from "../export/recordWebM";

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

const MP4_OK = canRecordMp4(); // 此瀏覽器能否原生錄製 MP4

export default function ExportDialog(p: Props) {
  const [format, setFormat] = useState<ExportFormat>(MP4_OK ? "mp4" : "webm");
  const [quality, setQuality] = useState<Quality>("mid");
  const [res, setRes] = useState<Res>("720");
  if (!p.open) return null;

  const q = QUALITY.find((x) => x.id === quality)!;
  const r = RES.find((x) => x.id === res)!;
  const durLabel = fmtSec(p.durationSec);
  const estMaxMB = Math.max(1, Math.round((q.bps * p.durationSec) / 8 / 1e6));
  const pct = Math.round(Math.max(0, Math.min(1, p.progress)) * 100);
  const remain = fmtSec((1 - p.progress) * p.durationSec);

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
                  onClick={() => MP4_OK && setFormat("mp4")}
                  disabled={!MP4_OK}
                  title={MP4_OK ? "" : "此瀏覽器不支援原生 MP4 錄製"}
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
              匯出為<b>即時錄製</b>(直接錄成 {format.toUpperCase()},免轉檔),需約 {durLabel}（與影片等長）。
            </p>

            <div className="modal-actions">
              <button className="ghost" onClick={p.onClose}>
                取消
              </button>
              <button
                className="primary"
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
              錄製中 <b>{pct}%</b> · 剩餘約 {remain}
            </p>
            <p className="modal-note">請保持此分頁在前景,以免錄製掉幀。</p>
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
