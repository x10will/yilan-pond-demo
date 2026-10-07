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

export default async function install(api) {
  const manifest = await (await fetch(window.DT_assetUrl(api.site.contextLayerManifest))).json();
  const layer = manifest.layers['supported-labels'];
  const catalog = await (await fetch(window.DT_assetUrl(layer.path))).json();
  const ids = new Set(manifest.target_face_ids);
  const overlay = document.createElement('div'); overlay.className = 'pond-footprint-labels';
  const labels = catalog.filter(row => ids.has(row.id) || api.site.farmPondHtmlContextLabels === true
    && row.type === 'candidate-context').map(row => {
    const element = document.createElement('span'); element.className = 'pond-footprint-label';
    element.dataset.entityId = row.id; element.textContent = row.name.replace(/（模擬）/g, '').trim();
    if (row.type === 'candidate-context') element.classList.add('pond-context-label');
    overlay.append(element);
    return {id: row.id, element, anchor: new api.THREE.Vector3(row.x, row.y, row.z)};
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
  api.onFrame(() => {
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
      const phoneWidth = innerWidth <= 767 ? innerWidth : null;
      if (row.phoneWidth !== phoneWidth) {
        row.phoneWidth = phoneWidth;
        // Intrinsic width prevents absolute shrink-to-fit from collapsing a
        // label near the right edge before its position is clamped.
        row.element.style.width = phoneWidth ? 'max-content' : '';
        row.element.style.maxWidth = phoneWidth ? `${Math.max(0, phoneWidth - 16)}px` : '';
        row.element.style.whiteSpace = phoneWidth ? 'normal' : '';
        row.element.style.overflowWrap = phoneWidth ? 'anywhere' : '';
        row.element.style.boxSizing = phoneWidth ? 'border-box' : '';
      }
      let left = (point.x + 1) * innerWidth / 2, top = (1 - point.y) * innerHeight / 2;
      if (phoneWidth && !row.element.hidden) {
        const position = clampPondPhoneLabel(left, top, row.element.offsetWidth, row.element.offsetHeight,
          innerWidth, innerHeight, {warning: row.element.classList.contains('pond-label-warning'),
            equipment: row.element.classList.contains('pond-equipment-warning')});
        left = position.left; top = position.top;
      }
      row.element.style.left = `${left}px`;
      row.element.style.top = `${top}px`;
    }
    // The two nearby model plaques can share screen space at desktop scaling.
    // Separate their text boxes only; their artwork/world anchors stay intact.
    const plaques = labels.filter(row => row.model && !row.element.hidden);
    if (plaques.length === 2) {
      const first = plaques[0].element.getBoundingClientRect();
      const second = plaques[1].element.getBoundingClientRect();
      if (first.left < second.right && first.right > second.left &&
          first.top < second.bottom && first.bottom > second.top) {
        const element = plaques[0].element;
        element.style.top = `${parseFloat(element.style.top) - (first.bottom - second.top) - 4}px`;
      }
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
      const label = {id:row.id, element, anchor:new api.THREE.Vector3(...row.position), warningOnly:true, active:false};
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
        labels.push({element, model: sprite, anchor: new api.THREE.Vector3()});
        replaced.push([sprite, sprite.material.opacity]); sprite.material.opacity = 0;
      });
    }
  }
  api.appEvent('farm-pond-labels-ready', {});
  return () => {
    disposeWorld?.();
    window.removeEventListener('dt:details-loaded', replaceLabels);
    overlay.remove();
    for (const [sprite, opacity] of replaced) sprite.material.opacity = opacity;
  };
}
