import type { AspectRatio } from "../types/timeline";
import { BASEMAPS } from "../map/basemaps";

const ASPECTS: AspectRatio[] = ["16:9", "9:16", "1:1"];

interface Props {
  playing: boolean;
  currentTime: number;
  duration: number;
  aspectRatio: AspectRatio;
  basemapId: string;
  exporting: boolean;
  onToggle: () => void;
  onSeek: (t: number) => void;
  onAspect: (a: AspectRatio) => void;
  onBasemap: (id: string) => void;
  onExport: () => void;
}

function fmt(t: number) {
  const s = Math.max(0, t);
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(1).padStart(4, "0");
  return `${m}:${sec}`;
}

export default function TransportBar(p: Props) {
  return (
    <div className="transport">
      <button className="play" onClick={p.onToggle} disabled={p.exporting}>
        {p.playing ? "❚❚" : "▶"}
      </button>
      <span className="time">
        {fmt(p.currentTime)} / {fmt(p.duration)}
      </span>
      <input
        className="scrub"
        type="range"
        min={0}
        max={Math.max(p.duration, 0.001)}
        step={0.05}
        value={Math.min(p.currentTime, p.duration)}
        onChange={(e) => p.onSeek(parseFloat(e.target.value))}
        disabled={p.exporting}
      />
      <div className="aspects">
        {ASPECTS.map((a) => (
          <button
            key={a}
            className={"chip" + (a === p.aspectRatio ? " active" : "")}
            onClick={() => p.onAspect(a)}
            disabled={p.exporting}
          >
            {a}
          </button>
        ))}
      </div>
      <select
        className="basemap"
        value={p.basemapId}
        onChange={(e) => p.onBasemap(e.target.value)}
        disabled={p.exporting}
      >
        {BASEMAPS.map((b) => (
          <option key={b.id} value={b.id}>
            {b.label}
          </option>
        ))}
      </select>
      <button className="export" onClick={p.onExport} disabled={p.exporting}>
        {p.exporting ? "匯出中…" : "匯出 WebM"}
      </button>
    </div>
  );
}
