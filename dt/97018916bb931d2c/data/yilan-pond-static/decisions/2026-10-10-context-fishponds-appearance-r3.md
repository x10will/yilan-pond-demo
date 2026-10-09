# Fishpond static appearance correction — 2026-10-10

Recorded by Codex under the delegated correction of Will's 2026-10-10 fishpond presentation brief.
The parent inspected r2 opening and regional screenshots and requested a clearly readable blue water belt
with earthen banks. This is an authored static appearance choice, not new source geometry.

Inspection found that generated r2 surfaces contain the expected colors and normals, but their glTF
primitives declare no materials. The retained viewer uses Lambert fallback for these primitives;
there is no evidence that the default metallic PBR path caused the dark appearance.
Generated water also declares layer `water`, which the pond adapter replaces with its shared authored
context-water material. Retained blue water declares `context-waterways` and avoids that replacement.

The appearance-r3 bake declares nonmetallic, rough, opaque, double-sided PBR materials for water, bank
and soil, carrying the configured RGBA palette once as normalized baseColorFactor without COLOR_0
multiplication. Generated water declares `context-waterways`, matching retained blue context water.
The near prop and far manifest layer request preservation of declared materials. Material-less retained
OSM geometry still follows the viewer's existing fallback. No terrain override flag is added.

The same public source `inputs/context-fishponds-public-20261010-r3.geojson` and its 103 geometry arrays and IDs remain authoritative.
The public source receipt `receipts/20261010-context-fishponds-public-r3.receipt.json` is bound by SHA-256 `ddecb893d2ad4d6c544c212d1a2f9d1e1d00da89b4928ced05d9a96a9a1eeda4`.
Near selection remains 24 outlines touching the existing 1.5 km radius. All projection, quantization,
terrain seating, water/bank separation and geometry settings stay unchanged. No imagery fetch, inference,
runtime, topology, equipment, canonical story, lighting authority or frozen AI changes occur.
Three monitored ponds and five authored canals remain. Four scattered illustrative ponds remain retired.
Local R3 evidence and all first and r2 bake, generation, staging and output records remain immutable.

外框為 NLSC PHOTO2／SAM3 AI 衍生（存取日 2026-10-10）；水面、土岸及配色為模擬靜態展示，
非測繪、土地利用認定、即時監測或養殖操作建議。

This preparation writes only new authored declarations. Baking, generation assembly and bundle rebuild
remain deferred until the parent confirms the active verifier has closed its servers.
