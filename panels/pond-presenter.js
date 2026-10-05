// Pond-only presenter chrome. This never changes canonical data or panel-core.
const loggedFailures = new Set();
const menuInstallations = new WeakMap();

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text != null) node.textContent = text;
  if (className) node.className = className;
  return node;
}

export function appendPondLoadFailure(target, error, locale = document.documentElement?.lang) {
  const raw = String(error?.stack || error?.message || error);
  const message = String(error?.message || error);
  const english = locale === 'en';
  const box = element('div', null, 'pond-load-failure');
  const status = element('p', english ? 'Simulated data failed to load. Please refresh.'
    : '模擬資料載入失敗，請重新整理', 'farm-status');
  status.setAttribute('role', 'status');
  const details = element('details', null, 'pond-error-details');
  details.append(element('summary', english ? 'Technical details' : '技術細節'), element('pre', raw));
  box.append(status, details);
  target.append(box);
  // Shared candidate loads can reject in several panels. Report that failure
  // once, while keeping its full diagnostic available in each affected panel.
  if (!loggedFailures.has(message)) {
    loggedFailures.add(message);
    console.error('Pond simulated data failed to load', error);
  }
  return box;
}

export function pondMenuPosition(anchor, menu, viewport) {
  const margin = 8;
  const width = Math.min(menu.width, Math.max(0, viewport.width - margin * 2));
  const height = Math.min(menu.height, Math.max(0, viewport.height - margin * 2));
  const left = Math.max(margin, Math.min(anchor.right - width, viewport.width - width - margin));
  const preferredTop = anchor.bottom + 4;
  const top = preferredTop + height <= viewport.height - margin ? preferredTop
    : Math.max(margin, Math.min(anchor.top - height - 4, viewport.height - height - margin));
  return {left, top};
}

export function installPondPanelMenus(root = globalThis.document) {
  if (!root?.addEventListener || !root.querySelectorAll) return () => {};
  if (menuInstallations.has(root)) return menuInstallations.get(root);
  const win = root.defaultView || globalThis.window;
  const openMenus = () => [...root.querySelectorAll('.panel-core-app .panel-menu[open]')];
  const fit = menu => {
    if (!menu.open) return;
    const summary = menu.querySelector('summary');
    const actions = menu.querySelector('.panel-actions');
    if (!summary || !actions) return;
    const viewport = {width: win.innerWidth, height: win.innerHeight};
    actions.style.maxHeight = `${Math.max(0, viewport.height - 16)}px`;
    const position = pondMenuPosition(summary.getBoundingClientRect(), actions.getBoundingClientRect(), viewport);
    actions.style.left = `${position.left}px`;
    actions.style.top = `${position.top}px`;
  };
  const reposition = () => { for (const menu of openMenus()) fit(menu); };
  const toggle = event => {
    if (event.target.matches?.('.panel-menu') && event.target.closest?.('.panel-core-app')) fit(event.target);
  };
  const outside = event => {
    for (const menu of openMenus()) if (!menu.contains(event.target)) menu.open = false;
  };
  const escape = event => {
    if (event.key !== 'Escape') return;
    const menus = openMenus();
    for (const menu of menus) menu.open = false;
    if (menus.length) {
      event.preventDefault();
      menus[0].querySelector('summary')?.focus({preventScroll: true});
    }
  };
  root.addEventListener('toggle', toggle, true);
  root.addEventListener('pointerdown', outside, true);
  root.addEventListener('keydown', escape, true);
  root.addEventListener('scroll', reposition, true);
  win?.addEventListener('resize', reposition);
  const dispose = () => {
    root.removeEventListener('toggle', toggle, true);
    root.removeEventListener('pointerdown', outside, true);
    root.removeEventListener('keydown', escape, true);
    root.removeEventListener('scroll', reposition, true);
    win?.removeEventListener('resize', reposition);
    menuInstallations.delete(root);
  };
  menuInstallations.set(root, dispose);
  return dispose;
}
