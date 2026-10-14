// Report the nearest authored vertex of the mesh's declared graph members.
// The clicked mesh provides identity and XY; Z comes only from the bound graph.
export function authoredStationAtHit(userData, point, edgeById, geoToLocal) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
  const ids = userData?.dt_edge_id ? [userData.dt_edge_id] : userData?.dt_covered_edges;
  if (!Array.isArray(ids)) return null;
  let best = null;
  for (const id of ids) {
    const vertices = edgeById.get(id)?.polyline_3d || [];
    vertices.forEach((vertex, index) => {
      if (!Array.isArray(vertex) || vertex.length < 3 || !Number.isFinite(vertex[2])) return;
      const [x, y] = geoToLocal(vertex[0], vertex[1]);
      const distanceSquared = (x - point.x) ** 2 + (y - point.y) ** 2;
      if (Number.isFinite(distanceSquared) && (!best || distanceSquared < best.distanceSquared)) {
        best = { edge: id, index, z: vertex[2], distanceSquared };
      }
    });
  }
  return best;
}
