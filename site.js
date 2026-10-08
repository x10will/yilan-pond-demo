// Site-owned configuration is injected by the launcher/static builder before app modules load.
// Runtime data still enters exclusively through DT's verified canonical candidate loader.
export const FARM_SITE = {site_id: 'farm', static_mount: 'farm', canonical_mount: 'farm-canonical'};

export function siteFrom(search = globalThis.location?.search, deployment = globalThis.FARM_DEPLOYMENT) {
  const configured = deployment?.siteConfig;
  const requested = new URLSearchParams(search || '').get('site');
  // Will's 2026-10-04 content brief: a site-only bundle falls back to its own
  // declared site, before either panels or the viewer request another site's data.
  if (configured?.build_only) return configured;
  if (!requested || requested === configured?.site_id) return configured || FARM_SITE;
  if (requested === 'farm') return FARM_SITE;
  throw new Error(`未宣告的站點「${requested}」。依據 2026-09-30 A2 brief，站點必須使用自己宣告的設定與候選資料。`);
}

export function siteNotices(site = siteFrom()) {
  return site.site_id === 'farm' ? ['本示範資料皆為模擬', '僅供原型展示，非農場操作建議'] : site.notices || [];
}

export function replayPosition(search, clock) {
  const params = new URLSearchParams(search || '');
  const time = Number(params.get('t'));
  const speed = Number(params.get('speed'));
  return {
    time: Number.isFinite(time) ? Math.min(clock.duration, Math.max(0, time)) : 0,
    rate: clock.rates?.includes(speed) ? speed : clock.rate,
  };
}

// Will, 2026-10-08: first-time ponds must show before service-worker precache.
// Called only by the generated pond shell; the shared 六堆 bootstrap is unchanged.
export async function afterPondFirstView(app, paint = callback => requestAnimationFrame(callback)) {
  if (!app.map.readyInfo) await new Promise(resolve => {
    const unsubscribe = app.map.subscribe('ready', () => { unsubscribe?.(); resolve(); });
  });
  // The first callback runs before paint. A second callback proves one browser
  // paint opportunity has completed before downloading the offline precache.
  await new Promise(resolve => paint(() => paint(resolve)));
}

function visibleInScene(object, scene) {
  for (let current = object; current; current = current.parent) {
    if (current.visible === false) return false;
    if (current === scene) return true;
  }
  return false;
}

function visibleContextRoot(root, scene) {
  if (!root || !visibleInScene(root, scene)) return false;
  let visibleGeometry = false;
  root.traverse(object => {
    if (object.isMesh && object.geometry?.attributes?.position?.count > 0 && visibleInScene(object, scene)) {
      visibleGeometry = true;
    }
  });
  return visibleGeometry;
}

// Will, 2026-10-08: keep the first-view cover until ponds and nearby context
// actually exist. This observes DT's canonical presentation; it creates no state.
export async function waitForPondScene(site, frame = globalThis.document?.querySelector('iframe.map-frame'), {
  now = () => performance.now(), readyTimeoutMs = 8000, log = console,
} = {}) {
  const paths = site.presentation?.initial_context || [];
  const started = now(), waitedFor = new Set();
  let renderedFrames = 0, renderedDocument, readySince;
  const finish = (outcome, pending) => {
    const detail = {outcome, elapsedMs: Math.round(now() - started), waitedFor: [...waitedFor], pending};
    log[outcome === 'ready-timeout' ? 'warn' : 'debug']?.('[pond-cover]', detail);
    return detail;
  };
  while (true) {
    const currentFrame = (frame?.isConnected === false ? null : frame)
      || globalThis.document?.querySelector('iframe.map-frame');
    const viewer = currentFrame?.contentWindow;
    const doc = viewer?.document;
    if (doc !== renderedDocument) { renderedFrames = 0; renderedDocument = doc; }
    const status = doc?.getElementById('loading-status')?.textContent || '';
    const fatal = doc?.getElementById('loading-error');
    const error = viewer?.__dtEmbed?.error || (status.startsWith('Error:') ? status : null)
      || (fatal && !fatal.hidden ? doc.getElementById('loading-error-message')?.textContent || 'DT scene load failed' : null);
    if (error) throw new Error(error);
    const dt = viewer?.__dt;
    const world = dt?.scene?.getObjectByName('farm-pond-world');
    const pending = [];
    if (!viewer?.__dtEmbed?.ready) pending.push('viewer-ready');
    if (!doc?.getElementById('loading')?.classList.contains('done')) pending.push('viewer-overlay');
    if (!world?.userData?.canonicalState) pending.push('canonical-world');
    for (const path of paths) {
      const prop = viewer?.DT_SITE?.props?.find(row => row.path === path);
      if (!prop || !visibleContextRoot(dt?.contextRegistry?.get(prop.id)?.root, dt?.scene)) pending.push(`context:${path}`);
    }
    const complete = pending.length === 0;
    if (complete && renderedFrames === 2) return finish('scene-painted', []);
    for (const reason of pending) waitedFor.add(reason);
    if (viewer?.__dtEmbed?.ready) {
      readySince ??= now();
      // Will, 2026-10-09: a ready viewer must never remain behind a stuck cover.
      // This reveals existing presentation only; it does not repair runtime data.
      if (now() - readySince >= readyTimeoutMs) return finish('ready-timeout',
        pending.length ? pending : ['iframe-paint']);
    } else readySince = undefined;
    if (!complete) renderedFrames = 0;
    // An iframe starts at about:blank. Navigation discards that document's RAF
    // callbacks, so a host timer must keep the readiness check alive. Only actual
    // frames from the same loaded document count toward the two-frame reveal.
    const painted = await new Promise(resolve => {
      let settled = false, animation;
      const done = painted => {
        if (settled) return;
        settled = true; clearTimeout(timer);
        if (!painted && viewer?.document === doc) viewer?.cancelAnimationFrame?.(animation);
        resolve(painted);
      };
      const timer = setTimeout(() => done(false), 50);
      animation = viewer ? viewer.requestAnimationFrame(() => done(true))
        : requestAnimationFrame(() => done(true));
    });
    if (complete && painted && viewer?.document === doc && currentFrame?.isConnected !== false) renderedFrames++;
  }
}
