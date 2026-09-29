import type { TimelineDoc } from "../types/timeline";

// 匯入 / JSON 編輯器套用前的結構驗證。只檢查「缺了會讓渲染出錯」的欄位與型別，
// 錯誤訊息帶路徑（如 phases[2].camera.center），方便定位。

const ASPECTS = ["16:9", "9:16", "1:1"];
const TITLE_POS = ["top-left", "top-center", "top-right"];
const PLACE_KINDS = ["city", "castle", "battle", "terrain"];
const LABEL_DIRS = ["top", "bottom", "left", "right"];
const MOVEMENT_STYLES = ["advance", "retreat", "artillery", "naval"];
const ANNOTATION_KINDS = ["caption", "title"];
const MAX_ERRORS = 8;

type Obj = Record<string, unknown>;

export type ValidationResult = { ok: true; doc: TimelineDoc } | { ok: false; errors: string[] };

export function validateDoc(input: unknown): ValidationResult {
  const errors: string[] = [];
  const err = (path: string, msg: string) => errors.push(`${path}：${msg}`);

  const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
  const num = (v: unknown) => typeof v === "number" && Number.isFinite(v);
  const str = (v: unknown) => typeof v === "string";

  const reqStr = (o: Obj, k: string, path: string) => {
    if (!str(o[k])) err(`${path}.${k}`, "需為字串");
  };
  const reqNum = (o: Obj, k: string, path: string, min = -Infinity) => {
    if (!num(o[k])) err(`${path}.${k}`, "需為數字");
    else if ((o[k] as number) < min) err(`${path}.${k}`, `需 ≥ ${min}`);
  };
  const optNum = (o: Obj, k: string, path: string, min = -Infinity) => {
    if (o[k] !== undefined) reqNum(o, k, path, min);
  };
  const oneOf = (o: Obj, k: string, path: string, allowed: string[], optional = false) => {
    if (optional && o[k] === undefined) return;
    if (!allowed.includes(o[k] as string)) err(`${path}.${k}`, `需為 ${allowed.join(" / ")} 之一`);
  };
  const lngLat = (v: unknown, path: string) => {
    if (!Array.isArray(v) || v.length !== 2 || !num(v[0]) || !num(v[1])) {
      err(path, "需為 [lng, lat] 數字陣列");
      return;
    }
    if (Math.abs(v[0]) > 180 || Math.abs(v[1]) > 90) err(path, "經緯度超出範圍（注意順序為 [lng, lat]）");
  };
  const arr = (o: Obj, k: string, path: string, optional = false): unknown[] => {
    if (optional && o[k] === undefined) return [];
    if (!Array.isArray(o[k])) {
      err(path ? `${path}.${k}` : k, "需為陣列");
      return [];
    }
    return o[k] as unknown[];
  };
  const each = (items: unknown[], path: string, fn: (o: Obj, p: string) => void) =>
    items.forEach((it, i) => {
      const p = `${path}[${i}]`;
      if (isObj(it)) fn(it, p);
      else err(p, "需為物件");
    });

  if (!isObj(input)) return { ok: false, errors: ["根節點需為物件"] };

  if (!isObj(input.meta)) err("meta", "缺少或不是物件");
  else {
    const m = input.meta;
    reqStr(m, "title", "meta");
    oneOf(m, "aspectRatio", "meta", ASPECTS);
    reqStr(m, "basemapStyle", "meta");
    oneOf(m, "titlePosition", "meta", TITLE_POS, true);
  }

  each(arr(input, "factions", ""), "factions", (f, p) => {
    reqStr(f, "id", p);
    reqStr(f, "name", p);
    reqStr(f, "color", p);
  });

  each(arr(input, "places", ""), "places", (pl, p) => {
    reqStr(pl, "id", p);
    reqStr(pl, "name", p);
    reqNum(pl, "lng", p);
    reqNum(pl, "lat", p);
    if (num(pl.lng) && num(pl.lat)) lngLat([pl.lng, pl.lat], `${p}.(lng, lat)`);
    oneOf(pl, "kind", p, PLACE_KINDS);
    oneOf(pl, "labelDir", p, LABEL_DIRS, true);
  });

  const phases = arr(input, "phases", "");
  if (Array.isArray(input.phases) && phases.length === 0) err("phases", "至少需要一個分鏡");
  each(phases, "phases", (ph, p) => {
    reqStr(ph, "id", p);
    reqStr(ph, "title", p);
    reqNum(ph, "durationSec", p, 0.001);
    optNum(ph, "transitionSec", p, 0);
    if (!isObj(ph.camera)) err(`${p}.camera`, "缺少或不是物件");
    else {
      const c = ph.camera;
      lngLat(c.center, `${p}.camera.center`);
      reqNum(c, "zoom", `${p}.camera`);
      reqNum(c, "bearing", `${p}.camera`);
      reqNum(c, "pitch", `${p}.camera`);
      oneOf(c, "transition", `${p}.camera`, ["ease", "cut"], true);
    }
    each(arr(ph, "movements", p), `${p}.movements`, (mv, mp) => {
      reqStr(mv, "id", mp);
      reqStr(mv, "factionId", mp);
      oneOf(mv, "style", mp, MOVEMENT_STYLES);
      reqNum(mv, "drawDurationSec", mp, 0);
      optNum(mv, "startSec", mp, 0);
      const path = arr(mv, "path", mp);
      if (Array.isArray(mv.path) && path.length < 2) err(`${mp}.path`, "至少需要 2 個點");
      path.forEach((pt, i) => lngLat(pt, `${mp}.path[${i}]`));
    });
    each(arr(ph, "annotations", p, true), `${p}.annotations`, (a, ap) => {
      reqStr(a, "text", ap);
      reqNum(a, "lng", ap);
      reqNum(a, "lat", ap);
      optNum(a, "startSec", ap, 0);
      oneOf(a, "kind", ap, ANNOTATION_KINDS, true);
    });
  });

  if (errors.length) {
    const shown = errors.slice(0, MAX_ERRORS);
    if (errors.length > MAX_ERRORS) shown.push(`…以及另外 ${errors.length - MAX_ERRORS} 個問題`);
    return { ok: false, errors: shown };
  }
  return { ok: true, doc: input as unknown as TimelineDoc };
}
