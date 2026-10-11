# 宜蘭區域骨架與 workshop 錨點的暫供選擇 — 2026-10-01

Authority: Will, 2026-10-01，宜蘭 regional scene skeleton brief，原話：

> "the safe way is to make the DT wide enough to cover those areas and we choose one for workshop demo"
>
> "If indoor is harder to demo (it's controlled and needs less AI) we pick one outdoor"
>
> "the farm workshop is this weekend, i prefer not to do big moves"

Codex writer 於 2026-10-01 為 Claude Code lane 記錄以下暫供選擇，依 2026-09-30 決策檔先例：這不是 Director 裁示，也不冒稱 dragon5285、AskaYu800304、kevin70504 已同意。農場團隊可用較晚、具名、具日期的決策檔取代。本檔保留當時選擇與其 lineage。

Claude Code lane 暫供，2026-10-01：「先做一個涵蓋頭城、員山、冬山及壯圍／五結海岸的區域骨架；workshop 從壯圍沿海魚塭帶的人工戶外模擬錨點開始。既有半鹹水三塭夜間劇本、200／300／400 秒事件、設備及取樣不改。真實農場只作候選場域背景點，不給它們感測值、設備故障、浮頭風險、警示或 AI 建議。」

## 已公開地點與近似背景座標

所有列項都是**依公開來源描述的地點，不是測繪位置**；不代表農場入口、界址、內部配置、設備或 endorsement。來源 scout 只有柯林提供數值 map pin。其餘數值由 lane 編寫為來源所述地區的近似背景點，**不是公開頁面公布的精確農場經緯度**，不應用來導航。

| 候選背景點 | 近似 N, E | 位置出處與精度 |
| --- | --- | --- |
| 冬山鄉 柯林漁廠 | 24.684, 121.737 | [農業易遊網](https://ezgo.ardswc.gov.tw/zh-tw/leisure-area/10/) 記載柯林一路／羅東溪休閒農業區；[遊程票券頁](https://www.taiwanfarm.com.tw/products/nvwzl/) map embed 為 24.683887, 121.7367558。此處四捨五入為遊客地圖背景點，不是測繪 footprint。 |
| 冬山鄉 仁山漁廠 | 24.644, 121.733 | [仁山自述](https://www.rengsang.com.tw/sweet_about.html) 支持冬山所在地；brief 指定近仁山植物園。數值是植物園附近的人工區域近似，尚未驗證農場 pin，精度僅為地區。 |
| 員山鄉 蘭鱈三隻魚 | 24.744, 121.683 | [微笑台灣](https://smiletaiwan.cw.com.tw/article/4619) 支持員山所在地。數值是員山地區的人工近似，尚未驗證農場 pin，精度僅為鄉鎮。 |
| 頭城鎮 寶爸的墨瑞鱈 | 24.861, 121.819 | [業者公開 profile](https://www.facebook.com/profile.php/?id=100064880642056) 支持頭城所在地。數值是頭城地區的人工近似，尚未驗證農場 pin，精度僅為鄉鎮。 |

以上公開來源描述由 2026-10-01 `yilan-site-scout` 彙整；本 lane 先讀其報告，沒有取得現地測量或重新確認營運情況。`inputs/regional-anchors.json` 逐點保留來源、座標的作者性質與精度。點標籤一律含「候選場域，背景標示」；較粗略者加地區及「概略位置」。不描繪真實農場建物或池槽。

## 區域 bbox 與同一投影

WGS84 bbox：south 24.59、west 121.60、north 24.93、east 121.87。約 38 × 27 km，向候選點外側留餘量，也涵蓋壯圍／五結沿海。這是 lane 為 context roads 選的展示範圍，不是行政疆界或農場範圍。

workshop 人工地理錨點：**24.746 N, 121.814 E**，壯圍沿海魚塭帶的模擬放置。選戶外是依 Will 的方向；此背景適合既有半鹹水 pond-night 意象，週末前保留已驗證的 pipeline，並將虛構事件與真實農場名稱隔開。它不對應某個真實農場或 surveyed pond。沿用三塭原本本地 XY 公尺，不移動任何 canonical position；此錨點取代 viewer 的 dummy `(0,0)`。

道路、區域平面、背景標籤與相機 preset 皆用 DT 既有 center 與緯度 scale 換算至同一本地 XY。區域平面為人工平坦展示底面，不是真實高程、土地利用或地籍。OSM 只呈現區域道路，`authority_scope: "context-only"`；不加入 Node／Edge／Face topology、巡塭路線或 canonical frames。道路寬度和顏色只是呈現選擇。

## 保留與非目標

workshop 第一個 close oblique preset；其後每個候選一個 close 背景視角，沿用有限 orbit，不提供任意區域漫遊。切視角不把既有 mock 遙測或通知指派給候選。所有設備、水質、天氣、警示、寒流公告及 AI 建議仍是模擬，來源仍是 2026-09-30 決策與 canonical frames。

不做 live sensors、診斷、實際養殖建議、現地內部 mapping、供排水推論、runtime routing、真實 farm scenario 或部署。歷史 receipts／seals 不改；本次 package、道路 bake 及 generation 另建新 outputs 與具實際執行時間的 dated receipts。六堆資料及 generation 不變。
