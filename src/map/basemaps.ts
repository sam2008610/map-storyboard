// 底圖來源抽象化。v1 用 OpenFreeMap（免金鑰、免註冊）。
// 之後要換 MapTiler / 自架 Protomaps，只要在這裡加一筆 styleUrl。

export interface Basemap {
  id: string;
  label: string;
  styleUrl: string;
}

export const BASEMAPS: Basemap[] = [
  { id: "dark", label: "暗色（戰術）", styleUrl: "https://tiles.openfreemap.org/styles/dark" },
  { id: "liberty", label: "明亮", styleUrl: "https://tiles.openfreemap.org/styles/liberty" },
  { id: "positron", label: "簡圖", styleUrl: "https://tiles.openfreemap.org/styles/positron" },
];

export const DEFAULT_BASEMAP_ID = "positron";

export function basemapStyleUrl(id: string): string {
  return (BASEMAPS.find((b) => b.id === id) ?? BASEMAPS[0]).styleUrl;
}
