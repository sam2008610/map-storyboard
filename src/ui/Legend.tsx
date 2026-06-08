import type { TimelineDoc } from "../types/timeline";

export default function Legend({ doc }: { doc: TimelineDoc }) {
  return (
    <div className="legend">
      {doc.factions.map((f) => (
        <div className="legend-item" key={f.id}>
          <span className="swatch" style={{ background: f.color }} />
          {f.name}
        </div>
      ))}
    </div>
  );
}
