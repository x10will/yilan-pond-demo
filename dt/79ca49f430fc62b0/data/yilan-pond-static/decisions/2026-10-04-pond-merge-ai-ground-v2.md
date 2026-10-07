# Authored ground color encoding correction, 2026-10-04

Codex implements Will's 2026-10-04 request to restore believable ground within the Pages budget. This record refines the color encoding in decisions/2026-10-04-pond-merge-ai-workshop.md after direct night/dawn visual QA.

The authored display RGB [161,139,99] and bounded spatial variation are converted from sRGB to linear RGB before storing glTF vertex color bytes. Without this conversion, the renderer brightens the supplied values, leaving night soil grey and too pale. This correction gives dark earth/olive ground at night and warm brown at dawn under the unchanged canonical environment lighting.

Geometry, height, bounds and indices use the exact Pages-v2 crop. No overlay mesh, new draw call, downloaded texture, light, map inference or runtime state is added. The first derivative and execution receipts remain immutable. The final ground is inputs/context/merge-ai-ground-v2-20261004/meshes/terrain.glb, selected by new v2 packages and assembly.
