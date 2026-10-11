# Downstream paddlewheel direction, 2026-10-07

Will asked on 2026-10-07: "so the areolau(?) is to propell the water in to form that circular movement? was the water wheel facing the right direction then".

His same-day lane brief directs: "Flip the spin sense in code so the push matches the foam" and "Fix the 1-1, 2-1 and 3-1 yaws in the site's authored equipment data, so the axle is about perpendicular to their foam_path's initial direction and the push lies along it." It requires a new dated input, receipt, decision, canonical rebake, baked geometry regression test and headless evidence, with no publication.

Codex implements that explicit correction on 2026-10-07. The farm team Director retains its demo/data mandate; this record does not attribute a new decision to a team member who did not make it. The three authored foam paths start with [9, -3]. Set their yaw to atan2(9, 3) = 1.2490457723982544 radians (71.565051177 degrees). The axle is local X; negative decorative X spin moves bottom paddles toward local -Y, which this yaw maps to the existing downstream tangent. Leave all other equipment yaws and foam paths unchanged, including the canonical backup placement. Reverse decorative spin for all aerators.

New dated world and asset inputs supersede only these three orientation values in the 2026-10-04 catalogs for this delivery. Reuse the accepted two-scenario baker and packaging pipeline. Canonical frames remain the only runtime authority for equipment roots, state, routes, restrictions, responses and events. Static scene and provenance remain author-created simulated inputs, and decorative spin remains render-time presentation.

This is a resettable ten-minute simulated prototype of 國立屏東科技大學「智慧化農業管理平台」. Foam and paddle motion illustrate authored circulation, not measured currents or validated hydrodynamics. States and recommendations remain labelled simulated, with visible provenance. No live sensing, diagnosis, operational advice, deployment or publication. Historical receipts, inputs and frozen AI retain their original bytes.
