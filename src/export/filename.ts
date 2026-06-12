import type { AspectRatio } from "../types/timeline";

/**
 * @brief
 * Build a filesystem-safe export basename from the project title.
@param title Raw project or meta title.
 */
export function sanitizeFilenameBase(title: string): string {
  return title.replace(/[\\/:*?"<>|]/g, "_").trim() || "warmap";
}

/** Local timestamp tag for export filenames, e.g. 20250612-153045. */
export function timestampTag(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

/**
 * @brief
 * Map export resolutionScale to a short tier label used in filenames.
@param scale Export resolution scale (1 = full stage resolution).
 */
export function resolutionTierLabel(scale: number): string {
  if (scale >= 0.95) return "1080p";
  if (scale >= 0.6) return "720p";
  return "480p";
}

/**
 * @brief
 * Compose a video export filename with title, timestamp, aspect ratio, and resolution tier.
@param opts Filename parts gathered at export time.
 */
export function buildExportFilename(opts: {
  title: string;
  ext: "mp4" | "webm";
  aspectRatio: AspectRatio;
  resolutionScale: number;
}): string {
  const base = sanitizeFilenameBase(opts.title);
  const aspect = opts.aspectRatio.replace(":", "x");
  const tier = resolutionTierLabel(opts.resolutionScale);
  return `${base}_${timestampTag()}_${aspect}-${tier}.${opts.ext}`;
}
