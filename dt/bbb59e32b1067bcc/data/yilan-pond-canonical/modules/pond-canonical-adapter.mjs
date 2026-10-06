// Agricultural telemetry projection for DT's verified candidate loader.
// Authority: Will's 2026-09-30 A2 brief: canonical data, inspectable lineage,
// five-second cards, authored alerts, and an unchanged 六堆 candidate.
const requireBinding = (ok, message) => {
  if (!ok) throw new Error(`Pond canonical binding: ${message} (Will, 2026-09-30 A2 brief; protects labelled canonical data and site lineage)`);
};
const copy = value => structuredClone(value);
const key = row => `${row.entity_id}\u0000${row.metric}`;

import {expandPondFrames} from './pond-frame-wire.mjs';

export function createAdapter({manifest, artifacts, resourceBaseUrl}) {
  // Retain a private copy so consumers cannot modify subsequently selected data.
  const snapshot = copy(artifacts['static-snapshot.json']);
  // DT verifies the exact wire bytes before this adapter expands references. Panels
  // receive the same expanded document; no value, sample, transform or route is derived.
  artifacts['composed-frames.json'] = expandPondFrames(artifacts['composed-frames.json']);
  const composed = copy(artifacts['composed-frames.json']);
  const site = copy(manifest.site);
  requireBinding(site?.site_id && site.label && site.simulation_label === '模擬', 'site declaration missing');
  requireBinding(snapshot?.site_id === site.site_id && composed?.site_id === site.site_id, 'site mismatch');
  requireBinding(snapshot.runtime_authority === false, 'snapshot must be static only');
  requireBinding(snapshot.snapshot_revision === composed.snapshot_revision
    && snapshot.snapshot_revision === manifest.snapshot_revision, 'snapshot revision mismatch');
  requireBinding(composed.frame_set_revision === manifest.frame_set_revision, 'frame revision mismatch');
  requireBinding(composed.simulation_label === '模擬', 'frame-set simulation notice missing');
  const frames = composed.canonical_frames;
  const durationSeconds = composed.demo_sequence?.duration_seconds;
  requireBinding(durationSeconds === 600 && frames?.length === 6, 'six frames and 600-second duration required');
  const records = [...(snapshot.topology?.faces ?? []), ...(snapshot.topology?.nodes ?? []),
    ...(snapshot.topology?.edges ?? []), ...(snapshot.assets?.assets ?? [])];
  const entityLabels = Object.fromEntries(records.map(row => [row.id, row.label || row.id]));
  const twinCatalog = snapshot.assets?.assets ?? [];
  const twinIds = new Set(twinCatalog.map(row => row.id));
  const canonicalTwins = snapshot.assets?.twin_inventory_version !== undefined
    || frames.some(frame => Object.hasOwn(frame, 'asset_transforms'));
  const refs = new Set(Object.values(snapshot.provenance_catalog ?? {})
    .map(row => `${row.path}@sha256:${row.sha256}`));
  const hasRefs = row => Array.isArray(row.provenance_refs) && row.provenance_refs.length > 0
    && row.provenance_refs.every(ref => refs.has(ref));
  requireBinding(!Object.hasOwn(composed, 'story_chapters') || Array.isArray(composed.story_chapters),
    'story chapters must be an array when declared');
  const validPose = pose => pose && typeof pose === 'object'
    && ['desktop', 'phone'].every(width => {
      const view = pose[width];
      return view && typeof view === 'object'
        && ['position', 'target'].every(key => Array.isArray(view[key]) && view[key].length === 3
          && view[key].every(Number.isFinite));
    });
  const storyChapters = composed.story_chapters;
  const hasStory = Array.isArray(storyChapters);
  const storyById = new Map();
  if (hasStory) {
    let previous = -1;
    for (const chapter of storyChapters) {
      requireBinding(typeof chapter.id === 'string' && chapter.id.trim() && !storyById.has(chapter.id)
        && typeof chapter.title === 'string' && chapter.title.trim()
        && typeof chapter.caption === 'string' && chapter.caption.trim()
        && Number.isInteger(chapter.elapsed_seconds) && chapter.elapsed_seconds >= 0
        && chapter.elapsed_seconds <= durationSeconds && chapter.elapsed_seconds > previous
        && typeof chapter.scenario_time === 'string' && chapter.scenario_time.trim()
        && chapter.simulation_label === '模擬' && hasRefs(chapter) && validPose(chapter.camera),
      'story chapters require ordered IDs, captions, time, labelled desktop/phone cameras and provenance');
      previous = chapter.elapsed_seconds; storyById.set(chapter.id, chapter);
    }
    requireBinding(storyChapters.length > 0 && storyChapters[0].elapsed_seconds === 0,
      'guided story must start at canonical time zero');
  }
  const topologyNodes = new Map((snapshot.topology?.nodes ?? []).map(row => [row.id, row]));
  const topologyEdges = new Map((snapshot.topology?.edges ?? []).map(row => [row.id, row]));
  const eventIds = new Set(frames.flatMap(frame => frame.event_occurrences ?? []).map(row => row.occurrence_id));
  const storySamples = [];
  const aiNarration = [];
  const transformSamples = [];
  const hasTransformSamples = frames.some(frame => Object.hasOwn(frame, 'asset_transform_samples'));
  if (hasTransformSamples) requireBinding(frames.every(frame => Object.hasOwn(frame, 'asset_transform_samples')),
    'sampled twin placement rows must cover all six canonical frames');
  if (!hasStory) requireBinding(frames.every(frame => !Object.hasOwn(frame, 'story_samples')),
    'story samples require their declared chapter catalog');
  const validateRoute = route => {
    requireBinding(Array.isArray(route) && route.length >= 3 && route.length % 2 === 1,
      'response route must alternate declared Nodes and Edges');
    for (let i = 0; i < route.length; i++) {
      if (i % 2 === 0) requireBinding(topologyNodes.has(route[i]), 'response route Node must exist in static topology');
      else {
        const edge = topologyEdges.get(route[i]);
        const from = edge?.start_node_id ?? edge?.from_node_id;
        const to = edge?.end_node_id ?? edge?.to_node_id;
        requireBinding(edge && from === route[i - 1] && to === route[i + 1],
          'response route Edge must connect its adjacent declared Nodes');
      }
    }
  };
  if (canonicalTwins) {
    requireBinding(twinIds.size === twinCatalog.length && new Set(records.map(row => row.id)).size === records.length,
      'twin and topology IDs must be unique');
    const staticRecords = new Map(records.map(row => [row.id, row]));
    const sourcePaths = new Set(Object.values(snapshot.provenance_catalog ?? {}).map(row => row.path));
    for (const row of twinCatalog) {
      requireBinding(typeof row.id === 'string' && row.id.length > 0 && row.type === 'Asset'
        && typeof row.kind === 'string' && row.kind.length > 0 && row.simulation_label === '模擬'
        && row.specs && typeof row.specs === 'object' && !Array.isArray(row.specs)
        && Object.keys(row.specs).length > 0 && Object.values(row.specs).every(value => Number.isFinite(value) && value >= 0),
      'twin identity/kind/specifications/notice missing');
      requireBinding(['Face', 'Edge', 'Node'].includes(row.anchor?.kind)
        && staticRecords.get(row.anchor.id)?.type === row.anchor.kind, 'twin anchor must name its declared topology kind');
      requireBinding(Array.isArray(row.provenance_refs) && row.provenance_refs.length > 0
        && row.provenance_refs.every(ref => refs.has(ref) || sourcePaths.has(ref)), 'twin catalog provenance missing');
      requireBinding(row.relationships && typeof row.relationships === 'object' && !Array.isArray(row.relationships),
        'twin relationships missing');
      for (const [relation, targets] of Object.entries(row.relationships)) {
        requireBinding(relation === 'transfer' ? row.kind === 'generator-power' && targets === 'manual-only'
          : Array.isArray(targets) && targets.length > 0 && new Set(targets).size === targets.length
            && targets.every(id => staticRecords.has(id)), 'twin relationship target missing');
      }
    }
  }
  const provenanceLinks = (manifest.provenance_links ?? []).map(row => {
    const retained = manifest.files?.find(file => file.path === row.path);
    requireBinding(Object.hasOwn(artifacts, row.path) && artifacts[row.path] !== null
      && ['string', 'object'].includes(typeof artifacts[row.path]) && (refs.has(row.sourceId)
      || retained && row.sourceId.endsWith(`@sha256:${retained.sha256}`)), 'provenance link has no retained source');
    const href = new URL(row.path, resourceBaseUrl).href;
    requireBinding(href.startsWith(resourceBaseUrl), 'provenance link escapes candidate');
    return {label: row.title, url: row.path, title: row.title, href, sourceId: row.sourceId};
  });
  requireBinding(provenanceLinks.length > 0, 'inspectable decision provenance required');
  const seen = new Set();
  for (const [i, frame] of frames.entries()) {
    const start = i * 100;
    requireBinding(frame.frame_index === i && frame.elapsed_seconds === start
      && frame.simulation_label === '模擬', 'frame index/time/notice mismatch');
    requireBinding(Array.isArray(frame.telemetry_samples) && Array.isArray(frame.event_occurrences), 'frame data arrays missing');
    if (canonicalTwins) {
      const transforms = frame.asset_transforms;
      requireBinding(Array.isArray(transforms) && transforms.length === twinIds.size
        && new Set(transforms.map(row => row.id)).size === twinIds.size, 'frame requires one transform per twin');
      for (const row of transforms) {
        requireBinding(twinIds.has(row.id) && Array.isArray(row.position) && row.position.length === 3
          && row.position.every(Number.isFinite) && Number.isFinite(row.rotation)
          && Number.isFinite(row.scale) && row.scale > 0
          && (!Object.hasOwn(row, 'pose') || row.pose && typeof row.pose === 'object' && !Array.isArray(row.pose)
            && Object.values(row.pose).every(Number.isFinite))
          && row.simulation_label === '模擬' && hasRefs(row),
        'canonical twin transform identity/placement/notice/source missing');
      }
    }
    let previous = -1;
    for (const row of frame.telemetry_samples) {
      requireBinding(Number.isInteger(row.elapsed_seconds) && row.elapsed_seconds >= start
        && row.elapsed_seconds < start + 100 && row.elapsed_seconds >= previous, 'sample outside ordered frame window');
      previous = row.elapsed_seconds;
      const id = `${row.elapsed_seconds}\u0000${key(row)}`;
      requireBinding(!seen.has(id), 'duplicate entity/metric/time sample'); seen.add(id);
      requireBinding(Object.hasOwn(entityLabels, row.entity_id) && typeof row.metric === 'string', 'undeclared sample entity/metric');
      requireBinding(row.simulation_label === '模擬' && hasRefs(row) && Number.isFinite(Date.parse(row.sampled_at)), 'sample time/notice/source missing');
      const numeric = Object.hasOwn(row, 'value');
      requireBinding(numeric ? Number.isFinite(row.value) && typeof row.unit === 'string' && !Object.hasOwn(row, 'state')
        : typeof row.state === 'string', 'sample requires numeric value/unit or state');
    }
    for (const row of frame.event_occurrences) {
      requireBinding(Number.isFinite(row.elapsed_seconds) && row.elapsed_seconds >= 0 && row.elapsed_seconds < start + 100
        && typeof row.occurrence_id === 'string' && typeof row.title === 'string'
        && row.simulation_label === '模擬' && hasRefs(row) && Number.isFinite(Date.parse(row.activated_at)), 'event time/notice/source missing');
    }
    let previousAi = start - 1;
    for (const row of frame.ai_narration ?? []) {
      const codexGeneration = row.lineage?.backend === 'codex-exec' || row.lineage?.source_kind === 'codex-generation';
      requireBinding(Number.isInteger(row.elapsed_seconds) && row.elapsed_seconds >= start
        && row.elapsed_seconds < start + 100 && row.elapsed_seconds >= previousAi
        && typeof row.beat_id === 'string' && ['why', 'suggestion'].includes(row.kind)
        && storyById.has(row.chapter_id) && typeof row.text === 'string' && row.text.trim()
        && typeof row.fallback_text === 'string' && row.simulation_label === '模擬' && hasRefs(row)
        && ['generated', 'fallback'].includes(row.status) && row.validation?.accepted === (row.status === 'generated')
        && Array.isArray(row.validation.reasons) && row.lineage?.frozen_path && row.lineage?.frozen_sha256
        && typeof row.lineage.human_review === 'boolean'
        && (row.status === 'generated' ? row.label === (codexGeneration
          ? 'AI 生成（Sol 6.1，模擬情境；非操作建議）' : 'AI 生成（模擬情境；非操作建議）')
          && (!codexGeneration || row.lineage.backend === 'codex-exec'
            && row.lineage.source_kind === 'codex-generation' && row.lineage.model_id === 'gpt-6.1-sol')
          && typeof row.lineage.model_id === 'string' && Number.isFinite(Date.parse(row.lineage.generated_at))
          : row.text === row.fallback_text && row.validation.reasons.length > 0),
      'AI narration requires canonical time, simulation label, frozen evidence and explicit fallback (Will, 2026-10-04 A+B+C)');
      aiNarration.push(row); previousAi = row.elapsed_seconds;
    }
    if (hasStory) {
      requireBinding(Array.isArray(frame.story_samples) && frame.story_samples.length > 0,
        'guided story requires canonical story samples in every frame');
      let previousStory = start - 1;
      for (const row of frame.story_samples) {
        const end = i === frames.length - 1 ? durationSeconds : start + 100;
        requireBinding(Number.isInteger(row.elapsed_seconds) && row.elapsed_seconds >= start
          && row.elapsed_seconds < end && row.elapsed_seconds > previousStory
          && storyById.has(row.chapter_id) && row.simulation_label === '模擬' && hasRefs(row)
          && storyChapters.filter(chapter => chapter.elapsed_seconds <= row.elapsed_seconds).at(-1)?.id === row.chapter_id
          && validPose(row.camera) && row.response && typeof row.response.phase === 'string'
          && row.response.phase.trim() && Array.isArray(row.response.active_alert_ids)
          && new Set(row.response.active_alert_ids).size === row.response.active_alert_ids.length
          && row.response.active_alert_ids.every(id => typeof id === 'string' && eventIds.has(id)),
        'story sample requires ordered canonical phase, declared chapter, active event IDs, cameras and provenance');
        if (Object.hasOwn(row.response, 'actor_id')) requireBinding(typeof row.response.actor_id === 'string' && row.response.actor_id,
          'response actor ID must be a declared string');
        if (Object.hasOwn(row.response, 'task_id')) requireBinding(typeof row.response.task_id === 'string' && row.response.task_id,
          'response task ID must be a declared string');
        if (Object.hasOwn(row.response, 'route_sequence')) validateRoute(row.response.route_sequence);
        if (Object.hasOwn(row, 'summary')) requireBinding(row.summary && typeof row.summary === 'object'
          && !Array.isArray(row.summary) && row.summary.simulation_label === '模擬' && hasRefs(row.summary),
        'story summary must carry its own simulation notice and provenance');
        storySamples.push(row); previousStory = row.elapsed_seconds;
      }
    }
    if (hasTransformSamples) {
      requireBinding(canonicalTwins && Array.isArray(frame.asset_transform_samples) && frame.asset_transform_samples.length > 0,
        'sampled placements require declared twins and a nonempty array');
      let previousTransform = start - 1;
      for (const sample of frame.asset_transform_samples) {
        const end = i === frames.length - 1 ? durationSeconds : start + 100;
        const transforms = sample.asset_transforms;
        requireBinding(Number.isInteger(sample.elapsed_seconds) && sample.elapsed_seconds >= start
          && sample.elapsed_seconds < end && sample.elapsed_seconds > previousTransform
          && sample.simulation_label === '模擬' && hasRefs(sample)
          && Array.isArray(transforms) && transforms.length === twinIds.size
          && new Set(transforms.map(row => row.id)).size === twinIds.size,
        'sampled placements require ordered, complete, labelled twin transforms');
        for (const row of transforms) requireBinding(twinIds.has(row.id) && Array.isArray(row.position)
          && row.position.length === 3 && row.position.every(Number.isFinite) && Number.isFinite(row.rotation)
          && Number.isFinite(row.scale) && row.scale > 0
          && (!Object.hasOwn(row, 'pose') || row.pose && typeof row.pose === 'object' && !Array.isArray(row.pose)
            && Object.values(row.pose).every(Number.isFinite))
          && row.simulation_label === '模擬' && hasRefs(row),
        'sampled twin transform identity/placement/notice/source missing');
        transformSamples.push(sample); previousTransform = sample.elapsed_seconds;
      }
    }
    let previousEnvironment = start - 1;
    for (const row of frame.environment_samples ?? []) {
      requireBinding(Number.isInteger(row.elapsed_seconds) && row.elapsed_seconds >= start
        && row.elapsed_seconds < start + 100 && row.elapsed_seconds > previousEnvironment
        && row.environment?.simulation_label === '模擬' && hasRefs(row.environment),
      'environment sample time/order/notice/source missing');
      previousEnvironment = row.elapsed_seconds;
    }
  }
  if (hasStory) requireBinding(storySamples.length > 0, 'guided story requires supplied samples');
  const frameTimesSeconds = frames.map(frame => frame.elapsed_seconds);
  function selectFrame(index, elapsedSeconds = frameTimesSeconds[index]) {
    requireBinding(Number.isInteger(index) && index >= 0 && index < frames.length, 'invalid frame index');
    requireBinding(Number.isFinite(elapsedSeconds) && elapsedSeconds >= frameTimesSeconds[index]
      && (index === frames.length - 1 ? elapsedSeconds <= durationSeconds
        : elapsedSeconds < frameTimesSeconds[index + 1]), 'clock does not belong to selected frame');
    const telemetryHistory = frames.slice(0, index + 1).flatMap(frame => frame.telemetry_samples)
      .filter(row => row.elapsed_seconds <= elapsedSeconds);
    const latest = new Map();
    for (const row of telemetryHistory) latest.set(key(row), row);
    const telemetry = [...latest.values()].sort((a, b) => key(a).localeCompare(key(b)));
    const inspection = {};
    for (const row of telemetry) {
      (inspection[row.entity_id] ??= []).push({label: `${row.metric}｜${row.simulation_label}`,
        value: `${row.state ?? `${row.value} ${row.unit}`}｜${row.sampled_at}`},
      {label: '來源', value: [...row.provenance_refs]});
    }
    const notifications = frames[index].event_occurrences.filter(row => row.elapsed_seconds <= elapsedSeconds)
      .map(row => ({id: row.occurrence_id, kind: row.event_kind,
        text: `${row.title}｜${row.detail ?? ''}｜${row.activated_at}｜${row.simulation_label}`,
        title: row.title, detail: row.detail, sourceIds: [...row.provenance_refs], sampledAt: row.activated_at,
        elapsedSeconds: row.elapsed_seconds, simulationLabel: row.simulation_label,
        actorId: row.actor_id, actorLabel: row.actor_label, taskId: row.task_id,
        decision: row.decision ? copy(row.decision) : undefined,
        resolvedOccurrenceId: row.resolved_occurrence_id,
        subjectIds: [...(row.subject_ids ?? row.affected_twin_ids ?? [])]}));
    const environment = frames[index].environment_samples?.filter(row => row.elapsed_seconds <= elapsedSeconds).at(-1)?.environment;
    const sampledTransforms = transformSamples.filter(row => row.elapsed_seconds <= elapsedSeconds).at(-1)?.asset_transforms;
    const assetTransforms = (sampledTransforms ?? frames[index].asset_transforms ?? [])
      .map(({id, position, rotation, scale, pose}) => ({id, position, rotation, scale, ...(pose ? {pose: copy(pose)} : {})}));
    const storySample = storySamples.filter(row => row.elapsed_seconds <= elapsedSeconds).at(-1);
    const story = hasStory && storySample ? {
      chapters: copy(storyChapters), chapter: copy(storyById.get(storySample.chapter_id)),
      response: copy(storySample.response), camera: copy(storySample.camera),
      ...(Object.hasOwn(storySample, 'summary') ? {summary: copy(storySample.summary)} : {}),
    } : undefined;
    const reachedAi = aiNarration.filter(row => row.elapsed_seconds <= elapsedSeconds);
    const selectedAi = aiNarration.length ? {
      chapter: reachedAi.filter(row => row.kind === 'why' && row.chapter_id === storySample?.chapter_id).at(-1),
      suggestion: reachedAi.filter(row => row.kind === 'suggestion' && row.chapter_id === storySample?.chapter_id).at(-1), history: reachedAi,
    } : undefined;
    if (selectedAi) for (const row of [selectedAi.chapter, selectedAi.suggestion].filter(Boolean)) {
      const generated = row.status === 'generated' && row.lineage.source_kind !== 'recorded-fixture'
        && !/fixture/i.test(row.lineage.model_id || '');
      const codexFallback = row.status === 'fallback' && row.lineage.backend === 'codex-exec';
      const label = generated || codexFallback ? row.label : '腳本備援（A；模擬情境；非操作建議）';
      const backend = row.lineage.backend ? `｜後端：${row.lineage.backend}` : '';
      for (const id of row.subject_ids ?? []) (inspection[id] ??= []).push(
        {label, value: row.text},
        {label: generated ? 'AI 生成出處' : '腳本備援（A）出處', value: `${row.lineage.model_id ?? '腳本備援'}${backend}｜${row.lineage.generated_at ?? ''}｜prompt SHA-256: ${row.lineage.prompt_sha256 ?? ''}`},
        {label: '來源', value: [...row.provenance_refs]});
    }
    return copy({frameIndex: index, elapsedSeconds, beatLabel: composed.scenario.title,
      notices: [site.simulation_label, composed.scenario.notice], notifications,
      alerts: notifications.filter(row => row.kind !== 'equipment-fault'), telemetry, telemetryHistory,
      inspection, entityLabels, presentation: {}, provenanceLinks, assetTransforms, twinCatalog,
      ...(story ? {story} : {}),
      ...(selectedAi ? {aiNarration: selectedAi} : {}),
      ...(environment ? {environment} : {})});
  }
  return {title: `${site.label} · ${composed.scenario.title}`, durationSeconds, frameTimesSeconds: [...frameTimesSeconds],
    site: copy(site), entityLabels: copy(entityLabels), selectFrame, project: selectFrame};
}
