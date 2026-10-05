import {notificationsPanel} from './panels/notifications.js';
import {provenancePanel} from './panels/provenance.js';
import {scenarioFrom} from './panels/scenario.js';
import {siteFrom} from './site.js';
import {telemetryPanels} from './panels/telemetry.js';
import {pondPanels, pondPresentation} from './panels/pond.js';

const site = siteFrom();

function mapUrl(search = globalThis.location?.search) {
  const site = siteFrom(search);
  const url = new URL(`./${globalThis.FARM_DEPLOYMENT?.dtBase || 'dt/'}docs/viewer-3d/index.html?site=${encodeURIComponent(site.site_id)}&canonical=1&embed=1&compactNav=1`, import.meta.url);
  const requested = new URLSearchParams(search || '').get('scenario');
  if (pondPresentation(site)) {
    const viewerSite = scenarioFrom(search).scenario?.viewer_site_id;
    if (viewerSite) url.searchParams.set('site', viewerSite);
    url.searchParams.append('ext', new URL('./map-ext/pond-labels.js', import.meta.url).href);
    if (site.presentation.world?.config) url.searchParams.set('pondWorld', site.presentation.world.config);
  }
  if (site.site_id !== 'farm') {
    if (requested !== null) url.searchParams.set('scenario', requested);
    return url.href;
  }
    return url.href;
}
export {mapUrl};

const baseManifest = {
  // Each simulation remembers its layout. Desktop keeps both named panels;
  // phone starts with the map and only the active use case's panel.
  version: 1, title: '智慧化農業管理平台', subtitle: '國立屏東科技大學 · 模擬資料原型',
  locale: 'zh-Hant', locales: ['zh-Hant', 'en'], apiBase: './api/',
  // Same-origin DT viewer in embed mode, relative to the app: run.py mounts dt/* beside
  // the app, and the static build copies it to the dt/<id>/ its deployment-config.js names,
  // so any base path works. compactNav=1 asks
  // the viewer for its compact phone navigation (DT embed-098f224e and later; older
  // generations ignore it).
  // The page's scenario goes to the viewer as &scenario=<id> (none for 總覽); a refused value
  // also gives the viewer a refused scenario, never a different candidate.
  // 巡田 loads its status and numbered-stop module through DT's same-origin ?ext= extension.
  mapUrl: mapUrl(),
  // The ten-minute canonical demonstration.
  clock: {duration: 600000, rate: 1, labelFormat: t => { const s = Math.floor(t / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }, loop: false, step: 100000, rates: [1, 10, 60]},
  streams: {},
  theme: {accent: '#6fae5b'},
};

export const manifest = {...baseManifest, panelTypes:{}, catalogue:[], preset:[]};

if (site.site_id !== 'farm') {
  manifest.id = `npust-smart-agriculture-panel-${site.site_id}`;
  manifest.title = site.identity?.title || '國立屏東科技大學「智慧化農業管理平台」';
  manifest.subtitle = site.label;
  delete manifest.layout;
  manifest.panelTypes = {'pond-notifications': notificationsPanel, 'pond-provenance': provenancePanel, ...telemetryPanels};
  manifest.catalogue = [{id: 'map', type: 'map', titleKey: site.label, icon: '⌖', defaultSize: {w: 8, h: 10}},
    ...Object.values(telemetryPanels).map(panel => ({id: panel.id, type: panel.id, titleKey: panel.title, icon: panel.icon, defaultSize: panel.defaultSize})),
    ...['pond-notifications', 'pond-provenance'].map(id => ({id, type:id,
      titleKey:manifest.panelTypes[id].title, icon:manifest.panelTypes[id].icon, defaultSize:{w:4,h:5}}))];
  manifest.preset = [
    {id: 'map', type: 'map', x: 0, y: 0, w: 8, h: 10},
    {id: 'pond-scada', type: 'pond-scada', x: 8, y: 0, w: 4, h: 10},
    {id: 'pond-water', type: 'pond-water', x: 0, y: 10, w: 8, h: 12},
    {id: 'pond-weather', type: 'pond-weather', x: 8, y: 10, w: 4, h: 12},
    {id: 'pond-notifications', type: 'pond-notifications', x: 0, y: 22, w: 8, h: 5},
    {id: 'pond-provenance', type: 'pond-provenance', x: 8, y: 22, w: 4, h: 5},
  ];
  if (pondPresentation(site)) {
    manifest.id += '-workshop-ui-v1';
    // Canonical envelopes are 100 s apart, but pond samples and pointer seeking
    // live within them. Keep the shared 六堆 clock unchanged.
    manifest.clock = {...manifest.clock, step: 1000};
    manifest.panelTypes = {...manifest.panelTypes, ...pondPanels()};
    manifest.catalogue = manifest.catalogue.map(card => ({...card,
      titleKey: manifest.panelTypes[card.type]?.title || card.titleKey}));
    manifest.preset = [
      {id: 'map', type: 'map', x: 0, y: 0, w: 8, h: 6},
      {id: 'pond-notifications', type: 'pond-notifications', x: 8, y: 0, w: 4, h: 6},
      {id: 'pond-water', type: 'pond-water', x: 0, y: 6, w: 8, h: 4},
      {id: 'pond-scada', type: 'pond-scada', x: 8, y: 6, w: 4, h: 4},
      {id: 'pond-weather', type: 'pond-weather', x: 0, y: 10, w: 8, h: 3},
      {id: 'pond-provenance', type: 'pond-provenance', x: 8, y: 10, w: 4, h: 3},
    ];
    manifest.layout = {phone: {order: ['pond-notifications', 'pond-water', 'pond-scada', 'pond-weather', 'pond-provenance']}};
  }
}
