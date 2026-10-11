# 宜蘭區域骨架的呈現暫供選擇 — 2026-10-01

Authority: Will's 2026-10-01 regional-skeleton brief, tasks 3–4: "Convert the frozen roads into road assets with DT's existing primitives, used as a library and not edited" and "Add a regional flat surface, the road assets, candidate labels, and one close preset per anchor, with the workshop anchor first."

Codex writer 於 2026-10-01 為 Claude Code lane 暫供：「沿用三塭及設備原有幾何、配色、取樣和夜間事件；用人工平坦區域底面襯托 frozen OSM 背景道路。每個候選只有背景文字錨點，不建造真實農場的池槽或建物。相機維持原有 close oblique 距離與有限 orbit；只把 target 移到指定背景地區，workshop 視角排第一。」

這不是 Director 裁示。dragon5285、AskaYu800304、kevin70504 可用較晚、具名、具日期的檔案取代；區域 bbox、錨點來源與精度沿用 `decisions/2026-10-01-yilan-region-skeleton.md`，不補稱測繪或 public map pin。

`road-bake.json` 是道路呈現的完整數值宣告。寬度以展示公尺為 motorway 12、trunk 10、primary 8、secondary 6、tertiary 5、unclassified 4、residential 3；link 分別為 6／5／5／4／3。灰綠 RGBA `[151,155,147,255]`、Z `0.03`。這些是 lane 編寫的可讀性選擇，不是 OSM 路寬或現地量測。線段只依 frozen highway geometry 投影及裁切，不用它們連接或計算巡塭路線。

`candidate-packaging.json` 是底面、保留 pond styles、背景文字及 close presets 的完整數值宣告。底面從 bbox 四角投影而來，Z `0`，配色沿用 A2 的人工底面。所有候選的 camera offset 是 `[0,-145,110]`，target Z `0.3`；workshop 沿用 `[45,-110,110]` 看向 `[45,35,0.3]`。far plane `1000`、orbit max distance `350` 沿用 A2，不因此開放任意區域漫遊。背景標籤含「候選場域，背景標示」；沒有精確 pin 的點加「概略位置」。按鈕用較短地區名稱方便選擇，完整來源與限制可在 provenance 查閱。

面板 subtitle 與 notices 明示卡片固定屬於壯圍 workshop 模擬三塭。切到候選背景點不把 telemetry、故障、浮頭风险、警示、寒流公告或 AI 建議附於真實農場。原有 frame／scenario／決策 bytes 不改。OSM attribution 與 public source links 透過保留的擷取紀錄、區域決策與錨點清單可見。

本次只是可重設的十分鐘 prototype，不做現地監測、診斷、養殖操作指示、內部 mapping、runtime routing、live feed 或部署。
