// One authenticated authored graph for surfaces, diagnostics and actor seating.
// Sites without an accepted bundle keep their canonical resource contract.
async function readJson(fetchAsset, binding) {
  const response = await fetchAsset(binding.url);
  if (!response.ok) throw new Error(`${binding.role} graph fetch failed: ${response.status}`);
  const bytes = await response.arrayBuffer();
  if (binding.sha256) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    const sha256 = [...new Uint8Array(digest)].map(n => n.toString(16).padStart(2, '0')).join('');
    if (sha256 !== binding.sha256) throw new Error(`${binding.role} graph content hash mismatch`);
  }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

export async function loadGraphBundle({ graphAsset, assetUrl, fetchAsset }) {
  const edges = graphAsset('edges');
  const intersections = graphAsset('intersections');
  const meshReceiptUrl = assetUrl('meshes/terrain.glb.generated_by.json');
  if (edges.publication) {
    const receipt = await readJson(fetchAsset, {...edges.publication, role: 'publication'});
    if (receipt.schema !== 'dt-runtime-graph-publication/v2' ||
        receipt.projection?.id !== edges.projection.id || receipt.projection?.version !== edges.projection.version ||
        receipt.candidateCompletionSha256 !== edges.candidateCompletionSha256 ||
        receipt.inputClosureSha256 !== edges.inputClosureSha256) throw new Error('Graph publication receipt chain mismatch');
    for (const pin of [edges, intersections]) {
      const row = receipt.assets?.[pin.role];
      if (row?.path !== pin.path || row?.sha256 !== pin.sha256 || row?.sourceIdentity?.sha256 !== pin.sourceSha256) {
        throw new Error(`${pin.role} graph publication chain mismatch`);
      }
    }
  }
  if (edges.sha256) {
    const response = await fetchAsset(meshReceiptUrl);
    if (!response.ok) throw new Error(`Graph mesh receipt fetch failed: ${response.status}`);
    const receipt = await response.json();
    const meshGraph = receipt.consumed_artifacts?.edges_json?.sha256?.replace(/^sha256:/, '');
    if (meshGraph !== (edges.sourceSha256 || edges.sha256)) throw new Error('Selected graph differs from the mesh receipt');
  }
  const [edgeDoc, nodeDoc] = await Promise.all([
    readJson(fetchAsset, edges), readJson(fetchAsset, intersections),
  ]);
  if (!Array.isArray(edgeDoc.edges) || !Array.isArray(nodeDoc.intersections)) {
    throw new Error('Graph bundle lacks edges or intersections');
  }
  if (edges.sha256) {
    for (const [pin, rows] of [[edges, edgeDoc.edges], [intersections, nodeDoc.intersections]]) {
      if (rows.length === 0) {
        throw new Error(`Empty ${pin.role} graph: ${pin.url}; mesh receipt: ${meshReceiptUrl}` +
          (edges.publication ? `; publication receipt: ${edges.publication.url}` : ''));
      }
    }
  }
  return { edges: edgeDoc, intersections: nodeDoc, bindings: { edges, intersections } };
}
