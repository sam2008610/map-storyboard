import * as turf from "@turf/turf";
import type { Map as MlMap } from "maplibre-gl";
import type { TimelineDoc } from "../types/timeline";
import type { BuiltTimeline } from "../engine/timeline";
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
    filter: ["!", ["get", "dashed"]],
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
    filter: ["get", "dashed"],
    layout: { "line-cap": "butt", "line-join": "round" },
    paint: {
      "line-color": ["get", "color"],
      "line-width": 4,
      "line-opacity": 0.95,
      "line-dasharray": [2, 2],
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

/** 依時間計算每條 movement 的生長進度，產出 line + arrow 的 GeoJSON 並更新 source。 */
export function updateMovements(
  map: MlMap,
  doc: TimelineDoc,
  built: BuiltTimeline,
  currentIndex: number,
  localT: number
) {
  const colors = factionColorMap(doc);
  const lineFeatures: any[] = [];
  const arrowFeatures: any[] = [];

  for (const span of built.spans) {
    if (span.index > currentIndex) break;
    for (const mv of span.phase.movements) {
      const color = colors[mv.factionId] ?? "#888";
      const dashed = mv.style === "artillery";
      const frac =
        span.index < currentIndex ? 1 : clamp01(localT / Math.max(0.001, mv.drawDurationSec));
      if (frac <= 0 || mv.path.length < 2) continue;

      const line = turf.lineString(mv.path);
      const total = turf.length(line, { units: "kilometers" });
      let drawn: GeoJSON.Feature<GeoJSON.LineString>;
      if (frac >= 1) {
        drawn = line;
      } else {
        const dist = Math.max(total * frac, 1e-4);
        drawn = turf.lineSliceAlong(line, 0, dist, { units: "kilometers" });
      }
      lineFeatures.push({ ...drawn, properties: { color, dashed } });

      const coords = drawn.geometry.coordinates;
      if (coords.length >= 2) {
        const tip = coords[coords.length - 1] as [number, number];
        const prev = coords[coords.length - 2] as [number, number];
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
}
