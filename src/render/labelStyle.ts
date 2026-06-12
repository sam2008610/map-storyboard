export interface TextLabelPaint {
  color: string;
  haloColor: string;
  haloWidth: number;
}

export interface MapLabelStyle {
  annotation: TextLabelPaint;
  place: TextLabelPaint;
}

/**
 * @brief
 * Resolve label paint for the active basemap so text stays readable on light and dark tiles.
@param basemapId Basemap id from basemaps.ts.
 */
export function labelStyleForBasemap(basemapId: string): MapLabelStyle {
  if (basemapId === "dark") {
    return {
      annotation: { color: "#ffd27f", haloColor: "#0d0d0d", haloWidth: 2.4 },
      place: { color: "#f3ede1", haloColor: "#0d0d0d", haloWidth: 1.8 },
    };
  }
  // Light basemaps: places use cool charcoal; annotations use warm rust so the two stay distinct.
  return {
    annotation: { color: "#9a3412", haloColor: "#ffffff", haloWidth: 1.6 },
    place: { color: "#1c1917", haloColor: "#ffffff", haloWidth: 2.6 },
  };
}
