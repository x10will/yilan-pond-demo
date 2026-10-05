# 宜蘭 OSM 背景底景來源 — Geofabrik，2026-10-01

Map data © OpenStreetMap contributors, Open Database License (ODbL) 1.0: https://www.openstreetmap.org/copyright . Extract supplied by Geofabrik: https://download.geofabrik.de/asia/taiwan.html .

The lane downloaded the current dated Taiwan extract, https://download.geofabrik.de/asia/taiwan-260930.osm.pbf, because the latest PBF and checksum aliases returned a redirect loop. Acquired on 2026-10-01 at 13:53:02.580244 UTC; download began at 13:52:15.447954 UTC. Size: 327,197,648 bytes. SHA-256: 517a963d5d811d971cd914002b06241994d427f1c9d4e7b10bbf492a991f389d . Published and locally verified MD5: e46223386a02b669c974ac9501808968 . Replication sequence 4925, source timestamp 2026-09-30T20:22:42Z.

Pinned pyosmium 4.3.1 locally selected buildings, coastline, waterways, water bodies and roads for south/west/north/east (24.59, 121.60, 24.93, 121.87). All five layers share that one PBF snapshot. Complete source ways and relation support are retained when they intersect the display bbox; the renderer clips their display geometry locally. Full extract coverage is also checked against Geofabrik's published Taiwan boundary polygon. complete: true means the requested extract selection is covered; it does not claim that OSM maps every real building or water feature.

OSM is geographic background only. No pond layout, equipment, pedestrian topology, routes, telemetry, incident or advice comes from OSM. Three workshop ponds and all runtime values are author-created 模擬. Candidate labels are approximate background locality markers and have no real farm incidents. Flat elevations, fallback building heights, class widths and colors are authored display choices. No DEM, trees or land-use layer is acquired.

The acquisition receipt is inputs/osm/geofabrik-20261001-v1/acquisition.json. It binds every frozen layer with SHA-256 and size, includes exact download metadata, and records source topology diagnostics. Raw clipped source bytes remain once in site inputs; runtime packages retain that receipt, feature lineage, notices and verified rendered meshes. The three failed Overpass acquisition receipts and original roads remain immutable historical evidence, superseded for the current scene by this same-source acquisition.

Provisional presentation and any mock-anchor choices: decisions/2026-10-01-yilan-geofabrik-base-scene.md . The farm team may supersede the lane's display choices through a later dated, named decision.
