import type { Camera, TimelineDoc } from "../types/timeline";

export type ExportFormat = "webm" | "mp4";

export interface ExportOptions {
  format: ExportFormat;
  videoBitsPerSecond: number; // 錄製位元率上限(畫質↔大小)
  resolutionScale: number; // 1=原始(1080p)、0.667≈720p、0.444≈480p
  onProgress?: (fraction: number) => void; // 0..1
}

// MapStage 對外暴露的命令介面，供 App 的 transport / 匯出 / 編輯按鈕呼叫。
export interface StageController {
  play(): void;
  pause(): void;
  toggle(): void;
  seek(t: number): void;
  setDoc(doc: TimelineDoc): void;
  /** 回傳 true=完成並下載、false=使用者取消。 */
  exportVideo(opts: ExportOptions): Promise<boolean>;
  cancelExport(): void;
  /** 影片總長(秒),供匯出視窗顯示預估時間/大小。 */
  totalDuration(): number;
  /** 讀取目前地圖鏡頭(供編輯模式「設為本分鏡鏡頭」)。 */
  getCamera(): Camera;
}
