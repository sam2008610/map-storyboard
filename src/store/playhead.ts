import { useSyncExternalStore } from "react";

/**
 * 播放頭時間的小型外部 store。時鐘每幀都會更新時間,若放在 App 的 state
 * 會讓整棵元件樹每幀 re-render;改由需要顯示時間的元件自行訂閱。
 */
export interface Playhead {
  get(): number;
  set(t: number): void;
  subscribe(listener: () => void): () => void;
}

export function createPlayhead(): Playhead {
  let time = 0;
  const listeners = new Set<() => void>();
  return {
    get: () => time,
    set: (t) => {
      if (t === time) return;
      time = t;
      listeners.forEach((l) => l());
    },
    subscribe: (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}

export function usePlayheadTime(p: Playhead): number {
  return useSyncExternalStore(p.subscribe, p.get);
}
