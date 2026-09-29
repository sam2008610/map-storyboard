import type { Map as MlMap } from "maplibre-gl";
import type { TimelineDoc } from "../types/timeline";
import { buildTimeline, phaseAt, type BuiltTimeline } from "../engine/timeline";
import { cameraAt } from "../engine/camera";
import { addMovementLayers, prepareMovements, updateMovements, type PreparedMovement } from "./movements";
import { addPlaceLayers, updatePlaces, type PlaceOverride } from "./places";
import { addAnnotationLayers, updateAnnotations } from "./annotations";

/**
 * Scene：在 style 載入後一次性建立所有 GL 圖層，之後 render(time) 為純函式更新
 * （source data + camera），不依賴真實時間。播放 / scrub / 匯出共用同一條路。
 */
export class Scene {
  map: MlMap;
  doc: TimelineDoc;
  built: BuiltTimeline;
  private movements: PreparedMovement[][];
  // 各 source 上次寫入內容的 key；相同就略過 setData。source 重建或 doc 變動時清空。
  private keys: { places: string | null; movements: string | null; annotations: string | null } = {
    places: null,
    movements: null,
    annotations: null,
  };

  constructor(map: MlMap, doc: TimelineDoc) {
    this.map = map;
    this.doc = doc;
    this.built = buildTimeline(doc);
    this.movements = prepareMovements(doc);
  }

  private invalidate() {
    this.keys = { places: null, movements: null, annotations: null };
  }

  /** 在 map style 載入完成後呼叫（每次換底圖後 source 都是新建的空 source）。 */
  setup(basemapId: string) {
    this.invalidate();
    if (this.map.getSource("wm-places")) return; // 同一份 style 已建立過圖層
    addMovementLayers(this.map);
    addPlaceLayers(this.map, basemapId);
    addAnnotationLayers(this.map, basemapId);
  }

  get totalDuration() {
    return this.built.totalDuration;
  }

  /** 換一份 doc（JSON 編輯後重繪）：重建時間軸，圖層沿用。 */
  setDoc(doc: TimelineDoc) {
    this.doc = doc;
    this.built = buildTimeline(doc);
    this.movements = prepareMovements(doc);
    this.invalidate();
  }

  render(time: number) {
    const at = phaseAt(this.built, time);
    const idx = at.span.index;
    this.map.jumpTo(cameraAt(this.built, at));
    const k = this.keys;
    k.places = updatePlaces(this.map, this.doc, this.built, idx, k.places);
    k.movements = updateMovements(this.map, this.movements, idx, at.localT, k.movements);
    k.annotations = updateAnnotations(this.map, this.built, idx, at.localT, k.annotations);
  }

  /**
   * 編輯模式靜態渲染:顯示「到選定分鏡為止」的內容(行軍全部畫完、地點全顯示),
   * 但**不動鏡頭**,讓使用者自由操作地圖。override 供拖曳即時預覽。
   */
  renderStatic(phaseIndex: number, override?: PlaceOverride) {
    const n = this.built.spans.length;
    const idx = Math.max(0, Math.min(phaseIndex, n - 1));
    const k = this.keys;
    k.places = updatePlaces(this.map, this.doc, this.built, idx, k.places, { editMode: true, override });
    k.movements = updateMovements(this.map, this.movements, idx, 1e9, k.movements); // localT 極大 → frac=1
    k.annotations = updateAnnotations(this.map, this.built, idx, 1e9, k.annotations);
  }
}
