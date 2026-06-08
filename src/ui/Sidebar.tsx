import type { ReactNode } from "react";
import type { TimelineDoc, TitlePosition } from "../types/timeline";
import Legend from "./Legend";
import JsonEditor from "./JsonEditor";

interface Props {
  doc: TimelineDoc;
  onApply: (doc: TimelineDoc) => void;
  onTitlePosition: (pos: TitlePosition) => void;
  top?: ReactNode;
}

const TITLE_POS: { id: TitlePosition; label: string }[] = [
  { id: "top-left", label: "左上" },
  { id: "top-center", label: "中上" },
  { id: "top-right", label: "右上" },
];

export default function Sidebar({ doc, onApply, onTitlePosition, top }: Props) {
  const curPos = doc.meta.titlePosition ?? "top-left";

  return (
    <aside className="sidebar">
      {top}
      <header className="brand">
        <h1>{doc.meta.title}</h1>
        {doc.meta.subtitle && <p className="sub">{doc.meta.subtitle}</p>}
      </header>

      <section className="panel">
        <h2>陣營圖例</h2>
        <Legend doc={doc} />
      </section>

      <section className="panel">
        <h2>標題位置</h2>
        <div className="aspects">
          {TITLE_POS.map((p) => (
            <button
              key={p.id}
              className={"chip" + (p.id === curPos ? " active" : "")}
              onClick={() => onTitlePosition(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="hint">標題與副標題取自 meta.title／meta.subtitle，會一起進影片。</div>
      </section>

      <section className="panel">
        <h2>分鏡（{doc.phases.length}）</h2>
        <ol className="phase-list">
          {doc.phases.map((ph) => (
            <li key={ph.id}>
              <b>{ph.title}</b>
              <span className="meta">
                {ph.date ? `${ph.date} · ` : ""}
                {ph.durationSec}s
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="panel grow">
        <h2>資料（JSON）</h2>
        <JsonEditor doc={doc} onApply={onApply} />
      </section>
    </aside>
  );
}
