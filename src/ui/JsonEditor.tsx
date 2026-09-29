import { useEffect, useRef, useState } from "react";
import type { TimelineDoc } from "../types/timeline";
import { validateDoc } from "../data/validate";

interface Props {
  doc: TimelineDoc;
  onApply: (doc: TimelineDoc) => void;
}

export default function JsonEditor({ doc, onApply }: Props) {
  const [text, setText] = useState(() => JSON.stringify(doc, null, 2));
  const [errors, setErrors] = useState<string[]>([]);
  // 最近一次從 doc 同步進來的文字；text 與它不同代表使用者有尚未套用的草稿
  const syncedRef = useRef(text);
  const [stale, setStale] = useState(false);

  // 外部 doc 變動（套用 / 載入範例 / 編輯模式）時同步文字框；
  // 若有未套用的草稿則保留，只提示資料已在別處變更，避免覆蓋使用者的輸入
  useEffect(() => {
    const next = JSON.stringify(doc, null, 2);
    if (next === syncedRef.current) return;
    const hasDraft = text !== syncedRef.current;
    syncedRef.current = next;
    if (hasDraft) {
      setStale(true);
    } else {
      setText(next);
      setErrors([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc]);

  const discardDraft = () => {
    setText(syncedRef.current);
    setErrors([]);
    setStale(false);
  };

  const apply = () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      setErrors(["JSON 格式有誤：" + (e as Error).message]);
      return;
    }
    const result = validateDoc(parsed);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors([]);
    setStale(false);
    syncedRef.current = text; // 自己套用的變更不算外部變動；隨後 doc 更新時會換成標準格式
    onApply(result.doc);
  };

  return (
    <div className="json-editor">
      <textarea
        spellCheck={false}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {stale && (
        <div className="warn">
          資料已在其他地方變更，這裡是你尚未套用的草稿。
          <button className="ghost small" onClick={discardDraft}>
            放棄草稿，載入最新
          </button>
        </div>
      )}
      <div className="row">
        <button onClick={apply}>套用並重繪</button>
      </div>
      {errors.length > 0 && (
        <ul className="err">
          {errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
      <div className="hint">
        座標一律 [lng, lat]。改座標 / durationSec / camera 後按「套用並重繪」。
      </div>
    </div>
  );
}
