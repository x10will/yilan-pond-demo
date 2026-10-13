# Round 9 water ownership (simulated presentation)

Date: 2026-10-13. Recorded by: Codex implementation lane for the farm team, under Will's explicit Round 9 brief. This is a provisional implementation decision, not a claim that dragon5285, AskaYu800304 or kevin70504 personally reviewed it.

Authority: Farm AGENTS.md, **Director mandate**. Will's 2026-09-24 words are: "ALL i ever asked is data lineage, and director has mandate. Make reasonable decisions." The named farm team holds demo/data choices. Will's Round 9 direction is to clip context water under pond footprints with a small margin, remove duplicate hero ribbons, and keep physical banks/equipment visible.

Decision: subtract the union of admitted, quantized derived fishpond footprints and authored hero/canal pond polygons, buffered outward by **0.5 m**, from both retained near and far context-water meshes in S3 before derived surfaces are appended. Clip triangles in XY and interpolate their original Z and appearance at new vertices. The 0.5 m is simulated display clearance, not survey accuracy or a change in canal flow. It removes centimeter-separated competing water ownership without raising ponds or equipment.

Decision: omit exactly the twelve `pond-{1,2,3}-bank-{0,1,2,3}` static ribbon meshes from presentation. Their authored topology, Edge records, coordinates and canonical route data remain intact. Farm's runtime bank, soil, grass, liner and equipment geometry remains visible; physical bank occlusion from low views is correct.

Decision: retain the Round 8b authored cameraNear **0.3 m**, all other camera/movement settings, and DT source generation **bdd5ccded507fb8f1bd04d6a79b3e314a6449697**. Rebind fresh dated candidate copies to the new static manifest while preserving composed frames, snapshots, adapters and frozen AI bytes. Historical inputs, decisions and execution receipts remain historical records.

The follow-up surface audit and measured height sweeps determine whether any additional thin-surface separations are necessary. Any such choice receives its own dated decision before it is baked. No runtime state, positions, routes, restrictions, responses, events or advice are recomputed.
