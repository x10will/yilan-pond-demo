# Recovery backup joins pond circulation, 2026-10-07

Authority: Will, 2026-10-07, asked "so the areolau(?) is to propell the water in to form that circular movement? was the water wheel facing the right direction then". His lane acceptance says "All four wheels in a pond drive one coherent circulation in the same rotational sense, matching the foam. The backup wheel at recovery does the same." Codex executes this bounded correction under that explicit instruction.

The independent baked-transform/player-motion check discovered that the recovery backup at [36, 79, 1.993], with yaw zero, pushes south after the requested spin reversal. Its own default foam also goes south, but this creates clockwise torque around pond 3's centre [20, 63], while the four pond aerators and their foam go counter-clockwise.

Set only the authored response story's backup_running_transform.rotation to -1.5707963267948966 radians, aiming its downstream push west along the north bank. The default twin-local foam follows the canonical yaw. Keep its position, scale, parked pose, transport, route, timing, equipment state and oxygen model unchanged. This supplements decisions/2026-10-07-pond-wheel-direction.md and supersedes only its assumption that the backup recovery yaw can remain unchanged. The Director's existing mandate remains with the farm team; no absent team member's decision is invented.

Create new dated story/scenario inputs, v2 bakes, packages and receipts. Preserve the first wheels execution and all historical receipt bytes. The first geometry failure is retained as evidence. Canonical frames alone authorize runtime equipment transforms; no runtime patch is permitted.

The resettable ten-minute prototype remains explicitly simulated, with visible provenance and simulated-state/recommendation notices. Foam is an illustration, not measured currents or validated hydrodynamics. No live sensing, diagnosis, operational advice, deployment or publication.
