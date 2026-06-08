import type { TimelineDoc } from "../types/timeline";

// 以 localStorage 保存的專案。整份 doc 連同名稱存在瀏覽器,重整後仍在。
// 跨機器備份 / 分享請用匯出 JSON 檔（見 App 的匯出功能）。

export interface ProjectMeta {
  id: string;
  name: string;
  updatedAt: number;
}
interface StoredProject extends ProjectMeta {
  doc: TimelineDoc;
}

const KEY = "warmapstudio.projects.v1";
const LAST = "warmapstudio.lastProjectId";

function readAll(): Record<string, StoredProject> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}
function writeAll(m: Record<string, StoredProject>) {
  localStorage.setItem(KEY, JSON.stringify(m));
}

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "p_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function listProjects(): ProjectMeta[] {
  return Object.values(readAll())
    .map(({ id, name, updatedAt }) => ({ id, name, updatedAt }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getProject(id: string): StoredProject | null {
  return readAll()[id] ?? null;
}

/** 存檔:有 id 則覆寫,否則新建。回傳專案 meta。 */
export function saveProject(opts: { id?: string; name: string; doc: TimelineDoc }): ProjectMeta {
  const all = readAll();
  const id = opts.id ?? uid();
  const rec: StoredProject = { id, name: opts.name, doc: opts.doc, updatedAt: Date.now() };
  all[id] = rec;
  writeAll(all);
  setLastProjectId(id);
  return { id, name: rec.name, updatedAt: rec.updatedAt };
}

export function deleteProject(id: string) {
  const all = readAll();
  delete all[id];
  writeAll(all);
  if (getLastProjectId() === id) setLastProjectId(null);
}

export function getLastProjectId(): string | null {
  return localStorage.getItem(LAST);
}
export function setLastProjectId(id: string | null) {
  if (id) localStorage.setItem(LAST, id);
  else localStorage.removeItem(LAST);
}
