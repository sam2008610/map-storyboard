import { useEffect, useRef, useState } from "react";
import type { AspectRatio, Place, TimelineDoc, TitlePosition } from "./types/timeline";
import { DEFAULT_DOC, EXAMPLES, blankDoc } from "./data/examples";
import {
  deleteProject,
  getLastProjectId,
  getProject,
  listProjects,
  saveProject,
  setLastProjectId,
  type ProjectMeta,
} from "./store/projects";
import { createPlayhead } from "./store/playhead";
import { DEFAULT_BASEMAP_ID } from "./map/basemaps";
import { sanitizeFilenameBase } from "./export/filename";
import { validateDoc } from "./data/validate";
import MapStage, { type EditTool } from "./map/MapStage";
import type { StageController, ExportOptions } from "./map/stageController";
import Sidebar from "./ui/Sidebar";
import ProjectBar from "./ui/ProjectBar";
import TransportBar from "./ui/TransportBar";
import EditorPanel from "./ui/EditorPanel";
import ExportDialog from "./ui/ExportDialog";

function withDefaultBasemap(doc: TimelineDoc): TimelineDoc {
  return { ...doc, meta: { ...doc.meta, basemapStyle: DEFAULT_BASEMAP_ID } };
}

function initialWorkspace(): { doc: TimelineDoc; name: string; id: string | null } {
  const last = getLastProjectId();
  if (last) {
    const p = getProject(last);
    if (p) return { doc: p.doc, name: p.name, id: p.id };
  }
  return { doc: withDefaultBasemap(DEFAULT_DOC), name: DEFAULT_DOC.meta.title, id: null };
}

export default function App() {
  // 只在首次 render 讀 localStorage（放在元件本體會每次 render 都重讀、重 parse）
  const [init] = useState(initialWorkspace);
  const [doc, setDocState] = useState<TimelineDoc>(() => structuredClone(init.doc));
  const [projectName, setProjectName] = useState(init.name);
  const [currentId, setCurrentId] = useState<string | null>(init.id);
  const [dirty, setDirty] = useState(false);
  const [projects, setProjects] = useState<ProjectMeta[]>(() => listProjects());

  // 播放時間每幀變動,放在外部 store 由 TransportBar 自行訂閱,避免整個 App 每幀 re-render
  const [playhead] = useState(createPlayhead);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const controllerRef = useRef<StageController | null>(null);

  // ---- 編輯模式狀態 ----
  const [editMode, setEditMode] = useState(false);
  const [selectedPhaseIndex, setSelectedPhaseIndex] = useState(0);
  const [activeTool, setActiveTool] = useState<EditTool>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  const aspectRatio: AspectRatio = doc.meta.aspectRatio;
  const basemapId = doc.meta.basemapStyle;

  const refresh = () => setProjects(listProjects());

  // 有未存變更時,關閉 / 重新整理分頁前提醒
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // 改動「地理內容」(places/phases/factions…)：需重建場景時間軸
  const applyDoc = (next: TimelineDoc, markDirty = true) => {
    setDocState(next);
    controllerRef.current?.setDoc(next);
    setDirty(markDirty);
  };

  // 只改 meta(比例/底圖/標題位置/重新命名)：免重建場景,僅更新疊加層與屬性
  const patchMeta = (partial: Partial<TimelineDoc["meta"]>) => {
    setDocState((d) => ({ ...d, meta: { ...d.meta, ...partial } }));
    setDirty(true);
  };

  // ---- 專案操作 ----
  // 存檔失敗(例如 localStorage 已滿)時提示,並維持未存狀態
  const trySave = (opts: Parameters<typeof saveProject>[0]) => {
    try {
      return saveProject(opts);
    } catch (e) {
      alert("存檔失敗:" + (e as Error).message);
      return null;
    }
  };
  const handleSave = () => {
    const meta = trySave({ id: currentId ?? undefined, name: projectName || "未命名", doc });
    if (!meta) return;
    setCurrentId(meta.id);
    setDirty(false);
    refresh();
  };
  const handleSaveAs = () => {
    const name = window.prompt("另存新檔名稱", projectName);
    if (!name) return;
    const meta = trySave({ name, doc });
    if (!meta) return;
    setCurrentId(meta.id);
    setProjectName(name);
    setDirty(false);
    refresh();
  };
  const handleNew = () => {
    const d = blankDoc();
    setProjectName(d.meta.title);
    setCurrentId(null);
    applyDoc(structuredClone(d), true);
  };
  const handleOpen = (id: string) => {
    const p = getProject(id);
    if (!p) return;
    setProjectName(p.name);
    setCurrentId(id);
    setLastProjectId(id);
    applyDoc(structuredClone(p.doc), false);
  };
  const handleDelete = (id: string) => {
    try {
      deleteProject(id);
    } catch (e) {
      alert("刪除失敗:" + (e as Error).message);
      return;
    }
    if (id === currentId) setCurrentId(null);
    refresh();
  };
  const handleLoadExample = (file: string) => {
    const ex = EXAMPLES.find((e) => e.file === file);
    if (!ex) return;
    setProjectName(ex.doc.meta.title);
    setCurrentId(null);
    applyDoc(withDefaultBasemap(structuredClone(ex.doc)), true);
  };
  const handleImport = async (file: File) => {
    try {
      const result = validateDoc(JSON.parse(await file.text()));
      if (!result.ok) throw new Error("\n" + result.errors.join("\n"));
      const parsed = result.doc;
      setProjectName(parsed.meta.title || file.name.replace(/\.json$/i, ""));
      setCurrentId(null);
      applyDoc(parsed, true);
    } catch (e) {
      alert("匯入失敗:" + (e as Error).message);
    }
  };
  const handleExport = () => {
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sanitizeFilenameBase(projectName)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // 點「匯出影片」→ 開設定視窗(不直接匯出)
  const openExport = () => {
    setExportProgress(0);
    setExportOpen(true);
  };
  const startExport = async (opts: ExportOptions) => {
    if (!controllerRef.current) return;
    setExporting(true);
    setExportProgress(0);
    try {
      // 進度以 0.5% 為單位更新,避免每幀都觸發 App re-render
      await controllerRef.current.exportVideo({
        ...opts,
        onProgress: (f) => setExportProgress(Math.floor(f * 200) / 200),
      });
    } catch (e) {
      alert("匯出失敗:" + (e as Error).message);
    } finally {
      setExporting(false);
      setExportOpen(false);
    }
  };
  const cancelExport = () => controllerRef.current?.cancelExport();

  // ---- 編輯操作 ----
  const toggleEditMode = () => {
    setEditMode((v) => {
      const next = !v;
      if (next) setSelectedPhaseIndex((i) => Math.max(0, Math.min(i, doc.phases.length - 1)));
      else {
        setActiveTool(null);
        setSelectedPlaceId(null);
      }
      return next;
    });
  };
  const captureCamera = () => {
    const cam = controllerRef.current?.getCamera();
    if (!cam) return;
    const phases = doc.phases.map((ph, i) => (i === selectedPhaseIndex ? { ...ph, camera: cam } : ph));
    applyDoc({ ...doc, phases }, true);
  };
  const addPlace = (lngLat: [number, number]) => {
    const phase = doc.phases[selectedPhaseIndex];
    const id = "pl_" + Math.random().toString(36).slice(2, 8);
    const place: Place = {
      id,
      name: "新地點",
      lng: lngLat[0],
      lat: lngLat[1],
      kind: "city",
      faction: doc.factions[0]?.id,
      appearAtPhase: phase?.id,
    };
    applyDoc({ ...doc, places: [...doc.places, place] }, true);
    setActiveTool(null);
    setSelectedPlaceId(id);
  };
  const updatePlace = (id: string, patch: Partial<Place>) => {
    applyDoc({ ...doc, places: doc.places.map((pl) => (pl.id === id ? { ...pl, ...patch } : pl)) }, true);
  };
  const movePlace = (id: string, lngLat: [number, number]) =>
    updatePlace(id, { lng: lngLat[0], lat: lngLat[1] });
  const deletePlace = (id: string) => {
    applyDoc({ ...doc, places: doc.places.filter((pl) => pl.id !== id) }, true);
    if (selectedPlaceId === id) setSelectedPlaceId(null);
  };

  return (
    <div className="app">
      <Sidebar
        doc={doc}
        onApply={(next) => applyDoc(next, true)}
        onTitlePosition={(pos: TitlePosition) => patchMeta({ titlePosition: pos })}
        top={
          <ProjectBar
            projectName={projectName}
            dirty={dirty}
            projects={projects}
            onRename={(name) => {
              setProjectName(name);
              setDirty(true);
            }}
            onSave={handleSave}
            onSaveAs={handleSaveAs}
            onNew={handleNew}
            onOpen={handleOpen}
            onDelete={handleDelete}
            onLoadExample={handleLoadExample}
            onImport={handleImport}
            onExport={handleExport}
          />
        }
        editor={
          <EditorPanel
            doc={doc}
            editMode={editMode}
            selectedPhaseIndex={selectedPhaseIndex}
            activeTool={activeTool}
            selectedPlaceId={selectedPlaceId}
            onToggleEditMode={toggleEditMode}
            onSelectPhase={setSelectedPhaseIndex}
            onSetTool={setActiveTool}
            onCaptureCamera={captureCamera}
            onUpdatePlace={updatePlace}
            onDeletePlace={deletePlace}
          />
        }
      />
      <main className="main">
        <MapStage
          doc={doc}
          aspectRatio={aspectRatio}
          basemapId={basemapId}
          onReady={(c) => (controllerRef.current = c)}
          onTime={playhead.set}
          onDuration={setDuration}
          onPlayState={setPlaying}
          editMode={editMode}
          selectedPhaseIndex={selectedPhaseIndex}
          activeTool={activeTool}
          selectedPlaceId={selectedPlaceId}
          onMapAddPlace={addPlace}
          onSelectPlace={setSelectedPlaceId}
          onMovePlace={movePlace}
        />
        <TransportBar
          playing={playing}
          playhead={playhead}
          duration={duration}
          aspectRatio={aspectRatio}
          basemapId={basemapId}
          exporting={exporting}
          editMode={editMode}
          onToggle={() => controllerRef.current?.toggle()}
          onSeek={(t) => controllerRef.current?.seek(t)}
          onAspect={(a) => patchMeta({ aspectRatio: a })}
          onBasemap={(id) => patchMeta({ basemapStyle: id })}
          onExport={openExport}
        />
      </main>
      <ExportDialog
        open={exportOpen}
        durationSec={duration}
        exporting={exporting}
        progress={exportProgress}
        onStart={startExport}
        onCancel={cancelExport}
        onClose={() => setExportOpen(false)}
      />
    </div>
  );
}
