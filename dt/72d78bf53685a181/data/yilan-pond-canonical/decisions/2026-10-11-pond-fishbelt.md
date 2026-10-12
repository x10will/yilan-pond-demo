# Pond belt presentation — 2026-10-11

Will, 2026-10-11: "i fail to see the new farms. you added some ponds near the sim farm and made it look out of place". The delegated implementation brief asks for believable flat aquaculture water, thin earthen banks, complete-pond clearance around the authored plot, and a dedicated pond-belt view. This records Codex's reversible presentation choices under that brief; it does not claim a new Director ruling or survey truth.

The source remains `inputs/context-fishponds-public-20261010-r3.geojson`: all 103 admitted NLSC/SAM3-derived source outlines remain unchanged. The presentation copies retain 100 outlines (21 near, 79 far). Three complete outlines are omitted from the new mesh because they intersect the authored plot's clearance:

- `yilan-context-fishpond-1ad1b8f92c570d5b`
- `yilan-context-fishpond-1d3a955b7a5b36a4`
- `yilan-context-fishpond-a1f772c092055fb9`

The plot is the convex hull of the existing authored monitored ponds, paddies, channels, paths, dikes and shed footprints. A 35 m outward buffer preserves the immediate setting, including spaces between authored features. Plot bounds are [-150, -65, 180, 183] m; buffered bounds are [-185, -100, 215, 218] m in the existing DT local XY frame. Intersection drops the complete source outline, never clips or invents its geometry. The optional setting defaults to the previous shape-wise 3 m exclusion when absent.

Water is a horizontal triangulated surface with 0.12 m clearance above the maximum sampled retained terrain height. Bank tops remain separate from water in XY and are 0.15 m above water, with 1.2 m thin bank width. These are simulated rendering elevations, not engineering or aquaculture design. The fresh palette is water #182c29, bank #80945d and soil #937d57. The water and bank colors match the local authored pond palette. The opt-in `derived_context_appearance: authored-diffuse` uses Lambert lighting only for meshes carrying `farm_context_fishpond_surface`, so generated ponds follow the same diffuse lighting response as local channels and banks. Historical cyan PBR materials reflected the environment much more brightly and made the flat polygons appear pale or swollen. OSM waterways, regional terrain and other sites keep their existing materials.

The new `08-fishbelt` viewpoint targets [500, -1500, 0] m, where the admitted outlines form the south coastal belt. Desktop position [1700, -3200, 2250] m has a 3,066 m range; portrait position [700, -3400, 3100] m has a 3,642 m range. The retained outline extent is [-432, -2969.25, 1239.5, 4341.5] m; the south belt is the compact grouping below the demonstration. This view intentionally shows that belt at a useful scale while `07-region` remains available for full county context. Both scenario viewer declarations receive the same static presentation view. No canonical camera samples or replay state changes.

The three monitored ponds, equipment, canonical frames/snapshots and frozen AI inputs remain byte-identical. Source and presentation lineage remain visible through the new dated bake/generation receipts. Existing execution receipts and historical packages remain immutable. This is a resettable ten-minute simulated demonstration; no diagnosis, monitoring, operational recommendation, completeness claim, inferred internal layout or imagery redistribution is added.

Configuration: `fishpond-packaging-fishbelt-20261011.json`. New static/canonical outputs and receipts are dated 20261011. Code lives in farm; the site owns this choice, the configuration and the baked artifacts.
