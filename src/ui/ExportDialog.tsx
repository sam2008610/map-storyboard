import { useState } from "react";

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
  onStart: (opts: { videoBitsPerSecond: number; resolutionScale: number }) => void;
  onCancel: () => void; // 取消進行中的匯出
  onClose: () => void; // 關閉視窗(未匯出時)
}

export default function ExportDialog(p: Props) {
  const [quality, setQuality] = useState<Quality>("mid");
  const [res, setRes] = useState<Res>("720");
  if (!p.open) return null;

  const q = QUALITY.find((x) => x.id === quality)!;
  const r = RES.find((x) => x.id === res)!;
  const estMaxMB = Math.max(1, Math.round((q.bps * p.durationSec) / 8 / 1e6));
  const durLabel = `${Math.round(p.durationSec)} 秒`;
  const pct = Math.round(p.progress * 100);
  const remain = Math.max(0, Math.ceil((1 - p.progress) * p.durationSec));

  return (
    <div className="modal-backdrop" onClick={p.exporting ? undefined : p.onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>匯出影片（WebM）</h3>

        {!p.exporting ? (
          <>
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
              實際通常更小,解析度越低越小。匯出為<b>即時錄製</b>,需約 {durLabel}（與影片等長）。
            </p>

            <div className="modal-actions">
              <button className="ghost" onClick={p.onClose}>
                取消
              </button>
              <button
                className="primary"
                onClick={() => p.onStart({ videoBitsPerSecond: q.bps, resolutionScale: r.scale })}
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
              匯出中 <b>{pct}%</b> · 剩餘約 {remain} 秒
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
