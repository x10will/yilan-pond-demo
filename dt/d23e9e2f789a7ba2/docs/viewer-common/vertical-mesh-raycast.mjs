// Broad phase for vertical rays through a static loaded surface mesh. Buckets
// contain mesh triangle indices, never sampled heights: every candidate is
// intersected by Three.js so overlapping sheets resolve to the top hit.
export function buildVerticalMeshRaycast(THREE, mesh) {
  mesh.updateWorldMatrix(true, false);
  const geometry = mesh.geometry;
  const positions = geometry.getAttribute('position');
  const indices = geometry.getIndex();
  const count = indices ? indices.count : positions.count;
  const bounds = new THREE.Box3().setFromObject(mesh);
  const width = bounds.max.x - bounds.min.x;
  const height = bounds.max.y - bounds.min.y;
  if (!(width > 0 && height > 0 && count > 0)) return () => null;
  // A coarse grid keeps index storage small on phones while narrowing a
  // multi-million-triangle mesh to a local set for each navigation frame.
  const cells = Math.max(1, Math.ceil(Math.cbrt(count / 3)));
  const buckets = new Array(cells * cells);
  const cellX = x => Math.max(0, Math.min(cells - 1, Math.floor((x - bounds.min.x) / width * cells)));
  const cellY = y => Math.max(0, Math.min(cells - 1, Math.floor((y - bounds.min.y) / height * cells)));
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const hit = new THREE.Vector3();
  const ray = new THREE.Ray(new THREE.Vector3(), new THREE.Vector3(0, 0, -1));
  function triangle(offset) {
    a.fromBufferAttribute(positions, indices ? indices.getX(offset) : offset).applyMatrix4(mesh.matrixWorld);
    b.fromBufferAttribute(positions, indices ? indices.getX(offset + 1) : offset + 1).applyMatrix4(mesh.matrixWorld);
    c.fromBufferAttribute(positions, indices ? indices.getX(offset + 2) : offset + 2).applyMatrix4(mesh.matrixWorld);
  }
  const start = geometry.drawRange.start;
  const end = Math.min(count, start + geometry.drawRange.count);
  for (let offset = start; offset + 2 < end; offset += 3) {
    triangle(offset);
    const x0 = cellX(Math.min(a.x, b.x, c.x)), x1 = cellX(Math.max(a.x, b.x, c.x));
    const y0 = cellY(Math.min(a.y, b.y, c.y)), y1 = cellY(Math.max(a.y, b.y, c.y));
    for (let iy = y0; iy <= y1; iy++) {
      for (let ix = x0; ix <= x1; ix++) {
        const key = iy * cells + ix;
        (buckets[key] || (buckets[key] = [])).push(offset);
      }
    }
  }
  return function surfaceZAt(x, y) {
    if (x < bounds.min.x || x > bounds.max.x || y < bounds.min.y || y > bounds.max.y) return null;
    const candidates = buckets[cellY(y) * cells + cellX(x)];
    if (!candidates) return null;
    ray.origin.set(x, y, bounds.max.z);
    let topZ = -Infinity;
    for (const offset of candidates) {
      triangle(offset);
      if (ray.intersectTriangle(a, b, c, false, hit)) topZ = Math.max(topZ, hit.z);
    }
    return Number.isFinite(topZ) ? topZ : null;
  };
}
