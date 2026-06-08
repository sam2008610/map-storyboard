import type { TimelineDoc } from "../types/timeline";
import { DEFAULT_BASEMAP_ID } from "../map/basemaps";

// 自動載入 examples/ 資料夾下所有 .json 當作內建範例。
// 新增一個 examples/*.json 檔就會自動出現在「範例」選單,不必改程式。
const mods = import.meta.glob("/examples/*.json", { eager: true });

export interface Example {
  file: string;
  title: string;
  doc: TimelineDoc;
}

export const EXAMPLES: Example[] = Object.entries(mods)
  .map(([path, m]) => {
    const doc = ((m as any).default ?? m) as TimelineDoc;
    return { file: path.split("/").pop() || path, title: doc.meta?.title || path, doc };
  })
  .sort((a, b) => a.file.localeCompare(b.file));

// 開機預設載入的 doc:優先鳥羽伏見,否則第一個範例。
export const DEFAULT_DOC: TimelineDoc =
  EXAMPLES.find((e) => e.file.includes("toba"))?.doc ?? EXAMPLES[0].doc;

export function blankDoc(): TimelineDoc {
  return {
    meta: {
      title: "未命名戰役",
      subtitle: "",
      aspectRatio: "16:9",
      basemapStyle: DEFAULT_BASEMAP_ID,
      titlePosition: "top-left",
    },
    factions: [
      { id: "a", name: "我方", color: "#5b86d6" },
      { id: "b", name: "敵方", color: "#d6534d" },
    ],
    places: [],
    phases: [
      {
        id: "p1",
        title: "第一階段",
        durationSec: 6,
        transitionSec: 2,
        camera: { center: [135.7, 34.9], zoom: 10, bearing: 0, pitch: 30 },
        movements: [],
      },
    ],
  };
}
