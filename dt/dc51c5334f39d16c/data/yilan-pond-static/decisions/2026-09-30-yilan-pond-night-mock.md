# 展示選擇 —— 宜蘭魚塭夜間（模擬）

Authority: Claude Code lane, provisionally supplied on the 2026-09-30 pond-feed brief: "Option A from the architecture scout. Keep the existing six canonical frames (0/100/…/500 s)." "At a baked time, pond 3's 水車 goes to fault. Its DO falls while the other ponds hold."

本檔依 2026-09-30 brief 由 Codex writer 記錄 Claude Code lane **替團隊暫供的選擇**，沿用
2026-09-28 的先例。這不是 Director 的裁示，也不冒稱團隊已同意。依 `AGENTS.md` 記錄的
Will 2026-09-24 原話：「Director 是團隊，不是我。」Director 是 dragon5285、AskaYu800304、
kevin70504；團隊可以隨時用一份較晚、具名、具日期的決策檔取代本檔，不必先問我們。本檔保留為
2026-09-30 暫供選擇的記錄，不改寫歷史位元組。

## 暫供選擇及原話

Claude Code lane 暫供，2026-09-30：「用三座半鹹水金目鱸模擬魚塭；1、2 塭持續曝氣，3 塭水車在
200 秒故障，DO 在 300 秒到 3.8 mg/L，出現浮頭風險與模擬建議；400 秒顯示一則寒流模擬公告。」

這些數值、時間、魚種與建議只為清楚展示 pipeline，未核定生物學門檻，不是實際養殖操作指示。
魚塭為宜蘭意象的原創場景，沒有對應真實地點。三個矩形以本地公尺座標人工編寫；水車、泵與閘門
錨定各自的塭。沒有從 OSM、航照或另一農場推測內部邊界、水流或供排水連通。

展示 600 秒壓縮 8 小時（2026-01-15 22:00 到次日 06:00）的模擬夜晚，每 5 展示秒一筆取樣，
最後一筆為 595 秒；600 秒保留該筆及原取樣時間。日期是劇本，不是真實天氣紀錄。門檻僅用於
bake 編寫既定事件，不由面板判斷。

以下是本檔供 baker 讀取的完整宣告；值與中文文字的出處是本次暫供選擇。

```json
{
  "scenario_id": "pond-night",
  "title": "魚塭夜間（模擬）",
  "summary": "宜蘭三座金目鱸模擬魚塭的夜間設備、水質與天氣；3 塭水車故障，其他塭維持曝氣。",
  "simulation_label": "模擬",
  "species": "金目鱸（模擬半鹹水養殖）",
  "night_start": "2026-01-15T22:00:00+08:00",
  "night_seconds_per_demo_second": 48,
  "sample_step_seconds": 5,
  "duration_seconds": 600,
  "ponds": [
    {"id": "pond-1", "label": "魚塭 1（模擬）", "polygon": [[0, 0], [40, 0], [40, 30], [0, 30]], "do_start_mg_l": 6.5},
    {"id": "pond-2", "label": "魚塭 2（模擬）", "polygon": [[50, 0], [90, 0], [90, 30], [50, 30]], "do_start_mg_l": 6.3},
    {"id": "pond-3", "label": "魚塭 3（模擬）", "polygon": [[25, 40], [65, 40], [65, 70], [25, 70]], "do_start_mg_l": 6.4}
  ],
  "fault_pond_id": "pond-3",
  "fault_seconds": 200,
  "risk_seconds": 300,
  "cold_warning_seconds": 400,
  "illustrative_do_threshold_mg_l": 4.0,
  "illustrative_cold_air_threshold_c": 12.0,
  "fault_do_keyframes": [[0, 6.4], [200, 5.6], [300, 3.8], [500, 2.6], [595, 2.5]],
  "air_temperature_keyframes": [[0, 19.0], [200, 16.0], [400, 12.0], [595, 10.0]],
  "fault_title": "3 塭水車故障（模擬）",
  "fault_detail": "3 塭水車停止曝氣；市電正常，備用發電機待命。",
  "risk_title": "3 塭浮頭風險（模擬）",
  "risk_detail": "模擬 DO 降至 3.8 mg/L，低於劇本示意門檻 4.0 mg/L；1、2 塭維持曝氣。",
  "suggestion_label": "AI 建議（模擬）",
  "suggestion_text": "移入備用水車，暫停翌晨投餌；本建議為劇本內容，非實際操作指示。",
  "cold_title": "寒流提醒｜模擬公告",
  "cold_detail": "模擬冷空氣於後半夜抵達，氣溫續降；此公告為展示編寫，不是任何機關發布。",
  "notice": "所有設備、水質、天氣、警示與 AI 建議均為模擬；僅供十分鐘原型展示，非監測、診斷或養殖操作建議。"
}
```

## 背景出處

本 lane 先讀兩份 2026-09-30 scout 報告。它們提供夜間 DO、設備與寒流的背景脈絡，沒有驗證本檔
魚種專屬的門檻或回復時間。本候選所有值的直接 provenance 是本檔的人工模擬宣告；不以真實機關
的名義發布公告，也不宣稱現地監測。

## 可修訂性

Director（團隊）後續具日期、具名並載明取代內容的決策檔優先。本暫供選擇與輸出 receipt 保留歷史。
