import type { Camera } from "../types/timeline";
import { easeInOutCubic } from "./easing";
import type { BuiltTimeline, PhaseAt } from "./timeline";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// bearing 取最短角差插值（避免 350°→10° 繞一大圈）
function lerpAngle(a: number, b: number, t: number): number {
  let d = ((b - a + 540) % 360) - 180;
  return a + d * t;
}

function lerpCamera(from: Camera, to: Camera, t: number): Camera {
  return {
    center: [lerp(from.center[0], to.center[0], t), lerp(from.center[1], to.center[1], t)],
    zoom: lerp(from.zoom, to.zoom, t),
    bearing: lerpAngle(from.bearing, to.bearing, t),
    pitch: lerp(from.pitch, to.pitch, t),
  };
}

/**
 * 決定性相機狀態：phase i 的前 transitionSec 由「上一 phase 的 camera」eased 插值到
 * 「此 phase 的 camera」，其餘時間維持。第一個 phase 直接定在自身 camera。
 * 不依賴真實時間，播放與逐幀匯出結果一致。
 */
export function cameraAt(built: BuiltTimeline, at: PhaseAt): Camera {
  const { span, transitionProgress } = at;
  const target = span.phase.camera;
  // 硬切:進入此 phase 直接定在目標鏡頭,不從上一鏡頭插值(用於遠距離跳轉)
  if (span.index === 0 || target.transition === "cut") return target;
  const prev = built.spans[span.index - 1].phase.camera;
  return lerpCamera(prev, target, easeInOutCubic(transitionProgress));
}
