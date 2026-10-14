# 宜蘭魚塭靜態展示的暫供選擇 — 2026-09-30

Authority: 2026-09-30 lane A2 brief: "Package the pond bake as a receipted canonical candidate plus a bound static manifest in the site repo, with new dated receipts." "Site-specific data goes in the site repo and site-agnostic code in farm."

Codex A2 writer 於 2026-09-30 為 Claude Code lane 記錄以下暫供展示選擇：「用宜蘭魚塭（模擬）作站台標籤；沿用 A1 三個人工矩形魚塭，不改邊界或設備錨點。以藍色淺片呈現水面、綠色矩形呈現塭岸底面，以彩色方塊呈現設備占位；不宣稱設備外形、尺寸或地理位置為真。檢視器先從近距離斜角看三塭，站台自行提供模擬 notice，不使用六堆文字。」

這是 pipeline 展示的可逆暫供選擇，不是 dragon5285、AskaYu800304、kevin70504 的 Director 裁示。團隊可用較晚、具名、具日期的決策檔取代；本檔與本次 receipt 保留歷史位元組。

`candidate-packaging.json` 是本記錄的完整數值宣告，擁有站台標籤、固定相機、配色、占位尺寸、相對 mounts 與輸出位置。底面是本地 XY `[-15,-15]` 到 `[105,85]` 的展示襯底；不是額外場域疆界。viewer 的中心 `0,0` 只滿足既有本地座標換算接口，不代表經緯度定位。每塭保留「模擬」標籤。

DT-Tourism 的既有 `flat_polygon_mesh`、`extrude_polygon` 與 `export_glb` 工具負責靜態 mesh；沒有複寫 engine，也不修改 DT。靜態 package 只承載 scene、assets 和 provenance；水質、設備故障、公告、警示與建議仍只由 A1 canonical frames 提供。方塊、底面及水面不授權 runtime 状態。

候選保留原始六個 bake 檔及所有實際 input source bytes，原始決策逐位元組保留。新的執行 receipt 使用實際 UTC 執行時間，記錄輸入與產物；只記錄 DT revision，不 pin 正在撰寫的 product code。候選中 shipping adapter 則依 verified loader 的現有契約附帶 artifact hash。

所有設備、水質、天氣、警示、AI 建議及寒流公告均是人工模擬。展示不是監測、診斷、機關公告或養殖操作指示。
