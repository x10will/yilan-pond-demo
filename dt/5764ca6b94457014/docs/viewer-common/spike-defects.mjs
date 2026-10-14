// One receipt-bound connected component supplies one spike marker. Historical
// triangle anomalies do not earn visible-defect markers on an adopting site.
async function sha256(bytes) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(n => n.toString(16).padStart(2, '0')).join('');
}

export function validateSpikeBinding(report, { terrainHash, terrainReceiptHash, terrainReceipt, graph }) {
  const binding = report?.world_binding;
  if (report?.schema !== 'dt-connected-spike-defects/v1' || !binding || !Array.isArray(report.defects)
      || binding.terrain_sha256 !== terrainHash || binding.terrain_receipt_sha256 !== terrainReceiptHash
      || terrainReceipt?.artifact_sha256 !== terrainHash
      || binding.edges_sha256 !== graph.edges.sha256
      || binding.publication_sha256 !== graph.edges.publication?.sha256
      || binding.input_closure_sha256 !== graph.edges.inputClosureSha256
      || binding.candidate_completion_sha256 !== graph.edges.candidateCompletionSha256) {
    throw new Error('Connected spike diagnostic differs from the loaded world receipt');
  }
  const ids = new Set();
  for (const defect of report.defects) {
    const interior = sample => Number.isInteger(sample?.target_face)
      && defect.face_ids?.includes(sample.target_face)
      && Array.isArray(sample.barycentric) && sample.barycentric.length === 3
      && sample.barycentric.every(v => Number.isFinite(v) && v >= 0.1)
      && Math.abs(sample.barycentric.reduce((a, b) => a + b, 0) - 1) <= 1e-12
      && sample.target_xyz?.length === 3 && sample.target_xyz.every(Number.isFinite)
      && defect.face_ids?.includes(sample.hit?.face);
    if (ids.has(defect.defect_id) || ![defect.x, defect.y, defect.z, defect.prominence_m].every(Number.isFinite)
        || defect.verdict !== 'confirmed_visible_shape' || !defect.producer_face_stamps?.length
        || !defect.face_ids?.length || !defect.visibility?.views?.length
        || defect.visibility.views.some(v => !v.witnesses || v.witnesses.length < 2 || !v.witnesses.every(interior))) {
      throw new Error('Connected spike diagnostic lacks a measured component witness');
    }
    ids.add(defect.defect_id);
  }
  if (report.summary?.spike !== report.defects.length) throw new Error('Connected spike population differs from its components');
  return report;
}

export async function loadSpikeDefects(response, { fetchAsset, assetUrl, graph }) {
  if (!response) return null;
  const report = await response.json();
  const read = async path => {
    const result = await fetchAsset(assetUrl(path));
    if (!result.ok) throw new Error(`Connected spike world witness unavailable: ${path}`);
    return result.arrayBuffer();
  };
  const [terrain, receipt] = await Promise.all([read('meshes/terrain.glb'), read('meshes/terrain.glb.generated_by.json')]);
  const [terrainHash, terrainReceiptHash] = await Promise.all([sha256(terrain), sha256(receipt)]);
  return validateSpikeBinding(report, { terrainHash, terrainReceiptHash,
    terrainReceipt: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(receipt)), graph });
}

export function spikeMarkerDiagnosis(defect) {
  const point = [defect.x, defect.y, defect.z];
  return { diagnosis_id: defect.defect_id, axis: 'spike', verdict: 'confirmed_fault',
    freshness: { status: 'fresh' }, producing_stage: defect.producing_stage,
    root_cause: defect.root_cause, stage_trace: defect.stage_trace,
    missing_stage_evidence: defect.missing_stage_evidence,
    effect: { type: 'spike', point, metrics: {
      prominence_m: defect.prominence_m, width_m: defect.half_height_width_m,
      area_m2: defect.affected_projected_area_m2, length_m: defect.affected_length_m,
      visible_cameras: defect.visibility.views.length,
    } }, marker: { surface_point: point, vertical_offset_m: 0 },
    recommended_action: { summary: `${defect.route}; geometry repair is owned by that lane` },
    spike_defect: defect };
}
