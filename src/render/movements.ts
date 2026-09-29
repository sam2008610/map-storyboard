import type { Map as MlMap } from "maplibre-gl";
import type { LngLat, Movement, TimelineDoc } from "../types/timeline";
import { clamp01 } from "../engine/easing";
import { factionColorMap } from "./colors";

const SRC_LINES = "wm-mv-lines";
const SRC_ARROWS = "wm-mv-arrows";
const ARROW_IMG = "wm-arrowhead";

// 0=正北、順時針。座標為 [lng,lat]。
function bearing(a: [number, number], b: [number, number]): number {
  const lat1 = (a[1] * Math.PI) / 180;
  const dy = b[1] - a[1];
  const dx = (b[0] - a[0]) * Math.cos(lat1);
  return (Math.atan2(dx, dy) * 180) / Math.PI;
}

const DEG = Math.PI / 180;
const EARTH_RADIUS_KM = 6371.0088;
const MAX_MERC_LAT = 85.0511;

function haversineKm(a: LngLat, b: LngLat): number {
  const dLat = (b[1] - a[1]) * DEG;
  const dLng = (b[0] - a[0]) * DEG;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * DEG) * Math.cos(b[1] * DEG) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

const mercY = (lat: number) =>
  Math.log(Math.tan(Math.PI / 4 + (Math.max(-MAX_MERC_LAT, Math.min(MAX_MERC_LAT, lat)) * DEG) / 2));
const latFromMercY = (y: number) => (2 * Math.atan(Math.exp(y)) - Math.PI / 2) / DEG;

// 在 a→b 取比例 t 的點。於 Web Mercator 空間內插，讓生長端點剛好落在地圖畫出的直線段上。
function interpolate(a: LngLat, b: LngLat, t: number): LngLat {
  const ya = mercY(a[1]);
  return [a[0] + (b[0] - a[0]) * t, latFromMercY(ya + (mercY(b[1]) - ya) * t)];
}

/** 取路徑從起點到 distKm 的部分（cumKm 為各頂點累積距離）。 */
function sliceAlong(path: LngLat[], cumKm: number[], distKm: number): LngLat[] {
  const out: LngLat[] = [path[0]];
  for (let i = 1; i < path.length; i++) {
    if (cumKm[i] >= distKm) {
      const seg = cumKm[i] - cumKm[i - 1];
      out.push(interpolate(path[i - 1], path[i], seg > 0 ? (distKm - cumKm[i - 1]) / seg : 1));
      return out;
    }
    out.push(path[i]);
  }
  return out;
}

// 箭頭方向取「與端點不同」的前一個頂點，避免路徑有重複點時 bearing 變 0
function lastDistinctBefore(coords: LngLat[]): LngLat | null {
  const tip = coords[coords.length - 1];
  for (let i = coords.length - 2; i >= 0; i--) {
    if (coords[i][0] !== tip[0] || coords[i][1] !== tip[1]) return coords[i];
  }
  return null;
}

function makeArrowImage(): { width: number; height: number; data: Uint8ClampedArray } {
  const s = 24;
  const c = document.createElement("canvas");
  c.width = s;
  c.height = s;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, s, s);
  ctx.fillStyle = "#fff"; // SDF：以 alpha 定形狀，顏色由 icon-color 決定
  ctx.beginPath();
  ctx.moveTo(s / 2, 2); // 頂點朝上（北）
  ctx.lineTo(s - 3, s - 4);
  ctx.lineTo(s / 2, s - 9);
  ctx.lineTo(3, s - 4);
  ctx.closePath();
  ctx.fill();
  const img = ctx.getImageData(0, 0, s, s);
  return { width: s, height: s, data: img.data };
}

export function addMovementLayers(map: MlMap) {
  if (!map.hasImage(ARROW_IMG)) {
    const a = makeArrowImage();
    map.addImage(ARROW_IMG, a, { sdf: true });
  }
  const empty = { type: "FeatureCollection", features: [] } as const;
  map.addSource(SRC_LINES, { type: "geojson", data: empty as any });
  map.addSource(SRC_ARROWS, { type: "geojson", data: empty as any });

  map.addLayer({
    id: "wm-mv-line-solid",
    type: "line",
    source: SRC_LINES,
    filter: ["match", ["get", "style"], ["advance", "retreat"], true, false],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": ["get", "color"],
      "line-width": 4,
      "line-opacity": 0.92,
    },
  });
  map.addLayer({
    id: "wm-mv-line-dashed",
    type: "line",
    source: SRC_LINES,
    filter: ["==", ["get", "style"], "artillery"],
    layout: { "line-cap": "butt", "line-join": "round" },
    paint: {
      "line-color": ["get", "color"],
      "line-width": 4,
      "line-opacity": 0.95,
      "line-dasharray": [2, 2],
    },
  });
  map.addLayer({
    id: "wm-mv-line-naval",
    type: "line",
    source: SRC_LINES,
    filter: ["==", ["get", "style"], "naval"],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": ["get", "color"],
      "line-width": 3.5,
      "line-opacity": 0.8,
      "line-dasharray": [4, 3],
    },
  });
  map.addLayer({
    id: "wm-mv-arrow",
    type: "symbol",
    source: SRC_ARROWS,
    layout: {
      "icon-image": ARROW_IMG,
      "icon-size": 0.8,
      "icon-rotate": ["get", "bearing"],
      "icon-rotation-alignment": "map",
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
    },
    paint: { "icon-color": ["get", "color"] },
  });
}

export interface PreparedMovement {
  mv: Movement;
  color: string;
  cumKm: number[]; // 各頂點的累積距離（公里），cumKm[0]=0
  totalKm: number;
}

/**
 * 換 doc 時預先算好每條 movement 的顏色與累積距離，render 時只剩切片與內插，
 * 不必每幀重建幾何、重算長度。回傳值依 phase index 排列。
 */
export function prepareMovements(doc: TimelineDoc): PreparedMovement[][] {
  const colors = factionColorMap(doc);
  return doc.phases.map((phase) =>
    phase.movements.map((mv) => {
      const cumKm = [0];
      for (let i = 1; i < mv.path.length; i++) {
        cumKm.push(cumKm[i - 1] + haversineKm(mv.path[i - 1], mv.path[i]));
      }
      return { mv, color: colors[mv.factionId] ?? "#888", cumKm, totalKm: cumKm[cumKm.length - 1] };
    })
  );
}

/**
 * 依時間計算每條 movement 的生長進度，產出 line + arrow 的 GeoJSON 並更新 source。
 * 回傳本幀的內容 key；與 prevKey 相同代表畫面內容沒變，直接略過 setData（免觸發 worker 重新切 tile）。
 */
export function updateMovements(
  map: MlMap,
  prepared: PreparedMovement[][],
  currentIndex: number,
  localT: number,
  prevKey: string | null
): string {
  // 過去 phase 的內容只取決於 currentIndex；當前 phase 取決於每條的進度
  const fracOf = (pm: PreparedMovement) =>
    clamp01((localT - (pm.mv.startSec ?? 0)) / Math.max(0.001, pm.mv.drawDurationSec));
  const current = prepared[currentIndex] ?? [];
  const key = currentIndex + "|" + current.map(fracOf).join(",");
  if (key === prevKey) return key;

  const lineFeatures: any[] = [];
  const arrowFeatures: any[] = [];

  for (let i = 0; i <= currentIndex && i < prepared.length; i++) {
    const past = i < currentIndex;
    for (const pm of prepared[i]) {
      const { mv, color } = pm;
      if (past && mv.persist === false) continue; // 不累積的 movement,過了本階段就消失
      const frac = past ? 1 : fracOf(pm);
      if (frac <= 0 || mv.path.length < 2) continue;

      const coords = frac >= 1 ? mv.path : sliceAlong(mv.path, pm.cumKm, pm.totalKm * frac);
      lineFeatures.push({
        type: "Feature",
        geometry: { type: "LineString", coordinates: coords },
        properties: { color, style: mv.style },
      });

      const tip = coords[coords.length - 1];
      const prev = lastDistinctBefore(coords);
      if (prev) {
        arrowFeatures.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: tip },
          properties: { color, bearing: bearing(prev, tip) },
        });
      }
    }
  }

  (map.getSource(SRC_LINES) as any)?.setData({
    type: "FeatureCollection",
    features: lineFeatures,
  });
  (map.getSource(SRC_ARROWS) as any)?.setData({
    type: "FeatureCollection",
    features: arrowFeatures,
  });
  return key;
}
