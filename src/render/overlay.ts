import type { TimelineDoc } from "../types/timeline";

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (typeof (ctx as any).roundRect === "function") {
    ctx.beginPath();
    (ctx as any).roundRect(x, y, w, h, r);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** 陣營圖例（左下角，避開頂部標題與右下 attribution）。 */
function drawLegend(ctx: CanvasRenderingContext2D, doc: TimelineDoc, h: number) {
  const factions = doc.factions ?? [];
  if (!factions.length) return;

  const s = h / 1080;
  const fontSize = Math.round(28 * s);
  const pad = Math.round(20 * s);
  const rowH = Math.round(40 * s);
  const swatchW = Math.round(34 * s);
  const swatchH = Math.round(10 * s);
  const gap = Math.round(12 * s);

  ctx.save();
  ctx.font = `${fontSize}px "Noto Sans TC", system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";

  let maxText = 0;
  for (const f of factions) maxText = Math.max(maxText, ctx.measureText(f.name).width);

  const boxW = pad * 2 + swatchW + gap + maxText;
  const boxH = pad * 2 + factions.length * rowH;
  const x = pad;
  const y = h - pad - boxH;

  roundRect(ctx, x, y, boxW, boxH, Math.round(8 * s));
  ctx.fillStyle = "rgba(18,20,24,0.74)";
  ctx.fill();
  ctx.lineWidth = Math.max(1, s);
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.stroke();

  factions.forEach((f, i) => {
    const cy = y + pad + i * rowH + rowH / 2;
    roundRect(ctx, x + pad, cy - swatchH / 2, swatchW, swatchH, swatchH / 2);
    ctx.fillStyle = f.color;
    ctx.fill();
    ctx.fillStyle = "#f1ece0";
    ctx.fillText(f.name, x + pad + swatchW + gap, cy);
  });

  ctx.restore();
}

/** 標題卡（位置由 meta.titlePosition 決定：左上 / 中上 / 右上）。 */
function drawTitle(ctx: CanvasRenderingContext2D, doc: TimelineDoc, w: number, h: number) {
  const title = doc.meta.title;
  if (!title) return;
  const sub = doc.meta.subtitle;
  const pos = doc.meta.titlePosition ?? "top-left";

  const s = h / 1080;
  const pad = Math.round(20 * s);
  const titleSize = Math.round(40 * s);
  const subSize = Math.round(22 * s);
  const lineGap = Math.round(8 * s);
  const boxPadX = Math.round(20 * s);
  const boxPadY = Math.round(14 * s);
  const titleFont = `700 ${titleSize}px "Noto Serif TC", serif`;
  const subFont = `${subSize}px "Noto Sans TC", sans-serif`;

  ctx.save();
  ctx.textBaseline = "top";

  ctx.font = titleFont;
  const tw = ctx.measureText(title).width;
  let sw = 0;
  if (sub) {
    ctx.font = subFont;
    sw = ctx.measureText(sub).width;
  }
  const contentW = Math.max(tw, sw);
  const boxW = contentW + boxPadX * 2;
  const boxH = boxPadY * 2 + titleSize + (sub ? subSize + lineGap : 0);

  let x0 = pad;
  if (pos === "top-center") x0 = (w - boxW) / 2;
  else if (pos === "top-right") x0 = w - pad - boxW;
  const y0 = pad;

  roundRect(ctx, x0, y0, boxW, boxH, Math.round(8 * s));
  ctx.fillStyle = "rgba(18,20,24,0.7)";
  ctx.fill();
  ctx.lineWidth = Math.max(1, s);
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.stroke();

  let tx = x0 + boxPadX;
  ctx.textAlign = "left";
  if (pos === "top-center") {
    ctx.textAlign = "center";
    tx = x0 + boxW / 2;
  } else if (pos === "top-right") {
    ctx.textAlign = "right";
    tx = x0 + boxW - boxPadX;
  }

  ctx.font = titleFont;
  ctx.fillStyle = "#f3ede1";
  ctx.fillText(title, tx, y0 + boxPadY);
  if (sub) {
    ctx.font = subFont;
    ctx.fillStyle = "#aab0bb";
    ctx.fillText(sub, tx, y0 + boxPadY + titleSize + lineGap);
  }

  ctx.restore();
}

/**
 * 在 2D context 上畫圖例 + 標題。尺寸以 1080 高為基準等比縮放，解析度無關。
 * 預覽 overlay 與匯出合成共用同一份繪製。
 */
export function drawOverlay(
  ctx: CanvasRenderingContext2D,
  doc: TimelineDoc,
  w: number,
  h: number
) {
  drawLegend(ctx, doc, h);
  drawTitle(ctx, doc, w, h);
}
