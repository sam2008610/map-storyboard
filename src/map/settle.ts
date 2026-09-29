import type { Map as MlMap } from "maplibre-gl";

// MapLibre 內部 dirty 旗標（私有欄位）：資料載入完成會設 _sourcesDirty，
// 樣式變動設 _styleDirty，文字標籤擺放未完成時 _placementDirty 為 true。
interface MapInternals {
  _sourcesDirty?: boolean;
  _styleDirty?: boolean;
  _placementDirty?: boolean;
}

/**
 * 同步重繪地圖，並等到圖磚、GeoJSON（worker 非同步處理）、標籤擺放都完成，
 * 確保畫面是這一幀的完整狀態。不依賴 requestAnimationFrame，背景分頁也能推進。
 * 等待期間只在有東西變動時才重繪，避免反覆整張重畫。
 * 超過 timeoutMs 仍未就緒（例如網路很慢）就以目前畫面為準繼續。
 */
export async function renderSettled(map: MlMap, timeoutMs = 8000): Promise<void> {
  const m = map as unknown as MapInternals;
  const deadline = performance.now() + timeoutMs;
  map.redraw();
  while (!(map.loaded() && !m._placementDirty) && performance.now() < deadline) {
    await new Promise((r) => setTimeout(r, 4));
    if (m._sourcesDirty || m._styleDirty || m._placementDirty) map.redraw();
  }
}

/**
 * 暫時關閉標籤淡入淡出（預設 300ms，依真實時間計算），讓逐幀匯出的標籤狀態與幀時間無關。
 * 回傳還原函式。_fadeDuration 為私有欄位，不存在時不做任何事。
 */
export function disableLabelFade(map: MlMap): () => void {
  const m = map as unknown as { _fadeDuration?: number };
  if (typeof m._fadeDuration !== "number") return () => {};
  const prev = m._fadeDuration;
  m._fadeDuration = 0;
  return () => {
    m._fadeDuration = prev;
  };
}
