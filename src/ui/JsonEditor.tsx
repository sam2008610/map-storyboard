import { useEffect, useState } from "react";
import type { TimelineDoc } from "../types/timeline";

interface Props {
  doc: TimelineDoc;
  onApply: (doc: TimelineDoc) => void;
}

export default function JsonEditor({ doc, onApply }: Props) {
  const [text, setText] = useState(() => JSON.stringify(doc, null, 2));
  const [err, setErr] = useState("");

  // 外部 doc 變動（套用 / 載入範例）時同步文字框
  useEffect(() => {
    setText(JSON.stringify(doc, null, 2));
    setErr("");
  }, [doc]);

  const apply = () => {
    try {
      const parsed = JSON.parse(text) as TimelineDoc;
      if (!parsed.phases || !Array.isArray(parsed.phases))
        throw new Error("缺少 phases 陣列");
      setErr("");
      onApply(parsed);
    } catch (e) {
      setErr("JSON 格式有誤：" + (e as Error).message);
    }
  };

  return (
    <div className="json-editor">
      <textarea
        spellCheck={false}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="row">
        <button onClick={apply}>套用並重繪</button>
      </div>
      {err && <div className="err">{err}</div>}
      <div className="hint">
        座標一律 [lng, lat]。改座標 / durationSec / camera 後按「套用並重繪」。
      </div>
    </div>
  );
}
