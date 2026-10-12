# 宜蘭魚塭的塭岸節點、走廊與標籤 — 2026-09-30 補充

Authority: 2026-09-30 lane A2 brief requires the DT viewer to show author-created, labelled simulated 宜蘭 ponds. In the actual initial browser run the parent observed missing `meshes/nodes.glb`, `meshes/edges.glb` and absent pond labels. The bounded integration assignment asks to emit the authored topology with DT's existing polygon and ribbon primitives, and to declare the existing pond labels through `supported-labels`.

Codex A2 packaging writer 於 2026-09-30 為 Claude Code lane 記錄：「沿用 A1 的四個塭岸 Node 位置與三條 pedestrian bank corridor Edge，不新增或推測連通。節點呈現為 0.9 公尺寬、底高 0.1 公尺、厚 0.25 公尺的小方標；走廊呈現為 1.8 公尺寬、Z 為 0.1 公尺的米色 ribbon。這些尺寸與高度只是人工展示風格，不是現地量測。三塭既有『模擬』標籤經 DT 的 supported-labels 契約載入。」

本補充是 pipeline 展示的可逆暫供選擇，不是 Director 裁示。Director 是 dragon5285、AskaYu800304、kevin70504；團隊可用較晚、具名、具日期的決策檔取代。本檔不改寫 `decisions/2026-09-30-yilan-pond-static-presentation.md`，也不改寫 A1 決策、canonical frames 或 v1/v2 packages 與 receipts。

完整數值由 `candidate-packaging.json` 的 `static.node_style`、`static.edge_style` 宣告，RGBA 顏色分別是 `[138,128,103,255]` 與 `[206,188,148,255]`。站台顯示 Node、Edge 兩層。使用 read-only DT-Tourism 的 `extrude_polygon` 與 `extrude_ribbon`，產物保留每個 Node/Edge 的原始 stable ID；不使用有 SML 預設值的 legacy graph exporter。

Node 位置與 Edge 起訖唯一來源是既有 `inputs/topology.json`。Edge 是人工行人塭岸走廊，不是水路、供排水或疾病傳播連通。靜態 mesh 只呈現 authored scene/topology，不能計算 runtime route、restriction、response 或 equipment state。

新的 v3 執行 receipt 記錄本補充、實際 source bytes、shipped mesh/candidate bytes 與實際 UTC 執行時間。所有資料、圖形、設備、水質、天氣、警示與 AI 建議仍為模擬；沒有真實地理定位、監測、診斷、機關發布或養殖操作指示。
