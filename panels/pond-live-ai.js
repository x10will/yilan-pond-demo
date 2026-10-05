// Optional narration only. This module never seeks the clock or changes the twin.
import {canonicalAdapter, el} from './farm-data.js';
import {pondProjection} from './pond.js';

export function liveEndpoint(search = globalThis.location?.search || '', local = globalThis.FARM_LIVE_AI) {
  const supplied = new URLSearchParams(search).get('ai') || local?.endpoint;
  if (!supplied) return null;
  try {
    const url = new URL(supplied);
    if (url.username || url.password || url.search || url.hash) return null;
    if (url.protocol !== 'https:' && !(url.protocol === 'http:'
      && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))) return null;
    return url.href.replace(/\/$/, '');
  } catch { return null; }
}

export function liveTwinContext(projection, selectedId, records = projection.twinCatalog || projection.twins || []) {
  const selected = records.find(row => row.id === selectedId) || null;
  const serves = selected?.relationships?.serves || [];
  const pondId = selected?.kind === 'pond' ? selected.id : serves.length === 1 ? serves[0]
    : !serves.length && selected?.anchor?.kind === 'Face' ? selected.anchor.id : null;
  const pond = records.find(row => row.id === pondId && row.kind === 'pond') || null;
  const fields = (record, names) => Object.fromEntries(names.filter(name => Object.hasOwn(record, name)).map(name => [name, record[name]]));
  const sample = row => fields(row, ['entity_id','metric','value','state','unit','sampled_at','elapsed_seconds','simulation_label']);
  const identity = row => row ? fields(row, ['id','kind','label','anchor','specs','relationships']) : null;
  const chapter = projection.story?.chapter;
  return structuredClone({simulation_label:'模擬', frame_index:projection.frameIndex,
    elapsed_seconds:projection.elapsedSeconds, selected_twin:identity(selected), pond:identity(pond),
    state:(projection.telemetry || []).filter(row => row.metric !== 'dissolved_oxygen').map(sample),
    do:(projection.telemetry || []).filter(row => row.metric === 'dissolved_oxygen').map(sample),
    events:(projection.notifications || []).map(row => fields(row, ['id','kind','title','detail','sampledAt','subjectIds'])),
    story:chapter ? {chapter:fields(chapter, ['id','title','caption','elapsed_seconds','scenario_time']),
      phase:projection.story.response?.phase} : null});
}

export function createLiveAI(container, {endpoint = liveEndpoint(), fetchResource = globalThis.fetch,
  getContext = () => null, timeoutMs = 65000} = {}) {
  if (!endpoint) return null;
  const root = el('section', null, 'pond-live-ai'); root.dataset.liveAi = 'experimental';
  const title = el('h3', '即時問答（實驗）');
  const notice = el('p', '模擬情境解說 · 非操作建議。即時服務不影響預先烘焙的故事。', 'farm-caption');
  const connectForm = el('form'), keyLabel = el('label', '存取金鑰（僅保留於本頁記憶體）');
  const keyInput = el('input'); keyInput.type = 'password'; keyInput.autocomplete = 'off';
  keyInput.setAttribute('aria-label', '即時問答存取金鑰'); keyInput.required = true;
  const connectButton = el('button', '連線'); connectButton.type = 'submit';
  keyLabel.append(keyInput); connectForm.append(keyLabel, connectButton);
  const conversation = el('div'); conversation.hidden = true;
  const selection = el('select'); selection.setAttribute('aria-label', '問答選取孿生');
  const all = el('option', '全部魚塭（模擬）'); all.value = ''; selection.append(all);
  const askForm = el('form'), question = el('textarea'); question.maxLength = 500; question.required = true;
  question.setAttribute('aria-label', '詢問目前模擬影格'); question.placeholder = '此影格有哪些模擬事件？';
  const askButton = el('button', '詢問目前影格'); askButton.type = 'submit';
  const disconnectButton = el('button', '中斷並清除金鑰'); disconnectButton.type = 'button';
  const answer = el('output', '', 'pond-live-answer'); answer.setAttribute('aria-live', 'polite');
  askForm.append(question, askButton); conversation.append(selection, askForm, answer, disconnectButton);
  const status = el('p', '輸入金鑰後連線；離線故事隨時可用。', 'farm-caption'); status.setAttribute('role', 'status');
  root.append(title, notice, connectForm, conversation, status); container.append(root);
  let accessKey = '', busy = false, version = 0;
  const request = async (path, body) => {
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchResource(`${endpoint}/${path}`, {method:body ? 'POST' : 'GET',
        headers:{Authorization:`Bearer ${accessKey}`, ...(body ? {'Content-Type':'application/json'} : {})},
        ...(body ? {body:JSON.stringify(body)} : {}), signal:controller.signal, cache:'no-store',
        credentials:'omit', redirect:'error', referrerPolicy:'no-referrer'});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } finally { clearTimeout(timeout); }
  };
  const unavailable = () => {
    accessKey = ''; keyInput.value = ''; root.hidden = true; conversation.hidden = true;
    // No error response body is displayed: upstream echoes must not expose secrets.
    status.textContent = '即時服務無法連線；預先烘焙的故事仍可使用。';
  };
  const connect = async key => {
    const current = ++version; accessKey = String(key || '').trim(); keyInput.value = '';
    if (!accessKey) return false;
    connectButton.disabled = true;
    try {
      const health = await request('health');
      if (current !== version) return false;
      if (health.ok !== true) throw new Error('unavailable');
      root.hidden = false; connectForm.hidden = true; conversation.hidden = false;
      status.textContent = '已連線 · 回答只解說送出的模擬影格。'; return true;
    } catch { if (current === version) unavailable(); return false; }
    finally { connectButton.disabled = false; }
  };
  const disconnect = () => { ++version; unavailable(); };
  const ask = async text => {
    if (!accessKey || busy || conversation.hidden) return null;
    const prompt = String(text).trim();
    if (!prompt || prompt.length > 500) { status.textContent = '問題限 1 至 500 字；請縮短後再詢問。'; return null; }
    const context = getContext(selection.value); if (!context) return null;
    const current = version; busy = true; askButton.disabled = true; status.textContent = '解說目前模擬影格中…';
    try {
      const result = await request('ask', {question:prompt,context});
      if (current !== version) return null;
      if (result.label !== '模擬' || typeof result.answer !== 'string') throw new Error('unlabelled answer');
      answer.textContent = `${result.answer}\n模擬 · ${result.model || '本地情境拒答'}${result.refused ? ' · 範圍外拒答' : ''}`;
      status.textContent = '回覆屬實驗解說，不會更改影格或故事。'; return result;
    } catch { if (current === version) unavailable(); return null; }
    finally { busy = false; askButton.disabled = false; }
  };
  connectForm.onsubmit = event => { event.preventDefault(); void connect(keyInput.value); };
  askForm.onsubmit = event => { event.preventDefault(); void ask(question.value); };
  disconnectButton.onclick = disconnect;
  return {root, connect, ask, disconnect, selection};
}

export async function installPondLiveAI(container, app) {
  // Discard accidental query keys immediately. This interface never reads them.
  const url = new URL(globalThis.location.href);
  if (url.searchParams.has('key')) {
    url.searchParams.delete('key'); globalThis.history.replaceState(null, '', url);
  }
  const endpoint = liveEndpoint(); if (!endpoint) return null;
  let candidate;
  try { candidate = await canonicalAdapter(); } catch { return null; }
  const snapshot = candidate.artifacts['static-snapshot.json'];
  const records = [...(snapshot.topology?.faces || []), ...(snapshot.assets?.assets || [])];
  const home = container.querySelector('.pond-notifications') || container;
  const style = el('link'); style.rel = 'stylesheet'; style.href = new URL('./pond-ai.css', import.meta.url).href;
  document.head.append(style);
  const view = createLiveAI(home, {endpoint,
    getContext:id => liveTwinContext(pondProjection(candidate, app.clock.time), id, records)});
  for (const row of records) {
    const option = el('option', row.label || row.id); option.value = row.id; view.selection.append(option);
  }
  return view;
}
