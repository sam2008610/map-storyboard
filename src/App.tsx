import { useRef, useState } from "react";
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
import { DEFAULT_BASEMAP_ID } from "./map/basemaps";
import MapStage, { type EditTool } from "./map/MapStage";
import type { StageController } from "./map/stageController";
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
  const init = initialWorkspace();
  const [doc, setDocState] = useState<TimelineDoc>(() => structuredClone(init.doc));
  const [projectName, setProjectName] = useState(init.name);
  const [currentId, setCurrentId] = useState<string | null>(init.id);
  const [dirty, setDirty] = useState(false);
  const [projects, setProjects] = useState<ProjectMeta[]>(() => listProjects());

  const [currentTime, setCurrentTime] = useState(0);
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
  const handleSave = () => {
    const meta = saveProject({ id: currentId ?? undefined, name: projectName || "未命名", doc });
    setCurrentId(meta.id);
    setDirty(false);
    refresh();
  };
  const handleSaveAs = () => {
    const name = window.prompt("另存新檔名稱", projectName);
    if (!name) return;
    const meta = saveProject({ name, doc });
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
    deleteProject(id);
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
      const text = await file.text();
      const parsed = JSON.parse(text) as TimelineDoc;
      if (!parsed.phases || !Array.isArray(parsed.phases)) throw new Error("缺少 phases 陣列");
      setProjectName(parsed.meta?.title || file.name.replace(/\.json$/i, ""));
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
    a.download = `${projectName || "warmap"}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // 點「匯出 WebM」→ 開設定視窗(不直接匯出)
  const openExport = () => {
    setExportProgress(0);
    setExportOpen(true);
  };
  const startExport = async (opts: { videoBitsPerSecond: number; resolutionScale: number }) => {
    if (!controllerRef.current) return;
    setExporting(true);
    setExportProgress(0);
    try {
      await controllerRef.current.exportWebM({ ...opts, onProgress: setExportProgress });
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
          onTime={setCurrentTime}
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
          currentTime={currentTime}
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
