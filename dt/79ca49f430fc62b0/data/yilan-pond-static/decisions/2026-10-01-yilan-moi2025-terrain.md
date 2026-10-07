# 宜蘭 MOI 2025 背景地形與垂直呈現選擇

日期：2026-10-01。記錄者與本 lane 的執行選擇：Codex。依據：Will 同日 terrain brief 的「ok, your call. Take it slow, no rush, but keep going.」、官方 20 m DTM、海面平坦、魚塭與背景物件須貼合表面、farm main 凍結及 branches only 的方向。本記錄是該 brief 下可回復的展示選擇；保留既有農場團隊與 Claude lane 的決策紀錄。

## 官方來源與授權

採用內政部地政司「2025年版全臺灣20公尺網格數值地形模型DTM資料」，政府資料開放平臺資料集 https://data.gov.tw/dataset/176927 。同一資料集的官方 TGOS index 連結不分幅臺灣合併 archive，資源名 `不分幅_台灣20MDEM(2025)`、實際下載檔名 `不分幅_全台20MDEM(2025).zip`。宜蘭縣分幅更新 archive 在指定 bbox 的西北陸地缺資料；其觀察 binding 與不採用理由另存 acquisition receipt。使用官方合併資料補齊，沒有換用非官方或全球 DEM。

原始 archive 268,985,841 bytes，SHA-256 `2e1cd738b3c3abbcfdbce79ac18a5818a6ec80aa32c2813f0e21cfd909be295c`。只放 ignored cache，Git 保留可重下載的 URL、大小、SHA-256、原始 member 資訊及取得時間。`seed-dem` 驗證已存在 archive 後跳過網路；重建過程不取得網路資料。

授權是政府資料開放授權條款第1版（OGDL 1.0）：https://data.gov.tw/license 。顯名聲明與衍生處理說明保存在 `inputs/dem/source-notice.md` 及 acquisition receipt；包裝與 panel 的來源文字亦保留提供機關、2025 資料名稱、授權網址及衍生者。

## 水平與垂直政策

裁切 bbox 固定為 south 24.59、west 121.60、north 24.93、east 121.87；場景中心保持 24.746 N、121.814 E。DT 的 `DEMGrid` 負責讀取與轉換，`site_bake_terrain.generate_terrain_for_profile` 負責格網表面。圖資 catalogue 與 XML 宣告 TWD97/TM2 121（EPSG:3826），TIFF 自訂標籤為 WGS84/TM2 121；本 lane 明確選 EPSG:3826，保留兩者原始聲明。PixelIsPoint 以原始 pixel center 取樣，不額外平移半格。

垂直比例 1×，geoid offset 0 m。使用來源公尺高程，不聲稱做過垂直基準轉換。宜蘭分幅 header 宣告 TWVD2001；合併 TIFF 沒有明確垂直 datum tag。此差異列在 receipt，不把顯示海面 zero 宣稱為精密測量 datum。蘭陽平原近乎平坦是預期行為，往西丘陵保持 relief。

OSM 岸線只作為背景陸海遮罩。海面全部維持 Z=0 m，且邊界在原岸線上。海岸 transition 距離 20 m。缺測或非正陸地樣本使用明示的 0.1 m 顯示底限；缺測僅可落在距岸 110 m 內，超出此帶即停止。此界線是本 lane 的 authored display policy，並非官方地形修補規則。

完整 20 m 格網有 2,590,465 個節點，其中 2,293,218 個為背景陸地。DT 的保留 NoData 取樣有 413 個缺測 query；最遠距 OSM 岸線 103.360 m。該 query 的 bilinear footprint 觸及距岸 78.395 m 的缺測來源 cell，並非內陸地形大片缺口。採 110 m 帶涵蓋此 footprint；沒有換用最近鄰填補或其他 DEM。完整檢查另存新的 fine-grid verification receipt，不改 acquisition receipt 的既有 200 m 粗檢查。實際 clamp 統計保存在地形 metadata。

DT 既有 S1 mesh 採 20 m 格網與 sigma 1.5 cells 平滑，頂點不低於來源樣本 2 m；其平滑為衍生展示處理，不能視為原始 DTM 測量值。所有 roads、水域、水道與建物展示幾何依匯出的實際三角表面取樣，保留 layer 的小幅防閃爍 offset。建物高度延續 OSM 或明示 fallback，底部與屋頂隨地表作示意貼合，不新增結構、橋梁或水文主張。

## 人工 workshop 平台

三口模擬塭的 XY、IDs、設備錨定、拓樸、劇本與 telemetry 保持既有 authored input。為使平坦塭面與設備落在同一表面，本 lane 編寫 local XY bounds [-20,-20,120,100] m 的小平台，平台 Z 取 [0,0] 的 DTM 樣本，量化至 0.001 m；外圈 transition 40 m。平台在 DT 平滑後烘焙進 terrain，屬人工展示整地，不是現地農場地形。

Static face/node/edge/asset styles 加上相同平台高程與原展示 offset，farm 的 branch packager 可保持不變。平台不提供新 runtime state、position、route 或建議；canonical pond-night bake 仍是既有模擬 telemetry 與事件的 authority。Viewpoint 與背景標籤的 Z 在建置時取樣，執行時不補算或修復 canonical 內容。

## 保留與驗證範圍

DT、Penghu、panel-core、farm main 及既有 receipts 不修改。本 lane 的新 base/static/canonical folder 以新 receipts 綁定，證明重建 inventory、SHA-256 與大小相同後忽略 derived bytes。來源、授權、此選擇與執行 receipts 留在 site。真實 browser 的 workshop、冬山柯林、員山、300 s、reset 與海岸 screenshots 及其觀察另見 lane report。
