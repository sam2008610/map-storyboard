import type { Map as MlMap } from "maplibre-gl";
import type { TimelineDoc } from "../types/timeline";
import { buildTimeline, phaseAt, type BuiltTimeline } from "../engine/timeline";
import { cameraAt } from "../engine/camera";
import { addMovementLayers, updateMovements } from "./movements";
import { addPlaceLayers, updatePlaces } from "./places";
import { addAnnotationLayers, updateAnnotations } from "./annotations";

/**
 * Scene：在 style 載入後一次性建立所有 GL 圖層，之後 render(time) 為純函式更新
 * （source data + camera），不依賴真實時間。播放 / scrub / 匯出共用同一條路。
 */
export class Scene {
  map: MlMap;
  doc: TimelineDoc;
  built: BuiltTimeline;

  constructor(map: MlMap, doc: TimelineDoc) {
    this.map = map;
    this.doc = doc;
    this.built = buildTimeline(doc);
  }

  /** 在 map style 載入完成後呼叫一次。 */
  setup(basemapId: string) {
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
  }

  render(time: number) {
    const at = phaseAt(this.built, time);
    const idx = at.span.index;
    this.map.jumpTo(cameraAt(this.built, at));
    updatePlaces(this.map, this.doc, this.built, idx);
    updateMovements(this.map, this.doc, this.built, idx, at.localT);
    updateAnnotations(this.map, this.built, idx);
  }
}
