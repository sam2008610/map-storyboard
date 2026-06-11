# 地圖分鏡 (map-storyboard)

從一份 **timeline JSON** 在真實地理底圖上產出**分階段的戰史 / 時空地圖動畫**,並匯出成影片(WebM)。內建相機運鏡、行軍箭頭、地點標籤、圖例與標題卡,適合書籍作者 / 歷史內容創作者做 YouTube / Shorts / Reels 配圖。

> v1 為純手動編輯流程:你編輯 JSON → 即時預覽 → 匯出影片。
> 「文字 → JSON」的 LLM 自動抽取留待 v2。

---

## 快速開始

需求:Node.js 18+。

```bash
npm install
npm run dev      # 開 http://localhost:5173
```

其他指令:

```bash
npm run build    # 產出 dist/（正式打包）
npm run preview  # 預覽打包結果
```

開啟後預設載入「鳥羽伏見之戰」範例。

---

## 介面操作

```
┌──────────────┬────────────────────────────────────┐
│ [專案工具列]  │            舞台（固定比例）          │
│  · 標題/副標  │     ┌──────────────────────────┐    │
│  · 陣營圖例   │     │ [標題卡]                  │    │
│  · 標題位置   │     │        （地圖 + 動畫）     │    │
│  · 分鏡列表   │     │ [圖例]                    │    │
│  · 資料 JSON  │     └──────────────────────────┘    │
│              ├────────────────────────────────────┤
│              │ ▶  0:00/0:29 ──●───  16:9 9:16 1:1  │
│              │                 底圖▾   [匯出 WebM]  │
└──────────────┴────────────────────────────────────┘
```

- **▶ / ❚❚**:播放 / 暫停。
- **時間軸拖桿**:scrub 到任意時間點(畫面決定性更新,來回拖結果一致)。
- **16:9 / 9:16 / 1:1**:切換畫面比例(舞台與匯出解析度同步改變)。
- **底圖下拉**:暗色(戰術)/ 明亮 / 簡圖(來源為 OpenFreeMap,免金鑰)。
- **標題位置**:左上 / 中上 / 右上。
- **資料(JSON)**:編輯下方文字框 → 按「套用並重繪」。座標 / 鏡頭 / 時長都在這裡改。
- **匯出 WebM**:從頭播一次並錄成 `.webm`,**圖例與標題會一起進影片**。

### 編輯流程建議

1. 從「範例」下拉載入一個範例理解 schema。
2. 改 `meta.title`、新增 `factions`、`places`。
3. 在 `phases` 裡安排每階段的 `camera`(鏡頭)與 `movements`(行軍路線)。
4. 邊改邊「套用並重繪」,用時間軸 scrub 檢查。
5. 命名後**存檔**;滿意後切好比例 → 匯出影片。

### 視覺編輯模式(不用手刻 JSON)

側欄的 **✎ 進入編輯模式** 提供不碰原始 JSON 的編輯方式(底層仍寫回同一份 JSON):

- **選分鏡**:點「編輯中的分鏡」清單選一段;地圖會靜態顯示該段內容,且**放開鏡頭讓你自由縮放/旋轉**。
- **📷 設為本分鏡鏡頭**:把地圖飛到想要的角度,一鍵把目前鏡頭存進該分鏡(免手填 center/zoom/bearing/pitch)。
- **＋ 點地圖加地點**:開啟後點地圖落點即新增地點(免查經緯度);新增後可在表單改名稱/陣營/類別/出現時機,或**拖曳地點**調整位置。
- 點現有地點可選取編輯、刪除。

> 路線繪製、分鏡排序、陣營編輯為後續開發項目;目前仍可用 JSON 面板補齊。

---

## 專案管理與範例

側欄頂端的**專案工具列**負責建立、存取與分享作品。

| 功能 | 說明 |
|---|---|
| 專案名稱 | 直接在輸入框改名。旁邊的 **●** 亮起代表有未存變更。 |
| **存檔** | 把目前作品存進**瀏覽器**(localStorage),重整後仍在;已存過則覆寫。 |
| **另存** | 以新名稱另存一份。 |
| **新建** | 開一份空白專案。 |
| **開啟 ▾** | 列出已存檔的專案,點選載入,或按 `×` 刪除。 |
| **範例 ▾** | 載入內建範例(見下)到工作區。 |
| **匯入** | 讀入一個 `.json` 檔(別人分享的或你備份的)。 |
| **匯出** | 把目前作品下載成 `.json` 檔,用於**備份或跨機器 / 分享**。 |

> **存檔 vs 匯出**:
> 「存檔」存在這台瀏覽器(換電腦 / 清快取就沒了);要長期備份或給別人,請用「匯出 JSON」存成檔案。

### 內建範例(`examples/` 資料夾)

| 檔案 | 內容 |
|---|---|
| `toba-fushimi-1868.json` | **鳥羽伏見之戰**(戊辰戰爭):北上 → 南退 → 津藩倒戈砲擊 → 退往大坂。 |
| `hakodate-1869.json` | **箱館戰爭**(戊辰最終局):艦隊北航 → 鷲ノ木登陸 → 占全島·共和國成立 → 宮古灣海戰(硬切)→ 三路反攻 → 箱館灣總攻 → 土方戰死 → 五稜郭開城。 |
| `seinan-1877.json` | **西南戰爭**(西鄉隆盛之亂):舉兵北上 → 熊本城攻防 → 田原坂之戰 → 解圍南退 → 轉戰宮崎 → 和田越決戰 → 可愛岳突圍長征 → 城山決戰。 |
| `normandy-1944.json` | **諾曼第登陸 D-Day**:午夜空降 → 五處灘頭登陸 → 向內陸推進 → 目標卡昂。 |
| `stalingrad-1942.json` | **史達林格勒戰役**(天王星行動):德軍攻城 → 南北鉗形突破 → 卡拉奇會師 → 第六軍被圍。 |
| `hokkaido-roadtrip-2026.json` | **北海道自駕 9 日**(旅遊行程示範):每天一段分鏡、路線逐日生長,展示同引擎也能做非戰史的時空動畫。 |

要新增範例,只要把一個合法的 timeline JSON 丟進 `examples/` 資料夾,它會自動出現在「範例」下拉(透過 Vite `import.meta.glob` 載入,免改程式)。
範例的歷史座標為**合理估計**,精確位置請自行對照史料微調。

---

## 重要慣例

- **座標一律 `[lng, lat]`(經度在前、緯度在後)**,符合 GeoJSON 慣例。
  ⚠️ 注意這跟 Leaflet 的 `[lat, lng]` 相反,從別處搬資料時要翻轉。
- **時間軸是把各 `phase.durationSec` 依序串接**而成;總長 = 所有 phase 時長相加。
- **匯出綁即時播放**(MediaRecorder),可能掉幀、格式為 WebM(非 MP4)。高品質 4K/MP4 逐幀匯出留 v2。
- **中文標籤由瀏覽器本機字型渲染**(localIdeograph):匯出端機器需安裝 Noto Serif TC / Noto Sans TC,中文地名才會顯示。

---

## JSON 格式（timeline schema）

頂層結構:

```jsonc
{
  "meta":     { ... },        // 影片基本設定
  "factions": [ ... ],        // 陣營（決定顏色）
  "places":   [ ... ],        // 地點 marker
  "phases":   [ ... ]         // 分鏡（時間軸的每一段）
}
```

### `meta`

| 欄位 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `title` | string | ✓ | 主標題,顯示在標題卡、也是匯出檔名。 |
| `subtitle` | string | | 副標題,顯示在主標題下方。 |
| `aspectRatio` | `"16:9" \| "9:16" \| "1:1"` | ✓ | 畫面比例 / 匯出解析度(1920×1080 / 1080×1920 / 1080×1080)。 |
| `basemapStyle` | string | ✓ | 底圖 id:`"dark"` / `"liberty"` / `"positron"`。 |
| `titlePosition` | `"top-left" \| "top-center" \| "top-right"` | | 標題卡位置,預設 `"top-left"`。 |
| `attribution` | string | | 地圖來源標註文字(顯示在右下)。 |

### `factions[]`（陣營）

決定行軍路線與所屬地點的顏色,並列在圖例。

| 欄位 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `id` | string | ✓ | 唯一識別,供 `place.faction` / `movement.factionId` 參照。 |
| `name` | string | ✓ | 顯示名稱(出現在圖例)。 |
| `color` | string | ✓ | CSS 顏色,如 `"#5b86d6"`。 |

### `places[]`（地點）

| 欄位 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `id` | string | ✓ | 唯一識別。 |
| `name` | string | ✓ | 地名標籤(畫在地圖上)。 |
| `lng` | number | ✓ | 經度。 |
| `lat` | number | ✓ | 緯度。 |
| `kind` | `"city" \| "castle" \| "battle" \| "terrain"` | ✓ | 地點種類;沒指定 `faction` 時用來決定顏色。**也決定圓點大小/外框**:`castle` 最大且外框粗、`battle` 次之、`city` 中、`terrain` 小。 |
| `faction` | string | | 所屬陣營 id;有則用陣營色,圓點上色。 |
| `appearAtPhase` | string | | 在「該 phase id 起」才出現;**省略 = 一開始就有**。 |
| `labelDir` | `"top" \| "bottom" \| "left" \| "right"` | | 名稱標籤相對圓點的方向,**預設 `bottom`(下方)**。密集地區用來錯開標籤避免重疊。 |
| `note` | string | | 備註(目前不渲染,供存檔說明用)。 |

### `phases[]`（分鏡 / 時間軸段落）

每個 phase 是時間軸的一段,有自己的鏡頭與行軍。

| 欄位 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `id` | string | ✓ | 唯一識別(供 `place.appearAtPhase` 參照)。 |
| `title` | string | ✓ | 階段名稱(顯示於側欄分鏡列表)。 |
| `date` | string | | 日期字串,如 `"1868-01-27"`(顯示於分鏡列表)。 |
| `durationSec` | number | ✓ | 此階段時長(秒)。 |
| `transitionSec` | number | | 進入此階段時,相機過渡所佔秒數;**省略 = `durationSec` 的 40%(上限 2 秒)**。 |
| `camera` | Camera | ✓ | 此階段的目標鏡頭(見下)。 |
| `movements` | Movement[] | ✓ | 此階段播放的行軍路線(可空陣列)。 |
| `annotations` | Annotation[] | | 此階段顯示的浮動文字標註。 |
| `fronts` / `territory` | — | | **v2 預留,目前不渲染。** |

#### `camera`（鏡頭關鍵影格）

相機在進入每個 phase 的前 `transitionSec` 秒,從「上一階段的鏡頭」平滑插值到此階段的鏡頭,之後維持。第一個 phase 直接定在自身鏡頭。整個過程是**決定性**的(scrub / 匯出結果一致)。

| 欄位 | 型別 | 說明 |
|---|---|---|
| `center` | `[lng, lat]` | 鏡頭中心。 |
| `zoom` | number | 縮放,約 0–22(數字越大越近)。 |
| `bearing` | number | 旋轉角(度),0 = 正北。 |
| `pitch` | number | 俯仰角(度),0 = 正上方俯視,越大越斜。 |
| `transition` | `"ease" \| "cut"` | **預設 `ease`**(平滑插值)。`cut` = 進入此 phase 時**硬切**到目標鏡頭、不插值,適合跳到遠方戰場(例如海戰)避免橫越大片地圖的拖沓。 |

#### `movements[]`（行軍路線)

箭頭沿 `path` 在此階段內逐漸生長;過去階段的路線預設維持全長顯示(可用 `persist` 關閉)。

| 欄位 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `id` | string | ✓ | 唯一識別。 |
| `label` | string | ✓ | 標籤(目前供說明用)。 |
| `factionId` | string | ✓ | 所屬陣營 id,決定線色。 |
| `style` | `"advance" \| "retreat" \| "artillery" \| "naval"` | ✓ | 線條樣式:`advance`/`retreat` 實線;`artillery` 短虛線(倒戈/砲擊);`naval` 長虛線、較淡(海戰/艦隊)。 |
| `path` | `[lng, lat][]` | ✓ | 路徑座標串(至少 2 點)。 |
| `drawDurationSec` | number | ✓ | 箭頭畫完整條路徑所需秒數(建議 ≤ 該 phase 的 `durationSec`)。 |
| `startSec` | number | | **階段內延遲幾秒才開始生長,預設 0**。同一階段多條給不同值即可**錯開**(例如三路進攻先後展開)。 |
| `persist` | boolean | | **預設 `true`**(畫完後累積保留到之後階段)。設 `false` = 只在自己的階段顯示,過了就消失,用來避免長戰役畫面糊成一團。 |

#### `annotations[]`（浮動文字標註)

只在所屬 phase 顯示(可用 `startSec` 讓它在階段中途才浮現)。

| 欄位 | 型別 | 說明 |
|---|---|---|
| `text` | string | 文字內容。 |
| `lng` / `lat` | number | 標註位置座標。 |
| `startSec` | number | **階段內延遲幾秒才浮現,預設 0**。例如讓「某城陷落」在該段播到一半才出現。 |
| `kind` | `"caption" \| "title"` | **預設 `caption`**。`title` = 較大字級,適合該段的結語/標題。 |

---

## 最小可用範例

```json
{
  "meta": {
    "title": "示範戰役",
    "subtitle": "西元某年",
    "aspectRatio": "16:9",
    "basemapStyle": "dark",
    "titlePosition": "top-center"
  },
  "factions": [
    { "id": "blue", "name": "藍軍", "color": "#5b86d6" },
    { "id": "red",  "name": "紅軍", "color": "#d6534d" }
  ],
  "places": [
    { "id": "a", "name": "甲城", "lng": 135.50, "lat": 34.70, "kind": "castle", "faction": "blue" },
    { "id": "b", "name": "乙城", "lng": 135.76, "lat": 34.93, "kind": "city",   "faction": "red", "appearAtPhase": "p2" }
  ],
  "phases": [
    {
      "id": "p1",
      "title": "藍軍進攻",
      "date": "0001-01-01",
      "durationSec": 6,
      "transitionSec": 2,
      "camera": { "center": [135.63, 34.81], "zoom": 10.5, "bearing": 0, "pitch": 30 },
      "movements": [
        {
          "id": "m1", "label": "北上", "factionId": "blue", "style": "advance",
          "path": [[135.50, 34.70], [135.63, 34.82], [135.76, 34.93]],
          "drawDurationSec": 4
        }
      ]
    },
    {
      "id": "p2",
      "title": "紅軍砲擊",
      "durationSec": 6,
      "camera": { "center": [135.76, 34.93], "zoom": 12, "bearing": -15, "pitch": 45 },
      "movements": [
        {
          "id": "m2", "label": "砲擊", "factionId": "red", "style": "artillery",
          "path": [[135.80, 34.95], [135.76, 34.93]],
          "drawDurationSec": 3
        }
      ],
      "annotations": [
        { "text": "紅軍反擊", "lng": 135.80, "lat": 34.95 }
      ]
    }
  ]
}
```

完整實例見 `examples/` 資料夾的各個 `.json`(或載入後在「資料(JSON)」面板讀到)。

---

## 技術概觀

- **框架**:React + TypeScript + Vite。
- **地圖**:MapLibre GL JS(WebGL 平滑運鏡);底圖 OpenFreeMap(免金鑰)。
- **地理運算**:Turf.js(`turf.along` / `lineSliceAlong` 讓箭頭沿路徑生長)。
- **動畫核心**:自建 timeline clock(`requestAnimationFrame`);`Scene.render(t)` 為純函式,播放 / scrub / 匯出共用同一條路。
- **匯出**:`canvas.captureStream()` + `MediaRecorder`。**所有要入鏡的地圖內容皆以 GL 圖層繪製**,圖例 / 標題則以 2D canvas 合成疊加(因為 captureStream 只錄 GL canvas)。

### 專案結構

```
examples/                  內建範例 JSON（自動載入成「範例」選單）
src/
├─ types/timeline.ts     資料模型（schema 的真實來源）
├─ data/examples.ts      載入 examples/*.json + 預設 / 空白 doc
├─ store/projects.ts     localStorage 專案存取（存檔 / 開啟 / 刪除）
├─ engine/               clock · timeline · camera · easing（動畫核心）
├─ render/               scene · movements · places · annotations · overlay · colors
├─ map/                  basemaps · MapStage（MapLibre 容器）· stageController
├─ export/recordWebM.ts  WebM 匯出（含合成圖例/標題）
└─ ui/                   ProjectBar · Sidebar · TransportBar · JsonEditor · Legend
```

---

## 已知限制 / 路線圖

**v1 限制**

- 匯出為即時錄製,可能掉幀;格式 WebM(非 MP4)。
- JSON 採整份貼上 / 套用;尚無拖拉式座標編輯。
- 中文匯出需本機字型(見上)。
- 專案存檔在**瀏覽器 localStorage**(單機、會被清快取清掉);長期備份請用「匯出 JSON」。

**v2 規劃**

- LLM 文字 → timeline JSON(帶座標校正)。
- 前線 / 領土多邊形隨階段變形(`fronts` / `territory`)。
- 高品質匯出:ffmpeg.wasm 逐幀 → 固定 fps 4K MP4。
- 標題卡轉場 / 字幕 / 旁白音軌、地圖點選填座標。
