# R1 camera pose floor for the 2026-10-11 pond fixes round

Actor: Codex, delegated site-packaging lane. This is a provisional packaging decision, not a Director ruling.

Will's 2026-10-11 direction for this lane was: "Raise the affected authored poses to z ≥ 14, keeping each look target and framing as close as possible". Codex applies that instruction by raising only baked chapter/sample camera position Z values below 14 to 14.0. Camera XY, look targets, chapter timing, actor transforms, events, telemetry, routes and all other runtime data stay byte-semantically unchanged. The existing site cameraFloorZ remains 13.7.

The responding chapter's desktop and phone worker-follow position offsets rise by the same vertical amount as their authored starting camera positions; target offsets remain unchanged. This keeps the authored follow framing aligned with the z ≥ 14 presentation floor. The response and no-response candidates are separate new copies of the fishpass2 round-two candidates; all historical candidates and receipts remain preserved.
