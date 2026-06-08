import { useRef } from "react";
import type { ProjectMeta } from "../store/projects";
import { EXAMPLES } from "../data/examples";

interface Props {
  projectName: string;
  dirty: boolean;
  projects: ProjectMeta[];
  onRename: (name: string) => void;
  onSave: () => void;
  onSaveAs: () => void;
  onNew: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onLoadExample: (file: string) => void;
  onImport: (file: File) => void;
  onExport: () => void;
}

export default function ProjectBar(p: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="projectbar">
      <div className="pb-row">
        <input
          className="pb-name"
          value={p.projectName}
          onChange={(e) => p.onRename(e.target.value)}
          placeholder="專案名稱"
        />
        <span className={"pb-dirty" + (p.dirty ? " on" : "")} title={p.dirty ? "有未存變更" : "已存檔"}>
          ●
        </span>
      </div>

      <div className="pb-row">
        <button onClick={p.onSave}>存檔</button>
        <button className="ghost" onClick={p.onSaveAs}>
          另存
        </button>
        <button className="ghost" onClick={p.onNew}>
          新建
        </button>
        <details className="pb-menu">
          <summary>開啟 ▾</summary>
          <div className="pb-pop">
            {p.projects.length === 0 && <div className="pb-empty">(尚無存檔)</div>}
            {p.projects.map((pr) => (
              <div className="pb-item" key={pr.id}>
                <button className="pb-open" onClick={() => p.onOpen(pr.id)}>
                  {pr.name}
                </button>
                <button
                  className="pb-del"
                  title="刪除"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`刪除專案「${pr.name}」?`)) p.onDelete(pr.id);
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </details>
      </div>

      <div className="pb-row">
        <select
          className="pb-example"
          value=""
          onChange={(e) => {
            if (e.target.value) p.onLoadExample(e.target.value);
            e.target.value = "";
          }}
        >
          <option value="">範例 ▾</option>
          {EXAMPLES.map((ex) => (
            <option key={ex.file} value={ex.file}>
              {ex.title}
            </option>
          ))}
        </select>
        <button className="ghost" onClick={() => fileRef.current?.click()}>
          匯入
        </button>
        <button className="ghost" onClick={p.onExport}>
          匯出
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) p.onImport(f);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
