# 宜蘭三塭世界展示的暫供選擇 — 2026-10-04

日期：2026-10-04，Asia/Taipei。實際作者與記錄者：Codex。狀態：provisional-not-director-ruling；這是本 lane 的可逆展示選擇，不是 dragon5285、AskaYu800304 或 kevin70504 的 Director 裁示。

依據：Will 2026-10-04 工作 brief 授權推進本地模擬場景，原話包含「Push as far as you can」；本 lane 分派要求水面、設備、夜間與周邊場景 dressing，保留既有資料 lineage、terrain-v3 平台與 canonical frames。下列數值由 Codex 依該範圍暫供選擇，不將分派摘要冒充 Will 或 Director 的逐字裁示。較晚、具名、具日期的 Director 決策可取代本選擇；本檔及後續 execution receipt 保留歷史位元組。

Codex 的暫供選擇原文：「沿用已編寫的三塭邊界及 12 個設備錨點，在既有整平小平台內加入少量鄰塭、田畦、土色步道、小屋與植栽；東側用狹長水面及蘆葦表現水岸意象。以近距離斜角讓三塭是桌面及手機的主角。所有新增幾何及外觀都標為模擬，不以 OSM 或影像推定內部配置，也不將靜態 dressing 變成 runtime 狀態。」

`inputs/pond-world-20261004.json` 是上述選擇的完整靜態數值宣告，schema 為 `pond-world/v1`，`simulation_label` 為「模擬」，`source_ref` 指向本檔。其來源逐項如下；同一組中的每個 ID 均適用該列來源及 notice。

| 靜態層／ID | 幾何及外觀來源 | Notice 與用途 |
| --- | --- | --- |
| `ponds`：pond-1、pond-2、pond-3 | `inputs/geometry.geojson` 的既有人工 Polygon，不改 XY；原始記錄為 `decisions/2026-09-30-yilan-pond-night-mock.md` | 三塭是人工模擬，不是現地測繪。水面色彩、輪廓與漣漪只作展示。 |
| `assets`：aerator-1/2/3、pump-1/2/3、sluice-1/2/3、power-mains、power-generator、weather-site | `inputs/assets.json` 既有 ID、kind、label 及 XY；Z 沿用 `candidate-packaging-terrain-v3.json` 的各設備 `base_z`，rotation 暫供 0 | 設備外形是程序製作的原創占位，不是產品型號、尺寸或現場機具；運轉、故障與燈號只由 canonical frame 驅動。 |
| `paths` 前三列 | `inputs/topology.json` 已編寫的三條 Edge 端點；2.6 m 寬為本檔暫供外觀 | 保留原行人塭岸走廊來源。其他 dressing 路徑不加入拓撲、可行走路線或 runtime 路徑。 |
| `context_ponds`：context-pond-west、context-pond-northwest、context-pond-north、context-pond-northeast、context-pond-east | Codex 2026-10-04 本檔的人工矩形選擇；完整座標見 world 輸入 | 人工鄰塭意象，僅是近景背景；沒有設備、水質、事件、Face 或即時場域權限。 |
| `context_ponds`：context-water-east-shore | Codex 2026-10-04 本檔的東側狹長人工水面；X 113–118 m，Y -16–96 m | 水岸意象，不宣稱這是海岸位置、河川、水道、供排水或潮汐界線；與既有 OSM 背景岸線來源分開。 |
| `paddies`：paddy-southwest、paddy-south、paddy-southeast、paddy-west、paddy-east | Codex 2026-10-04 本檔的人工田畦矩形；完整座標見 world 輸入 | 一般農地意象，不宣稱實際種植、作物種類、土地利用或產量。 |
| `paths` 後五列、全部 `vegetation`、`sheds`：workshop-shed、`palette` | Codex 2026-10-04 本檔的明確數值；樹、蘆葦、草與暖色小屋只用本地程序幾何 | 人工靜態場景 dressing；不宣稱真實植栽、建物、土地邊界或設備服務範圍。未下載模型、材質或照片。 |

靜態高度延續 terrain-v3：`sites/yilan-pond/terrain-scene-20261001.json` 宣告 workshop pad XY `[-20,-20,120,100]`，來源取樣後的展示平台 Z 為 1.683 m；既有面片頂面與設備 base 為 1.983 m。新增水面 Z 為 1.993 m，即在面片上加 0.010 m 的展示偏移以免重疊閃爍；土色步道 Z 為 1.813 m、田畦 Z 為 1.713 m、植栽及小屋 base 為 1.683 m。這些是展示高度，沒有更改 DTM、垂直基準、canonical position 或 transform。所有新增 polygon、中心與路徑都在既有人工整平範圍內，沒有新的 terrain bake。

固定近景 camera 以三塭中心附近 `[45,33,1.983]` 為 target；桌面 position 為 `[5,-66,76.683]`，手機 portrait 為 `[40,-102,115.683]`。這是本 lane 的初始 framing；瀏覽器驗看可在同一未執行宣告中調整，驗看結果另立新 execution receipt。既有區域候選背景視角與官方 DTM、OSM notice 仍保留。

`candidate-packaging-world-20261004.json` 延伸 `candidate-packaging-terrain-v3.json`，只指向新的 world-v1 static、canonical candidate 和 package receipt；world 輸入、本檔與原始靜態展示決策經 `context.source_paths` 保留，並有可見 `provenance_links`。`viewer.pondWorld.config` 使用 mount 相對路徑。`panel-site-world-20261004.json` 延伸既有 terrain notice 與 `panel-site-workshop-ui.json` 的 pond-night UI、取樣欄位、寒流公告及相機設定。`viewer-generation-world-20261004.json` 保留 terrain-v3 的 clean DT revision `7116d70b9517e7d2aad1925c669b0e5341724469`，輸出新 local generation；不改舊輸出或舊 receipt。

本 lane 的後續分派依 Will 的方向重用 DT 已有的 canonical `projection.environment` 環境與 lighting 消費能力，不另寫夜色 engine。Codex 在 `scenarios/pond-night-world-20261004.json` 保留 `scenarios/pond-night.json` 的全部既有 telemetry、事件、引用及原始 authoring 記錄，僅新增以下兩筆由 Codex 於 2026-10-04 明確編寫的視覺 environment keyframes；本檔是新增 lighting 值的暫供來源，原始 authoring 記錄只表示被沿用的原始內容。

| elapsed_seconds | preset_hint | sun.azimuth_deg | sun.elevation_deg | 模擬展示選擇 |
| --- | --- | --- | --- | --- |
| 0 | night | 100 | -18 | 深夜冷色氣氛，維持至最後一筆夜間取樣。 |
| 550 | dawn | 100 | 2 | 暖色破曉前意象，沿用 DT 的 dawn preset。 |

以上 sun 角度與 preset 是作者指定的模擬視覺輸入，不是天文計算、真實日出時間、經緯度推算或光照觀測。既有模擬 chronology 將展示 600 秒對應 2026-01-15 22:00 到次日 06:00，每 5 展示秒對應 4 模擬分鐘；因此夜間 preset 延續至 elapsed 545 秒的 05:16 取樣，elapsed 550 秒對應 05:20 起採暖色破曉前意象。這是編寫的展示轉換，不宣稱宜蘭當日已日出。

新輸入宣告為 `site-inputs-world-20261004.json`，僅將 scenario path 改指 world scenario，並將新 bake 輸出指向 `outputs/pond-night-world-20261004`；幾何、拓撲、設備及原始夜間決策仍沿用原有來源。Frame Engine 在 bake 時每 5 展示秒產生 canonical environment sample，`time_of_day` 取自原有模擬 chronology，並攜帶 scenario 來源與本次展示選擇的 provenance refs。靜態 world 輸入不帶 environment 或 runtime lighting 權限；player 只消費已 bake 的 canonical environment，不從時間、位置、terrain 或靜態配置推算或修補它。

原始 `outputs/pond-night` 及其 6 個 canonical frames 保留為歷史；本次 lighting 必須另產生新 dated bake 及 packaging execution receipt，新的 world-v1 candidate 改從 `outputs/pond-night-world-20261004` 包裝，並使用已宣告的新 `receipts/20261004-pond-world-v1.receipt.json`。這不是新的 terrain bake。現有設備、水質、天氣、故障、浮頭風險、AI 建議及模擬寒流公告的 telemetry 與 event inputs 不改，仍只由 canonical frames 提供；不從靜態配置補推設備或水質狀態，不改寫任何歷史 scenario、bake、決策或 receipt。

整個場景及推薦都屬十分鐘、可重置的國立屏東科技大學「智慧化農業管理平台」模擬原型；沒有真實農場幾何、即時 IoT、感測觀測、病害診斷、養殖操作建議、任意導航、runtime 路徑規劃、上線或外部發佈權限。OSM 及 MOI DTM 只沿用既有背景及其保留來源與授權，沒有用它們推定內部塭界。本檔是 notice 與 authoring provenance，execution receipt 必須另由實際執行產生。
