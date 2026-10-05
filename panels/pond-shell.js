// Same-origin host presentation for the declared pond UI. DT runtime files stay
// untouched. Only camera pose, HTML controls, labels and canonical event display
// change; DT still owns scene transforms and playback.
import {canonicalAdapter, el, SITE} from './farm-data.js';
import {compactLabel, playbackTime, pondKeyNumbers, pondNumber, pondPeriod, pondProjection, pondStatus, pondWorldState, wallTime, pondText} from './pond.js';
import {appendPondLoadFailure} from './pond-presenter.js';

const textEntry = target => target?.isContentEditable || ['TEXTAREA', 'SELECT'].includes(target?.tagName)
  || target?.tagName === 'INPUT' && !['button', 'checkbox', 'radio'].includes(target.type);

const shellLabels = {
  'zh-Hant': {reset:'重設示範', inspect:'檢視設備', guided:'返回導覽', previous:'上一章', next:'下一章',
    details:'詳情', camera:'重設視角', speed:'速度', play:'播放', pause:'暫停', replay:'重播',
    ended:'示範已結束；從頭重播', seek:'示範回放時間（零至十分鐘）', provenance:'模擬與出處',
    chapters:'章節列表', map:'返回地圖', destination:'選擇目前用途的詳細資料'},
  en: {reset:'Reset demo', inspect:'Inspect equipment', guided:'Return to tour', previous:'Previous chapter', next:'Next chapter',
    details:'Details', camera:'Reset camera', speed:'Speed', play:'Play', pause:'Pause', replay:'Replay',
    ended:'Demo ended; replay from start', seek:'Demo replay time (zero to ten minutes)', provenance:'Simulation and sources',
    chapters:'Chapters', map:'Return to map', destination:'Choose detail destination'},
};
export const pondShellLabel = (key, locale) => (shellLabels[locale] || shellLabels['zh-Hant'])[key];

// panel-core exposes selection/focus and its add-panel control, rather than an
// addPanel API. Use those existing routes to recreate a closed destination.
export function ensurePondPanel(container, app, id, selected = null) {
  if (!container.querySelector(`.grid-stack-item[data-panel="${id}"]`)) {
    if (id === 'selection') app.select(selected);
    else {
      const catalog = container.querySelector('select[data-catalogue]');
      if (!catalog || ![...catalog.options].some(option => option.value === id)) return false;
      const previous = catalog.value;
      catalog.value = id; container.querySelector('[data-add]')?.click(); catalog.value = previous;
    }
  }
  app.focus(id);
  return true;
}

export function bindPondTwinSelection(map, onSelected = () => {}) {
  return map.subscribe('select', ({entity} = {}) => {
    map.send('appCommand', {name: 'farm-pond-select-twin', payload: {id: entity?.id || null}});
    // Native picking reaches panel-core asynchronously, which focuses the
    // selection header. Restore inspection focus after that host-side update.
    onSelected(entity);
  });
}

export function bindPondPlaybackControls(controls, clock, onDone) {
  const range = controls?.querySelector('input[type=range]');
  if (!range) return;
  range.min = '0'; range.max = String(clock.duration); range.step = '1';
  range.setAttribute('aria-label', '示範回放時間（零至十分鐘）');
  range.oninput = () => {
    clock.pause();
    clock.seek(Math.max(0, Math.min(clock.duration, Number(range.value) || 0)));
  };
  range.addEventListener('pointerdown', () => { clock.pause(); range.focus?.({preventScroll:true}); });
  range.addEventListener('keydown', event => {
    const direction = {ArrowRight:1, ArrowUp:1, ArrowLeft:-1, ArrowDown:-1}[event.key];
    if (!direction) return;
    event.preventDefault(); event.stopPropagation();
    range.value = String(Math.max(0, Math.min(clock.duration, Number(range.value) + direction * 1000)));
    range.oninput();
  });
  for (const name of ['pointerup', 'pointercancel', 'change']) range.addEventListener(name, event => onDone(event.target));
}

// Pond-only presentation around panel-core's existing clock. Ended playback is
// paused once; replay seeks through the same canonical projection as a reset.
export function bindPondEndedState(controls, clock, onReplay = () => {}, locale = () => 'zh-Hant') {
  const play = controls?.querySelector('button');
  if (!play) return;
  const original = play.onclick;
  const render = () => {
    const ended = clock.time >= clock.duration;
    if (ended && !clock.paused) clock.pause();
    controls.dataset.ended = String(ended);
    play.textContent = pondShellLabel(ended ? 'replay' : clock.paused ? 'play' : 'pause', locale());
    play.dataset.label = ended ? 'replay' : clock.paused ? 'play' : 'pause';
    play.setAttribute('aria-label', ended ? pondShellLabel('ended', locale()) : play.textContent);
  };
  play.onclick = event => {
    if (clock.time >= clock.duration) { onReplay(); clock.seek(0); clock.play(); }
    else original?.call(play, event);
    render();
  };
  const unsubscribe = clock.subscribe(render);
  return () => { unsubscribe?.(); play.onclick = original; };
}

export function pausePondChapterBoundary(clock, chapters, previous, milliseconds, guided) {
  if (!guided || clock.paused || milliseconds <= previous) return null;
  const boundary = chapters.map(row => row.elapsed_seconds * 1000)
    .filter(time => Number.isFinite(time) && time > previous && time <= milliseconds)
    .sort((a, b) => a - b)[0];
  if (boundary === undefined) return null;
  clock.pause(); clock.seek(boundary);
  return boundary;
}

// Keep the presenter's current run and replay position in the existing URL.
// Playback ticks are throttled by real time; pause, seeks, speed and F5 flush
// immediately. app.js restores this position paused on the next cold boot.
export function bindPondReplayURL(clock, {location = globalThis.location, history = globalThis.history,
  controls, events = globalThis, now = () => performance.now()} = {}) {
  if (!location?.href || !history?.replaceState) return;
  let savedAt = -Infinity, savedPosition;
  const save = (force = false) => {
    const timestamp = now();
    const position = `${clock.time}:${clock.rate}`;
    if (position === savedPosition || !force && timestamp - savedAt < 1000) return;
    const url = new URL(location.href);
    url.searchParams.set('t', String(clock.time));
    url.searchParams.set('speed', String(clock.rate));
    history.replaceState(history.state, '', url);
    savedAt = timestamp; savedPosition = position;
  };
  const pause = clock.pause;
  clock.pause = function (...args) { const result = pause.apply(this, args); save(true); return result; };
  clock.subscribe(() => save(clock.paused));
  controls?.addEventListener('change', () => save(true));
  events?.addEventListener?.('keydown', event => {
    if (event.key === 'F5' || (event.ctrlKey || event.metaKey) && event.key?.toLowerCase() === 'r') save(true);
  }, true);
  events?.addEventListener?.('pagehide', () => save(true));
}

export function focusPondViewer(frame, mode, target) {
  if (mode !== 'inspection' || textEntry(target)) return false;
  const canvas = frame?.contentDocument?.querySelector('canvas');
  if (!canvas) return false;
  canvas.tabIndex = 0;
  frame.contentWindow?.focus(); canvas.focus({preventScroll: true});
  return true;
}

// Camera presentation only. DT's current WASD uses metres per render frame;
// consume native keys here and use its documented metre-translation hook.
// viewChanged supplies heading in degrees (sampled by DT every 250 ms).
export function bindPondInspectionMovement(frame, mode, heading) {
  const doc = frame.contentDocument, win = frame.contentWindow, held = new Set();
  let animation, previous;
  const stop = () => { held.clear(); if (animation != null) win.cancelAnimationFrame?.(animation); animation = null; };
  const tick = now => {
    animation = null;
    if (mode() !== 'inspection' || !held.size || doc.hidden) { stop(); return; }
    const seconds = Math.max(0, Math.min(.1, (now - previous) / 1000)); previous = now;
    const angle = heading() * Math.PI / 180;
    const forward = Number(held.has('w')) - Number(held.has('s'));
    const right = Number(held.has('d')) - Number(held.has('a'));
    const up = Number(held.has('e')) - Number(held.has('q'));
    const length = Math.hypot(forward, right, up);
    if (length) {
      const distance = 5 * seconds / length;
      win.__dtEmbed?.translateCameraTarget?.(
        (forward * Math.sin(angle) + right * Math.cos(angle)) * distance,
        (forward * Math.cos(angle) - right * Math.sin(angle)) * distance, up * distance);
    }
    animation = win.requestAnimationFrame(tick);
  };
  doc.addEventListener('keydown', event => {
    const key = event.key.toLowerCase();
    if (mode() !== 'inspection' || textEntry(event.target) || !/^[wasdqe]$/.test(key)) return;
    event.preventDefault(); event.stopImmediatePropagation(); held.add(key);
    if (animation == null) { previous = win.performance.now(); animation = win.requestAnimationFrame(tick); }
  }, true);
  doc.addEventListener('keyup', event => {
    const key = event.key.toLowerCase();
    if (!held.has(key)) return;
    event.preventDefault(); event.stopImmediatePropagation(); held.delete(key);
    if (!held.size) stop();
  }, true);
  win.addEventListener('blur', stop);
  doc.addEventListener('visibilitychange', stop);
  return stop;
}

// Let the viewer receive the initiating down and every subsequent move. Switch
// before its movement handler runs, without replaying synthetic input or changing
// canonical time. A tap/click alone keeps the current tour chapter.
export function bindPondCameraInput(frame, mode, inspect = () => {}) {
  const doc = frame.contentDocument;
  if (!doc) return;
  const pointers = new Map();
  doc.addEventListener('pointerdown', event => {
    if (event.target?.tagName !== 'CANVAS') return;
    pointers.set(event.pointerId, {x:event.clientX, y:event.clientY});
    if (mode() === 'guided' && pointers.size > 1) inspect();
  }, true);
  doc.addEventListener('pointermove', event => {
    const start = pointers.get(event.pointerId);
    if (mode() === 'guided' && start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 3) inspect();
  }, true);
  for (const name of ['pointerup', 'pointercancel']) doc.addEventListener(name, event => pointers.delete(event.pointerId), true);
  frame.contentWindow?.addEventListener?.('blur', () => pointers.clear());
  doc.addEventListener('wheel', event => {
    if (mode() === 'guided' && event.target?.tagName === 'CANVAS') inspect();
  }, {capture:true, passive:true});
  doc.addEventListener('dblclick', event => {
    if (mode() === 'guided' && event.target?.tagName === 'CANVAS') inspect();
  }, true);
  doc.addEventListener('keydown', event => {
    if (mode() === 'guided' && !textEntry(event.target)
      && /^(?:[wasdqe]|Arrow\w+|Control|Meta|[1-9])$/i.test(event.key)) {
      event.stopImmediatePropagation(); event.preventDefault();
    }
  }, true);
  doc.addEventListener('pointerup', event => focusPondViewer(frame, mode(), event.target));
  doc.addEventListener('click', event => focusPondViewer(frame, mode(), event.target));
}

// The pond's flowing columns are not GridStack coordinates. Reuse its handle,
// but resize the actual displayed card in pixels, then reflow the host columns.
export function bindPondPanelResize(item, grid, {isPhone, onDone, onSize}) {
  const card = item.querySelector('.panel-card');
  let handle = item.querySelector('.ui-resizable-se');
  if (!card) return;
  if (!handle) { handle = el('div', null, 'ui-resizable-handle ui-resizable-se'); item.append(handle); }
  handle.tabIndex = 0; handle.setAttribute('role', 'button');
  handle.setAttribute('aria-label', '調整面板大小；方向鍵調整寬高');
  let drag;
  const size = (width, height) => {
    const phone = isPhone(), map = item.dataset.panel === 'map';
    const viewport = globalThis.innerHeight || 844;
    if (phone) {
      const deck = map ? drag.deckHeight - (height - drag.height) : height;
      const deckHeight = Math.round(Math.max(150, Math.min(viewport * .55, deck)));
      grid.closest?.('.panel-core-app')?.style.setProperty('--deck-h', `${deckHeight}px`);
    } else {
      item.style.setProperty('--pond-panel-width', `${Math.round(Math.max(280, Math.min(grid.getBoundingClientRect().width, width)))}px`);
      item.style.setProperty('--pond-panel-height', `${Math.round(Math.max(map ? 340 : 170, height))}px`);
    }
    onSize();
  };
  handle.addEventListener('mousedown', event => { event.stopImmediatePropagation(); event.preventDefault(); }, true);
  handle.addEventListener('pointerdown', event => {
    if (event.button > 0 || item.classList.contains('is-collapsed') || item.classList.contains('is-maximized')) return;
    const rect = card.getBoundingClientRect();
    drag = {id: event.pointerId, x: event.clientX, y: event.clientY, width: rect.width, height: rect.height,
      deckHeight: grid.getBoundingClientRect().height};
    handle.setPointerCapture(event.pointerId); item.classList.toggle('pond-resizing', true);
    for (const frame of grid.querySelectorAll?.('iframe') || []) frame.style.pointerEvents = 'none';
    event.stopImmediatePropagation(); event.preventDefault();
  }, true);
  handle.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    size(drag.width + event.clientX - drag.x, drag.height + event.clientY - drag.y);
    event.preventDefault();
  });
  const finish = event => {
    if (!drag || event.pointerId !== drag.id) return;
    const id = drag.id; drag = null;
    if (handle.hasPointerCapture(id)) handle.releasePointerCapture(id);
    item.classList.toggle('pond-resizing', false);
    for (const frame of grid.querySelectorAll?.('iframe') || []) frame.style.pointerEvents = '';
    onDone(event.target);
  };
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) handle.addEventListener(name, finish);
  handle.addEventListener('keydown', event => {
    if (!/^Arrow/.test(event.key)) return;
    const rect = card.getBoundingClientRect();
    drag = {width: rect.width, height: rect.height, deckHeight: grid.getBoundingClientRect().height};
    size(rect.width + (event.key === 'ArrowRight' ? 24 : event.key === 'ArrowLeft' ? -24 : 0),
      rect.height + (event.key === 'ArrowDown' ? 24 : event.key === 'ArrowUp' ? -24 : 0));
    drag = null; event.preventDefault(); event.stopPropagation();
  });
}

export function installPondShell(container, app) {
  let cameraMode = 'guided';
  let selectedEntity = null;
  let cameraHeading = 0;
  const locale = () => document.documentElement.lang;
  const label = key => pondShellLabel(key, locale());
  const isPhone = () => globalThis.matchMedia?.('(max-width: 767px)').matches;
  const playback = container.querySelector('.replay-controls');
  const showPhonePanel = id => {
    if (id && !ensurePondPanel(container, app, id, selectedEntity)) return;
    container.dataset.pondPhonePanel = id || '';
    for (const item of container.querySelectorAll('.panel-grid>.grid-stack-item'))
      item.classList.toggle('pond-phone-active', item.dataset.panel === id);
    for (const button of container.querySelectorAll('.pond-phone-details-toggle'))
      button.setAttribute('aria-expanded', String(!!id));
    for (const picker of container.querySelectorAll('.pond-phone-panel-picker')) {
      picker.hidden = !id;
      const select = picker.querySelector('select'); if (select && id) select.value = id;
    }
  };
  const restoreFocus = target => {
    if (cameraMode !== 'inspection' || textEntry(target)) return;
    requestAnimationFrame(() => {
      if (textEntry(document.activeElement)) return;
      focusPondViewer(container.querySelector('iframe.map-frame'), cameraMode, target);
    });
  };
  bindPondTwinSelection(app.map, entity => {
    selectedEntity = entity || null;
    if (entity?.id) {
      if (isPhone()) showPhonePanel('selection');
      else ensurePondPanel(container, app, 'selection', entity);
    }
    restoreFocus();
  });
  app.map.subscribe('viewChanged', view => { if (Number.isFinite(view?.heading)) cameraHeading = view.heading; });
  bindPondPlaybackControls(playback, app.clock, restoreFocus);
  bindPondEndedState(playback, app.clock, () => {
    cameraMode = 'guided'; showPhonePanel(null);
    for (const frame of container.querySelectorAll('iframe.map-frame')) {
      const entry = frames.get(frame); if (entry) entry.cameraSignature = null;
    }
  }, locale);
  container.addEventListener('click', event => {
    if (event.target.closest?.('.farm-demo-reset,[data-label=reset]')) {
      if (event.target.closest?.('[data-label=reset]')) selectedEntity = null;
      cameraMode = 'guided';
      showPhonePanel(null);
      for (const frame of container.querySelectorAll('iframe.map-frame')) {
        const entry = frames.get(frame); if (entry) entry.cameraSignature = null;
      }
    }
    if (event.detail !== 0) restoreFocus(event.target);
  }, true);
  const topbar = container.querySelector('.topbar');
  const banner = el('div', '模擬設備、水質、天氣與 AI 建議 · 十分鐘原型，非即時監測或操作建議。', 'pond-simulation-banner');
  banner.setAttribute('role', 'note'); topbar?.after(banner);
  // Keep panel-core's direct children and controls, but let the two desktop
  // columns flow independently. Only rendered card heights determine placement.
  const grid = container.querySelector('.panel-grid');
  const observed = new Set();
  const resized = new WeakSet();
  let layoutRequest;
  const flow = () => {
    layoutRequest = null;
    if (!grid || globalThis.matchMedia?.('(max-width: 767px)').matches) return;
    const next = [1, 1];
    for (const item of grid.children) {
      const card = item.querySelector('.panel-card'); if (!card) continue;
      const column = ['map', 'pond-water', 'pond-weather'].includes(item.dataset.panel) ? 0 : 1;
      const height = item.classList.contains('is-collapsed') ? 56 : Math.ceil(card.getBoundingClientRect().height);
      item.style.gridColumn = String(column + 1);
      item.style.gridRow = `${next[column]} / span ${height + 16}`;
      next[column] += height + 16;
    }
  };
  const requestFlow = () => { if (!layoutRequest) layoutRequest = requestAnimationFrame(flow); };
  const cardSizes = new ResizeObserver(requestFlow);
  const watchCards = () => {
    const cards = new Set(grid?.querySelectorAll('.panel-card') || []);
    for (const card of observed) {
      if (!cards.has(card)) { cardSizes.unobserve(card); observed.delete(card); }
    }
    for (const card of cards) {
      if (!observed.has(card)) { observed.add(card); cardSizes.observe(card); }
    }
    for (const item of grid?.children || []) {
      if (!resized.has(item)) {
        resized.add(item);
        bindPondPanelResize(item, grid, {
          isPhone: () => globalThis.matchMedia?.('(max-width: 767px)').matches,
          onSize: requestFlow, onDone: restoreFocus,
        });
      }
    }
    requestFlow();
  };
  watchCards();
  if (grid) new MutationObserver(watchCards).observe(grid, {childList: true, subtree: true});
  const frames = new WeakMap();
  const entries = new Set();
  let candidate, latest;
  const toast = el('div', null, 'pond-camera-toast'); toast.hidden = true;
  toast.setAttribute('role', 'status'); toast.setAttribute('aria-live', 'polite'); container.append(toast);
  let toastTimer;
  const switchCamera = (next, announce = false) => {
    if (cameraMode === next) return;
    app.clock.pause(); cameraMode = next;
    if (next === 'guided') {
      for (const entry of entries) entry.cameraSignature = null;
      toast.hidden = true; clearTimeout(toastTimer);
    }
    update(app.clock.time);
    if (next === 'guided') app.clock.play();
    if (announce) {
      toast.textContent = locale() === 'en' ? 'Free inspection · Press “Return to tour” to continue the story'
        : '已切換為自由檢視 · 按『返回導覽』繼續故事';
      toast.hidden = false; clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { toast.hidden = true; }, 5500);
    }
  };
  const seek = app.clock.seek.bind(app.clock);
  app.clock.seek = milliseconds => {
    // Stop before panel-core transports time, so the viewer never receives a
    // transient sample after the chapter boundary or echoes an overshoot back.
    if (pausePondChapterBoundary(app.clock, latest?.story?.chapters || [], app.clock.time, milliseconds,
      cameraMode === 'guided') !== null) return;
    seek(milliseconds);
  };
  bindPondReplayURL(app.clock, {controls: playback});
  const selectChapter = chapter => {
    if (!Number.isFinite(chapter?.elapsed_seconds)) return;
    app.clock.pause();
    app.clock.seek(chapter.elapsed_seconds * 1000);
  };
  const renderStoryNav = (entry, frame, story) => {
    if (!story?.chapters?.length || !story.chapter) {
      if (entry.storyNav) entry.storyNav.hidden = true;
      return;
    }
    // Authored chapter poses resume when the visitor returns to the tour.
    frame.tabIndex = 0;
    if (!entry.storyNav) {
      const nav = el('section', null, 'pond-guided-story'); nav.setAttribute('aria-label', '模擬情境章節');
      const heading = el('div', null, 'pond-guided-heading');
      const sequence = el('span', null, 'pond-guided-sequence');
      const time = el('output', null, 'pond-guided-time'); heading.append(sequence, time);
      const title = el('h2', null, 'pond-guided-title');
      const caption = el('p', null, 'pond-guided-caption');
      const languageNote = el('small', 'Story text in Traditional Chinese', 'pond-story-language');
      const numbers = el('dl', null, 'pond-key-numbers'); numbers.setAttribute('aria-label', '目前章節重點數字（模擬）');
      const controls = el('div', null, 'pond-camera-controls');
      const mode = el('button', '檢視設備', 'pond-camera-mode'); mode.type = 'button';
      const cameraReset = el('button', null, 'pond-camera-reset'); cameraReset.type = 'button';
      cameraReset.onclick = () => {
        for (const current of entries) { current.cameraSignature = null; applyCamera(current, true); }
        restoreFocus(cameraReset);
      };
      const notice = el('span', null, 'pond-camera-notice'); notice.setAttribute('role', 'status');
      const provenance = el('button', '模擬與出處', 'pond-provenance-entry'); provenance.type = 'button';
      provenance.onclick = () => isPhone() ? showPhonePanel('pond-provenance') : app.focus('pond-provenance');
      const details = el('button', '詳情', 'pond-phone-details-toggle'); details.type = 'button';
      details.setAttribute('aria-expanded', 'false');
      details.onclick = () => showPhonePanel(container.dataset.pondPhonePanel ? null : 'pond-notifications');
      controls.append(mode, cameraReset, notice, provenance, details);
      mode.onclick = () => {
        switchCamera(cameraMode === 'guided' ? 'inspection' : 'guided'); restoreFocus(mode);
      };
      const stepper = el('div', null, 'pond-guided-stepper');
      const previous = el('button', '上一章', 'pond-guided-previous'); previous.type = 'button';
      const next = el('button', '下一章', 'pond-guided-next'); next.type = 'button';
      const chapters = el('details', null, 'pond-guided-list');
      const summary = el('summary', '章節列表'); chapters.append(summary);
      const chapterItems = el('div'); chapters.append(chapterItems);
      const picker = el('div', null, 'pond-phone-panel-picker'); picker.hidden = true;
      const panelSelect = el('select'); panelSelect.setAttribute('aria-label', '選擇目前用途的詳細資料');
      for (const [id, label] of [['pond-notifications','目前事件'],['pond-water','水質'],['pond-scada','設備'],
        ['pond-weather','天氣'],['pond-provenance','模擬與出處'],['selection','選取設備']]) {
        const option = el('option', label); option.value = id; panelSelect.append(option);
      }
      panelSelect.onchange = () => showPhonePanel(panelSelect.value);
      const close = el('button', '返回地圖'); close.type = 'button'; close.onclick = () => showPhonePanel(null);
      picker.append(panelSelect, close);
      stepper.append(previous, next); nav.append(heading, title, caption, languageNote, numbers, controls, stepper, chapters, picker);
      frame.parentElement.append(nav);
      entry.storyResize = new ResizeObserver(([size]) => {
        const height = `${Math.ceil(size.target.getBoundingClientRect().height)}px`;
        frame.parentElement.style.setProperty('--pond-story-height', height);
        container.style.setProperty('--pond-phone-sheet-height', height);
      });
      entry.storyResize.observe(nav);
      Object.assign(entry, {storyNav:nav, storySequence:sequence, storyTime:time, storyTitle:title,
        storyCaption:caption, languageNote, storyPrevious:previous, storyNext:next, storyList:chapters,
        storyItems:chapterItems, storyChapters:null, storyHome:frame.parentElement, storyNumbers:numbers,
        cameraMode:mode, cameraReset, cameraNotice:notice, provenance, details, summary, panelSelect, close});
    }
    if (isPhone()) {
      // Keep the sheet inside core's isolated stacking root so open panel
      // menus can rise above it. A sibling outside that root always wins.
      const home = container.querySelector('.panel-core-app') || container;
      if (entry.storyNav.parentElement !== home) home.append(entry.storyNav);
      if (playback?.parentElement !== entry.storyNav) entry.storyNav.append(playback);
    } else {
      if (entry.storyNav.parentElement !== entry.storyHome) entry.storyHome.append(entry.storyNav);
      const home = frame.closest('.panel-card');
      if (playback && home && playback.parentElement !== home) home.insertBefore(playback, home.querySelector('.panel-body'));
    }
    const chapters = story.chapters;
    const signature = JSON.stringify(chapters.map(({id, title, caption, elapsed_seconds, scenario_time}) =>
      [id, title, caption, elapsed_seconds, scenario_time]));
    if (entry.storyChapters !== signature) {
      entry.storyChapters = signature;
      entry.storyItems.replaceChildren();
      for (const chapter of chapters) {
        const time = wallTime(chapter.scenario_time);
        const title = chapter.title.startsWith(time) ? chapter.title.slice(time.length).trim().replace(/^·\s*/, '') : chapter.title;
        const button = el('button', `${time} · ${title}`, 'pond-guided-chapter');
        button.type = 'button'; button.dataset.chapterId = chapter.id;
        button.dataset.elapsedSeconds = String(chapter.elapsed_seconds);
        button.onclick = () => { selectChapter(chapter); entry.storyList.open = false; }; entry.storyItems.append(button);
      }
    }
    const index = chapters.findIndex(row => row.id === story.chapter.id);
    entry.storyNav.hidden = false; entry.storyNav.dataset.chapterId = story.chapter.id;
    const english = locale() === 'en';
    entry.storySequence.textContent = english ? `Chapter ${index + 1} / ${chapters.length}` : `第 ${index + 1} / ${chapters.length} 章`;
    entry.storyTime.textContent = app.clock.time >= app.clock.duration ? (english ? 'Demo ended · 10:00' : '示範已結束 · 10:00')
      : `${wallTime(story.chapter.scenario_time)} · ${playbackTime(app.clock.time)} · ${english ? 'Simulated' : '模擬'}`;
    entry.languageNote.hidden = !english;
    entry.storyTitle.textContent = story.chapter.title;
    entry.storyCaption.textContent = story.chapter.caption;
    const numbers = pondKeyNumbers(latest);
    const numberSignature = JSON.stringify([numbers, locale()]);
    if (entry.numberSignature !== numberSignature) {
      entry.numberSignature = numberSignature;
      entry.storyNumbers.replaceChildren(...numbers.map(({label, value}) => {
        const item = el('div'); item.append(el('dt', pondText(label, locale())), el('dd', pondText(value, locale()))); return item;
      }));
    }
    entry.storyNav.dataset.cameraMode = cameraMode;
    entry.cameraMode.textContent = label(cameraMode === 'guided' ? 'inspect' : 'guided');
    entry.cameraReset.textContent = label('camera'); entry.cameraReset.hidden = cameraMode !== 'inspection';
    entry.storyPrevious.textContent = label('previous'); entry.storyNext.textContent = label('next');
    entry.details.textContent = label('details'); entry.provenance.textContent = label('provenance');
    entry.summary.textContent = label('chapters'); entry.close.textContent = label('map');
    entry.panelSelect.setAttribute('aria-label', label('destination'));
    entry.cameraMode.setAttribute('aria-pressed', String(cameraMode === 'inspection'));
    entry.cameraNotice.textContent = cameraMode === 'guided'
      ? (english ? 'Drag or zoom to inspect · Select equipment for details' : '拖曳或縮放即可自由檢視 · 點設備看詳情')
      : (english ? 'Inspection camera · Move with WASD / drag · Select equipment for details' : '檢視鏡頭 · WASD／拖曳可移動 · 點設備看詳情');
    entry.storyPrevious.disabled = index <= 0;
    entry.storyNext.disabled = index < 0 || index >= chapters.length - 1;
    entry.storyPrevious.onclick = () => selectChapter(chapters[Math.max(0, index - 1)]);
    entry.storyNext.onclick = () => selectChapter(chapters[Math.min(chapters.length - 1, index + 1)]);
    for (const button of entry.storyItems.querySelectorAll('button')) {
      button.setAttribute('aria-current', button.dataset.chapterId === story.chapter.id ? 'step' : 'false');
    }
  };
  const applyCamera = (entry, force = false) => {
    if (cameraMode === 'inspection' && !force) return;
    const viewer = entry.frame.contentWindow?.__dtEmbed;
    if (!viewer?.ready || typeof viewer.setCameraPose !== 'function') return;
    if (entry.viewer !== viewer) { entry.viewer = viewer; entry.cameraSignature = null; }
    const phone = globalThis.matchMedia?.('(max-width: 767px)').matches;
    const pose = latest?.story?.camera?.[phone ? 'phone' : 'desktop'];
    const fallback = SITE.presentation.viewer;
    const selected = pose || (fallback && (phone ? fallback.portrait : fallback.overview));
    if (!selected) return;
    const signature = JSON.stringify(selected);
    if (signature === entry.cameraSignature) return;
    entry.cameraSignature = signature;
    cameraHeading = Math.atan2(selected.target[0] - selected.position[0], selected.target[1] - selected.position[1]) * 180 / Math.PI;
    viewer.setCameraPose(selected.position, selected.target);
  };
  const update = milliseconds => {
    if (!candidate) return;
    latest = pondProjection(candidate, milliseconds);
    const timestamp = latest.telemetry[0]?.sampled_at;
    const output = container.querySelector('.replay-controls output');
    const period = pondPeriod(latest);
    const english = locale() === 'en';
    const periodText = english ? ({夜間:'Night',清晨:'Dawn',日間:'Day',傍晚:'Dusk'}[period] || '') : period;
    if (output) output.textContent = `${wallTime(timestamp)}${periodText ? ` ${periodText}` : ''} · ${english ? 'Replay' : '回放'} ${playbackTime(milliseconds)}`;
    if (SITE.presentation?.world) app.map.send('appCommand', {
      name: 'farm-pond-world-state', payload: pondWorldState(latest),
    });
    app.map.send('appCommand', {name: 'farm-pond-label-status', payload: latest.telemetry
      .filter(row => row.metric === 'dissolved_oxygen').map(row => ({id: row.entity_id,
        label: compactLabel(latest.entityLabels[row.entity_id]),
        ...pondStatus(latest, row.entity_id)}))});
    for (const frame of container.querySelectorAll('iframe.map-frame')) {
      const entry = frames.get(frame); if (!entry) continue;
      renderStoryNav(entry, frame, latest.story);
      applyCamera(entry);
      entry.status.replaceChildren(el('span', '模擬', 'pond-badge'));
      const ponds = [...new Set(latest.telemetry.filter(row => row.metric === 'dissolved_oxygen').map(row => row.entity_id))];
      for (const id of ponds) {
        const sample = latest.telemetry.find(row => row.entity_id === id && row.metric === 'dissolved_oxygen');
        const {fault, risk, degraded, status} = pondStatus(latest, id);
        const label = compactLabel(latest.entityLabels[id]);
        const badge = el('span', degraded ? `${label} · ${status} · DO ${pondNumber(sample)}`
          : `${fault || risk ? '⚠ ' : ''}${label} · DO ${pondNumber(sample)}${risk ? ' 警示' : fault ? ' 設備故障' : ''}`, 'pond-map-badge');
        badge.dataset.entityId = id;
        if (!degraded && (fault || risk)) badge.classList.add('pond-critical');
        entry.status.append(badge);
      }
    }
  };
  const attach = frame => {
    if (frames.has(frame)) return;
    const status = el('div', null, 'pond-map-status'); status.setAttribute('aria-label', '壯圍三座魚塭狀態（模擬）');
    frame.parentElement.append(status);
    const entry = {frame, status, viewer: null}; frames.set(frame, entry); entries.add(entry);
    const decorate = () => {
      const doc = frame.contentDocument;
      if (!doc?.head) return;
      if (entry.inputDocument !== doc) {
        entry.inputDocument = doc; bindPondCameraInput(frame, () => cameraMode, () => switchCamera('inspection', true));
        entry.stopMovement?.();
        entry.stopMovement = bindPondInspectionMovement(frame, () => cameraMode, () => cameraHeading);
        doc.addEventListener('click', event => {
          if (!event.target.closest?.('#btn-reset')) return;
          cameraMode = 'guided'; entry.cameraSignature = null; showPhonePanel(null);
        }, true);
      }
      doc.documentElement.dataset.pondUi = 'true';
      if (!doc.getElementById('pond-host-style')) {
        const style = doc.createElement('style'); style.id = 'pond-host-style';
        style.textContent = `
          html.dt-embed[data-pond-ui] #dt-embed-navigation{max-width:calc(100% - 72px)!important;gap:5px!important;right:8px!important;top:8px!important;flex-wrap:nowrap!important}
          html.dt-embed[data-pond-ui] #dt-embed-navigation #viewpoints,html.dt-embed[data-pond-ui] #dt-embed-navigation #btn-reset-view,html.dt-embed[data-pond-ui] #dt-embed-navigation #mobile-compass,html.dt-embed[data-pond-ui] #dt-embed-navigation #btn-zoom-in,html.dt-embed[data-pond-ui] #dt-embed-navigation #btn-zoom-out{display:none!important}
          .pond-footprint-labels{position:fixed;inset:0;pointer-events:none;z-index:4}
          .pond-footprint-label{position:absolute;transform:translate(-50%,-50%);white-space:nowrap;padding:5px 9px;border-radius:7px;border:1px solid #8eabb6;background:#163441ed;color:#f1fafc;font:600 13px system-ui;box-shadow:0 2px 6px #0003}
          .pond-label-warning{background:#743b28f2;color:#ffe0cd;border:1px solid #ef9b72}
          .pond-label-degraded{background:#594424f2;color:#ffe6b2;border:1px solid #c9a365}
          .pond-label-warning:not(.pond-equipment-warning){transform:translate(-50%,-100%);margin-top:-5px}
          .pond-equipment-warning{transform:translate(-50%,0);padding:3px 6px;font-size:11px;border-radius:12px;z-index:1}
          .pond-label-equipment{display:block;font-size:11px;text-align:center;line-height:1.4}
          .pond-label-equipment:empty{display:none}
          @media(max-width:767px){.pond-footprint-label{font-size:14px;padding:4px 6px}.pond-label-status,.pond-label-equipment{font-size:14px}.pond-equipment-warning{transform:translate(-100%,0)}}
          @media(max-width:767px){#dt-embed-navigation{display:flex!important;flex-wrap:nowrap!important;left:auto!important}}
        `;
        doc.head.append(style);
      }
      const reset = doc.querySelector('#btn-reset-view');
      if (reset) reset.setAttribute('aria-hidden', 'true');
      const demoReset = doc.querySelector('#btn-reset');
      if (demoReset) demoReset.textContent = label('reset');
      // Translate text before and throughout asset loading, not just after ready.
      const translate = () => {
        const loading = doc.querySelector('#loading'); if (!loading) return;
        const walker = doc.createTreeWalker(loading, 4);
        const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
        for (const node of nodes) {
          if (/Loading|Creating|Terrain loaded|^Ready$/.test(node.textContent)) node.textContent =
            /terrain/i.test(node.textContent) ? '正在載入地形…' : /^Ready$/.test(node.textContent) ? '載入完成' : '正在載入宜蘭魚塭（模擬）…';
        }
      };
      translate();
      if (!entry.loadingObserver && doc.getElementById('loading')) {
        entry.loadingObserver = new MutationObserver(translate);
        entry.loadingObserver.observe(doc.getElementById('loading'), {childList: true, subtree: true, characterData: true});
      }
      const viewer = frame.contentWindow?.__dtEmbed;
      if (viewer?.ready && viewer !== entry.viewer && typeof viewer.setCameraPose === 'function') {
        entry.viewer = null;
        applyCamera(entry);
      }
    };
    frame.addEventListener('load', () => { entry.loadingObserver?.disconnect(); entry.loadingObserver = null; decorate(); });
    entry.unsubscribeReady = app.map.subscribe('ready', decorate);
    decorate();
    update(app.clock.time);
  };
  const scan = () => {
    const current = new Set(container.querySelectorAll('iframe.map-frame'));
    for (const entry of entries) {
      if (current.has(entry.frame)) continue;
      entry.storyResize?.disconnect(); entry.loadingObserver?.disconnect(); entry.unsubscribeReady?.();
      entry.stopMovement?.();
      entry.storyNav?.remove(); entries.delete(entry);
    }
    for (const frame of current) attach(frame);
  };
  const localize = () => {
    for (const reset of container.querySelectorAll('.farm-demo-reset')) reset.textContent = label('reset');
    playback?.querySelector('input[type=range]')?.setAttribute('aria-label', label('seek'));
    const speed = playback?.querySelector('select');
    if (speed) {
      speed.setAttribute('aria-label', label('speed'));
      for (const option of speed.options) option.textContent = `${label('speed')} ${option.value}×`;
    }
    const play = playback?.querySelector('button');
    if (play) {
      play.textContent = label(app.clock.time >= app.clock.duration ? 'replay' : app.clock.paused ? 'play' : 'pause');
      play.setAttribute('aria-label', app.clock.time >= app.clock.duration ? label('ended') : play.textContent);
    }
    for (const entry of entries) {
      const reset = entry.frame.contentDocument?.querySelector('#btn-reset');
      if (reset) reset.textContent = label('reset');
    }
    if (latest) update(app.clock.time);
  };
  new MutationObserver(localize).observe(document.documentElement, {attributes:true, attributeFilter:['lang']});
  globalThis.addEventListener('resize', () => { requestFlow(); if (latest) update(app.clock.time); });
  scan(); new MutationObserver(scan).observe(container, {childList: true, subtree: true});
  localize();
  app.map.subscribe('appEvent', ({name} = {}) => {
    if (name === 'farm-pond-labels-ready' || name === 'farm-pond-world-ready') update(app.clock.time);
  });
  app.map.subscribe('time', ({t} = {}) => { if (Number.isFinite(t)) update(t); });
  canonicalAdapter().then(value => { candidate = value; update(app.clock.time); }).catch(error => {
    const home = container.querySelector('.farm-map-holder');
    if (home && !home.querySelector('.pond-shell-load-failure')) {
      const message = appendPondLoadFailure(home, error);
      message.classList.add('pond-shell-load-failure');
    }
  });
}
