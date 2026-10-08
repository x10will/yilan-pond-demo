// Static label presentation through DT's supported extension facade.
// No scene object, authored anchor or runtime transform is moved.
export function clampPondPhoneLabel(x, y, width, height, viewportWidth, viewportHeight,
  {warning = false, equipment = false, margin = 8} = {}) {
  // Match the host's label transforms: centered labels, warnings above their
  // anchor, and legacy equipment warnings ending at their anchor on phones.
  const horizontal = equipment ? 1 : .5;
  const vertical = equipment ? 0 : warning ? 1 : .5;
  const offsetY = warning && !equipment ? -5 : 0;
  const clamp = (value, low, high) => Math.max(low, Math.min(Math.max(low, high), value));
  return {
    left: clamp(x, margin + width * horizontal, viewportWidth - margin - width * (1 - horizontal)),
    top: clamp(y, margin + height * vertical - offsetY, viewportHeight - margin - height * (1 - vertical) - offsetY),
  };
}

const labelOffsets = [{dx:0, dy:0}];
for (let dy = -144; dy <= 144; dy += 8) for (let dx = -144; dx <= 144; dx += 8) {
  if (dx || dy) labelOffsets.push({dx, dy});
}
labelOffsets.sort((a, b) => a.dx * a.dx + a.dy * a.dy - b.dx * b.dx - b.dy * b.dy
  || a.dy - b.dy || Math.abs(a.dx) - Math.abs(b.dx) || a.dx - b.dx);

// Will, 2026-10-08: pond names take priority; move presentation boxes only.
// Fixed order and half-pixel projection keep a stationary camera stationary.
export function layoutPondLabels(rows, viewportWidth, viewportHeight, obstacles = []) {
  const margin = 8, gap = 4;
  const intersects = (a, b) => a.left < b.left + b.width + gap && a.left + a.width + gap > b.left
    && a.top < b.top + b.height + gap && a.top + a.height + gap > b.top;
  const ordered = rows.map((row, order) => ({...row, order}))
    .sort((a, b) => a.priority - b.priority || a.order - b.order);
  const place = sequence => {
    const occupied = [...obstacles], result = new Map();
    for (const row of sequence) {
      const {id, width, height} = row;
      const clamp = (value, high) => Math.max(margin, Math.min(high, value));
      const left = clamp(Math.round((row.x - width / 2) * 2) / 2, viewportWidth - margin - width);
      const top = clamp(Math.round((row.y - (row.above ? height + 5 : height / 2)) * 2) / 2,
        viewportHeight - margin - height);
      let placement = {id, left, top, width, height, hidden:true};
      const distance = row.priority === 0 ? 144 : 96;
      for (const {dx, dy} of labelOffsets) {
        if (dx * dx + dy * dy > distance * distance) continue;
        const candidate = {id, left:left + dx, top:top + dy, width, height, hidden:false};
        if (candidate.left < margin || candidate.top < margin
          || candidate.left + width > viewportWidth - margin
          || candidate.top + height > viewportHeight - margin
          || occupied.some(box => intersects(candidate, box))) continue;
        placement = candidate; occupied.push(candidate); break;
      }
      result.set(id, placement);
    }
    return result;
  };
  let result = place(ordered);
  const ponds = ordered.filter(row => row.priority === 0);
  const others = ordered.filter(row => row.priority !== 0);
  const count = placements => ponds.filter(row => !placements.get(row.id).hidden).length;
  // Three pond names can fit even when the first greedy choice blocks the
  // third. Retry their fixed orders before yielding any pond's space.
  for (const sequence of [ponds, [...ponds].reverse()]) {
    for (let start = 0; start < sequence.length && count(result) < ponds.length; start++) {
      const candidate = place([...sequence.slice(start), ...sequence.slice(0, start), ...others]);
      if (count(candidate) > count(result)) result = candidate;
    }
  }
  return rows.map(row => result.get(row.id));
}

export default async function install(api) {
  const manifest = await (await fetch(window.DT_assetUrl(api.site.contextLayerManifest))).json();
  const layer = manifest.layers['supported-labels'];
  const catalog = await (await fetch(window.DT_assetUrl(layer.path))).json();
  const ids = new Set(manifest.target_face_ids);
  const overlay = document.createElement('div'); overlay.className = 'pond-footprint-labels';
  overlay.classList.add('pond-label-layout');
  const leaders = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  leaders.classList.add('pond-label-leaders'); leaders.setAttribute('aria-hidden', 'true');
  overlay.append(leaders);
  const labels = catalog.filter(row => ids.has(row.id) || api.site.farmPondHtmlContextLabels === true
    && row.type === 'candidate-context').map(row => {
    const element = document.createElement('span'); element.className = 'pond-footprint-label';
    element.dataset.entityId = row.id; element.textContent = row.name.replace(/（模擬）/g, '').trim();
    if (row.type === 'candidate-context') element.classList.add('pond-context-label');
    overlay.append(element);
    return {id: row.id, element, priority: ids.has(row.id) ? 0 : 2,
      anchor: new api.THREE.Vector3(row.x, row.y, row.z)};
  });
  const pondLabels = labels.filter(row => ids.has(row.id));
  const replacedIds = new Set([...labels.map(row => row.id), 'yilan-workshop-context']);
  const renderLabel = label => {
    const row = label.statusRow; if (!row) return;
    const status = document.createElement('span'); status.className = 'pond-label-status';
    status.textContent = row.status ? ` · ${row.status}` : row.warning ? ` · ⚠ ${row.warning}` : '';
    const equipment = document.createElement('span'); equipment.className = 'pond-label-equipment';
    equipment.textContent = label.equipmentWarning ?? '';
    label.element.replaceChildren(document.createTextNode(row.label), status, equipment);
    label.element.setAttribute('aria-label', `${row.label}${row.status ? ` · ${row.status}` : row.warning ? ` · ${row.warning}` : ''} ${equipment.textContent}`.trim());
    label.element.classList.toggle('pond-label-warning', !row.degraded && (!!row.warning || !!equipment.textContent));
    label.element.classList.toggle('pond-label-degraded', !!row.degraded);
  };
  // Embed mode admits overlays inside its existing canvas container.
  document.getElementById('canvas-container').append(overlay);
  const replaced = [];
  const replaceLabels = () => api.scene.traverse(sprite => {
    if (sprite.isSprite && sprite.userData.context_id === layer.stable_id &&
        replacedIds.has(sprite.userData.label_id) &&
        !replaced.some(([known]) => known === sprite)) {
      replaced.push([sprite, sprite.material.opacity]); sprite.material.opacity = 0;
    }
  });
  replaceLabels();
  // DT's supported progressive loader can deliver its labels after this
  // overlay. Apply the same presentation replacement when details finish.
  window.addEventListener('dt:details-loaded', replaceLabels);
  api.onAppCommand((name, rows) => {
    if (name !== 'farm-pond-label-status') return;
    for (const label of pondLabels) {
      const row = rows.find(row => row.id === label.id); if (!row) continue;
      label.statusRow = row; renderLabel(label);
    }
  });
  // Camera projection affects only HTML label placement. Static catalog anchors
  // stay static; the host sends statuses from the selected verified frame.
  const offFrame = api.onFrame(() => {
    const visible = [];
    for (const row of labels) {
      if (row.model) row.model.getWorldPosition(row.anchor);
      const point = row.anchor.clone().project(api.camera);
      row.element.hidden = row.warningOnly && (!row.active || row.merged) || point.z < -1 || point.z > 1 || Math.abs(point.x) > 1 || Math.abs(point.y) > 1;
      if (row.model) {
        // Model plaques follow the already-rendered canonical twin root. This
        // projects its existing artwork anchor; it does not set any transform.
        for (let object = row.model; object; object = object.parent) if (!object.visible) row.element.hidden = true;
        if (api.camera.position.distanceTo(row.anchor) > 350) row.element.hidden = true;
      }
      if (row.element.hidden) { if (row.leader) row.leader.style.display = 'none'; continue; }
      row.x = (point.x + 1) * innerWidth / 2; row.y = (1 - point.y) * innerHeight / 2;
      row.element.style.maxWidth = `${Math.max(0, innerWidth - 16)}px`;
      const rect = row.element.getBoundingClientRect();
      visible.push({id:row.id, x:row.x, y:row.y, width:rect.width, height:rect.height,
        priority:row.priority, above:row.element.classList.contains('pond-label-warning')});
    }
    const obstacles = [];
    const reserve = (element, offsetX = 0, offsetY = 0, scaleX = 1, scaleY = 1) => {
      const rect = element.getBoundingClientRect(), style = element.ownerDocument.defaultView.getComputedStyle(element);
      if (!rect.width || !rect.height || style.visibility === 'hidden' || style.display === 'none') return;
      const box = {left:(rect.left - offsetX) * scaleX, top:(rect.top - offsetY) * scaleY,
        width:rect.width * scaleX, height:rect.height * scaleY};
      if (box.left < innerWidth && box.top < innerHeight && box.left + box.width > 0 && box.top + box.height > 0) obstacles.push(box);
    };
    for (const element of document.querySelectorAll('#dt-embed-navigation')) reserve(element);
    // Same-origin host chips occupy the same pixels as the iframe. Reserve
    // their actual rectangles, including wrapped chapter-end readings.
    const frame = window.frameElement;
    if (frame) {
      const rect = frame.getBoundingClientRect();
      for (const element of frame.parentElement.querySelectorAll('.pond-map-status > *, .farm-credit, .farm-credit-full')) {
        reserve(element, rect.left, rect.top, innerWidth / rect.width, innerHeight / rect.height);
      }
    }
    const placements = layoutPondLabels(visible, innerWidth, innerHeight, obstacles);
    for (const box of placements) {
      const row = labels.find(row => row.id === box.id);
      row.element.hidden = box.hidden;
      row.element.style.left = `${box.left}px`; row.element.style.top = `${box.top}px`;
      if (!row.leader) {
        row.leader = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        row.leader.dataset.entityId = row.id; leaders.append(row.leader);
      }
      const endX = Math.max(box.left, Math.min(box.left + box.width, row.x));
      const endY = Math.max(box.top, Math.min(box.top + box.height, row.y));
      row.leader.style.display = box.hidden || Math.hypot(endX - row.x, endY - row.y) < 6 ? 'none' : '';
      for (const [name, value] of Object.entries({x1:row.x, y1:row.y, x2:endX, y2:endY})) row.leader.setAttribute(name, value);
    }
  });
  let disposeWorld;
  const worldPath = new URLSearchParams(location.search).get('pondWorld');
  if (worldPath) {
    const binding = manifest.outputs?.find(row => row.path === worldPath);
    if (!binding) throw new Error('Pond world needs its packaged source binding: Will, 2026-10-04, requires scene provenance');
    const response = await fetch(window.DT_assetUrl(worldPath));
    if (!response.ok) throw new Error('Cannot load the site-authored simulated pond world');
    const bytes = await response.arrayBuffer();
    const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
      .map(value => value.toString(16).padStart(2, '0')).join('');
    if (digest !== binding.sha256) throw new Error('Pond world source differs from its packaged binding');
    const config = JSON.parse(new TextDecoder().decode(bytes));
    const {default: installWorld, COMMAND} = await import('./pond-world.js');
    const canonicalTwins = config.twin_inventory_version === 1;
    // New twins use the renderer's individual red markers at canonical
    // positions; legacy worlds retain their original static warning labels.
    const equipmentLabels = (canonicalTwins ? [] : config.assets.filter(row => row.kind === 'aerator')).map(row => {
      const element = document.createElement('span');
      element.className = 'pond-footprint-label pond-equipment-warning pond-label-warning';
      element.dataset.entityId = row.id; element.hidden = true;
      element.textContent = `⚠ ${row.label.replace(/（模擬）/g, '').trim()}`;
      element.setAttribute('aria-label', `${row.label} · 故障`);
      overlay.append(element);
      const label = {id:row.id, element, priority:1, anchor:new api.THREE.Vector3(...row.position), warningOnly:true, active:false};
      label.anchor.z += 3;
      labels.push(label); return label;
    });
    api.onAppCommand((name, payload) => {
      if (name !== COMMAND) return;
      const faults = (payload.events ?? []).filter(row => row.kind === 'equipment-fault');
      const subjects = new Set(faults.flatMap(row => row.subjectIds));
      const states = new Map((payload.equipment ?? []).map(row => [row.id, row.state]));
      for (const label of pondLabels) {
        // Merge only subjects explicitly joined by the canonical fault event.
        // Static proximity or equipment numbers never create a relationship.
        const affected = faults.filter(event => event.subjectIds.includes(label.id));
        if (canonicalTwins) {
          const stopped = config.assets.filter(row => row.kind === 'aerator' && states.has(row.id)
            && !['on', 'running'].includes(states.get(row.id))
            && affected.some(event => event.subjectIds.includes(row.id)));
          label.equipmentWarning = stopped.length ? `原 ${stopped.length} 台水車停機` : '';
        } else {
          label.equipmentWarning = equipmentLabels.filter(equipment => affected.some(event => event.subjectIds.includes(equipment.id)))
            .map(equipment => equipment.element.textContent.replace(/^⚠ /, '') + '故障').join('、');
        }
        renderLabel(label);
      }
      for (const label of equipmentLabels) {
        label.active = subjects.has(label.id);
        label.merged = faults.some(event => event.subjectIds.includes(label.id) && pondLabels.some(pond => event.subjectIds.includes(pond.id)));
      }
    });
    disposeWorld = await installWorld(api, config);
    if (api.site.farmPondHtmlContextLabels === true) {
      // Will's 2026-10-07 request includes every blurred label. These two
      // plaques otherwise shrink raster text to a few pixels in close views.
      api.scene.getObjectByName('farm-pond-world')?.traverse(sprite => {
        if (!sprite.isSprite || sprite.name !== 'simulated-twin-presentation-label') return;
        const element = document.createElement('span'); element.className = 'pond-footprint-label pond-model-label';
        element.textContent = sprite.userData.label;
        if (!element.textContent.includes('模擬')) element.textContent += '（模擬）';
        element.hidden = true; overlay.append(element);
        let twin = sprite;
        while (twin && !twin.userData.entity_id) twin = twin.parent;
        const id = twin?.userData.entity_id || `model-plaque-${labels.length}`;
        element.dataset.entityId = id;
        if (sprite.userData.source_ref) element.dataset.sourceRef = sprite.userData.source_ref;
        labels.push({id, element, priority:1, model: sprite, anchor: new api.THREE.Vector3()});
        replaced.push([sprite, sprite.material.opacity]); sprite.material.opacity = 0;
      });
    }
  }
  api.appEvent('farm-pond-labels-ready', {});
  return () => {
    offFrame?.();
    disposeWorld?.();
    window.removeEventListener('dt:details-loaded', replaceLabels);
    overlay.remove();
    for (const [sprite, opacity] of replaced) sprite.material.opacity = opacity;
  };
}
