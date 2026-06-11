import type { Map as MlMap } from "maplibre-gl";
import type { TimelineDoc } from "../types/timeline";
import type { BuiltTimeline } from "../engine/timeline";
import { factionColorMap, placeColor } from "./colors";
import { labelStyleForBasemap } from "./labelStyle";

const SRC = "wm-places";
const PLACE_LAYERS = ["wm-place-hit", "wm-place-circle"] as const;

// 依 kind 變形的圓點尺寸/外框(播放 / 編輯兩種大小,維持相對關係)
const RADIUS: any = ["match", ["get", "kind"], "castle", 8, "battle", 7, "terrain", 5, 6];
const RADIUS_EDIT: any = ["match", ["get", "kind"], "castle", 13, "battle", 12, "terrain", 11, 12];
const STROKE: any = ["match", ["get", "kind"], "castle", 3.5, 2];
const STROKE_EDIT: any = ["match", ["get", "kind"], "castle", 4, 3];
// 依 labelDir 的標籤位移(預設 bottom=點下方,維持現行外觀)
const LABEL_OFFSET: any = [
  "match",
  ["get", "labelDir"],
  "top", ["literal", [0, -1.3]],
  "left", ["literal", [-1.8, 0]],
  "right", ["literal", [1.8, 0]],
  ["literal", [0, 1.3]],
];

export function addPlaceLayers(map: MlMap, basemapId: string) {
  const label = labelStyleForBasemap(basemapId).place;
  map.addSource(SRC, {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] } as any,
  });
  // Edit mode only: invisible large circle for easier click / drag hit testing.
  map.addLayer({
    id: "wm-place-hit",
    type: "circle",
    source: SRC,
    layout: { visibility: "none" },
    paint: {
      "circle-radius": 20,
      "circle-color": "rgba(0,0,0,0)",
      "circle-stroke-width": 0,
    },
  });
  // Selection ring in edit mode (default filter matches no id).
  map.addLayer({
    id: "wm-place-selected",
    type: "circle",
    source: SRC,
    filter: ["==", ["get", "id"], ""],
    paint: {
      "circle-radius": 11,
      "circle-color": "rgba(0,0,0,0)",
      "circle-stroke-color": "#ffd27f",
      "circle-stroke-width": 3,
    },
  });
  map.addLayer({
    id: "wm-place-circle",
    type: "circle",
    source: SRC,
    paint: {
      "circle-radius": RADIUS,
      "circle-color": ["get", "color"],
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": STROKE,
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
      "text-offset": LABEL_OFFSET,
      "text-anchor": "center",
      "text-allow-overlap": false,
    },
    paint: {
      "text-color": label.color,
      "text-halo-color": label.haloColor,
      "text-halo-width": label.haloWidth,
    },
  });
}

/**
 * Show places whose appearAtPhase index is <= currentIndex.
 * editMode=true shows all places for editing.
 * override updates one place position live while dragging without mutating doc.
 */
export function updatePlaces(
  map: MlMap,
  doc: TimelineDoc,
  built: BuiltTimeline,
  currentIndex: number,
  opts?: { editMode?: boolean; override?: { id: string; lng: number; lat: number } }
) {
  const colors = factionColorMap(doc);
  const phaseIndex: Record<string, number> = {};
  built.spans.forEach((s) => (phaseIndex[s.phase.id] = s.index));
  const ov = opts?.override;

  const features = doc.places
    .filter((p) => {
      if (opts?.editMode) return true;
      if (!p.appearAtPhase) return true;
      const idx = phaseIndex[p.appearAtPhase] ?? 0;
      return idx <= currentIndex;
    })
    .map((p) => {
      const lng = ov && ov.id === p.id ? ov.lng : p.lng;
      const lat = ov && ov.id === p.id ? ov.lat : p.lat;
      return {
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [lng, lat] },
        properties: {
          id: p.id,
          name: p.name,
          color: placeColor(p, colors),
          kind: p.kind,
          labelDir: p.labelDir ?? "bottom",
        },
      };
    });

  (map.getSource(SRC) as any)?.setData({ type: "FeatureCollection", features });
}

/** Highlight the selected place in edit mode; pass null to clear. */
export function setSelectedPlace(map: MlMap, id: string | null) {
  if (!map.getLayer("wm-place-selected")) return;
  map.setFilter("wm-place-selected", ["==", ["get", "id"], id ?? " "]);
}

/** Layers used for place click / drag hit testing in edit mode. */
export function placeInteractionLayers(): readonly string[] {
  return PLACE_LAYERS;
}

/**
 * @brief
 * Toggle edit-mode place visuals and hit targets without recreating layers.
@param map MapLibre map instance.
@param enabled Whether edit mode is active.
 */
export function setPlaceEditMode(map: MlMap, enabled: boolean) {
  if (!map.getLayer("wm-place-hit")) return;
  map.setLayoutProperty("wm-place-hit", "visibility", enabled ? "visible" : "none");
  map.setPaintProperty("wm-place-circle", "circle-radius", enabled ? RADIUS_EDIT : RADIUS);
  map.setPaintProperty("wm-place-circle", "circle-stroke-width", enabled ? STROKE_EDIT : STROKE);
  map.setPaintProperty("wm-place-selected", "circle-radius", enabled ? 22 : 11);
}
