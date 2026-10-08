// Display-only pond-night presentation. Runtime values and event subjects come
// from the verified candidate; the UI never computes an alarm or recommendation.
import {canonicalAdapter, canonicalBaseFor, el as element, SITE} from './farm-data.js';
import {projectionAt, readingValue} from './telemetry.js';
import {pondComparisonHistory, pondComparisonRuns, pondScenarioHref, selectPondTwin, twinInspection,
  pondTwinKindLabel, pondEntityLabel, pondAnchorLabel, pondSourceLabel, appendPondTwinTechnicalDetails} from './pond-inspection.js';
import {appendAINarration} from './pond-ai-narration.js';
import {appendPondLoadFailure} from './pond-presenter.js';

// Pond chrome follows panel-core's public ctx.locale and document language.
// Only declared presentation strings are translated; authored twin names,
// chapter text, events and notices retain their supplied content.
const english = {
  '模擬':'Simulated', '事件出處':'Event sources', '夜間警示與 AI 建議':'Night alerts and AI suggestions',
  '選取設備 · 模擬':'Selected equipment · Simulated', '水質':'Water quality', '設備':'Equipment', '天氣':'Weather',
  '水質監測':'Water quality', '設備監控':'Equipment monitoring', '氣象資訊':'Weather',
  '目前章節 · 模擬':'Current chapter · Simulated', '夜間三塭對照':'Night comparison of three ponds',
  '目前影格尚無警示。所有章節與回應均為預先編排的模擬內容。':'No alerts in this frame. All chapters and responses are scripted simulations.',
  '腳本內容 · 模擬，非操作建議':'Scripted simulation; not operating advice',
  '已接受 AI 腳本建議（模擬）':'AI script suggestion accepted (simulated)', '事件時間與出處':'Event times and sources',
  '模擬回應對照':'Simulated response comparison', '播放候選 · 模擬':'Replay run · Simulated',
  '有回應':'With response', '無回應':'No response', '模擬事件摘要':'Simulated event summary',
  '發生事件':'Incident', '現場處置':'On-site response', '警示至備援啟動':'Alert to backup start',
  '最低 DO':'Minimum DO', '無回應最低 DO':'Minimum DO without response', '事件避免情形':'Risk avoided',
  '摘要說明':'Summary note', '未提供':'Not supplied', '所有數值均為模型模擬':'All values are model simulations',
  '0 → 10 分鐘示範回放；每條線只顯示該候選的 canonical 取樣。':'0 → 10 minute replay; each line uses only its run\'s canonical samples.',
  'DO 氧收支模型與參數（模擬）':'DO oxygen balance model and parameters (simulated)',
  'DO 由水車供氧減去魚群及底泥呼吸，於展示前計算。夜間光合作用為零；這是人工假設的模型，未經養殖驗證。':'DO is baked before the demo from aerator oxygen supply minus fish and sediment respiration. Night photosynthesis is zero. This authored model has not been validated for aquaculture.',
  '此候選沒有提供可閱讀的模型參數。':'This run supplies no readable model parameters.', '參數原始 JSON（次要連結）':'Raw parameter JSON (secondary link)',
  '此時沒有已提供的樣本':'No supplied samples at this time', '三座魚塭 · 同時取樣':'Three ponds · Same sample time',
  '魚塭':'Pond', '⚠ 警示':'⚠ Alert', '首筆取樣 · 播放後顯示趨勢':'First sample · Play to see the trend',
  '額定功率 kW':'Rated power kW', '寬度 m':'Width m', '深度 m':'Depth m', '標準供氧 kg/h':'Standard oxygen supply kg/h',
  '供氧折減係數':'Oxygen transfer factor', '儲料量 kg':'Feed storage kg', '投餌量 kg/h':'Feed rate kg/h',
  '泵流量 m³/h':'Pump flow m³/h', '閘寬 m':'Sluice width m', '最大流量 m³/h':'Maximum flow m³/h', '斷路器 A':'Breaker A',
  '用電':'Power', '供氧':'Oxygen supply', '排水':'Drain flow', '進水':'Inlet flow', '流量':'Flow', '投餌':'Feed rate',
  '儲料量':'Feed storage', '狀態':'State', '溶氧':'Dissolved oxygen', '水溫':'Water temperature', '水位':'Water level',
  '鹽度':'Salinity', '氣溫':'Air temperature', '風速':'Wind speed', '雨量':'Rainfall', '濕度':'Humidity',
  '服務魚塭':'Served pond', '供電來源':'Power source', '供電至':'Power destination', '進水來源':'Inlet source', '排水至':'Drain destination',
  '屋內設備':'Housed equipment', '備援來源':'Backup source', '沿塭岸配線':'Dike cable route', '切換方式':'Transfer', '處置對象':'Response target',
  '種類':'Type', '共用設施／人員':'Shared facilities / staff', '靜態錨點':'Static anchor',
  '目前 canonical 狀態':'Current canonical state', '目前 canonical 位置':'Current canonical position', '尚無影格狀態':'No frame state yet',
  '目前 canonical 取樣 · 模擬':'Current canonical samples · Simulated', '此 twin 與取樣的出處':'Sources for this twin and its samples',
  '此候選沒有提供出處連結':'This run supplies no source links', '模擬與出處（快速檢視）':'Simulation and sources (quick view)',
  '選取設備詳細資料':'Selected equipment details', '點選場景設備或下方設備名稱，即可查看設備、目前取樣與出處。':'Select scene equipment or an equipment name below to inspect its current samples and sources.',
  '共用設備、電力與人員':'Shared equipment, power and staff', '規格、連結與出處':'Specifications, links and sources',
  '點選場景設備或設備卡片中的設備名稱。':'Select scene equipment or an equipment name in an equipment card.', '目前影格沒有公告':'No announcements in this frame',
  '模型版本':'Model version', '烘焙步長（示範秒）':'Bake step (demo seconds)', '呼吸參考水溫 °C':'Respiration reference temperature °C',
  '水溫升高 10 °C 的呼吸倍率':'Respiration multiplier per 10 °C', '夜間光合作用供氧 kg/h':'Night photosynthesis oxygen kg/h',
  'DO 上限 mg/L':'DO ceiling mg/L', '烘焙值小數位':'Baked decimal places', '面積 m²':'Area m²', '魚群總重 kg':'Fish biomass kg',
  '魚群呼吸 g O₂/kg/h':'Fish respiration g O₂/kg/h', '底泥呼吸 g O₂/m²/h':'Sediment respiration g O₂/m²/h', '初始 DO mg/L':'Initial DO mg/L',
  '取樣值':'Sample value', '規格值':'Specification value', '模型參數':'Model parameter', '關聯':'Relationship',
  '有回應與無回應的模擬 DO canonical 取樣對照；橫軸 0 至 600 秒，縱軸 mg/L':'Simulated canonical DO samples with and without response; horizontal axis 0 to 600 seconds, vertical axis mg/L',
  '時間未提供':'Time not supplied',
  '章末摘要':'Chapter-end summary', '回應時間':'Response time', '未採取回應':'No response taken',
  '腳本備援':'Script fallback',
  '目前影格狀態':'Current frame state', '目前取樣 · 模擬':'Current samples · Simulated',
  '設備與取樣的出處':'Equipment and sample sources', '技術細節':'Technical details', '模擬資料來源':'Simulation source',
  '靜態範圍':'Static footprint', '目前 DO':'Current DO', '魚塭與取樣的出處':'Pond and sample sources',
  '腳本備援（A；模擬情境；非操作建議）':'Script fallback (A; simulated scenario; not operating advice)',
  'ⓘ AI 生成與出處':'ⓘ AI generation and sources', 'ⓘ 腳本備援（A）與出處':'ⓘ Script fallback (A) and sources',
  '模型':'Model', '提示 SHA-256':'Prompt SHA-256', '保留腳本原因':'Script fallback reasons',
  '推理強度':'Reasoning effort', '此段 Token 用量':'Passage token usage', '整次生成 Token 用量':'Generation run total tokens',
  '此段等值費用估計':'Passage equivalent cost estimate', '整次生成等值費用估計':'Generation run equivalent cost estimate',
  '完整提示、原始回覆與凍結紀錄':'Full prompt, original response and frozen record',
  '此段沒有採用模型生成文字；凍結檔保留驗證原因與原始腳本備援。':'No model-generated text was adopted for this passage; the frozen record retains validation reasons and the original script fallback.',
  '此段沒有真實模型生成；凍結檔保留備援或作者編寫的測試文字。':'This passage has no real model generation; the frozen record retains fallback or author-written test text.',
};
const phaseEnglish = {夜間正常:'Normal night',設備故障:'Equipment fault',溶氧下降:'DO falling',警示:'Alert',腳本建議:'Script suggestion',
  已接受:'Accepted',現場處置:'On-site response',抵達魚塭:'Arrived at pond',備援運轉:'Backup running',警示解除:'Alert resolved',
  日出檢視:'Dawn inspection',事件摘要:'Event summary',待命:'Standby',出勤中:'Responding',放置設備:'Placing equipment',已完成:'Completed'};
export function pondText(text, locale = globalThis.document?.documentElement?.lang) {
  if (locale !== 'en' || typeof text !== 'string') return text;
  if (english[text]) return english[text];
  if (text.startsWith('AI 生成（')) return text.replace('AI 生成（', 'AI generated (').replace('，模擬情境；非操作建議）', ', simulated scenario; not operating advice)').replace('模擬情境；非操作建議）', 'simulated scenario; not operating advice)');
  if (/^章節開始 \d{2}:\d{2}$/.test(text)) return text.replace('章節開始 ', 'Chapter start ');
  if (/^\d{2}:\d{2} 提案時$/.test(text)) return text.replace(' 提案時', ' at proposal');
  const date = text.match(/^日期：(.*?) · 人工審閱：(已標記|未標記)$/);
  if (date) return `Date: ${date[1]} · Human review: ${date[2] === '已標記' ? 'Marked' : 'Not marked'}`;
  const prefixes = {'載入模擬資料':'Loading simulated data', '無法載入模擬資料：':'Unable to load simulated data: ',
    '目前流程：':'Current phase: ', '現場任務：':'On-site task: ', '發生於 ':'Occurred at ',
    '對照候選無法驗證：':'Unable to verify comparison run: ', '⚠ 影格警示：':'⚠ Frame alert: '};
  for (const [source, target] of Object.entries(prefixes)) {
    if (text.startsWith(source)) {
      const suffix = text.slice(source.length), split = suffix.indexOf(' · ');
      return target + (phaseEnglish[suffix] || (split >= 0 ? (phaseEnglish[suffix.slice(0,split)] || suffix.slice(0,split)) + suffix.slice(split) : suffix));
    }
  }
  const field = text.indexOf('：');
  if (field >= 0 && english[text.slice(0,field)]) return `${english[text.slice(0,field)]}: ${text.slice(field+1)}`;
  return text.replace(/^決策者：(.*?) · 時間：(.*?) · 決定：/, 'Actor: $1 · Time: $2 · Decision: ')
    .replace(/^(\d{2}:\d{2}) 事件：/, '$1 event: ')
    .replace(/原 (\d+) 台水車停機/g, '$1 original aerators stopped').replace(/備援水車運轉/g, 'Backup aerator running')
    .replace(/ DO 已取樣趨勢，(\d+) 筆；(.*?) 至 (.*?) mg\/L$/, ' DO sampled trend, $1 samples; $2 to $3 mg/L')
    .replace(/ · 警示$/, ' · Alert').replace(/^(\d+) 秒示範播放$/, '$1 demo seconds')
    .replace(/^(\d+(?:\.\d+)?) 模擬分$/, '$1 simulated minutes').replace(/^(\d+(?:\.\d+)?) 播放秒$/, '$1 replay seconds')
    .replace(/^⚠ 目前 DO (.*?) · 持續警示$/, '⚠ Current DO $1 · Ongoing alert')
    .replace(/^警示發生於 (\d{2}:\d{2})：/, 'Alert began at $1: ')
    .replace(/ · DO 已恢復/g, ' · DO recovered').replace(/ · 故障迴路仍隔離/g, ' · Faulted circuit remains isolated')
    .replace(/^備援運轉中/, 'Backup running').replace(/（隔離中）/g, ' (isolated)').replace(/（故障迴路）/g, ' (faulted circuit)')
    .replace(/ · 兩份已烘焙 DO 趨勢（模擬）$/, ' · Two baked DO trends (simulated)')
    .replace(/^(有回應|無回應) · /, (_, label) => `${english[label]} · `)
    .replace(/^(共用設備、電力與人員)/, english['共用設備、電力與人員']).replace(/ · (\d+) 個設備／人員$/, ' · $1 equipment / staff');
}
const chromeNodes = new WeakMap();
const chromeAttributes = new WeakMap();
function el(tag, text, className) {
  const node = element(tag, text, className);
  if (typeof text === 'string') chromeNodes.set(node, text);
  return node;
}
function localizeChrome(node, locale) {
  const source = chromeNodes.get(node);
  if (source != null) {
    const text = pondText(source, locale);
    // Preserve appended units, badges and details when replacing leading text.
    if (node.firstChild?.nodeType === 3) node.firstChild.data = text;
    else if ('text' in node) node.text = text;
    else if (!node.children.length) node.textContent = text;
  }
  for (const [name, text] of chromeAttributes.get(node) || []) node.setAttribute(name, pondText(text, locale));
  for (const child of node.children || []) localizeChrome(child, locale);
}
function chromeAttribute(node, name, text) {
  const attributes = chromeAttributes.get(node) || [];
  attributes.push([name, text]); chromeAttributes.set(node, attributes); node.setAttribute(name,text);
}

// UI precision only; canonical values and chart geometry retain their source bytes.
export const pondNumber = sample => Number.isFinite(sample?.value)
  ? sample.value.toFixed(sample.metric === 'water_level' ? 2 : 1) : '—';
export const pondReading = (sample, site = SITE) => 'state' in sample
  ? readingValue(sample, site) : `${pondNumber(sample)} ${sample.unit || ''}`.trim();

export const pondPresentation = site => site?.presentation?.kind === 'pond-night';
export const compactLabel = text => String(text).replace(/（模擬）/g, '').trim();
export const wallTime = timestamp => String(timestamp || '').match(/T([0-9]{2}:[0-9]{2})/)?.[1] || '時間未提供';
export const playbackTime = milliseconds => {
  const seconds = Math.floor(milliseconds / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};

// Read-only pond consumers share one exact-time selection. Retain only the
// latest projection per verified candidate, rather than one history per card.
const selectedProjections = new WeakMap();

export function pondProjection(candidate, milliseconds) {
  const selected = selectedProjections.get(candidate);
  if (selected && selected.milliseconds === milliseconds) return selected.projection;
  const projection = projectionAt(candidate, milliseconds);
  const frame = candidate.artifacts['composed-frames.json'].canonical_frames[projection.frameIndex];
  const events = new Map(frame.event_occurrences.map(row => [row.occurrence_id, row]));
  // Retained candidates predate the adapter's faceCatalog field. Their fully
  // verified snapshot supplies these static labels/sources only; readings and
  // transforms continue to come exclusively from the canonical projection.
  const faces = projection.faceCatalog || candidate.artifacts['static-snapshot.json']?.topology?.faces;
  const result = {...projection, ...(faces ? {faceCatalog: structuredClone(faces)} : {}),
    notifications: projection.notifications.map(row => ({...row,
    subjectIds: events.get(row.id)?.subject_ids || events.get(row.id)?.affected_twin_ids || []}))};
  selectedProjections.set(candidate, {milliseconds, projection: result});
  return result;
}

// A display message, copied from the verified selection. It contains no DO
// threshold, inferred incident, workstation time or static runtime fallback.
export function pondWorldState(projection) {
  return {
    frameIndex: projection.frameIndex,
    elapsedSeconds: projection.elapsedSeconds,
    sampledAt: projection.telemetry[0]?.sampled_at,
    ...(projection.environment ? {environment: structuredClone(projection.environment)} : {}),
    ...(projection.assetTransforms ? {assetTransforms: structuredClone(projection.assetTransforms)} : {}),
    ...(projection.story ? {story: structuredClone(projection.story)} : {}),
    ...(projection.story?.response ? {response: structuredClone(projection.story.response)} : {}),
    ...(Array.isArray(projection.story?.response?.active_alert_ids)
      ? {activeAlertIds: [...projection.story.response.active_alert_ids]} : {}),
    equipment: projection.telemetry.filter(row => row.metric === 'equipment_state')
      .map(row => ({id: row.entity_id, state: row.state})),
    events: projection.notifications.map(row => ({id: row.id, kind: row.kind, subjectIds: [...row.subjectIds]})),
  };
}

export function sampleStamp(projection, metrics, locale = globalThis.document?.documentElement?.lang) {
  const samples = (projection.telemetry || []).filter(row => !metrics || metrics.includes(row.metric));
  const times = [...new Set(samples.map(row => row.sampled_at))];
  // Use authored sample timestamps, including the last 595 s sample at demo end.
  // No playback-to-wall-clock interpolation and no workstation timezone conversion.
  return times.length ? times.map(time => `${locale === 'en' ? 'Sampled' : '取樣'} ${time.replace('T', ' ')}`).join('；')
    : locale === 'en' ? 'No samples yet' : '尚無取樣';
}

export function riskFor(projection, entityId, metric) {
  if (metric !== 'dissolved_oxygen') return false;
  const active = projection.story?.response?.active_alert_ids;
  return Array.isArray(active) ? projection.notifications.some(row => active.includes(row.id)
    && row.kind === 'simulated-low-oxygen-risk' && row.subjectIds.includes(entityId))
    : projection.notifications.some(row => row.kind === 'simulated-low-oxygen-risk' && row.subjectIds.includes(entityId));
}

// Presentation only: recovery is an explicit canonical event, never a DO test.
// Its shared backup subject must still be running in the selected sample.
export function pondStatus(projection, entityId) {
  const events = projection.notifications || [];
  const fault = events.some(row => row.kind === 'equipment-fault' && row.subjectIds.includes(entityId));
  const risk = riskFor(projection, entityId, 'dissolved_oxygen');
  const resolved = events.find(row => row.kind === 'simulated-alert-resolved' && row.subjectIds.includes(entityId));
  const backupRunning = !!resolved && events.some(row => row.kind === 'backup-aerator-running'
    && row.subjectIds.includes(entityId) && row.subjectIds.some(id => id !== entityId
      && resolved.subjectIds.includes(id) && projection.telemetry.some(sample => sample.entity_id === id
        && sample.metric === 'equipment_state' && ['on', 'running'].includes(sample.state))));
  const faultRemains = events.some(row => row.kind === 'equipment-fault' && row.subjectIds.includes(entityId)
    && row.subjectIds.some(id => projection.telemetry.some(sample => sample.entity_id === id
      && sample.metric === 'equipment_state' && ['fault', 'off'].includes(sample.state))));
  const degraded = faultRemains && !risk && backupRunning;
  return {fault, risk, degraded, warning: risk ? '警示' : degraded ? '' : fault ? '故障' : '',
    status: degraded ? '備援運轉中 · DO 已恢復' : ''};
}

export function pondEquipmentSummary(projection, entityId) {
  const status = pondStatus(projection, entityId);
  const faults = projection.notifications.filter(row => row.kind === 'equipment-fault' && row.subjectIds.includes(entityId));
  const originals = (projection.twinCatalog || []).filter(twin => twin.kind === 'aerator'
    && faults.some(event => event.subjectIds.includes(twin.id)));
  const stopped = originals.filter(twin => projection.telemetry.some(row => row.entity_id === twin.id
    && row.metric === 'equipment_state' && ['off','fault'].includes(row.state))).length;
  return [stopped ? `原 ${stopped} 台水車停機` : '', status.degraded ? '備援水車運轉 · DO 已恢復' : ''].filter(Boolean).join(' · ');
}

// The pond renderer uses this same canonical lighting preset, without deriving
// a period from the workstation clock or the chapter's display wording.
export const pondPeriod = projection => ({night:'夜間', dawn:'清晨', day:'日間', dusk:'傍晚'})
  [projection.environment?.preset_hint] || '';

// A compact phone headline, using only the currently selected canonical sample
// and its authored summary. Do not preview the final summary in earlier chapters.
export function pondKeyNumbers(projection) {
  const target = projection.story?.response?.task?.pond_id;
  const samples = projection.telemetry.filter(row => row.metric === 'dissolved_oxygen');
  const sample = samples.find(row => row.entity_id === target) || samples[0];
  const summary = projection.story?.summary;
  return [
    {label: `${compactLabel(projection.entityLabels?.[sample?.entity_id] || '魚塭')} DO`,
      value: sample ? `${pondNumber(sample)} mg/L` : '尚無取樣'},
    {label: '最低 DO', value: summary?.minimum_do_mg_l == null ? '章末摘要' : `${summary.minimum_do_mg_l} mg/L`},
    {label: '回應時間', value: summary?.response_seconds == null
      ? summary ? '未採取回應' : '章末摘要'
      : `${summary.response_scenario_seconds == null ? summary.response_seconds : summary.response_scenario_seconds / 60} ${summary.response_scenario_seconds == null ? '播放秒' : '模擬分'}`},
  ];
}

function badge() { return el('span', '模擬', 'pond-badge'); }
function sourceDetails(row, projection) {
  const details = el('details', null, 'pond-event-source');
  details.dataset.detailKey = row.id;
  details.append(el('summary', '事件出處'));
  for (const ref of row.sourceIds || []) {
    const link = projection.provenanceLinks?.find(item => item.sourceId === ref);
    const item = link ? el('a', link.title) : el('span', ref.split('@sha256:')[0]);
    if (link) { item.href = link.href; item.target = '_blank'; item.rel = 'noopener'; }
    details.append(item);
  }
  return details;
}

async function loadPondComparison(site) {
  const runs = pondComparisonRuns(site);
  return Promise.all(runs.map(async run => ({...run,
    candidate: await canonicalAdapter(canonicalBaseFor(run.scenario))})));
}

function observedPanel(id, title, draw, {load = () => canonicalAdapter(), site = SITE,
  loadComparison = () => loadPondComparison(site), getClock = () => globalThis.window?.app?.clock} = {}) {
  const panelTitle = locale => locale === 'en' && /-(water|scada|weather)$/.test(id)
    ? ({water:'Water quality', scada:'Equipment monitoring', weather:'Weather'})[id.split('-').at(-1)] : pondText(title, locale);
  return {id, get title() { return panelTitle(globalThis.document?.documentElement?.lang); }, icon: id === 'pond-notifications' ? '⚠' : '◌', defaultSize: {w: 4, h: 5},
    render(container, ctx) {
      const root = el('div', null, `farm-panel pond-panel ${id}`);
      const meta = el('div', null, 'pond-panel-meta'), when = el('output', pondText('載入模擬資料…',ctx.locale || globalThis.document?.documentElement?.lang), 'pond-sample-time');
      chromeNodes.delete(when);
      meta.append(badge(), when);
      const content = el('div', null, 'pond-panel-content');
      root.append(meta, content); container.append(root);
      let candidate, comparison, comparisonError, milliseconds = 0, disposed = false, signature,
        selectedId = ctx.getSelectedEntity?.()?.id || null;
      const interaction = {
        get selectedId() { return selectedId; },
        get comparison() { return comparison; },
        get comparisonError() { return comparisonError; },
        get replay() {
          const clock = getClock();
          return {time: Number.isFinite(clock?.time) ? clock.time : milliseconds,
            rate: Number.isFinite(clock?.rate) && clock.rate > 0 ? clock.rate : 1};
        },
        select(id) {
          const projection = pondProjection(candidate, milliseconds);
          if (selectPondTwin(ctx.map, projection, id)) { selectedId = id; render(); }
        },
      };
      const render = () => {
        if (!candidate || disposed) return;
        const projection = pondProjection(candidate, milliseconds);
        const locale = ctx.locale || globalThis.document?.documentElement?.lang || 'zh-Hant';
        const next = JSON.stringify([projection.telemetry, projection.notifications, projection.story, projection.aiNarration,
          selectedId, selectedId && projection.assetTransforms?.find(row => row.id === selectedId),
          !!comparison, comparisonError, locale]);
        if (next === signature) return;
        signature = next;
        root.dataset.elapsedSeconds = String(milliseconds / 1000);
        when.textContent = sampleStamp(projection, site.cards?.[id.replace(/^(farm|pond)-/, '')]?.metrics, locale);
        const opened = new Set([...(content.querySelectorAll?.('details[open]') || [])].map(node => node.dataset.detailKey));
        draw(content, projection, site, candidate, interaction);
        localizeChrome(root, locale);
        root.lang = locale;
        const card = root.closest?.('.panel-card');
        const heading = card?.querySelector('.panel-header h2');
        if (heading) heading.textContent = panelTitle(locale);
        for (const option of root.closest?.('.panel-core-app')?.querySelectorAll('option') || []) {
          if (option.value === id) option.textContent = panelTitle(locale);
        }
        for (const details of content.querySelectorAll?.('details') || []) {
          if (opened.has(details.dataset.detailKey)) details.open = true;
        }
      };
      const subscriptions = [ctx.map.subscribe('time', ({t} = {}) => { if (Number.isFinite(t)) { milliseconds = t; render(); } })];
      const localeObserver = globalThis.MutationObserver && globalThis.document?.documentElement
        ? new MutationObserver(render) : null;
      localeObserver?.observe(document.documentElement, {attributes: true, attributeFilter: ['lang']});
      if (id === 'pond-scada' || id === 'selection') subscriptions.push(ctx.map.subscribe('select', ({entity} = {}) => {
        selectedId = entity?.id || null; render();
      }));
      const ready = load().then(async value => {
        if (disposed) return;
        candidate = value; render();
        if (id === 'pond-notifications') {
          try { comparison = await loadComparison(); }
          catch (error) { comparisonError = error.message; }
          render();
        }
      }).catch(error => {
        if (!disposed) {
          when.textContent = '';
          content.replaceChildren();
          appendPondLoadFailure(content, error, ctx.locale || globalThis.document?.documentElement?.lang);
        }
      });
      return {root, ready, close: () => { disposed = true; localeObserver?.disconnect(); for (const unsubscribe of subscriptions) unsubscribe?.(); }};
    }, update() {}, dispose(view) { view.close(); view.root.remove(); },
    describeForAI() { return {schemaVersion: 1, kind: id, visibleFields: ['canonical samples', 'canonical events', 'sample time', 'sources'],
      summary: '模擬取樣與事件直接來自已驗證影格；不計算狀態、警示或建議。'}; }};
}

export function createPondStoryPanel(options = {}) {
  return observedPanel('pond-notifications', '夜間警示與 AI 建議', (content, projection, site, candidate, interaction) => {
    content.replaceChildren();
    drawRunSwitch(content, site, interaction);
    const events = projection.notifications.filter(row => row.kind !== 'simulated-announcement');
    const story = projection.story;
    if (story?.chapter) {
      content.append(el('span', '目前章節 · 模擬', 'pond-story-stage'),
        el('h3', story.chapter.title, 'pond-story-title'),
        el('p', story.chapter.caption, 'pond-story-caption'));
      const stage = ({normal:'夜間正常', fault:'設備故障', detection:'溶氧下降', warning:'警示', suggestion:'腳本建議',
        accepted:'已接受', responding:'現場處置', arrived:'抵達魚塭', 'backup-running':'備援運轉', resolved:'警示解除',
        dawn:'日出檢視', summary:'事件摘要'})[story.response?.phase] || story.response?.phase;
      if (stage) content.append(el('p', `目前流程：${stage}`, 'pond-response-stage'));
    }
    appendAINarration(content, projection, {ui: el});
    if (story?.summary) drawPondSummary(content, story.summary, events.find(row => row.kind === 'equipment-fault')?.title,
      projection, site, interaction);
    if (!events.length) {
      if (!story?.chapter) content.append(el('h3', '夜間三塭對照', 'pond-story-title'));
      content.append(el('p', '目前影格尚無警示。所有章節與回應均為預先編排的模擬內容。', 'pond-story-empty'));
      return;
    }
    const fault = events.find(row => row.kind === 'equipment-fault');
    const risk = events.find(row => row.kind === 'simulated-low-oxygen-risk'
      && (!Array.isArray(story?.response?.active_alert_ids) || story.response.active_alert_ids.includes(row.id)));
    const suggestion = events.find(row => ['simulated-ai-suggestion', 'simulated-suggestion'].includes(row.kind));
    if (!story?.chapter) content.append(el('h3', `⚠ ${compactLabel(risk?.title || fault?.title || events[0].title)}`, 'pond-story-title'));
    if (fault) {
      const box = el('article', null, 'pond-fault-event'); box.dataset.occurrenceId = fault.id;
      box.append(el('strong', `⚠ ${compactLabel(fault.title)}`),
        el('span', `發生於 ${wallTime(fault.sampledAt)} · ${fault.detail}`, 'pond-event-detail'));
      content.append(box);
    }
    if (risk) {
      const box = el('article', null, 'pond-risk-event'); box.dataset.occurrenceId = risk.id;
      const oxygen = projection.telemetry.find(row => row.metric === 'dissolved_oxygen' && risk.subjectIds.includes(row.entity_id));
      box.append(el('strong', oxygen ? `⚠ 目前 DO ${pondReading(oxygen)} · 持續警示` : `⚠ ${compactLabel(risk.title)}`),
        el('p', `警示發生於 ${wallTime(risk.sampledAt)}：${risk.detail}`, 'pond-event-detail'));
      content.append(box);
    }
    if (suggestion && (!story?.response || story.response.phase === 'suggestion')) {
      const box = el('article', null, 'pond-suggestion'); box.dataset.occurrenceId = suggestion.id;
      box.append(el('strong', `✦ ${suggestion.title}`), el('span', '腳本內容 · 模擬，非操作建議', 'pond-scripted-label'),
        el('p', suggestion.detail, 'pond-event-detail'));
      content.append(box);
    }
    const accepted = events.find(row => row.kind === 'operator-accepted');
    if (accepted) {
      const decision = accepted.decision || story?.response?.decision;
      const actor = decision?.actor_label || accepted.actorLabel || '模擬場務人員';
      const when = decision?.scenario_time || accepted.sampledAt;
      const action = decision?.action || accepted.detail || '已接受腳本建議';
      const box = el('article', null, 'pond-decision-event'); box.dataset.occurrenceId = accepted.id;
      box.append(el('strong', '已接受 AI 腳本建議（模擬）'),
        el('p', `決策者：${actor} · 時間：${when} · 決定：${action}`, 'pond-event-detail'));
      content.append(box);
    }
    const response = story?.response;
    if (response?.task) {
      const statusLabels = {idle:'待命', accepted:'已接受', responding:'出勤中', placing:'放置設備', running:'備援運轉', completed:'已完成'};
      const text = statusLabels[response.task.status] || response.task.status;
      content.append(el('p', `現場任務：${text}${response.actor_label ? ` · ${response.actor_label}` : ''}`, 'pond-response-task'));
    }
    const history = el('details', null, 'pond-event-history'); history.dataset.detailKey = 'history'; history.append(el('summary', '事件時間與出處'));
    for (const row of events) {
      const item = el('div', null, 'pond-event-record');
      item.append(el('strong', row.title), el('small', `發生於 ${row.sampledAt.replace('T', ' ')}`), sourceDetails(row, projection));
      history.append(item);
    }
    content.append(history);
  }, options);
}

function drawRunSwitch(content, site, interaction) {
  const runs = pondComparisonRuns(site);
  if (!runs.length) return;
  const nav = el('nav', null, 'pond-run-switch'); chromeAttribute(nav,'aria-label','模擬回應對照');
  nav.append(el('span', '播放候選 · 模擬'));
  const requested = new URLSearchParams(globalThis.location?.search || '').get('scenario');
  for (const run of runs) {
    const link = el('a', run.label, 'farm-button');
    const captureReplay = () => {
      const {time, rate} = interaction.replay;
      const duration = interaction.comparison?.find(row => row.role === run.role)?.candidate.adapter.durationSeconds;
      const url = new URL(pondScenarioHref(run.scenario));
      url.searchParams.set('t', String(Math.min(Number.isFinite(duration) ? duration * 1000 : Infinity, Math.max(0,time))));
      url.searchParams.set('speed', String(rate));
      link.href = url.href;
    };
    captureReplay();
    // Let the trusted click keep native navigation, capturing even a paused
    // clock whose speed changed since the last canonical sample render.
    link.onclick = captureReplay;
    link.dataset.run = run.role;
    if (run.scenario.param === requested) link.setAttribute('aria-current', 'page');
    nav.append(link);
  }
  content.append(nav);
}

function drawPondSummary(content, summary, faultTitle, projection, site, interaction) {
  const card = el('section', null, 'pond-closing-summary');
  card.append(el('h3', '模擬事件摘要', 'pond-story-title'), badge());
  const values = [
    ...(faultTitle ? [['發生事件', faultTitle]] : []),
    ...(summary.what_happened ? [['現場處置', summary.what_happened]] : []),
    ['警示至備援啟動', summary.response_time_label || (summary.response_seconds == null ? '未提供' : `${summary.response_seconds} 秒示範播放`)],
    ['最低 DO', summary.minimum_do_mg_l == null ? '未提供' : `${summary.minimum_do_mg_l} mg/L`],
    ...(summary.minimum_do_mg_l === summary.without_response_minimum_do_mg_l ? []
      : [['無回應最低 DO', summary.without_response_minimum_do_mg_l == null ? '未提供' : `${summary.without_response_minimum_do_mg_l} mg/L`]]),
    ['事件避免情形', summary.avoided_risk || '未提供'],
    ['摘要說明', summary.notice || '所有數值均為模型模擬'],
  ];
  const list = el('dl', null, 'pond-summary-values');
  for (const [label, value] of values) list.append(el('dt', label), el('dd', value));
  card.append(list);
  const runs = interaction.comparison;
  if (runs?.length === 2) {
    const entityId = site.presentation.comparison.entity_id;
    const curves = runs.map(run => ({...run, history: pondComparisonHistory(run.candidate, entityId)}));
    const label = compactLabel(projection.entityLabels[entityId] || entityId);
    const figure = el('figure', null, 'pond-response-comparison');
    figure.dataset.entityId = entityId;
    figure.append(el('figcaption', `${label} · 兩份已烘焙 DO 趨勢（模擬）`), drawComparisonTrend(curves),
      el('small', '0 → 10 分鐘示範回放；每條線只顯示該候選的 canonical 取樣。'));
    for (const [index, run] of curves.entries()) {
      const legend = el('p', `${run.label} · ${pondNumber(run.history[0])} → ${pondNumber(run.history.at(-1))} mg/L`);
      legend.style.color = index === 0 ? '#16897c' : '#b66b26'; figure.append(legend);
    }
    card.append(figure);
  } else if (interaction.comparisonError) {
    appendPondLoadFailure(card, interaction.comparisonError);
  }
  content.append(card);
}

function drawComparisonTrend(curves) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 240 92'); svg.setAttribute('role', 'img');
  chromeAttribute(svg,'aria-label','有回應與無回應的模擬 DO canonical 取樣對照；橫軸 0 至 600 秒，縱軸 mg/L');
  const maxValue = Math.max(8, ...curves.flatMap(run => run.history.map(row => row.value)));
  const point = row => [4 + row.elapsed_seconds / 600 * 232, 70 - row.value / maxValue * 64];
  for (const [index, run] of curves.entries()) {
    const line = document.createElementNS(svg.namespaceURI, 'polyline');
    // Hold each supplied sample until the next one; no interpolated DO value.
    const points = run.history.flatMap((row, i) => {
      const [x, y] = point(row);
      return i ? [[x, point(run.history[i - 1])[1]], [x, y]] : [[x, y]];
    });
    line.setAttribute('points', points.map(row => row.join(',')).join(' '));
    line.setAttribute('fill', 'none'); line.setAttribute('stroke', index === 0 ? '#16897c' : '#b66b26');
    line.setAttribute('stroke-width', '2.5'); line.dataset.run = run.role; svg.append(line);
  }
  for (const [text, x, anchor] of [['0 min', 4, 'start'], ['10 min', 236, 'end']]) {
    const label = document.createElementNS(svg.namespaceURI, 'text'); label.textContent = text;
    label.setAttribute('x', x); label.setAttribute('y', '88'); label.setAttribute('font-size', '10');
    label.setAttribute('fill', 'currentColor'); label.setAttribute('text-anchor', anchor); svg.append(label);
  }
  return svg;
}

function drawTrend(history, label) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 240 72'); svg.setAttribute('role', 'img');
  chromeAttribute(svg,'aria-label',`${label} DO 已取樣趨勢，${history.length} 筆；${pondNumber(history[0])} 至 ${pondNumber(history.at(-1))} mg/L`);
  const height = Math.max(8, ...history.map(row => row.value));
  const reached = Math.max(1, history.at(-1)?.elapsed_seconds || 0);
  const point = row => [4 + row.elapsed_seconds / reached * 232, 66 - row.value / height * 58];
  if (history.length > 1) {
    const line = document.createElementNS(svg.namespaceURI, 'polyline');
    line.setAttribute('points', history.map(point).map(row => row.join(',')).join(' '));
    line.setAttribute('fill', 'none'); line.setAttribute('stroke', 'currentColor'); line.setAttribute('stroke-width', '2.5'); svg.append(line);
  }
  if (history.length) {
    const [x, y] = point(history.at(-1));
    const dot = document.createElementNS(svg.namespaceURI, 'circle'); dot.setAttribute('cx', x); dot.setAttribute('cy', y);
    dot.setAttribute('r', '3.5'); dot.setAttribute('fill', 'currentColor'); svg.append(dot);
  }
  return svg;
}

const modelLabels = {model:'模型版本', integration_step_demo_seconds:'烘焙步長（示範秒）',
  reference_temperature_c:'呼吸參考水溫 °C', respiration_q10:'水溫升高 10 °C 的呼吸倍率',
  night_photosynthesis_kg_h:'夜間光合作用供氧 kg/h', oxygen_ceiling_mg_l:'DO 上限 mg/L',
  decimal_places:'烘焙值小數位', area_m2:'面積 m²', depth_m:'深度 m', fish_biomass_kg:'魚群總重 kg',
  fish_respiration_g_kg_h:'魚群呼吸 g O₂/kg/h', sediment_respiration_g_m2_h:'底泥呼吸 g O₂/m²/h',
  initial_do_mg_l:'初始 DO mg/L'};

export function drawPondOxygenModel(content, projection, candidate) {
  const model = el('details', null, 'pond-event-source pond-model-parameters'); model.dataset.detailKey = 'oxygen-model';
  model.append(el('summary', 'DO 氧收支模型與參數（模擬）'),
    el('p', 'DO 由水車供氧減去魚群及底泥呼吸，於展示前計算。夜間光合作用為零；這是人工假設的模型，未經養殖驗證。'));
  const path = candidate.manifest?.input_bindings?.pond_simulation_parameters?.path;
  const parameters = candidate.artifacts[path] || candidate.artifacts['pond-oxygen-parameters.json'];
  if (parameters) {
    const globals = el('dl', null, 'pond-model-values');
    for (const [key, value] of Object.entries(parameters)) {
      if (key === 'ponds' || key === 'decision_path' || key === 'simulation_label') continue;
      globals.append(el('dt', modelLabels[key] || '模型參數'), el('dd', value));
    }
    model.append(globals);
    for (const pond of parameters.ponds || []) {
      const group = el('section', null, 'pond-model-pond'); group.dataset.pondId = pond.id;
      group.append(el('h3', compactLabel(projection.entityLabels[pond.id] || pond.id)));
      const values = el('dl', null, 'pond-model-values');
      for (const [key, value] of Object.entries(pond)) {
        if (key !== 'id') values.append(el('dt', modelLabels[key] || '模型參數'), el('dd', value));
      }
      group.append(values); model.append(group);
    }
  } else model.append(el('p', '此候選沒有提供可閱讀的模型參數。'));
  for (const link of projection.provenanceLinks.filter(row => /pond-twin|pond-oxygen/.test(row.sourceId))) {
    const anchor = el('a', /pond-oxygen/.test(link.sourceId) ? '參數原始 JSON（次要連結）' : link.title);
    anchor.href = link.href; anchor.target = '_blank'; anchor.rel = 'noopener'; model.append(anchor);
  }
  content.append(model);
}

function drawWater(content, projection, site, candidate) {
  content.replaceChildren();
  const metrics = site.cards.water.metrics;
  const samples = projection.telemetry.filter(row => metrics.includes(row.metric));
  if (!samples.length) { content.append(el('p', '此時沒有已提供的樣本')); return; }
  const entities = [...new Set(samples.map(row => row.entity_id))];
  const table = el('table', null, 'pond-comparison'); table.append(el('caption', '三座魚塭 · 同時取樣'));
  const head = el('thead'), headings = el('tr'); headings.append(el('th', '魚塭'));
  for (const metric of metrics) {
    const cell = el('th', pondMetricLabel(metric, null, site)); cell.setAttribute('scope', 'col');
    const unit = samples.find(row => row.metric === metric)?.unit;
    if (unit && unit !== 'pH') cell.append(el('small', unit)); headings.append(cell);
  }
  head.append(headings); table.append(head);
  const body = el('tbody');
  for (const id of entities) {
    const row = el('tr'); row.dataset.entityId = id;
    const label = el('th', compactLabel(projection.entityLabels[id])); label.setAttribute('scope', 'row'); row.append(label);
    for (const metric of metrics) {
      const sample = samples.find(item => item.entity_id === id && item.metric === metric);
      const cell = el('td', pondNumber(sample)); cell.dataset.metric = metric;
      if (riskFor(projection, id, metric)) {
        cell.className = 'pond-critical'; cell.append(el('span', '⚠ 警示'));
      }
      row.append(cell);
    }
    body.append(row);
  }
  table.append(body); content.append(table);
  const trends = el('div', null, 'pond-trends');
  for (const id of entities) {
    const history = projection.telemetryHistory.filter(row => row.entity_id === id && row.metric === site.cards.water.trend_metric);
    const label = compactLabel(projection.entityLabels[id]);
    const trend = el('section', null, 'pond-trend'); trend.dataset.entityId = id;
    if (riskFor(projection, id, site.cards.water.trend_metric)) trend.classList.add('pond-critical');
    trend.append(el('h3', `${label} · DO`), drawTrend(history, label),
      el('small', history.length > 1 ? `${wallTime(history[0].sampled_at)} → ${wallTime(history.at(-1).sampled_at)} · ${pondNumber(history.at(-1))} mg/L` : '首筆取樣 · 播放後顯示趨勢'));
    trends.append(trend);
  }
  content.append(trends);
  const activeAlerts = projection.story?.response?.active_alert_ids;
  const risk = projection.notifications.find(row => row.kind === 'simulated-low-oxygen-risk'
    && (!Array.isArray(activeAlerts) || activeAlerts.includes(row.id)));
  if (risk) content.append(el('p', `⚠ 影格警示：${risk.detail}`, 'pond-threshold-note'));
  if (projection.twinCatalog?.some(row => row.specs)) drawPondOxygenModel(content, projection, candidate);
}

const specLabels = {rated_kw:'額定功率 kW', width_m:'寬度 m', depth_m:'深度 m',
  oxygen_transfer_kg_h:'標準供氧 kg/h', oxygen_transfer_factor:'供氧折減係數',
  capacity_kg:'儲料量 kg', feed_rate_kg_h:'投餌量 kg/h', flow_m3_h:'泵流量 m³/h',
  opening_width_m:'閘寬 m', max_flow_m3_h:'最大流量 m³/h', breaker_a:'斷路器 A'};
const channelLabels = {power_kw:'用電', oxygen_supply_kg_h:'供氧', flow_m3_h:'流量', feed_rate_kg_h:'投餌', capacity_kg:'儲料量'};
const metricLabels = {...channelLabels,equipment_state:'狀態',dissolved_oxygen:'DO',water_temperature:'水溫',
  water_level:'水位',ph:'pH',salinity:'鹽度',air_temperature:'氣溫',wind_speed:'風速',rainfall:'雨量',humidity:'濕度'};
export function pondMetricLabel(metric, twin, site = SITE) {
  if (metric === 'flow_m3_h') {
    if (/drain/.test(twin?.kind || '') || twin?.relationships?.drains_to) return '排水';
    if (/inlet/.test(twin?.kind || '') || twin?.relationships?.fed_from) return '進水';
    return '流量';
  }
  const declared = site.metric_labels?.[metric];
  return metricLabels[metric] || (declared && declared !== metric ? declared : '取樣值');
}
const pondEquipmentStates = {fault:'故障', standby:'待命', transporting:'搬運中', placing:'放置中', on:'運轉',
  idle:'待命', preparing:'準備中', walking:'沿塭岸出勤', monitoring:'監看中', paused:'已暫停', off:'停止'};
const relationshipLabels = {serves:'服務魚塭',powered_by:'供電來源',feeds:'供電至',fed_from:'進水來源',drains_to:'排水至',
  houses:'屋內設備',backup_supply:'備援來源',cable_along:'沿塭岸配線',transfer:'切換方式',responds_to:'處置對象'};

function sourceLink(link, fallback) {
  if (!link) return el('span', '模擬資料來源');
  const anchor = el('a', pondSourceLabel(link)); anchor.href = link.href; anchor.target = '_blank'; anchor.rel = 'noopener';
  return anchor;
}

function drawTwinFacts(content, details, projection, site) {
  const {twin, pondIds, telemetry, transform, sources} = details;
  const pond = twin.type === 'Face' && twin.kind === 'pond';
  const facts = el('dl', null, 'pond-twin-facts');
  const add = (label, value) => facts.append(el('dt', label), el('dd', value));
  add('種類', pondTwinKindLabel(twin.kind));
  add('魚塭', pondIds.length ? pondIds.map(id => compactLabel(projection.entityLabels[id] || id)).join('、') : '共用設施／人員');
  if (pond) {
    add('靜態範圍', pondEntityLabel(projection, twin.id));
    const oxygen = telemetry.find(row => row.metric === 'dissolved_oxygen');
    add('目前 DO', oxygen ? pondReading(oxygen, site) : '此時沒有已提供的樣本');
  } else {
    add('靜態錨點', pondAnchorLabel(projection, twin.anchor));
    const state = telemetry.find(row => row.metric === 'equipment_state');
    add('目前影格狀態', state ? (pondEquipmentStates[state.state] || site.state_labels?.[state.state] || state.state) : '尚無影格狀態');
  }
  for (const [key, value] of Object.entries(twin.specs || {})) add(specLabels[key] || '規格值', value);
  for (const [kind, targets] of Object.entries(twin.relationships || {})) {
    const values = (Array.isArray(targets) ? targets : [targets]);
    add(relationshipLabels[kind] || '關聯', values.map(id => pondEntityLabel(projection, id)).join('、'));
  }
  content.append(facts);
  const samples = el('section', null, 'pond-twin-telemetry'); samples.append(el('h4', '目前取樣 · 模擬'));
  for (const row of telemetry) samples.append(el('p', `${pondMetricLabel(row.metric, twin, site)}：`
    + `${pondReading(row, site)} · ${row.sampled_at.replace('T', ' ')}`));
  if (!telemetry.length) samples.append(el('p', '此時沒有已提供的樣本'));
  content.append(samples);
  const provenance = el('section', null, 'pond-twin-provenance'); provenance.append(el('h4', pond ? '魚塭與取樣的出處' : '設備與取樣的出處'));
  for (const {ref, link} of sources) provenance.append(sourceLink(link, ref));
  if (!sources.length) provenance.append(el('p', '此候選沒有提供出處連結'));
  content.append(provenance);
  appendPondTwinTechnicalDetails(content, details, {el});
}

function drawQuickProvenance(content, projection, site, candidate) {
  const sources = el('details', null, 'pond-quick-provenance'); sources.dataset.detailKey = 'quick-provenance';
  sources.append(el('summary', '模擬與出處（快速檢視）'));
  for (const text of site.notices || []) sources.append(el('p', text));
  if (candidate.manifest?.input_bindings?.pond_simulation_parameters
    || candidate.artifacts['pond-oxygen-parameters.json']) drawPondOxygenModel(sources, projection, candidate);
  for (const link of projection.provenanceLinks || []) {
    if (!/pond-oxygen/.test(link.sourceId)) sources.append(sourceLink(link));
  }
  content.append(sources);
}

function drawTwins(content, projection, site, candidate, interaction) {
  content.replaceChildren();
  drawQuickProvenance(content, projection, site, candidate);
  const selected = twinInspection(projection, interaction.selectedId);
  if (selected) {
    const card = el('article', null, 'pond-twin-inspection'); card.dataset.entityId = selected.twin.id;
    chromeAttribute(card,'aria-label','選取設備詳細資料'); card.setAttribute('aria-live', 'polite');
    card.append(el('h3', compactLabel(selected.twin.label)), badge());
    drawTwinFacts(card, selected, projection, site); content.append(card);
  } else content.append(el('p', '點選場景設備或下方設備名稱，即可查看設備、目前取樣與出處。', 'pond-inspection-hint'));
  const groups = new Map();
  for (const twin of projection.twinCatalog) {
    const serves = twin.relationships?.serves || [];
    const groupId = serves.length === 1 ? serves[0] : 'shared';
    if (!groups.has(groupId)) groups.set(groupId, []);
    groups.get(groupId).push(twin);
  }
  for (const [id, twins] of groups) {
    const section = el('details', null, 'pond-twin-group'); section.dataset.pondId = id;
    section.dataset.detailKey = `inventory-${id}`;
    section.append(el('summary', `${id === 'shared' ? '共用設備、電力與人員' : compactLabel(projection.entityLabels[id] || id)} · ${twins.length} 個設備／人員`));
    const status = pondStatus(projection, id);
    const equipment = pondEquipmentSummary(projection,id);
    if (equipment) section.append(el('p', `${equipment}${status.degraded ? ' · 故障迴路仍隔離' : ''}`, 'pond-equipment-recovery'));
    const list = el('dl', null, 'pond-readings pond-scada-readings');
    for (const twin of twins) {
      const state = projection.telemetry.find(row => row.entity_id === twin.id && row.metric === 'equipment_state');
      const label = el('dt'), choose = el('button', compactLabel(twin.label), 'farm-button pond-select-twin');
      choose.type = 'button'; choose.dataset.entityId = twin.id;
      choose.setAttribute('aria-pressed', twin.id === interaction.selectedId ? 'true' : 'false');
      choose.onclick = () => interaction.select(twin.id); label.append(choose); list.append(label);
      const stateText = state ? (pondEquipmentStates[state.state] || site.state_labels?.[state.state] || state.state) : null;
      const isolated = status.degraded && projection.notifications.some(event => event.kind === 'equipment-fault'
        && event.subjectIds.includes(id) && event.subjectIds.includes(twin.id));
      const annotation = isolated && state?.state === 'fault' ? '（隔離中）'
        : isolated && state?.state === 'off' ? '（故障迴路）' : '';
      const value = el('dd', state ? `${state.state === 'fault' ? '⚠ ' : ''}${stateText}${annotation}` : '尚無影格狀態');
      value.dataset.entityId = twin.id;
      if (state?.state === 'fault') value.className = 'pond-critical';
      const details = el('details', null, 'pond-event-source'); details.dataset.detailKey = twin.id;
      details.append(el('summary', '規格、連結與出處'), el('small', `${pondTwinKindLabel(twin.kind)} · ${pondAnchorLabel(projection, twin.anchor)}`));
      for (const [key, number] of Object.entries(twin.specs || {})) details.append(el('div', `${specLabels[key] || '規格值'}：${number}`));
      for (const [kind, targets] of Object.entries(twin.relationships || {})) {
        const label = relationshipLabels[kind] || '關聯';
        const text = (Array.isArray(targets) ? targets : [targets]).map(target => pondEntityLabel(projection, target)).join('、');
        details.append(el('div', `${label}：${text}`));
      }
      for (const sample of projection.telemetry.filter(row => row.entity_id === twin.id && channelLabels[row.metric])) {
        details.append(el('div', `${pondMetricLabel(sample.metric, twin, site)}：${pondReading(sample, site)}`));
      }
      for (const ref of twin.provenance_refs || []) {
        const link = projection.provenanceLinks.find(row => row.sourceId.split('@sha256:')[0] === ref.split('@sha256:')[0]);
        if (link) { const anchor = el('a', pondSourceLabel(link)); anchor.href = link.href; anchor.target = '_blank'; anchor.rel = 'noopener'; details.append(anchor); }
      }
      appendPondTwinTechnicalDetails(details, twinInspection(projection, twin.id), {el});
      value.append(details); list.append(value);
    }
    section.append(list); content.append(section);
  }
}

function drawReadings(content, projection, site, candidate, kind, interaction) {
  if (kind === 'scada' && projection.twinCatalog?.some(row => row.specs)) {
    drawTwins(content, projection, site, candidate, interaction); return;
  }
  content.replaceChildren();
  const rows = projection.telemetry.filter(row => site.cards[kind].metrics.includes(row.metric));
  const list = el('dl', null, `pond-readings pond-${kind}-readings`);
  for (const row of rows) {
    const label = compactLabel(projection.entityLabels[row.entity_id]);
    list.append(el('dt', kind === 'weather' ? pondMetricLabel(row.metric,null,site) : label));
    const warning = kind === 'weather' && row.metric === site.cards.weather.warning_metric && projection.notifications.some(event =>
      site.cards.weather.warning_event_ids?.includes(event.id) && event.subjectIds.includes(row.entity_id));
    const value = el('dd', row.state === 'fault' || warning ? `⚠ ${pondReading(row, site)}` : pondReading(row, site));
    value.dataset.entityId = row.entity_id;
    if (row.state === 'fault' || warning) value.className = 'pond-critical';
    list.append(value);
  }
  content.append(list);
  if (!rows.length) content.append(el('p', '此時沒有已提供的樣本'));
  if (kind === 'weather') {
    const advisories = projection.notifications.filter(row => site.cards.weather.advisory_kinds?.includes(row.kind));
    for (const row of advisories) {
      const article = el('article', null, 'pond-advisory'); article.dataset.occurrenceId = row.id;
      article.append(el('strong', row.title), el('p', row.detail), el('small', `發生於 ${wallTime(row.sampledAt)}`)); content.append(article);
    }
    if (!advisories.length) content.append(el('p', '目前影格沒有公告', 'farm-caption'));
  }
}

export const createPondTelemetryPanel = (kind, options = {}) => observedPanel(`pond-${kind}`, (options.site || SITE).cards[kind].title,
  kind === 'water' ? drawWater : (content, projection, site, candidate, interaction) => drawReadings(content, projection, site, candidate, kind, interaction), options);
export const createPondTwinSelectionPanel = (options = {}) => observedPanel('selection', '選取設備 · 模擬',
  (content, projection, site, candidate, interaction) => {
    content.replaceChildren();
    delete content.dataset.entityId;
    const selected = twinInspection(projection, interaction.selectedId);
    if (!selected) { content.append(el('p', '點選場景設備或設備卡片中的設備名稱。')); return; }
    content.dataset.entityId = selected.twin.id;
    content.append(el('h3', compactLabel(selected.twin.label)));
    drawTwinFacts(content, selected, projection, site);
  }, options);
export const pondPanels = options => ({'pond-notifications': createPondStoryPanel(options), selection: createPondTwinSelectionPanel(options),
  ...Object.fromEntries(['water', 'scada', 'weather'].map(kind => [`pond-${kind}`, createPondTelemetryPanel(kind)]))});
