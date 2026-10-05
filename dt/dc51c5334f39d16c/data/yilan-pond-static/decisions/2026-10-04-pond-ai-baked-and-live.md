# 宜蘭 pond AI: frozen narration and optional live questions

Authority: Claude, CTO for 宜蘭, under Will's 2026-10-04 choice **"A+B+C"**. Implemented by Codex in the delegated 宜蘭 pond AI lane on 2026-10-04.

Will asked: "you know we have to use github pages to publish for workshop. So how's the AI feature gonna work? javascript call back to a sidecar on stan?" He chose "A+B+C": scripted baked fallback, bake-time LLM suggestions frozen with lineage, and an optional live panel. The workshop site remains static and fully usable with no backend.

The CTO choice recorded here is to generate one short explanation for each canonical chapter plus one narration of the scripted AI suggestion. Prompts contain the canonical twin identity and state, DO model output, reached events and the existing response story at the beat. Narration uses third-person description of the baked proposal; it does not issue instructions or alter the story. All response events, equipment states, routes, positions and scripted `AI 建議（模擬）` wording remain unchanged.

The explicit seed command resolves `wimba.local` at run time and sends one request at a time to `http://wimba.local:8080/v1`. Model identity comes from the server response. Prompts, hashes, full request parameters, raw responses, timestamps, automated validation and the human-review flag are frozen as site input. The offline bake reads only those bytes. A failed or invalid beat uses its existing scripted text and retains the rejection reason. No request is sent to the decoy local LLM.

Accepted text is labelled `AI 生成（模擬情境；非操作建議）`. The viewer exposes model, prompt hash and date through inspection and the retained source links. Human review remains false unless a human actually reviews the generated text; automated length, Traditional Chinese and scenario-boundary checks are not human review. Fixture evidence is explicitly marked as a recorded fixture, never represented as a real Wimba run.

The optional `即時問答（實驗）` panel is a separate platform feature, hidden until an endpoint is configured and its health check succeeds. It cannot change canonical state or response events. The workshop does not depend on it. No public tunnel is started in this lane. Vogue, KG and MCP are not runtime dependencies.

All pond data, predictions and proposals are simulated mockup data for the resettable ten-minute demonstration of 國立屏東科技大學「智慧化農業管理平台」. Real observations, diagnosis, aquaculture operations, live control and production deployment remain non-goals. This decision does not replace historical site choices or receipts.
