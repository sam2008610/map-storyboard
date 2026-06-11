// 座標慣例：全程 [lng, lat]（GeoJSON 慣例）。⚠️ 絕不出現 [lat, lng]。

export type AspectRatio = "16:9" | "9:16" | "1:1";

export type TitlePosition = "top-left" | "top-center" | "top-right";

export type LngLat = [number, number];

export interface Meta {
  title: string;
  subtitle?: string;
  aspectRatio: AspectRatio;
  basemapStyle: string; // basemaps.ts 的 id
  titlePosition?: TitlePosition; // 標題卡位置，預設 top-left
  attribution?: string;
}

export interface Faction {
  id: string;
  name: string;
  color: string;
}

export type PlaceKind = "city" | "castle" | "battle" | "terrain";

export interface Place {
  id: string;
  name: string;
  lng: number;
  lat: number;
  kind: PlaceKind;
  faction?: string; // faction id
  appearAtPhase?: string; // phase id；省略=一開始就有
  labelDir?: LabelDir; // 標籤方向，預設 bottom（點下方）
  note?: string;
}

export type MovementStyle = "advance" | "retreat" | "artillery" | "naval";

export interface Movement {
  id: string;
  label: string;
  factionId: string;
  style: MovementStyle;
  path: LngLat[];
  drawDurationSec: number;
  startSec?: number; // 階段內延遲幾秒才開始生長（預設 0）→ 可錯開多條
  persist?: boolean; // 預設 true；false=只在本階段顯示，不累積到之後
}

export interface Camera {
  center: LngLat;
  zoom: number;
  bearing: number;
  pitch: number;
  transition?: "ease" | "cut"; // 預設 ease；cut=進入此 phase 時硬切，不從上一鏡頭插值
}

export type LabelDir = "top" | "bottom" | "left" | "right";

export interface Annotation {
  text: string;
  lng: number;
  lat: number;
  startSec?: number; // 階段內延遲幾秒才浮現（預設 0）
  kind?: "caption" | "title"; // 預設 caption；title=較大字
}

// v2 預留：前線、領土多邊形。v1 型別保留但不渲染。
export interface Front {
  factionId: string;
  coordinates: LngLat[];
}
export interface Territory {
  factionId: string;
  geojson: GeoJSON.Polygon;
}

export interface Phase {
  id: string;
  title: string;
  date?: string;
  durationSec: number;
  transitionSec?: number; // 進入此 phase 時相機過渡時間（預設取 durationSec 的一部分）
  camera: Camera;
  movements: Movement[];
  annotations?: Annotation[];
  fronts?: Front[]; // v2
  territory?: Territory[]; // v2
}

export interface TimelineDoc {
  meta: Meta;
  factions: Faction[];
  places: Place[];
  phases: Phase[];
}
