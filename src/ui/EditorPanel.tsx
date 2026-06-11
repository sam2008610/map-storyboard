import type { Place, PlaceKind, TimelineDoc } from "../types/timeline";
import type { EditTool } from "../map/MapStage";

const KINDS: { id: PlaceKind; label: string }[] = [
  { id: "city", label: "城市" },
  { id: "castle", label: "城堡/據點" },
  { id: "battle", label: "戰場/景點" },
  { id: "terrain", label: "地形/自然" },
];

interface Props {
  doc: TimelineDoc;
  editMode: boolean;
  selectedPhaseIndex: number;
  activeTool: EditTool;
  selectedPlaceId: string | null;
  onToggleEditMode: () => void;
  onSelectPhase: (i: number) => void;
  onSetTool: (t: EditTool) => void;
  onCaptureCamera: () => void;
  onUpdatePlace: (id: string, patch: Partial<Place>) => void;
  onDeletePlace: (id: string) => void;
}

export default function EditorPanel(p: Props) {
  if (!p.editMode) {
    return (
      <section className="panel">
        <button className="edit-toggle" onClick={p.onToggleEditMode}>
          ✎ 進入編輯模式
        </button>
      </section>
    );
  }

  const place = p.selectedPlaceId
    ? p.doc.places.find((x) => x.id === p.selectedPlaceId) ?? null
    : null;

  return (
    <section className="panel editor">
      <h2>
        編輯模式
        <button className="ghost small" onClick={p.onToggleEditMode}>
          ▶ 回播放
        </button>
      </h2>

      <div className="ed-block">
        <div className="ed-label">編輯中的分鏡</div>
        <div className="ed-phases">
          {p.doc.phases.map((ph, i) => (
            <button
              key={ph.id}
              className={"chip" + (i === p.selectedPhaseIndex ? " active" : "")}
              onClick={() => p.onSelectPhase(i)}
            >
              {i + 1}. {ph.title}
            </button>
          ))}
        </div>
        <button className="ed-cam" onClick={p.onCaptureCamera}>
          📷 設為本分鏡鏡頭
        </button>
        <div className="hint">自由縮放/旋轉地圖到想要的角度,再按此鍵把鏡頭存進這個分鏡。</div>
      </div>

      <div className="ed-block">
        <div className="ed-label">地點</div>
        <button
          className={"chip wide" + (p.activeTool === "add-place" ? " active" : "")}
          onClick={() => p.onSetTool(p.activeTool === "add-place" ? null : "add-place")}
        >
          {p.activeTool === "add-place" ? "● 點地圖落點中…(再按取消)" : "＋ 點地圖加地點"}
        </button>
        <div className="hint">選取模式下可點地點編輯、拖曳移動。</div>
      </div>

      {place && (
        <div className="ed-block ed-form">
          <div className="ed-label">
            編輯地點
            <button className="ghost small danger" onClick={() => p.onDeletePlace(place.id)}>
              刪除
            </button>
          </div>
          <label>
            名稱
            <input value={place.name} onChange={(e) => p.onUpdatePlace(place.id, { name: e.target.value })} />
          </label>
          <label>
            陣營/類別色
            <select
              value={place.faction ?? ""}
              onChange={(e) => p.onUpdatePlace(place.id, { faction: e.target.value || undefined })}
            >
              <option value="">（依類別預設色）</option>
              {p.doc.factions.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </label>
          <label>
            類別
            <select
              value={place.kind}
              onChange={(e) => p.onUpdatePlace(place.id, { kind: e.target.value as PlaceKind })}
            >
              {KINDS.map((k) => (
                <option key={k.id} value={k.id}>{k.label}</option>
              ))}
            </select>
          </label>
          <label>
            出現於
            <select
              value={place.appearAtPhase ?? ""}
              onChange={(e) => p.onUpdatePlace(place.id, { appearAtPhase: e.target.value || undefined })}
            >
              <option value="">一開始就有</option>
              {p.doc.phases.map((ph, i) => (
                <option key={ph.id} value={ph.id}>{i + 1}. {ph.title}</option>
              ))}
            </select>
          </label>
          <div className="ed-coords">
            <label>
              經度
              <input
                type="number" step="0.0001" value={place.lng}
                onChange={(e) => p.onUpdatePlace(place.id, { lng: parseFloat(e.target.value) })}
              />
            </label>
            <label>
              緯度
              <input
                type="number" step="0.0001" value={place.lat}
                onChange={(e) => p.onUpdatePlace(place.id, { lat: parseFloat(e.target.value) })}
              />
            </label>
          </div>
        </div>
      )}
    </section>
  );
}
