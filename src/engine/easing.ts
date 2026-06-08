export type Easing = (t: number) => number;

export const linear: Easing = (t) => t;

export const easeInOutCubic: Easing = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const easeOutCubic: Easing = (t) => 1 - Math.pow(1 - t, 3);

export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
