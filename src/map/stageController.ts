import type { Camera, TimelineDoc } from "../types/timeline";

// MapStage 對外暴露的命令介面，供 App 的 transport / 匯出 / 編輯按鈕呼叫。
export interface StageController {
  play(): void;
  pause(): void;
  toggle(): void;
  seek(t: number): void;
  setDoc(doc: TimelineDoc): void;
  exportWebM(): Promise<void>;
  /** 讀取目前地圖鏡頭(供編輯模式「設為本分鏡鏡頭」)。 */
  getCamera(): Camera;
}
