// Stable-ID inspection joins static snapshot facts to the selected canonical
// samples. Picking properties never supply a value or a runtime fallback.
export const POND_SELECT_TWIN = 'farm-pond-select-twin';

// Presentation names for declared schema kinds and authored topology IDs.
// These labels are display-only; the stable IDs remain the join authority.
const kindLabels = {aerator:'水車', 'backup-aerator':'備援水車', 'aerator-circuit':'水車迴路',
  'control-panel':'控制箱', feeder:'投餌機', 'generator-power':'備援發電機',
  'mains-power':'市電', pump:'進水泵', sluice:'水閘', 'drain-sluice':'排水閘',
  'inlet-sluice':'進水閘', 'weather-station':'氣象站', 'work-shed':'工作屋', worker:'場務人員', sensor:'感測器', pond:'魚塭'};
const namedAnchors = {'shed-footprint':'工作屋範圍', 'shed-entry':'工作屋入口',
  'canal-inlet-south':'南側進水溝', 'canal-inlet-west':'西側進水溝',
  'canal-drain-centre':'中央排水溝', 'canal-drain-east':'東側排水溝', 'canal-drain-north':'北側排水溝'};
export const pondTwinKindLabel = kind => kindLabels[kind] || '模擬設備';

export function pondEntityLabel(projection, id) {
  if (namedAnchors[id]) return namedAnchors[id];
  let match = String(id).match(/^pond-(\d+)-bank-(\d+)$/);
  if (match) return `魚塭 ${match[1]} · 塭堤 ${Number(match[2]) + 1}`;
  match = String(id).match(/^pond-(\d+)-corner-(\d+)$/);
  if (match) return `魚塭 ${match[1]} · 塭堤轉角 ${Number(match[2]) + 1}`;
  match = String(id).match(/^drain-node-(\d+)$/);
  if (match) return `魚塭 ${match[1]} · 排水節點`;
  match = String(id).match(/^pond-(\d+)$/);
  if (match) return `魚塭 ${match[1]}`;
  const label = projection.entityLabels?.[id];
  if (label && label !== id) return label.replace(/（模擬）/g, '').trim();
  return '模擬設施';
}

export function pondAnchorLabel(projection, anchor) {
  const kind = {Face:'區域', Edge:'塭堤', Node:'節點'}[anchor?.kind] || '位置';
  return `${kind} · ${pondEntityLabel(projection, anchor?.id)}`;
}

export function pondSourceLabel(link) {
  const title = link?.title;
  return title && !/(?:sha256:|\.(?:json|mjs|md)(?:\b|@)|^[\w-]+\/)/.test(title)
    ? title.replace(/canonical/g, '影格') : '模擬資料來源';
}

export function appendPondTwinTechnicalDetails(content, inspection, {el,
  locale = globalThis.document?.documentElement?.lang} = {}) {
  const details = el('details', null, 'pond-technical-details pond-event-source');
  details.dataset.detailKey = `technical-${inspection.twin.id}`;
  details.append(el('summary', locale === 'en' ? 'Technical details' : '技術細節'));
  const {twin, transform, sources} = inspection;
  for (const text of [`ID: ${twin.id}`, `kind: ${twin.kind}`,
    ...(twin.type === 'Face' ? ['type: Face'] : [`anchor: ${twin.anchor?.kind}: ${twin.anchor?.id}`]),
    ...(transform ? [`canonical position: ${transform.position.join(', ')}`] : []),
    ...Object.entries(twin.relationships || {}).map(([kind, ids]) =>
      `${kind}: ${(Array.isArray(ids) ? ids : [ids]).join(', ')}`),
    ...new Set(sources.flatMap(({ref, link}) => [ref, link?.sourceId].filter(Boolean)))]) details.append(el('p', text));
  content.append(details);
  return details;
}

export function twinInspection(projection, id) {
  const twin = projection.twinCatalog?.find(row => row.id === id)
    || projection.faceCatalog?.find(row => row.id === id && row.type === 'Face' && row.kind === 'pond');
  if (!twin) return null;
  const sourcePath = ref => String(ref).split('@sha256:')[0];
  const telemetry = (projection.telemetry || []).filter(row => row.entity_id === id);
  const refs = [...new Set([...(twin.provenance_refs || []),
    ...telemetry.flatMap(row => row.provenance_refs || [])])];
  const serves = twin.relationships?.serves;
  const pondIds = twin.type === 'Face' ? [twin.id] : Array.isArray(serves) ? serves : serves ? [serves] : [];
  return {
    twin,
    pondIds,
    telemetry,
    transform: projection.assetTransforms?.find(row => row.id === id) || null,
    sources: refs.map(ref => ({ref,
      link: projection.provenanceLinks?.find(row => sourcePath(row.sourceId) === sourcePath(ref)) || null})),
  };
}

// Match the farm map-client selection transport: the renderer emits select
// {entity}; the panel sends highlight and an app command to select the same ID.
// Avoid focusEntity because its flyTo would override the guided camera pose.
export function selectPondTwin(map, projection, id) {
  if (!twinInspection(projection, id)) return false;
  map.send?.('highlight', {ids: [id]});
  map.send?.('appCommand', {name: POND_SELECT_TWIN, payload: {id}});
  return true;
}

export function pondComparisonRuns(site) {
  const comparison = site.presentation?.comparison;
  if (!comparison) return [];
  return [
    ['with-response', '有回應', comparison.with_response],
    ['no-response', '無回應', comparison.without_response],
  ].map(([role, label, id]) => {
    const scenario = site.scenarios?.find(row => row.id === id);
    if (!scenario) throw new Error(`未宣告的魚塭對照候選：${id}`);
    return {role, label, scenario};
  });
}

export function pondScenarioHref(scenario, href = globalThis.location?.href) {
  const url = new URL(href);
  if (scenario.param == null) url.searchParams.delete('scenario');
  else url.searchParams.set('scenario', scenario.param);
  url.searchParams.delete('variant');
  return url.href;
}

// Each curve is the literal supplied history from a fully verified candidate.
// Both use the same elapsed-time axis; no curve is generated from summary minima.
export function pondComparisonHistory(candidate, entityId) {
  const seconds = candidate.adapter.durationSeconds;
  const index = candidate.adapter.frameTimesSeconds.length - 1;
  return candidate.adapter.project(index, seconds).telemetryHistory
    .filter(row => row.entity_id === entityId && row.metric === 'dissolved_oxygen');
}
