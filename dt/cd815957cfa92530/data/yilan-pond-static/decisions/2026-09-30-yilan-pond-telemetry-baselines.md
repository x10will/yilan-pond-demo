# 宜蘭魚塭 telemetry 基線補充（模擬）

Authority: Claude Code lane, provisionally supplied by Codex writer on 2026-09-30 under the lane A1 brief: "Bake the pond night from the site repo's inputs into the site repo's output folder." "Candidate packaging and receipts belong to the next lane, so a bake output plus tests is enough here."

這是 Claude Code lane 替團隊暫供的補充選擇，不是 Director 裁示。Director（dragon5285、AskaYu800304、kevin70504）可用較晚具名具日期的記錄取代。原 2026-09-30-yilan-pond-night-mock.md 的內容、魚種、三塭幾何、DO／氣溫曲線、事故時間與模擬建議文字全部保留，本檔不改寫它。

## 暫供選擇及原話

Claude Code lane，Codex writer，2026-09-30：「把缺少的基線寫成 site scenario 的 29 條 telemetry_profiles：1、2 塭 DO 從 6.5／6.3 降至 6.1／5.9 mg/L；3 塭使用原故障 DO 曲線。水溫 1／2／3 塭分別由 24.5／24.2／23.9 降至 20.5／20.2／19.9 °C；pH 7.8 降至 7.6，鹽度 12.0 升至 12.2 ppt，水位 1.5 降至 1.48 m。雨量 0、0、0.6、1.2 mm/h 對應 0、200、400、595 秒；風速 1.8、2.4、4.0、5.2 m/s 對應相同時間。所有數字是劇本，沒有現場或生物學準確性主張。」

同一人、同一天：「1、2 塭水車一直 on；3 塭水車在 200 秒改為 fault；所有泵 off，水閘 closed，市電 normal，發電機 standby。這些狀態到 595 秒保持。數字 keyframes 在 bake 時線性展開到五秒樣本，保留兩位小數；設備採 bake 時 step 展開。面板只能選既有樣本，不能插值或推論。」

同一人、同一天：「原曲線線性展開後首次 DO 低於 4.0 mg/L 是 290 秒（3.98 mg/L），浮頭風險與 AI 建議（模擬）仍按原 decision 的 300 秒啟動；不把兩者誤稱同一時間，不修改原曲線或原事件。水車故障是 200 秒，寒流模擬公告是 400 秒。公告沒有任何真實機關 byline。」

## Lineage

完整數值、單位、精度、bake interpolation 與事件宣告位於 scenarios/pond-night.json。每筆輸出樣本及事件同時引用原 decision、本補充記錄與實際 scenario JSON 的 path@sha256；輸出保留兩份 decision 的原始位元組。資料值存在 site repo，farm 程式沒有隱藏魚塭基線。所有圖層、設備、水質、天氣、公告、建議都是模擬，僅供 resettable 十分鐘原型；非監測、診斷或真實養殖操作指示。沒有候選包裝或 execution receipt。
