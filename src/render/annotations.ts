import type { Map as MlMap } from "maplibre-gl";
import type { BuiltTimeline } from "../engine/timeline";
import { labelStyleForBasemap } from "./labelStyle";

const SRC = "wm-annotations";

export function addAnnotationLayers(map: MlMap, basemapId: string) {
  const label = labelStyleForBasemap(basemapId).annotation;
  map.addSource(SRC, {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] } as any,
  });
  map.addLayer({
    id: "wm-annotation",
    type: "symbol",
    source: SRC,
    layout: {
      "text-field": ["get", "text"],
      "text-font": ["Noto Sans Regular"],
      "text-size": ["match", ["get", "kind"], "title", 26, 18],
      "text-offset": [0, -1.6],
      "text-anchor": "bottom",
      "text-allow-overlap": true,
    },
    paint: {
      "text-color": label.color,
      "text-halo-color": label.haloColor,
      "text-halo-width": label.haloWidth,
    },
  });
}

/**
 * 顯示當前 phase 中、已到 startSec 的 annotations。
 * 可見集合隨 localT 單調增加，故 (phase, 可見數量) 即可代表內容；key 未變時略過 setData。
 */
export function updateAnnotations(
  map: MlMap,
  built: BuiltTimeline,
  currentIndex: number,
  localT: number,
  prevKey: string | null
): string {
  const span = built.spans[currentIndex];
  const visible = (span?.phase.annotations ?? []).filter((a) => (a.startSec ?? 0) <= localT);
  const key = `${currentIndex}|${visible.length}`;
  if (key === prevKey) return key;

  const features = visible.map((a) => ({
    type: "Feature" as const,
    geometry: { type: "Point" as const, coordinates: [a.lng, a.lat] },
    properties: { text: a.text, kind: a.kind ?? "caption" },
  }));
  (map.getSource(SRC) as any)?.setData({ type: "FeatureCollection", features });
  return key;
}
