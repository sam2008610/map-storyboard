import type { Map as MlMap } from "maplibre-gl";
import type { TimelineDoc } from "../types/timeline";
import type { BuiltTimeline } from "../engine/timeline";
import { factionColorMap, placeColor } from "./colors";
import { labelStyleForBasemap } from "./labelStyle";

const SRC = "wm-places";

export function addPlaceLayers(map: MlMap, basemapId: string) {
  const label = labelStyleForBasemap(basemapId).place;
  map.addSource(SRC, {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] } as any,
  });
  map.addLayer({
    id: "wm-place-circle",
    type: "circle",
    source: SRC,
    paint: {
      "circle-radius": 6,
      "circle-color": ["get", "color"],
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 2,
    },
  });
  map.addLayer({
    id: "wm-place-label",
    type: "symbol",
    source: SRC,
    layout: {
      "text-field": ["get", "name"],
      "text-font": ["Noto Sans Regular"],
      "text-size": 14,
      "text-offset": [0, 1.1],
      "text-anchor": "top",
      "text-allow-overlap": false,
    },
    paint: {
      "text-color": label.color,
      "text-halo-color": label.haloColor,
      "text-halo-width": label.haloWidth,
    },
  });
}

/** appearAtPhase 之 phase index <= 當前 index 才顯示。 */
export function updatePlaces(
  map: MlMap,
  doc: TimelineDoc,
  built: BuiltTimeline,
  currentIndex: number
) {
  const colors = factionColorMap(doc);
  const phaseIndex: Record<string, number> = {};
  built.spans.forEach((s) => (phaseIndex[s.phase.id] = s.index));

  const features = doc.places
    .filter((p) => {
      if (!p.appearAtPhase) return true;
      const idx = phaseIndex[p.appearAtPhase] ?? 0;
      return idx <= currentIndex;
    })
    .map((p) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
      properties: { name: p.name, color: placeColor(p, colors) },
    }));

  (map.getSource(SRC) as any)?.setData({ type: "FeatureCollection", features });
}
