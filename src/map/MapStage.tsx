import { useEffect, useRef, useState } from "react";
import maplibregl, { Map as MlMap } from "maplibre-gl";
import type { AspectRatio, TimelineDoc } from "../types/timeline";
import { basemapStyleUrl } from "./basemaps";
import { Scene } from "../render/scene";
import { TimelineClock } from "../engine/clock";
import { recordWebM, downloadBlob } from "../export/recordWebM";
import { drawOverlay } from "../render/overlay";
import type { StageController } from "./stageController";

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
}

export default function MapStage({
  doc,
  aspectRatio,
  basemapId,
  onReady,
  onTime,
  onDuration,
  onPlayState,
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
      localIdeographFontFamily: "'Noto Serif TC','Noto Sans TC',sans-serif",
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

    map.on("load", () => {
      setup();
      const controller: StageController = {
        play: () => clockRef.current?.play(),
        pause: () => clockRef.current?.pause(),
        toggle: () => clockRef.current?.toggle(),
        seek: (t) => clockRef.current?.seek(t),
        setDoc: (d) => {
          docRef.current = d;
          scene.setDoc(d);
          buildClock();
          scene.render(Math.min(clockRef.current!.time, scene.totalDuration));
        },
        exportWebM: async () => {
          clockRef.current?.pause();
          const fname = `${docRef.current.meta.title || "warmap"}.webm`;
          const [ew, eh] = dimsRef.current;
          const blob = await recordWebM({
            canvas: map.getCanvas(),
            durationSec: scene.totalDuration,
            fps: 30,
            width: ew,
            height: eh,
            render: (t) => scene.render(t),
            overlay: (ctx, ow, oh) => drawOverlay(ctx, docRef.current, ow, oh),
          });
          downloadBlob(blob, fname);
          scene.render(0);
          clockRef.current?.seek(0);
        },
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
  // （以「已套用的 id」比對，避免 StrictMode 雙呼叫造成多餘的 setStyle）
  useEffect(() => {
    if (basemapId === appliedBasemap.current) return;
    const map = mapRef.current;
    const scene = sceneRef.current;
    if (!map || !scene) return;
    appliedBasemap.current = basemapId;
    map.setStyle(basemapStyleUrl(basemapId));
    const onStyle = () => {
      scene.setup(basemapId);
      scene.render(clockRef.current?.time ?? 0);
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
