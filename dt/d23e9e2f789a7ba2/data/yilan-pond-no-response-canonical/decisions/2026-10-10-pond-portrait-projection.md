# Portrait pond projection — 2026-10-10

Recorded by Codex under Will's 2026-10-10 fishpond brief, as delegated by the root agent on 2026-10-10: “Actual phone0projection is meaningful, fix presentation now.” The delegated requirement is to expose nearby derived fishponds during the cold phone opening while preserving canonical camera positions and targets.

Choose an optional static `presentation.viewer.portrait_fov_degrees` of **75 degrees** for the site's phone story view. Compared with the existing 55-degree vertical field of view, its projection spans `tan(37.5°) / tan(27.5°) = 1.474` times as much at the same distance. This is an authored projection choice, not a new runtime position or inferred camera route. The first final phone browser pass measured zero exposed derived-water vertices with the existing projection; its screenshots and failed check remain historical evidence.

The shell reads this optional site setting only for phone story camera poses, including reset and return to the story. It passes the canonical selected position and target through unchanged. Desktop and sites without the setting retain 55 degrees. The authored `07-region` overview resets both phone and desktop to 55 degrees to preserve its existing fitted pose; equipment inspection retains the current story projection until a deliberate regional view or reset. Sixdui has no new setting.

The implementation changes only the camera's projection matrix. This decision does not modify any existing configuration, canonical frame, geometry, topology, route, sensor, response, recommendation, or historical receipt. The integration owner applies the optional value in a new dated site configuration; the next full browser pass must establish whether nearby derived fishpond geometry is actually visible.
