# 專案 Brief：戰史地圖動畫產生器（暫名 WarMapStudio）

> 給 Claude Code 的起手 context。目標是做一個**從文字描述快速產出戰爭地圖動畫影片**的工具，定位類似 Mapimator，但補上「文字 → 結構化資料」的半自動流程，並特別適合書籍作者 / 歷史內容創作者。

---

## 1. 一句話目標

作者貼上一段戰史描述（或手動填資料）→ 工具在真實地理底圖上產出**分階段的行軍/前線動畫** → 匯出成 MP4 / GIF（支援 16:9、9:16、1:1），給 YouTube / Shorts / Reels / 文章配圖用。

**輸出是影片/動畫，不是只給人點的靜態互動地圖。** 時間軸與分鏡是第一公民。

---

## 2. 定位（為什麼做、跟現有工具的差別）

市面現況：
- **Mapimator**：最接近的商業產品。能畫前線、進攻/撤退箭頭、分階段、匯出 4K MP4/GIF。缺點：純手繪、沒有從文字自動生成、付費。
- **ArcGIS StoryMaps / StoryMapJS**：給作者用的敘事地圖，可嵌入網頁，但是**通用工具、非戰史專用**（沒有陣營/前線/夾擊等原語），且偏靜態互動而非影片。
- **MapStory（學界 2025）**：LLM 把文字腳本轉成可編輯地圖動畫的研究原型，思路跟我們一樣，但不是可用產品。
- **AI 戰爭地圖生成器（如 Pixa）**：文字生成一張**圖片插畫**，不是真實座標上的動畫。

**缺口 = 我們要做的：**
1. 從文字半自動抽出地點與動線（LLM）
2. 內建戰史原語：陣營、領土、前線、推進、撤退、夾擊、分階段
3. 輸出影片/動畫，社群比例齊全
4. 流程快、適合非設計師的作者

---

## 3. 核心流程（pipeline）

```
歷史文字段落
   │  (a) LLM 抽取 → timeline JSON（地點/陣營/路線/分階段/鏡頭）
   ▼
可編輯的 timeline JSON  ←── 作者手動微調座標、調鏡頭、改色
   │  (b) 渲染引擎依時間軸播放（相機 flyTo、箭頭沿路徑生長、前線變形）
   ▼
即時預覽 (canvas)
   │  (c) 匯出
   ▼
MP4 / GIF / WebM（16:9 / 9:16 / 1:1）
```

(a) 的 LLM 抽取可以離線跑（作者本機呼叫 API 產 JSON），不一定要塞在瀏覽器即時做。

---

## 4. 功能範圍

### MVP (v1)
- [ ] 載入 / 編輯 timeline JSON（先做手動編輯，LLM 抽取可後補）
- [ ] MapLibre GL 底圖，可選樣式（dark / 戰術風 / 衛星）
- [ ] 分階段（phases）播放：每階段有相機 keyframe（center/zoom/bearing/pitch）
- [ ] 行軍路線動畫：箭頭沿 path 逐漸生長（advance/retreat/artillery 三種樣式，含虛線）
- [ ] 地點 marker + 標籤，可設定在某階段出現
- [ ] 陣營色票（faction → color）
- [ ] 時間軸播放/暫停/scrub
- [ ] 畫面比例切換（1920×1080 / 1080×1920 / 1080×1080）
- [ ] 匯出影片（先求能動：MediaRecorder → WebM）

### 之後 (v2+)
- [ ] LLM 文字 → timeline JSON（in-app，帶座標校正 UI）
- [ ] 領土多邊形隨階段變形（front line morph）
- [ ] 高品質匯出（4K、固定 fps、MP4）：ffmpeg.wasm 或 server-side headless render
- [ ] 標題卡 / 字幕 / 旁白音軌 / 配樂
- [ ] 範本與一鍵社群比例重排
- [ ] 自訂 marker icon（爆炸、目標、要塞）

---

## 5. 技術選型（建議，可討論）

- **語言**：TypeScript + Vite（作者熟 React/TS，AlloScope 即此 stack）。UI 用 React 或先 vanilla 皆可。
- **地圖引擎**：**MapLibre GL JS**（不是 Leaflet）。理由：要的是 WebGL 平滑相機（`flyTo`/`easeTo`、bearing/pitch、連續 zoom）這種電影感運鏡，Leaflet 是 raster、運鏡卡。雛形用 Leaflet 只是為了快速驗證。
- **免金鑰底圖**：MapLibre 配 OpenFreeMap 或自架 Protomaps（pmtiles），或 MapTiler free tier。避免 Mapbox token。
- **地理運算**：**Turf.js**（`turf.along` / `turf.length` 用來讓箭頭沿路徑插值生長；計算 bearing 給箭頭朝向）。
- **動畫驅動**：自建 timeline clock（requestAnimationFrame）+ easing 函數；keyframe 之間插值相機與進度。
- **座標慣例**：**MapLibre / GeoJSON 用 `[lng, lat]`**。⚠️ 注意雛形（Leaflet）用的是 `[lat, lng]`，移植時要轉換。

---

## 6. 資料模型（timeline JSON schema 草案）

```jsonc
{
  "meta": {
    "title": "鳥羽伏見之戰",
    "subtitle": "1868 戊辰戰爭",
    "aspectRatio": "16:9",          // "16:9" | "9:16" | "1:1"
    "basemapStyle": "dark",
    "attribution": "© OpenStreetMap"
  },
  "factions": [
    { "id": "shogun", "name": "舊幕府軍", "color": "#23427a" },
    { "id": "gov",    "name": "新政府軍", "color": "#a8232b" }
  ],
  "places": [
    {
      "id": "yamazaki", "name": "山崎", "lng": 135.6856, "lat": 34.9036,
      "kind": "battle",                // city | castle | battle | terrain
      "faction": "shogun",             // 可選
      "appearAtPhase": "p3"            // 在此階段才出現；省略=一開始就有
    }
  ],
  "phases": [
    {
      "id": "p1",
      "title": "舊幕府軍北上",
      "date": "1868-01-27",
      "durationSec": 6,
      "camera": {
        "center": [135.70, 34.90], "zoom": 11, "bearing": 0, "pitch": 30,
        "transition": "flyTo"          // flyTo | easeTo | cut
      },
      "movements": [
        {
          "id": "m1", "label": "① 北上", "factionId": "shogun",
          "style": "advance",          // advance | retreat | artillery
          "path": [[135.5259,34.6873],[135.7237,34.9089],[135.761,34.932]],
          "drawDurationSec": 4
        }
      ],
      "fronts": [                       // v2：前線（虛線多邊形/折線）
        { "factionId": "gov", "coordinates": [[135.76,34.94],[135.74,34.90]] }
      ],
      "territory": [                    // v2：陣營領土多邊形
        { "factionId": "shogun", "geojson": { "type": "Polygon", "coordinates": [[]] } }
      ],
      "annotations": [
        { "text": "津藩倒戈", "lng": 135.6856, "lat": 34.9036 }
      ]
    }
  ]
}
```

---

## 7. 影片匯出（三條路，依品質取捨）

1. **MVP — MediaRecorder + `canvas.captureStream()`**：錄即時播放成 WebM。最快做出來，但綁即時、可能掉幀、非 MP4。
2. **進階 — 逐幀離線渲染**：手動推進動畫時鐘、每幀 `readPixels`/`toBlob` 擷取 → 用 **ffmpeg.wasm** 編成固定 fps 的 MP4，可 4K。較慢但品質穩。
3. **最高品質 — server-side**：headless Chromium（Playwright）逐幀截圖 + ffmpeg。需要後端，留到有需求再做。

GIF：用擷取到的幀餵 `gif.js` 或 ffmpeg.wasm。

渲染容器固定成目標解析度（1920×1080 / 1080×1920 / 1080×1080），讓擷取的幀直接吻合社群格式。

---

## 8. 現有雛形可重用的東西

我先前做了一個 Leaflet 驗證版（`history-map.html`，可一併附給 Claude Code 參考）。可直接搬的：
- **LLM 抽取 prompt**：要求模型只回傳 timeline JSON、side 用 enum、座標給最佳估計、古地名對應現代位置 — 已驗證可行。
- **戊辰戰爭 / 鳥羽伏見之戰範例資料**（橋本・八幡之戰那段）：當預設 demo 與 schema 測資。
- **色彩與圖例慣例**：舊幕府=靛藍、新政府=緋紅、倒戈砲擊=朱橙虛線、地形=石綠。
- 把 Leaflet 的 `[lat,lng]` 轉成 `[lng,lat]`、raster 換成 MapLibre 即可。

---

## 9. 待決定的問題（請 Claude Code 先跟我確認再動工）

1. v1 的 LLM 抽取要不要做，還是先純手動編輯 JSON？
2. UI 框架：React 還是先 vanilla TS？
3. 底圖來源最終選哪個（OpenFreeMap / Protomaps 自架 / MapTiler）？
4. v1 匯出先只做 WebS/WebM（MediaRecorder），還是直接上 ffmpeg.wasm？
5. 前線/領土多邊形（fronts/territory）要不要進 v1，還是 v2 再說？
