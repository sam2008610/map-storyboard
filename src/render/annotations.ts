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
      "text-size": 15,
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

/** 顯示當前 phase 的 annotations。 */
export function updateAnnotations(
  map: MlMap,
  built: BuiltTimeline,
  currentIndex: number
) {
  const span = built.spans[currentIndex];
  const annots = span?.phase.annotations ?? [];
  const features = annots.map((a) => ({
    type: "Feature" as const,
    geometry: { type: "Point" as const, coordinates: [a.lng, a.lat] },
    properties: { text: a.text },
  }));
  (map.getSource(SRC) as any)?.setData({ type: "FeatureCollection", features });
}
