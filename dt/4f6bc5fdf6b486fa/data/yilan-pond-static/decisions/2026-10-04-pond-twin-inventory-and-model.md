# Pond twin inventory and oxygen assumptions — 2026-10-04

Authority: Claude Opus 5.5 CTO, delegated 宜蘭 lane; recorded/executed by Codex on 2026-10-04 under the explicit pond-twins brief. Will owns product direction (2026-10-04: "so those are not twins, and are not useful for simulation. We need to set those up", "Push as far as you can"). Will delegated 宜蘭 data to the CTO on 2026-10-02: "yilan is you". These are reasonable authored mock choices within that brief, not measurements or validated aquaculture recommendations.

This decision supersedes the earlier flat inventory, scripted DO, suburban shed and simulated nearby pond-grid dressing for the new candidate only. Earlier inputs, candidates and receipts remain history. The supplied 2026-10-04 CTO satellite scout is visual reference only; no aerial geometry is traced or admitted as fact.

Chosen inventory: four 2 m paddle-wheel twins per pond, each rated 1.1 kW, and two 80 kg post-mounted automatic feeders per pond. Each pond has a 1.5 kW / 30 m³/h inlet pump on the bank fed from an authored inlet-channel Face, and a 1.2 m drain sluice at a Node declared on a bank Edge. There are six aerator circuits (three wheels on A and one on B per pond), mains, a 20 kW backup generator, a control panel, a sheet-roof work shed and the retained weather station. Total 35 equipment twins. Aerators anchor in pond Faces, feeders/pumps on bank Edges, sluices at drain Nodes, and electrical/shed/weather equipment in the shed-footprint Face. Cables follow bank Edges as relationships; channels are Faces and never pedestrian Edges.

Three nominal 40 × 40 m ponds have 2 m rounded corners, black liner and 3 m shared grassy dikes. Corner rounding removes less than 0.3% of nominal area; the model deliberately uses nominal 1,600 m² and 1.5 m water depth (2,400 m³), an authored simplification. Canal bank pads, pipe directions, gate dike nodes and a 10 × 8 m open work shed beside the west farm road are authored, not surveyed. The generator is sheltered inside the open shed so equipment remains inspectable. The existing paddle-wheel primitive is scaled to 1.98 m overall; feeders, pumps and gates have modest readability exaggeration. Lamp pools and foam are decorative and do not assert physical light or fluid simulation. Context is mainly paddies, with two scattered pairs of ponds.

Oxygen assumptions chosen before the first model run: fish biomass 12,000 kg per pond, reference fish demand 0.3 g O₂/(kg·h), sediment demand 0.75 g O₂/(m²·h), Q10 = 2 at 24 °C. Each running wheel's authored standard oxygen transfer is 2.4 kg/h with a fixed field factor 0.5 (1.2 kg/h effective). Four running wheels therefore supply 4.8 kg/h; reference fish plus sediment demand is also 4.8 kg/h. This is a deliberately simple oxygen-budget contrast, not manufacturer or biological validation. Water temperature is held at 24 °C over the compressed night as a thermal-inertia assumption; the retained air-temperature/cold announcement profiles remain independent. Initial DO is 6.5, 6.3 and 6.4 mg/L. Night photosynthesis, natural reaeration, water exchange, growth and feeding oxygen demand are omitted; feeders/pumps are idle and sluices closed. Oxygen is bounded between 0 and an authored 8 mg/L ceiling.

Equation: C_next = clamp(C + 1000·Δt_hours/V_m³·[Σ running SOTR_i·field_factor_i − (biomass·fish_rate + area·sediment_rate)/1000·Q10^((T−24)/10) + photosynthesis], 0, 8). The bake uses fixed five-demo-second steps (four simulated minutes), double precision and deterministic decimal output; the threshold is tested on unrounded model concentration.

At demo second 200 (00:40), pond 3 circuit A trips and its three served wheels stop; its B wheel remains running. No wheel, pump, gate, generator or worker automatically responds. The retained illustrative threshold is 4.0 mg/L. The first computed crossing sets both the canonical warning and the unchanged simulated AI suggestion time. No post-run parameter tuning is authorized to force 02:00; report the resulting time. Model parameters are retained in inputs/pond-oxygen-parameters-20261004.json. Shared model code is versioned by Git; evolving code bytes are not evidence pins.

The declaration below retains the night clock, announcement and suggestion wording required by the existing bake interface. Equipment/scenario inputs and the parameter file carry the full new inventory and model choices.

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
    {
      "id": "pond-1",
      "label": "魚塭 1（模擬）",
      "polygon": [
        [
          38.0,
          0.0
        ],
        [
          38.76537,
          0.15224
        ],
        [
          39.41421,
          0.58579
        ],
        [
          39.84776,
          1.23463
        ],
        [
          40.0,
          2.0
        ],
        [
          40.0,
          38.0
        ],
        [
          39.84776,
          38.76537
        ],
        [
          39.41421,
          39.41421
        ],
        [
          38.76537,
          39.84776
        ],
        [
          38.0,
          40.0
        ],
        [
          2.0,
          40.0
        ],
        [
          1.23463,
          39.84776
        ],
        [
          0.58579,
          39.41421
        ],
        [
          0.15224,
          38.76537
        ],
        [
          0.0,
          38.0
        ],
        [
          0.0,
          2.0
        ],
        [
          0.15224,
          1.23463
        ],
        [
          0.58579,
          0.58579
        ],
        [
          1.23463,
          0.15224
        ],
        [
          2.0,
          0.0
        ]
      ]
    },
    {
      "id": "pond-2",
      "label": "魚塭 2（模擬）",
      "polygon": [
        [
          81.0,
          0.0
        ],
        [
          81.76537,
          0.15224
        ],
        [
          82.41421,
          0.58579
        ],
        [
          82.84776,
          1.23463
        ],
        [
          83.0,
          2.0
        ],
        [
          83.0,
          38.0
        ],
        [
          82.84776,
          38.76537
        ],
        [
          82.41421,
          39.41421
        ],
        [
          81.76537,
          39.84776
        ],
        [
          81.0,
          40.0
        ],
        [
          45.0,
          40.0
        ],
        [
          44.23463,
          39.84776
        ],
        [
          43.58579,
          39.41421
        ],
        [
          43.15224,
          38.76537
        ],
        [
          43.0,
          38.0
        ],
        [
          43.0,
          2.0
        ],
        [
          43.15224,
          1.23463
        ],
        [
          43.58579,
          0.58579
        ],
        [
          44.23463,
          0.15224
        ],
        [
          45.0,
          0.0
        ]
      ]
    },
    {
      "id": "pond-3",
      "label": "魚塭 3（模擬）",
      "polygon": [
        [
          38.0,
          43.0
        ],
        [
          38.76537,
          43.15224
        ],
        [
          39.41421,
          43.58579
        ],
        [
          39.84776,
          44.23463
        ],
        [
          40.0,
          45.0
        ],
        [
          40.0,
          81.0
        ],
        [
          39.84776,
          81.76537
        ],
        [
          39.41421,
          82.41421
        ],
        [
          38.76537,
          82.84776
        ],
        [
          38.0,
          83.0
        ],
        [
          2.0,
          83.0
        ],
        [
          1.23463,
          82.84776
        ],
        [
          0.58579,
          82.41421
        ],
        [
          0.15224,
          81.76537
        ],
        [
          0.0,
          81.0
        ],
        [
          0.0,
          45.0
        ],
        [
          0.15224,
          44.23463
        ],
        [
          0.58579,
          43.58579
        ],
        [
          1.23463,
          43.15224
        ],
        [
          2.0,
          43.0
        ]
      ]
    }
  ],
  "fault_pond_id": "pond-3",
  "fault_seconds": 200,
  "cold_warning_seconds": 400,
  "illustrative_do_threshold_mg_l": 4.0,
  "illustrative_cold_air_threshold_c": 12.0,
  "air_temperature_keyframes": [
    [
      0,
      19.0
    ],
    [
      200,
      16.0
    ],
    [
      400,
      12.0
    ],
    [
      595,
      10.0
    ]
  ],
  "fault_title": "3 塭 A 迴路跳脫（模擬）",
  "fault_detail": "3 塭 A 迴路跳脫，三台水車停止；B 迴路的一台仍運轉。市電正常，備用發電機待命。",
  "risk_title": "3 塭浮頭風險（模擬）",
  "risk_detail": "模型 DO 穿越示意門檻 4.0 mg/L；1、2 塭持續曝氣。未加入人員處置。",
  "suggestion_label": "AI 建議（模擬）",
  "suggestion_text": "移入備用水車，暫停翌晨投餌；本建議為劇本內容，非實際操作指示。",
  "cold_title": "寒流提醒｜模擬公告",
  "cold_detail": "模擬冷空氣於後半夜抵達，氣溫續降；此公告為展示編寫，不是任何機關發布。",
  "notice": "所有設備、水質、天氣、警示與 AI 建議均為模擬；僅供十分鐘原型展示，非監測、診斷或養殖操作建議。"
}
```
