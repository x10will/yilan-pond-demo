// Same-origin host presentation for the declared pond UI. DT runtime files stay
// untouched. Only camera pose, HTML controls, labels and canonical event display
// change; DT still owns scene transforms and playback.
import {canonicalAdapter, el, SITE} from './farm-data.js';
import {compactLabel, localizePondPanelOptions, playbackTime, pondKeyNumbers, pondMapBadgeText, pondPeriod, pondProjection, pondStatus, pondWorldState, wallTime, pondText} from './pond.js';
import {appendPondLoadFailure} from './pond-presenter.js';

const textEntry = target => target?.isContentEditable || ['TEXTAREA', 'SELECT'].includes(target?.tagName)
  || target?.tagName === 'INPUT' && !['button', 'checkbox', 'radio'].includes(target.type);

const shellLabels = {
  'zh-Hant': {reset:'重設示範', inspect:'檢視設備', guided:'返回導覽', previous:'上一章', next:'下一章',
    details:'詳情', camera:'重設視角', speed:'速度', play:'播放', pause:'暫停', replay:'重播',
    ended:'示範已結束；從頭重播', seek:'示範回放時間（零至十分鐘）', provenance:'模擬與出處',
    chapters:'章節列表', map:'返回地圖', destination:'選擇目前用途的詳細資料',
    story:'模擬情境章節', resize:'調整面板大小；方向鍵調整寬高'},
  en: {reset:'Reset demo', inspect:'Inspect equipment', guided:'Return to tour', previous:'Previous chapter', next:'Next chapter',
    details:'Details', camera:'Reset camera', speed:'Speed', play:'Play', pause:'Pause', replay:'Replay',
    ended:'Demo ended; replay from start', seek:'Demo replay time (zero to ten minutes)', provenance:'Simulation and sources',
    chapters:'Chapters', map:'Return to map', destination:'Choose detail destination',
    story:'Simulated scenario chapters', resize:'Resize panel; use arrow keys to adjust width and height'},
};
export const pondShellLabel = (key, locale) => (shellLabels[locale] || shellLabels['zh-Hant'])[key];

export function applyPondCameraPose(entry, viewer, pose, fov) {
  const signature = JSON.stringify({pose, fov});
  if (signature === entry.cameraSignature) return true;
  const camera = entry.frame.contentWindow?.__dt?.camera;
  if (camera && camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
  if (viewer.setCameraPose(pose.position, pose.target) === false) return false;
  entry.cameraSignature = signature;
  return true;
}

export function pondResetRoute(target) {
  if (target.closest?.('[data-action=reset]')) return 'layout';
  return target.closest?.('.farm-demo-reset') ? 'demo' : null;
}

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

// The embedded viewer's Space belongs to the host replay, including Replay at
// the endpoint. Consume it before DT can start its independent internal clock.
export function bindPondSpacePlayback(frame, controls) {
  const documents = new Set([frame.contentDocument, frame.ownerDocument].filter(Boolean));
  const toggle = event => {
    const target = event.target;
    if (![' ', 'Space'].includes(event.key) || textEntry(target)
      || ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(target?.tagName)
      || target?.closest?.('button,input,select,textarea,[role=button]')) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (!event.repeat) controls?.querySelector('button')?.click();
  };
  for (const doc of documents) doc.addEventListener('keydown', toggle, true);
  return () => { for (const doc of documents) doc.removeEventListener?.('keydown', toggle, true); };
}

// Pond-only presentation around panel-core's existing clock. Ended playback is
// paused once; replay seeks through the same canonical projection as a reset.
export function bindPondEndedState(controls, clock, onReplay = () => {}, locale = () => 'zh-Hant') {
  const play = controls?.querySelector('button');
  if (!play) return;
  const original = play.onclick;
  const pause = clock.pause, start = clock.play;
  const render = () => {
    const ended = clock.time >= clock.duration;
    if (ended && !clock.paused) clock.pause();
    controls.dataset.ended = String(ended);
    play.textContent = pondShellLabel(ended ? 'replay' : clock.paused ? 'play' : 'pause', locale());
    play.dataset.label = ended ? 'replay' : clock.paused ? 'play' : 'pause';
    play.setAttribute('aria-label', ended ? pondShellLabel('ended', locale()) : play.textContent);
  };
  // panel-core only publishes seek ticks. Inspection and pointer pauses need
  // the same immediate label update even while the clock stays at this sample.
  clock.pause = function (...args) { const result = pause.apply(this, args); render(); return result; };
  clock.play = function (...args) { const result = start.apply(this, args); render(); return result; };
  play.onclick = event => {
    if (clock.time >= clock.duration) { onReplay(); clock.seek(0); clock.play(); }
    else original?.call(play, event);
    render();
  };
  const unsubscribe = clock.subscribe(render);
  return () => { unsubscribe?.(); play.onclick = original; clock.pause = pause; clock.play = start; };
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

// Keep native dolly above the sanctioned site floor BEFORE its next step. A
// render-time Z clamp alone lets cursor zoom keep shifting the orbit target.
// The angle-dependent minimum preserves close steep views and low-pitch banks.
export function bindPondZoomFloor(frame, options = SITE.presentation?.viewer || {}) {
  const doc = frame.contentDocument, win = frame.contentWindow;
  const {camera, controls} = win?.__dt || {};
  if (!camera || !controls) return;
  const minimum = controls.minDistance;
  const maximumPolar = controls.maxPolarAngle;
  const cursorZoom = controls.zoomToCursor;
  const fixedPivot = options.fixed_orbit_pivot === true;
  const target = controls.target, originalScaledAdd = target.addScaledVector;
  const touches = new Set(), listeners = [];
  let touchPlane, mouseGesture;
  let cursorReset, touchReset;
  const listen = (source, name, callback, capture = true) => {
    source?.addEventListener?.(name, callback, capture);
    listeners.push([source, name, callback, capture]);
  };
  const restoreMouse = () => {
    if (!mouseGesture) return;
    // Native modifier keyup may have restored plain-drag mappings while the
    // pointer remains held. Preserve that newer native state at cleanup.
    if (!mouseGesture.modifierReleased) {
      controls.mouseButtons.LEFT = mouseGesture.left;
      controls.mouseButtons.RIGHT = mouseGesture.right;
    }
    controls.rotateSpeed = mouseGesture.speed;
    mouseGesture = null;
  };
  // Keep the view ray unchanged while moving its pivot onto the authored plane.
  // Native orbit then turns around the point being looked at, without DT's
  // cursor-pin solver changing target height behind the floor constraint.
  const projectPivot = () => {
    const plane = win.DT_SITE.cameraTargetZ;
    const ray = target.clone().sub(camera.position);
    const scale = (plane - camera.position.z) / ray.z;
    if (Number.isFinite(plane) && ray.z < 0 && Number.isFinite(scale) && scale > 0) {
      target.copy(camera.position).add(ray.multiplyScalar(scale));
      target.z = plane;
    }
  };
  // DT's touch tilt solver translates the target before constructing the
  // camera from target + offset. Preserve the plane at that existing seam,
  // rather than correcting the camera after rendering.
  const planeScaledAdd = function (...args) {
    const result = originalScaledAdd.apply(this, args);
    if (touchPlane !== undefined) this.z = touchPlane;
    return result;
  };
  if (fixedPivot && typeof originalScaledAdd === 'function') target.addScaledVector = planeScaledAdd;
  const viewer = win.__dtEmbed, originalPose = viewer?.setCameraPose;
  const setPose = function (...args) {
    // Interactive constraints never reject an authored reset/chapter pose.
    controls.minDistance = minimum;
    if (fixedPivot) {
      controls.maxPolarAngle = maximumPolar;
      clearTimeout(touchReset);
      touches.clear(); touchPlane = undefined; restoreMouse();
    }
    return originalPose.apply(this, args);
  };
  if (typeof originalPose === 'function') viewer.setCameraPose = setPose;
  const limit = () => {
    if (options.wheel_zoom_to_cursor === false) {
      controls.zoomToCursor = false;
      clearTimeout(cursorReset);
      // Native event dispatch may run microtasks between listeners. Restore in
      // the next task, after OrbitControls has consumed this wheel event.
      cursorReset = setTimeout(() => { controls.zoomToCursor = cursorZoom; }, 0);
    }
    const offset = camera.position.clone().sub(controls.target);
    const range = Math.hypot(offset.x, offset.y, offset.z);
    const height = win.DT_SITE.cameraFloorZ - controls.target.z;
    if (fixedPivot) controls.maxPolarAngle = range > 0 && Number.isFinite(height)
      ? Math.min(maximumPolar, Math.acos(Math.max(-1, Math.min(1, height / range)))) : maximumPolar;
    const floorDistance = height > 0 && offset.z > 0
      ? Math.max(minimum, Math.min(controls.maxDistance, height * range / offset.z)) : minimum;
    let nearDistance = minimum;
    if (fixedPivot && Number.isFinite(options.near_plane_surface_z)
      && Number.isFinite(range) && range > 0 && offset.z > 0
      && Number.isFinite(camera.near) && camera.near > 0
      && Number.isFinite(camera.fov) && camera.fov > 0 && camera.fov < 180) {
      // Keep the lower near-frustum edge above the authored surface. This
      // constrains native input without changing DT's near plane or FOV.
      const vertical = offset.z / range, horizontal = Math.hypot(offset.x, offset.y) / range;
      const surfaceHeight = Math.max(0, options.near_plane_surface_z - target.z);
      const nearHalfHeight = camera.near * Math.tan(camera.fov * Math.PI / 360);
      nearDistance = Math.min(controls.maxDistance,
        camera.near + (nearHalfHeight * horizontal + surfaceHeight) / vertical);
      const amplitude = Math.hypot(range - camera.near, nearHalfHeight);
      const minimumPitch = Math.atan2(nearHalfHeight, range - camera.near)
        + Math.asin(Math.max(-1, Math.min(1, surfaceHeight / amplitude)));
      controls.maxPolarAngle = Math.min(controls.maxPolarAngle,
        Math.max(0, Math.min(maximumPolar, Math.PI / 2 - minimumPitch)));
    }
    const bounds = options.close_zoom_bounds_xy;
    const outside = bounds?.length === 4 && (target.x < bounds[0] || target.y < bounds[1]
      || target.x > bounds[2] || target.y > bounds[3]);
    controls.minDistance = Math.min(controls.maxDistance, Math.max(floorDistance, nearDistance,
      outside && Number.isFinite(options.context_zoom_min_distance_m) ? options.context_zoom_min_distance_m : minimum));
  };
  listen(doc, 'wheel', limit);
  if (fixedPivot) {
    listen(doc, 'keyup', event => {
      if (mouseGesture && ['Control', 'Meta'].includes(event.key)) mouseGesture.modifierReleased = true;
    });
    listen(doc, 'pointerdown', event => {
      if (event.target?.tagName !== 'CANVAS') return;
      if (event.pointerType === 'touch') {
        clearTimeout(touchReset);
        if (!touches.size) projectPivot();
        touches.add(event.pointerId);
        if (touches.size === 2) touchPlane = target.z;
        limit();
      } else if ((event.ctrlKey || event.metaKey) && [0, 2].includes(event.button)) {
        restoreMouse(); projectPivot();
        mouseGesture = {left:controls.mouseButtons.LEFT, right:controls.mouseButtons.RIGHT, speed:controls.rotateSpeed};
        // OrbitControls interprets Ctrl + PAN as native ROTATE.
        controls.mouseButtons.LEFT = 2; controls.mouseButtons.RIGHT = 2;
        controls.rotateSpeed = 1;
        limit();
      }
    });
    listen(doc, 'mousedown', event => {
      if (event.target?.tagName === 'CANVAS' && (event.ctrlKey || event.metaKey)
        && [0, 2].includes(event.button)) event.stopImmediatePropagation();
    });
    listen(doc, 'pointermove', event => {
      if (touches.has(event.pointerId) || mouseGesture) limit();
    });
    const release = event => {
      if (touches.delete(event.pointerId)) {
        // DT flushes its pending two-finger frame in pointerup. Keep the plane
        // through that handler, then release it before the next gesture.
        clearTimeout(touchReset);
        touchReset = setTimeout(() => { if (touches.size < 2) touchPlane = undefined; }, 0);
      }
      if (event.pointerType !== 'touch') restoreMouse();
    };
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) listen(doc, name, release);
    listen(win, 'blur', () => { clearTimeout(touchReset); touches.clear(); touchPlane = undefined; restoreMouse(); });
    listen(doc, 'visibilitychange', () => {
      if (doc.hidden) { clearTimeout(touchReset); touches.clear(); touchPlane = undefined; restoreMouse(); }
    });
    listen(doc, 'click', event => {
      if (event.target?.closest?.('#btn-zoom-in,#btn-zoom-out')) limit();
    });
  }
  return () => {
    for (const [source, name, callback, capture] of listeners) source?.removeEventListener?.(name, callback, capture);
    controls.minDistance = minimum;
    if (fixedPivot) {
      controls.maxPolarAngle = maximumPolar;
      clearTimeout(touchReset);
      touches.clear(); touchPlane = undefined; restoreMouse();
      if (target.addScaledVector === planeScaledAdd) target.addScaledVector = originalScaledAdd;
    }
    clearTimeout(cursorReset);
    controls.zoomToCursor = cursorZoom;
    if (viewer?.setCameraPose === setPose) viewer.setCameraPose = originalPose;
  };
}

// DT computes the camera-relative vector and its native speed. The only spatial
// addition is a terrain XY bound: native preflight travelled beyond the map.
// Intercept the shared target translation after DT adds the SAME vector to the
// camera, then remove only the clipped part from the camera. No movement loop.
export function bindPondNativeMovement(frame, mode, inspect = () => {}) {
  const doc = frame.contentDocument, win = frame.contentWindow, host = frame.ownerDocument;
  const dt = win?.__dt, target = dt?.controls?.target, camera = dt?.camera;
  if (!target || !camera) return;
  const held = new Set(), listeners = [];
  const listen = (source, name, callback, capture = false) => {
    if (!source?.addEventListener) return;
    source.addEventListener(name, callback, capture); listeners.push([source, name, callback, capture]);
  };
  const original = target.add;
  let terrain, bounds;
  const extent = () => {
    if (terrain !== dt.layers?.terrain) {
      terrain = dt.layers?.terrain;
      const row = terrain && dt.featureExtent?.(terrain);
      bounds = row && [...row.center, ...row.size].every(Number.isFinite) ? {
        min: row.center.map((v, i) => v - row.size[i] / 2),
        max: row.center.map((v, i) => v + row.size[i] / 2),
      } : null;
    }
    return bounds;
  };
  const guarded = function (delta) {
    if (mode() !== 'inspection' || !held.size) return original.call(this, delta);
    let fraction = 1;
    const boundary = extent();
    if (boundary) for (const [i, axis] of ['x', 'y'].entries()) {
      if (delta[axis]) fraction = Math.min(fraction, Math.max(0,
        ((delta[axis] > 0 ? boundary.max[i] : boundary.min[i]) - this[axis]) / delta[axis]));
    }
    // Q must stop the pair before either point reaches its floor. DT has
    // already translated the camera; its render-loop clamp runs later.
    if (delta.z < 0) {
      const ground = dt.terrainSampler?.(this.x, this.y);
      const targetFloor = Number.isFinite(ground) ? ground : win.DT_SITE.cameraTargetZ;
      fraction = Math.min(fraction, Math.max(0, (this.z - targetFloor) / -delta.z),
        Math.max(0, (camera.position.z - delta.z - win.DT_SITE.cameraFloorZ) / -delta.z));
    }
    const accepted = delta.clone().multiplyScalar(fraction);
    camera.position.sub(delta.clone().sub(accepted));
    return original.call(this, accepted);
  };
  target.add = guarded;
  // Host focus is an embedding concern. Relay keys to DT's existing listeners;
  // the host never computes a vector or substitutes its own key movement.
  const relay = (name, event) => doc.dispatchEvent(new win.KeyboardEvent(name, {
    key: event.key, code: event.code, shiftKey: event.shiftKey, repeat: event.repeat, bubbles: true,
  }));
  const release = () => {
    for (const key of [...held]) relay('keyup', {key});
    held.clear();
  };
  const down = event => {
    if (!/^[wasdqe]$/i.test(event.key) || textEntry(event.target)
      || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
    if (mode() === 'guided') inspect();
    if (mode() !== 'inspection') return;
    held.add(event.key.toLowerCase());
    if (event.currentTarget === host) {
      focusPondViewer(frame, mode(), event.target); relay('keydown', event); event.preventDefault();
    }
  };
  const up = event => {
    if (!/^[wasdqe]$/i.test(event.key)) return;
    held.delete(event.key.toLowerCase());
    if (event.currentTarget === host) relay('keyup', event);
  };
  for (const source of new Set([doc, host])) {
    listen(source, 'keydown', down, true); listen(source, 'keyup', up, true);
    listen(source, 'focusin', event => { if (textEntry(event.target)) release(); }, true);
    listen(source, 'visibilitychange', release);
  }
  listen(win, 'blur', release); listen(host?.defaultView, 'blur', release);
  return () => {
    release(); if (target.add === guarded) target.add = original;
    for (const [source, name, callback, capture] of listeners) source.removeEventListener?.(name, callback, capture);
  };
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
      && /^(?:Arrow\w+|Control|Meta|[1-9])$/i.test(event.key)) {
      event.stopImmediatePropagation(); event.preventDefault();
    }
  }, true);
  doc.addEventListener('pointerup', event => focusPondViewer(frame, mode(), event.target));
  doc.addEventListener('click', event => focusPondViewer(frame, mode(), event.target));
}

// The pond's flowing columns are not GridStack coordinates. Resize the actual
// displayed card in pixels, then reflow the host columns.
const pondResizeHandles = new WeakSet();
export function bindPondPanelResize(item, grid, {isPhone, onDone, onSize}) {
  const card = item.querySelector('.panel-card');
  let handle = item.querySelector('.pond-resize-handle') || item.querySelector('.ui-resizable-se');
  if (!card) return;
  if (!handle) { handle = el('div', null, 'ui-resizable-handle ui-resizable-se'); item.append(handle); }
  // Core can replace or append helpers at every desktop/compact transition.
  // Bind the current element, and keep only one hit target above the card.
  for (const other of item.querySelectorAll?.('.ui-resizable-se') || []) {
    if (other !== handle) other.remove();
  }
  handle.classList?.add('pond-resize-handle');
  if (pondResizeHandles.has(handle)) return;
  pondResizeHandles.add(handle);
  handle.tabIndex = 0; handle.setAttribute('role', 'button');
  handle.setAttribute('aria-label', pondShellLabel('resize', globalThis.document?.documentElement?.lang));
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

export function installPondShell(container, app, preset = []) {
  // A saved layout may omit a closed map. Pond boot requires its canonical
  // viewer handshake, so restore that declared panel before awaiting readiness.
  if (!container.querySelector('.grid-stack-item[data-panel="map"]')) ensurePondPanel(container, app, 'map');
  let cameraMode = 'guided';
  let resumeAfterInspection = false;
  let branchFocusHandled = false;
  let branchFocusPending = false;
  let layoutPose = null;
  let selectedEntity = null;
  const locale = () => document.documentElement.lang;
  const label = key => pondShellLabel(key, locale());
  const isPhone = () => globalThis.matchMedia?.('(max-width: 767px)').matches;
  const playback = container.querySelector('.replay-controls');
  container.addEventListener('focusin', () => {
    for (const frame of container.querySelectorAll('iframe.map-frame'))
      if (document.activeElement !== frame) frame.removeAttribute('data-pond-focus-visible');
  });
  container.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    // After a reset, Chrome may Tab to the iframe's BODY rather than its canvas.
    requestAnimationFrame(() => {
      const focused = document.activeElement;
      if (focused?.matches('iframe.map-frame')) focused.setAttribute('data-pond-focus-visible', '');
    });
  }, true);
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
  // Core has completed add/focus before this bubbling listener activates the
  // existing pond phone destination. Existing and recreated panels share it.
  container.addEventListener('click', event => {
    if (isPhone() && event.target.closest?.('[data-add]')) {
      const id = container.querySelector('select[data-catalogue]')?.value;
      if (id) showPhonePanel(id === 'map' ? null : id);
    }
  });
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
  bindPondPlaybackControls(playback, app.clock, restoreFocus);
  bindPondEndedState(playback, app.clock, () => {
    cameraMode = 'guided'; showPhonePanel(null);
    for (const frame of container.querySelectorAll('iframe.map-frame')) {
      const entry = frames.get(frame); if (entry) entry.cameraSignature = null;
    }
  }, locale);
  container.addEventListener('click', event => {
    const reset = pondResetRoute(event.target);
    if (reset === 'layout' && cameraMode === 'inspection') {
      const dt = container.querySelector('iframe.map-frame')?.contentWindow?.__dt;
      if (dt?.cameraState) layoutPose = {...dt.cameraState(), fov:dt.camera.fov};
    }
    if (reset === 'demo') {
      selectedEntity = null;
      cameraMode = 'guided';
      showPhonePanel(null);
      for (const frame of container.querySelectorAll('iframe.map-frame')) {
        const entry = frames.get(frame); if (entry) entry.cameraSignature = null;
      }
    }
    if (event.detail !== 0) restoreFocus(event.target);
  }, true);
  const topbar = container.querySelector('.topbar');
  const openProvenance = () => {
    if (isPhone()) return showPhonePanel('pond-provenance');
    if (ensurePondPanel(container, app, 'pond-provenance')) requestAnimationFrame(() => {
      container.querySelector('.grid-stack-item[data-panel="pond-provenance"]')
        ?.scrollIntoView({block:'center', behavior:'smooth'});
    });
  };
  const provenanceFallback = el('button', label('provenance'), 'pond-provenance-entry');
  provenanceFallback.type = 'button'; provenanceFallback.hidden = true;
  provenanceFallback.onclick = openProvenance;
  (container.querySelector('.topbar-controls') || topbar)?.append(provenanceFallback);
  const simulationNotice = '模擬設備、水質、天氣與 AI 建議 · 十分鐘原型，非即時監測或操作建議。';
  const subtitle = container.querySelector('.brand small');
  const noticeSubtitle = subtitle?.textContent === simulationNotice;
  const banner = el('div', pondText(simulationNotice, locale()), 'pond-simulation-banner');
  banner.setAttribute('role', 'note'); topbar?.after(banner);
  // Keep panel-core's direct children and controls, but let the two desktop
  // columns flow independently. Only rendered card heights determine placement.
  const grid = container.querySelector('.panel-grid');
  const observed = new Set();
  const slots = new Map();
  const initialItems = new Set(grid?.children || []);
  const compactOrder = new Map(preset.map((item, index) => [item.id, index]));
  const desktop = () => globalThis.matchMedia?.('(min-width: 1024px)').matches;
  const orderedCards = () => [...slots.keys()].filter(item => item.parentElement === grid)
    .sort((a, b) => slots.get(a).order - slots.get(b).order);
  const moveCard = (item, column, before) => {
    const list = orderedCards().filter(other => other !== item);
    const index = before ? list.indexOf(before) : list.length;
    list.splice(index < 0 ? list.length : index, 0, item);
    slots.get(item).column = column;
    list.forEach((other, order) => { slots.get(other).order = order; });
    // Persist through core's existing change/capture/save route. Its cells are
    // storage coordinates; the pond's displayed rows remain height-aware.
    const engine = grid.gridstack;
    if (engine) {
      const y = [0, 0]; engine.batchUpdate();
      for (const other of list) {
        const col = slots.get(other).column, node = other.gridstackNode;
        engine.update(other, {x: col ? 8 : 0, y: y[col], w: col ? 4 : 8});
        y[col] += node?.h || 3;
      }
      engine.batchUpdate(false);
    }
    requestFlow();
  };
  let moving;
  const clearMove = () => {
    if (!moving) return;
    const {header, id, item} = moving; moving = null;
    if (header.hasPointerCapture(id)) header.releasePointerCapture(id);
    item.classList.remove('pond-moving');
    for (const frame of grid.querySelectorAll('iframe')) frame.style.pointerEvents = '';
  };
  grid?.addEventListener('mousedown', event => {
    if (desktop() && event.target.closest('.panel-header')
      && !event.target.closest('button,input,select,summary,a,.panel-menu')) {
      event.stopImmediatePropagation(); event.preventDefault();
    }
  }, true);
  grid?.addEventListener('pointerdown', event => {
    const header = event.target.closest('.panel-header'), item = header?.closest('.grid-stack-item');
    if (!desktop() || event.button > 0 || !header || !slots.has(item)
      || item.classList.contains('is-maximized')
      || event.target.closest('button,input,select,summary,a,.panel-menu')) return;
    moving = {header, item, id:event.pointerId, x:event.clientX, y:event.clientY, moved:false};
    header.setPointerCapture(event.pointerId);
    event.stopImmediatePropagation(); event.preventDefault();
  }, true);
  grid?.addEventListener('pointermove', event => {
    if (!moving || moving.id !== event.pointerId) return;
    if (Math.hypot(event.clientX-moving.x, event.clientY-moving.y) < 6) return;
    moving.moved = true; moving.item.classList.add('pond-moving');
    for (const frame of grid.querySelectorAll('iframe')) frame.style.pointerEvents = 'none';
    event.preventDefault();
  });
  grid?.addEventListener('pointerup', event => {
    if (!moving || moving.id !== event.pointerId) return;
    const {item, moved} = moving;
    if (moved && desktop()) {
      const rect = grid.getBoundingClientRect();
      const column = event.clientX >= rect.left + (rect.width - 16) * 2/3 + 8 ? 1 : 0;
      const before = orderedCards().find(other => other !== item && slots.get(other).column === column
        && event.clientY < other.getBoundingClientRect().top + other.getBoundingClientRect().height / 2);
      moveCard(item, column, before);
    }
    clearMove(); restoreFocus(event.target);
  });
  for (const name of ['pointercancel','lostpointercapture']) grid?.addEventListener(name, clearMove);
  globalThis.addEventListener?.('blur', clearMove);
  globalThis.addEventListener?.('resize', () => { clearMove(); requestFlow(); });
  grid?.addEventListener('click', event => {
    const button = event.target.closest('[data-action]'), action = button?.dataset.action;
    const item = button?.closest('.grid-stack-item');
    if (!desktop() || !slots.has(item) || !/^(move-(left|right|up|down)|grow|shrink)$/.test(action)) return;
    event.stopImmediatePropagation(); event.preventDefault();
    if (action === 'grow' || action === 'shrink') {
      const handle = item.querySelector('.pond-resize-handle');
      for (const key of action === 'grow' ? ['ArrowRight','ArrowDown'] : ['ArrowLeft','ArrowUp'])
        handle?.dispatchEvent(new KeyboardEvent('keydown', {key, bubbles:true}));
    } else {
      const slot = slots.get(item), list = orderedCards().filter(other => slots.get(other).column === slot.column);
      const index = list.indexOf(item);
      if (action === 'move-left' || action === 'move-right') moveCard(item, action === 'move-right' ? 1 : 0);
      else if (action === 'move-up' && index > 0) moveCard(item, slot.column, list[index-1]);
      else if (action === 'move-down' && index < list.length-1) moveCard(item, slot.column, list[index+2]);
    }
    item.querySelector('.panel-menu').open = false;
  }, true);
  let layoutRequest;
  const flow = () => {
    layoutRequest = null;
    if (!grid || globalThis.matchMedia?.('(max-width: 767px)').matches) return;
    const next = [1, 1];
    const items = desktop() ? orderedCards() : [...grid.children]
      .sort((a, b) => (compactOrder.get(a.dataset.panel) ?? preset.length)
        - (compactOrder.get(b.dataset.panel) ?? preset.length));
    for (const item of items) {
      const card = item.querySelector('.panel-card'); if (!card) continue;
      const column = desktop() ? slots.get(item).column
        : ['map', 'pond-water', 'pond-weather'].includes(item.dataset.panel) ? 0 : 1;
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
      if (item.querySelector('.panel-card') && !slots.has(item)) {
        const newSelection = item.dataset.panel === 'selection' && !initialItems.has(item);
        slots.set(item, {column: newSelection || item.gridstackNode?.x >= 8 ? 1 : 0,
          order: (item.gridstackNode?.y || 0) * 12 + (item.gridstackNode?.x || 0)});
        if (newSelection) grid.gridstack?.update(item, {x:8, w:4});
      }
      // Both interactions belong to this flowing layout. Public update lets
      // GridStack destroy its own helpers before we create the pond handle;
      // removing a live vendor helper directly breaks later reset cleanup.
      const node = item.gridstackNode;
      if (node && (!node.noMove || !node.noResize))
        grid.gridstack?.update(item, {noMove:true, noResize:true});
      bindPondPanelResize(item, grid, {
        isPhone: () => globalThis.matchMedia?.('(max-width: 767px)').matches,
        onSize: requestFlow, onDone: restoreFocus,
      });
    }
    for (const item of slots.keys()) if (item.parentElement !== grid) slots.delete(item);
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
    if (next === 'inspection') resumeAfterInspection = !app.clock.paused;
    app.clock.pause(); cameraMode = next;
    if (next === 'guided') {
      for (const entry of entries) entry.cameraSignature = null;
      toast.hidden = true; clearTimeout(toastTimer);
    }
    update(app.clock.time);
    if (next === 'guided' && resumeAfterInspection) app.clock.play();
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
      const nav = el('section', null, 'pond-guided-story'); nav.setAttribute('aria-label', label('story'));
      const heading = el('div', null, 'pond-guided-heading');
      const sequence = el('span', null, 'pond-guided-sequence');
      const time = el('output', null, 'pond-guided-time'); heading.append(sequence, time);
      const title = el('h2', null, 'pond-guided-title');
      const caption = el('p', null, 'pond-guided-caption');
      const languageNote = el('small', 'Story text in Traditional Chinese', 'pond-story-language');
      const numbers = el('dl', null, 'pond-key-numbers'); numbers.setAttribute('aria-label', '目前章節重點數字（模擬）');
      const controls = el('div', null, 'pond-camera-controls');
      const mode = el('button', '檢視設備', 'pond-camera-mode'); mode.type = 'button';
      const region = el('button', '宜蘭全景（背景）', 'pond-regional-view'); region.type = 'button'; region.hidden = true;
      const fishbelt = el('button', '周邊魚塭', 'pond-fishbelt-view'); fishbelt.type = 'button'; fishbelt.hidden = true;
      const showView = (key, button) => {
        const viewer = frame.contentWindow?.__dtEmbed;
        const declared = frame.contentWindow?.DT_SITE?.viewpoints?.[key];
        const view = isPhone() && declared?.portrait ? declared.portrait : declared;
        if (!viewer?.ready || !view) return;
        switchCamera('inspection');
        const camera = frame.contentWindow?.__dt?.camera;
        if (camera && camera.fov !== 55) { camera.fov = 55; camera.updateProjectionMatrix(); }
        viewer.setCameraPose(view.pos, key === '08-fishbelt'
          ? SITE.presentation.viewer.fishbelt_target || view.target : view.target);
        restoreFocus(button);
      };
      region.onclick = () => showView('07-region', region);
      fishbelt.onclick = () => showView('08-fishbelt', fishbelt);
      const cameraReset = el('button', null, 'pond-camera-reset'); cameraReset.type = 'button';
      cameraReset.onclick = () => {
        for (const current of entries) { current.cameraSignature = null; applyCamera(current, true); }
        restoreFocus(cameraReset);
      };
      const notice = el('span', null, 'pond-camera-notice'); notice.setAttribute('role', 'status');
      const provenance = el('button', '模擬與出處', 'pond-provenance-entry'); provenance.type = 'button';
      provenance.onclick = openProvenance;
      const details = el('button', '詳情', 'pond-phone-details-toggle'); details.type = 'button';
      details.setAttribute('aria-expanded', 'false');
      details.onclick = () => showPhonePanel(container.dataset.pondPhonePanel ? null : 'pond-notifications');
      controls.append(mode, region, fishbelt, cameraReset, notice, provenance, details);
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
      // Branch focus can activate a destination before its story controls exist.
      const activePanel = container.dataset.pondPhonePanel;
      details.setAttribute('aria-expanded', String(!!activePanel));
      picker.hidden = !activePanel;
      if (activePanel) panelSelect.value = activePanel;
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
        cameraMode:mode, region, fishbelt, cameraReset, cameraNotice:notice, provenance, details, summary, panelSelect, close});
    }
    if (isPhone()) {
      if (entry.compactDesktop) {
        entry.storyNav.insertBefore(entry.cameraMode.parentElement, entry.storyPrevious.parentElement);
        entry.compactDesktop = false;
      }
      // Keep the sheet inside core's isolated stacking root so open panel
      // menus can rise above it. A sibling outside that root always wins.
      const home = container.querySelector('.panel-core-app') || container;
      if (entry.storyNav.parentElement !== home) home.append(entry.storyNav);
      if (playback?.parentElement !== entry.storyNav) entry.storyNav.append(playback);
    } else {
      if (!entry.compactDesktop) {
        // Keyboard focus follows the same chapter-then-view order as the row.
        entry.storyNav.insertBefore(entry.storyPrevious.parentElement, entry.cameraMode.parentElement);
        entry.storyNav.insertBefore(entry.storyList, entry.cameraMode.parentElement);
        entry.compactDesktop = true;
      }
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
        button.onclick = event => { selectChapter(chapter); entry.storyList.open = false; if (event.detail === 0) entry.storyList.querySelector('summary')?.focus({preventScroll:true}); }; entry.storyItems.append(button);
      }
    }
    const index = chapters.findIndex(row => row.id === story.chapter.id);
    entry.storyNav.hidden = false; entry.storyNav.dataset.chapterId = story.chapter.id;
    const english = locale() === 'en';
    const chapterTime = wallTime(story.chapter.scenario_time);
    const chapterTitle = story.chapter.title.startsWith(chapterTime)
      ? story.chapter.title.slice(chapterTime.length).trim().replace(/^·\s*/, '') : story.chapter.title;
    entry.storySequence.textContent = isPhone()
      ? (english ? `Chapter ${index + 1} / ${chapters.length}` : `第 ${index + 1} / ${chapters.length} 章`)
      : `${index + 1}/${chapters.length} · ${chapterTitle}`;
    entry.storySequence.title = `${story.chapter.title} · ${story.chapter.caption}`;
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
    entry.region.hidden = !frame.contentWindow?.DT_SITE?.viewpoints?.['07-region'];
    entry.region.textContent = english ? 'Yilan landscape (context)' : '宜蘭全景（背景）';
    entry.fishbelt.hidden = !frame.contentWindow?.DT_SITE?.viewpoints?.['08-fishbelt'];
    entry.fishbelt.textContent = english ? 'Nearby fish farms' : '周邊魚塭';
    entry.cameraReset.textContent = label('camera'); entry.cameraReset.hidden = isPhone() && cameraMode !== 'inspection';
    entry.storyPrevious.textContent = isPhone() ? label('previous') : '‹';
    entry.storyNext.textContent = isPhone() ? label('next') : '›';
    for (const [button, key] of [[entry.storyPrevious, 'previous'], [entry.storyNext, 'next']]) {
      button.title = label(key); button.setAttribute('aria-label', label(key));
    }
    entry.details.textContent = label('details'); entry.provenance.textContent = label('provenance');
    entry.storyNav.setAttribute('aria-label', label('story'));
    entry.summary.textContent = label('chapters'); entry.close.textContent = label('map');
    entry.panelSelect.setAttribute('aria-label', label('destination'));
    localizePondPanelOptions(entry.storyNav, locale(), SITE);
    entry.cameraMode.setAttribute('aria-pressed', String(cameraMode === 'inspection'));
    entry.cameraNotice.textContent = cameraMode === 'guided'
      ? (english ? 'Drag or zoom to inspect · Select equipment for details' : '拖曳或縮放即可自由檢視 · 點設備看詳情')
      : (english ? 'Inspection camera · Move with WASD / drag · Select equipment for details' : '檢視鏡頭 · WASD／拖曳可移動 · 點設備看詳情');
    entry.cameraMode.title = entry.cameraNotice.textContent;
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
    const portraitFov = fallback?.portrait_fov_degrees;
    const fov = phone && Number.isFinite(portraitFov) && portraitFov > 0 && portraitFov < 180
      ? portraitFov : 55;
    applyPondCameraPose(entry, viewer, selected, fov);
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
      entry.status.setAttribute('aria-label', pondText('壯圍三座魚塭狀態（模擬）', locale()));
      entry.status.replaceChildren(el('span', pondText('模擬', locale()), 'pond-badge'));
      const ponds = [...new Set(latest.telemetry.filter(row => row.metric === 'dissolved_oxygen').map(row => row.entity_id))];
      for (const id of ponds) {
        const {fault, risk, degraded} = pondStatus(latest, id);
        const badge = el('span', pondMapBadgeText(latest, id), 'pond-map-badge');
        badge.dataset.entityId = id;
        if (!degraded && (fault || risk)) badge.classList.add('pond-critical');
        entry.status.append(badge);
      }
      // A chapter-end result belongs beside the map readings, only once its
      // authored canonical summary exists. Keep the phone's existing sheet.
      if (!isPhone() && latest.story?.summary) {
        for (const {label, value} of pondKeyNumbers(latest).slice(1)) {
          if (value === '章末摘要') continue;
          entry.status.append(el('span', `${pondText(label, locale())} · ${pondText(value, locale())}`, 'pond-map-badge pond-map-result'));
        }
      }
    }
  };
  const attach = frame => {
    if (frames.has(frame)) return;
    const status = el('div', null, 'pond-map-status'); status.setAttribute('aria-label', pondText('壯圍三座魚塭狀態（模擬）', locale()));
    frame.parentElement.append(status);
    const entry = {frame, status, viewer: null}; frames.set(frame, entry); entries.add(entry);
    const decorate = () => {
      const doc = frame.contentDocument;
      if (!doc?.head) return;
      if (entry.inputDocument !== doc) {
        // Nested canvas focus does not match :focus-visible on its host iframe.
        doc.addEventListener('focusin', event => frame.toggleAttribute('data-pond-focus-visible',
          !!event.target.matches?.(':focus-visible')));
        entry.stopMovement?.(); entry.stopMovement = null;
        entry.stopZoom?.(); entry.stopZoom = null;
        entry.stopSpace?.();
        entry.inputDocument = doc; bindPondCameraInput(frame, () => cameraMode, () => switchCamera('inspection', true));
        entry.stopSpace = bindPondSpacePlayback(frame, playback);
        doc.addEventListener('click', event => {
          if (!event.target.closest?.('#btn-reset')) return;
          cameraMode = 'guided'; entry.cameraSignature = null; showPhonePanel(null);
        }, true);
      }
      if (frame.contentWindow?.__dt?.controls && !entry.stopMovement) {
        entry.stopMovement = bindPondNativeMovement(frame, () => cameraMode, () => switchCamera('inspection', true));
        entry.stopZoom = bindPondZoomFloor(frame);
        if (document.activeElement === document.body) focusPondViewer(frame, 'inspection');
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
          .pond-label-layout .pond-footprint-label{transform:none!important;margin:0!important;width:max-content;white-space:normal;overflow-wrap:anywhere;box-sizing:border-box}
          .pond-label-leaders{position:absolute;inset:0;width:100%;height:100%;overflow:hidden}
          .pond-label-leaders line{stroke:#bddbe5;stroke-width:1.5;stroke-opacity:.85}
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
        if (cameraMode === 'inspection' && layoutPose) {
          const {position, target, fov} = layoutPose;
          const camera = frame.contentWindow.__dt.camera;
          camera.fov = fov; camera.updateProjectionMatrix();
          viewer.setCameraPose(['x','y','z'].map(axis => position[axis]), ['x','y','z'].map(axis => target[axis]));
          layoutPose = null; entry.viewer = viewer;
        } else { entry.viewer = null; applyCamera(entry); }
      }
    };
    frame.addEventListener('load', () => { entry.loadingObserver?.disconnect(); entry.loadingObserver = null; decorate(); });
    entry.unsubscribeReady = app.map.subscribe('ready', decorate);
    decorate();
    update(app.clock.time);
  };
  const scan = () => {
    const current = new Set(container.querySelectorAll('iframe.map-frame'));
    provenanceFallback.hidden = !!container.querySelector('.pond-guided-story .pond-provenance-entry')?.getClientRects().length;
    for (const entry of entries) {
      if (current.has(entry.frame)) continue;
      entry.storyResize?.disconnect(); entry.loadingObserver?.disconnect(); entry.unsubscribeReady?.();
      entry.stopMovement?.();
      entry.stopZoom?.();
      entry.stopSpace?.();
      entry.storyNav?.remove(); entries.delete(entry);
    }
    for (const frame of current) attach(frame);
    if (!branchFocusHandled && !branchFocusPending && globalThis.location?.hash === '#pond-active-run'
      && container.querySelector('#pond-active-run')) {
      // Opening a phone destination mutates panel-core's DOM. Guard before
      // doing so: observer microtasks run before the focus animation frame.
      branchFocusPending = true;
      if (isPhone()) showPhonePanel('pond-notifications');
      requestAnimationFrame(() => {
        branchFocusPending = false;
        if (branchFocusHandled) return;
        const link = container.querySelector('#pond-active-run');
        if (!link?.getClientRects().length) return;
        branchFocusHandled = true;
        link.focus({preventScroll: true});
      });
    }
  };
  const localize = () => {
    for (const handle of container.querySelectorAll('.ui-resizable-handle')) handle.setAttribute('aria-label', label('resize'));
    banner.textContent = pondText(simulationNotice, locale());
    if (noticeSubtitle) subtitle.textContent = pondText(simulationNotice, locale());
    provenanceFallback.textContent = label('provenance');
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
  // Core renders a generic time after play/pause; restore the canonical readout.
  playback?.querySelector('button')?.addEventListener('click', () => update(app.clock.time));
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
