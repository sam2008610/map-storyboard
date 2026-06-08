import type { Phase, TimelineDoc } from "../types/timeline";

export interface PhaseSpan {
  phase: Phase;
  index: number;
  startTime: number; // 累積起始時間（秒）
  endTime: number;
}

export interface BuiltTimeline {
  spans: PhaseSpan[];
  totalDuration: number;
}

export function buildTimeline(doc: TimelineDoc): BuiltTimeline {
  let t = 0;
  const spans: PhaseSpan[] = doc.phases.map((phase, index) => {
    const startTime = t;
    const endTime = t + Math.max(0.001, phase.durationSec);
    t = endTime;
    return { phase, index, startTime, endTime };
  });
  return { spans, totalDuration: t };
}

export interface PhaseAt {
  span: PhaseSpan;
  localT: number; // 在此 phase 內經過的秒數
  /** 相機過渡進度 0..1（前 transitionSec 秒由 0→1，之後維持 1） */
  transitionProgress: number;
}

export function phaseAt(built: BuiltTimeline, time: number): PhaseAt {
  const { spans, totalDuration } = built;
  const t = Math.max(0, Math.min(time, totalDuration));
  const span =
    spans.find((s) => t >= s.startTime && t < s.endTime) ?? spans[spans.length - 1];
  const localT = t - span.startTime;
  const transSec = span.phase.transitionSec ?? Math.min(2, span.phase.durationSec * 0.4);
  const transitionProgress = transSec > 0 ? Math.min(1, localT / transSec) : 1;
  return { span, localT, transitionProgress };
}
