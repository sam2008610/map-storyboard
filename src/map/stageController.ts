import type { TimelineDoc } from "../types/timeline";

// MapStage 對外暴露的命令介面，供 App 的 transport / 匯出按鈕呼叫。
export interface StageController {
  play(): void;
  pause(): void;
  toggle(): void;
  seek(t: number): void;
  setDoc(doc: TimelineDoc): void;
  exportWebM(): Promise<void>;
}
