import { useEffect, useRef, useState } from "react";
import maplibregl, { Map as MlMap } from "maplibre-gl";
import type { AspectRatio, TimelineDoc } from "../types/timeline";
import { basemapStyleUrl } from "./basemaps";
import { MAP_IDEOGRAPH_FONT } from "./mapFonts";
import { Scene } from "../render/scene";
import { TimelineClock } from "../engine/clock";
import { buildExportFilename } from "../export/filename";
import { recordWebM, downloadBlob, pickRecordMime } from "../export/recordWebM";
import { drawOverlay } from "../render/overlay";
import { updatePlaces, setSelectedPlace, setPlaceEditMode, placeInteractionLayers } from "../render/places";
import type { StageController } from "./stageController";

export type EditTool = "add-place" | null;

const DIMS: Record<AspectRatio, [number, number]> = {
  "16:9": [1920, 1080],
  "9:16": [1080, 1920],
  "1:1": [1080, 1080],
};

interface Props {
  doc: TimelineDoc;
  aspectRatio: AspectRatio;
  basemapId: string;
  onReady: (c: StageController) => void;
  onTime: (t: number) => void;
  onDuration: (d: number) => void;
  onPlayState: (playing: boolean) => void;
  // 編輯模式
  editMode: boolean;
  selectedPhaseIndex: number;
  activeTool: EditTool;
  selectedPlaceId: string | null;
  onMapAddPlace: (lngLat: [number, number]) => void;
  onSelectPlace: (id: string | null) => void;
  onMovePlace: (id: string, lngLat: [number, number]) => void;
}

export default function MapStage({
  doc,
  aspectRatio,
  basemapId,
  onReady,
  onTime,
  onDuration,
  onPlayState,
  editMode,
  selectedPhaseIndex,
  activeTool,
  selectedPlaceId,
  onMapAddPlace,
  onSelectPlace,
  onMovePlace,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null); // 外層，量可用空間
  const stageRef = useRef<HTMLDivElement>(null); // 固定解析度的地圖容器
  const overlayRef = useRef<HTMLCanvasElement>(null); // 疊在地圖上的圖例層（預覽）
  const mapRef = useRef<MlMap | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const clockRef = useRef<TimelineClock | null>(null);
  const docRef = useRef(doc);
  const appliedBasemap = useRef(basemapId);
  const dimsRef = useRef<[number, number]>(DIMS[aspectRatio]);
  const [scale, setScale] = useState(1);

  // 鏡像當前編輯狀態給穩定的地圖事件處理器使用
  const editModeRef = useRef(editMode);
  const toolRef = useRef<EditTool>(activeTool);
  const selectedPhaseRef = useRef(selectedPhaseIndex);
  const onAddRef = useRef(onMapAddPlace);
  const onSelectRef = useRef(onSelectPlace);
  const onMoveRef = useRef(onMovePlace);
  const draggingRef = useRef<string | null>(null);
  const exportAbortRef = useRef<AbortController | null>(null);
  const selectedPlaceIdRef = useRef(selectedPlaceId);
  editModeRef.current = editMode;
  selectedPlaceIdRef.current = selectedPlaceId;
  toolRef.current = activeTool;
  selectedPhaseRef.current = selectedPhaseIndex;
  onAddRef.current = onMapAddPlace;
  onSelectRef.current = onSelectPlace;
  onMoveRef.current = onMovePlace;

  const [w, h] = DIMS[aspectRatio];
  dimsRef.current = [w, h];

  // 初始化地圖一次
  useEffect(() => {
    if (!stageRef.current) return;
    const first = doc.phases[0]?.camera;
    const map = new maplibregl.Map({
      container: stageRef.current,
      style: basemapStyleUrl(basemapId),
      center: first?.center ?? [135.7, 34.9],
      zoom: first?.zoom ?? 10,
      bearing: first?.bearing ?? 0,
      pitch: first?.pitch ?? 0,
      preserveDrawingBuffer: true, // captureStream / readPixels 必要
      localIdeographFontFamily: MAP_IDEOGRAPH_FONT,
      attributionControl: { compact: true },
      interactive: true,
    });
    mapRef.current = map;
    const scene = new Scene(map, docRef.current);
    sceneRef.current = scene;

    const buildClock = () => {
      clockRef.current?.dispose();
      const clock = new TimelineClock({
        totalDuration: scene.totalDuration,
        onTick: (t) => {
          scene.render(t);
          onTime(t);
        },
        onStateChange: () => onPlayState(clock.playing),
      });
      clockRef.current = clock;
      onDuration(scene.totalDuration);
    };

    const setup = () => {
      scene.setup(appliedBasemap.current);
      buildClock();
      scene.render(0);
      onTime(0);
    };

    const reRender = () => {
      if (editModeRef.current) scene.renderStatic(selectedPhaseRef.current);
      else scene.render(Math.min(clockRef.current!.time, scene.totalDuration));
    };

    const attachEditHandlers = (map: MlMap, scene: Scene) => {
      // 點地圖:加地點工具→落點;否則→選取/取消選取
      map.on("click", (e) => {
        if (!editModeRef.current) return;
        if (toolRef.current === "add-place") {
          onAddRef.current([e.lngLat.lng, e.lngLat.lat]);
          return;
        }
        const feats = map.queryRenderedFeatures(e.point, { layers: [...placeInteractionLayers()] });
        onSelectRef.current(feats.length ? ((feats[0].properties as any).id ?? null) : null);
      });

      // 拖曳地點(僅選取模式)
      map.on("mousedown", "wm-place-hit", (e) => {
        if (!editModeRef.current || toolRef.current) return;
        const id = (e.features?.[0]?.properties as any)?.id;
        if (!id) return;
        e.preventDefault(); // 阻止地圖平移
        draggingRef.current = id;
        onSelectRef.current(id);
        map.getCanvas().style.cursor = "grabbing";
      });
      map.on("mousemove", (e) => {
        const id = draggingRef.current;
        if (!id) return;
        updatePlaces(map, docRef.current, scene.built, selectedPhaseRef.current, {
          editMode: true,
          override: { id, lng: e.lngLat.lng, lat: e.lngLat.lat },
        });
      });
      map.on("mouseup", (e) => {
        const id = draggingRef.current;
        if (!id) return;
        draggingRef.current = null;
        map.getCanvas().style.cursor = "";
        onMoveRef.current(id, [e.lngLat.lng, e.lngLat.lat]);
      });

      // hover 游標(選取模式)
      map.on("mouseenter", "wm-place-hit", () => {
        if (editModeRef.current && !toolRef.current) map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "wm-place-hit", () => {
        if (!draggingRef.current && !toolRef.current) map.getCanvas().style.cursor = "";
      });
    };

    map.on("load", () => {
      setup();
      attachEditHandlers(map, scene);
      const controller: StageController = {
        play: () => clockRef.current?.play(),
        pause: () => clockRef.current?.pause(),
        toggle: () => clockRef.current?.toggle(),
        seek: (t) => clockRef.current?.seek(t),
        setDoc: (d) => {
          docRef.current = d;
          scene.setDoc(d);
          buildClock();
          reRender();
        },
        getCamera: () => {
          const c = map.getCenter();
          return {
            center: [c.lng, c.lat],
            zoom: map.getZoom(),
            bearing: map.getBearing(),
            pitch: map.getPitch(),
          };
        },
        totalDuration: () => scene.totalDuration,
        exportVideo: async (opts) => {
          clockRef.current?.pause();
          const title = docRef.current.meta.title || "warmap";
          // MP4 用瀏覽器原生錄製(H.264);不支援時退回 WebM。即時錄製,無轉檔。
          const mp4Mime = opts.format === "mp4" ? pickRecordMime("mp4") : null;
          const isMp4 = !!mp4Mime;
          const recMime = mp4Mime ?? pickRecordMime("webm") ?? undefined;
          const [ew, eh] = dimsRef.current;
          const W = Math.round(ew * opts.resolutionScale);
          const H = Math.round(eh * opts.resolutionScale);
          const ac = new AbortController();
          exportAbortRef.current = ac;

          const blob = await recordWebM({
            canvas: map.getCanvas(),
            durationSec: scene.totalDuration,
            fps: 30,
            width: W,
            height: H,
            videoBitsPerSecond: opts.videoBitsPerSecond,
            mimeType: recMime,
            render: (t) => scene.render(t),
            overlay: (ctx, ow, oh) => drawOverlay(ctx, docRef.current, ow, oh),
            onProgress: (f) => opts.onProgress?.(f),
            signal: ac.signal,
          });
          exportAbortRef.current = null;
          scene.render(0);
          clockRef.current?.seek(0);
          if (!blob) return false; // 取消
          const filename = buildExportFilename({
            title,
            ext: isMp4 ? "mp4" : "webm",
            aspectRatio: docRef.current.meta.aspectRatio,
            resolutionScale: opts.resolutionScale,
          });
          downloadBlob(blob, filename);
          return true;
        },
        cancelExport: () => exportAbortRef.current?.abort(),
      };
      onReady(controller);
    });

    return () => {
      clockRef.current?.dispose();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 切換底圖：初始 style 已由 map 建構帶入，只在 id 真正改變時 setStyle
  useEffect(() => {
    if (basemapId === appliedBasemap.current) return;
    const map = mapRef.current;
    const scene = sceneRef.current;
    if (!map || !scene) return;
    appliedBasemap.current = basemapId;
    map.setStyle(basemapStyleUrl(basemapId), { localIdeographFontFamily: MAP_IDEOGRAPH_FONT });
    const onStyle = () => {
      scene.setup(basemapId);
      setPlaceEditMode(map, editModeRef.current);
      if (editModeRef.current) {
        scene.renderStatic(selectedPhaseRef.current);
        setSelectedPlace(map, selectedPlaceIdRef.current);
      } else {
        scene.render(clockRef.current?.time ?? 0);
      }
    };
    map.once("styledata", onStyle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basemapId]);

  // 比例改變 → resize 地圖
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    requestAnimationFrame(() => map.resize());
  }, [w, h]);

  // 讓 docRef 跟著 doc prop(含只改 meta 的情況),確保匯出 overlay 用到最新 meta
  useEffect(() => {
    docRef.current = doc;
  }, [doc]);

  // 進/出編輯模式、或切換選定分鏡:暫停時鐘+靜態顯示該分鏡(不動鏡頭),或回到播放畫面
  useEffect(() => {
    const scene = sceneRef.current;
    const clock = clockRef.current;
    const map = mapRef.current;
    if (!scene || !clock || !map) return;
    setPlaceEditMode(map, editMode);
    if (editMode) {
      clock.pause();
      scene.renderStatic(selectedPhaseIndex);
    } else {
      setSelectedPlace(map, null);
      map.getCanvas().style.cursor = "";
      scene.render(clock.time);
    }
  }, [editMode, selectedPhaseIndex]);

  // 選取高亮
  useEffect(() => {
    const map = mapRef.current;
    if (map && editMode) setSelectedPlace(map, selectedPlaceId);
  }, [selectedPlaceId, editMode]);

  // 加地點工具→十字游標
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getCanvas().style.cursor = editMode && activeTool === "add-place" ? "crosshair" : "";
  }, [activeTool, editMode]);

  // 重畫預覽用的圖例 / 標題 overlay（doc 或比例改變時）
  useEffect(() => {
    const cv = overlayRef.current;
    if (!cv) return;
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    drawOverlay(ctx, doc, w, h);
  }, [w, h, doc]);

  // 量外層空間算縮放比，讓固定解析度舞台 fit 進預覽區
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const compute = () => {
      const aw = el.clientWidth - 24;
      const ah = el.clientHeight - 24;
      setScale(Math.min(aw / w, ah / h, 1));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [w, h]);

  return (
    <div ref={wrapRef} className="stage-wrap">
      <div
        className="stage-scaler"
        style={{ width: w * scale, height: h * scale }}
      >
        <div
          ref={stageRef}
          className="stage"
          style={{
            width: w,
            height: h,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        />
        <canvas
          ref={overlayRef}
          className="overlay"
          width={w}
          height={h}
          style={{
            width: w,
            height: h,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        />
      </div>
    </div>
  );
}
