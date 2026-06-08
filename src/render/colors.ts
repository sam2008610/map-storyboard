import type { Place, TimelineDoc } from "../types/timeline";

// 地形/中性地點在沒有 faction 時的色票（沿用雛形慣例）
const KIND_COLOR: Record<string, string> = {
  terrain: "#7c9166",
  battle: "#9a7bb5",
  castle: "#b8b2a4",
  city: "#cccccc",
};

export function factionColorMap(doc: TimelineDoc): Record<string, string> {
  const m: Record<string, string> = {};
  for (const f of doc.factions) m[f.id] = f.color;
  return m;
}

export function placeColor(p: Place, factions: Record<string, string>): string {
  if (p.faction && factions[p.faction]) return factions[p.faction];
  return KIND_COLOR[p.kind] ?? "#bbbbbb";
}
