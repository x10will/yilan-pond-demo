// 模擬與出處: the simulation notices plus where every loaded byte came from.
// Each value is read from the file the app actually loaded.
import {APP_BASE, CANONICAL_BASE, DT_BASE, SITE, canonicalAdapter, el, loadJSON, noticeBar} from './farm-data.js';
import {drawPondOxygenModel, localizePondChrome, localizePondPanelOptions, pondPresentation, pondText} from './pond.js';
import {aiNarrationGenerated} from './pond-ai-narration.js';
import {appendPondLoadFailure, installPondPanelMenus} from './pond-presenter.js';

// The static build carries its deployment record in deployment-config.js
// (window.FARM_DEPLOYMENT); run.py writes the same fields to runtime.local.json.
export function deploymentRecord() {
  return globalThis.FARM_DEPLOYMENT ? Promise.resolve(globalThis.FARM_DEPLOYMENT) : loadJSON(new URL('runtime.local.json', APP_BASE).href);
}

const short = value => (typeof value === 'string' ? value.replace(/^sha256:/, '').slice(0, 12) : '—');
// panel-core's licence is UNSET by owner decision (2026-09-24); VENDOR.json spells it in English.
const licence = value => (typeof value === 'string' && value.startsWith('UNSET') ? '未設定' : value || '—');

export const provenancePanel = {
  id: 'pond-provenance', get title() { return pondPresentation(SITE) ? pondText('模擬與出處') : '模擬與出處'; },
  icon: 'ⓘ', defaultSize: {w: 4, h: 5},

  render(container, ctx = {}) {
    const {loadCandidate = () => canonicalAdapter()} = ctx;
    const pond = pondPresentation(SITE);
    const locale = () => ctx.locale || globalThis.document?.documentElement?.lang || 'zh-Hant';
    const chrome = [], failures = [];
    // Register fixed UI explicitly. Source titles, notices and attribution use
    // plain el(), so even an authored string matching a UI label stays intact.
    const ui = (tag, text, cls) => {
      const node = el(tag, typeof text === 'function' ? text(locale()) : text, cls);
      if (pond) {
        chrome.push([node, text]);
        node.textContent = typeof text === 'function' ? text(locale()) : pondText(text, locale());
      }
      return node;
    };
    const root = el('div', null, 'farm-panel');
    const list = el('dl', null, 'pond-provenance');
    let notices;
    if (pond) {
      installPondPanelMenus();
      notices = el('ul', null, 'pond-full-notices');
      for (const text of SITE.notices || []) notices.append(el('li', text));
      const details = el('details', null, 'pond-provenance-notices');
      details.append(ui('summary', '完整模擬與地理聲明'), notices);
      const credits = el('ul', null, 'pond-full-notices');
      for (const credit of SITE.credits || []) {
        const item = el('li');
        if (credit.href) { const link = el('a', credit.text); link.href = credit.href; link.target = '_blank'; link.rel = 'noopener'; item.append(link); }
        else item.textContent = credit.text;
        credits.append(item);
      }
      const attribution = el('details'); attribution.append(ui('summary', '地圖授權 · OSM ODbL／內政部 DTM'), credits);
      root.append(ui('span', '模擬', 'pond-badge'), details, attribution, list);
    } else root.append(noticeBar(), el('p', '非正式候選示範；不提供即時監測、診斷或正式營運服務。', 'farm-caption'), list);
    container.append(root);

    const row = (term, value, href, {authoredTerm = false} = {}) => {
      const dd = el('dd');
      if (href) { const a = typeof value === 'function' ? ui('a', value) : el('a', value); a.href = href; a.target = '_blank'; a.rel = 'noopener'; dd.append(a); }
      else if (typeof value === 'function') {
        dd.textContent = value(locale()); if (pond) chrome.push([dd, value]);
      } else dd.textContent = value;
      list.append(authoredTerm ? el('dt', term) : ui('dt', term), dd);
    };
    const failed = (term, error) => {
      if (!pondPresentation(SITE)) { row(term, `無法讀取（${error.message}）`); return; }
      const value = el('dd');
      appendPondLoadFailure(value, error, locale());
      failures.push([value, error]);
      list.append(ui('dt', term), value);
    };

    const refreshLocale = () => {
      if (!pond) return;
      const selectedLocale = locale();
      for (const [node, text] of chrome) node.textContent = typeof text === 'function' ? text(selectedLocale) : pondText(text, selectedLocale);
      localizePondChrome(root, selectedLocale);
      for (const [node, error] of failures) { node.replaceChildren(); appendPondLoadFailure(node, error, selectedLocale); }
      root.lang = selectedLocale;
      localizePondPanelOptions(root, selectedLocale);
    };
    const localeObserver = pond && globalThis.MutationObserver && globalThis.document?.documentElement
      ? new MutationObserver(refreshLocale) : null;
    localeObserver?.observe(document.documentElement, {attributes:true, attributeFilter:['lang']});
    refreshLocale();

    const ready = (async () => {
      const [runtime, candidate] = await Promise.allSettled([
        deploymentRecord(), loadCandidate(),
      ]);
      if (candidate.status === 'fulfilled') {
        const m = candidate.value.manifest;
        if (notices) for (const text of candidate.value.adapter.project(0).notices || []) {
          if (!(SITE.notices || []).includes(text)) notices.append(el('li', text));
        }
        const revision = SITE.site_id === 'farm' ? `composed ${short(m.composed_revision)}` : `frames ${short(m.frame_set_revision)}`;
        row('候選資料', `${revision} · snapshot ${short(m.snapshot_revision)}`, CANONICAL_BASE + 'manifest.json');
        if (SITE.site_id !== 'farm') {
          const projection = candidate.value.adapter.project(0);
          if (pondPresentation(SITE)) drawPondOxygenModel(root, projection, candidate.value);
          for (const link of projection.provenanceLinks || []) {
            if (pondPresentation(SITE) && /pond-oxygen/.test(link.sourceId)) continue;
            row(link.title, link.title, new URL(link.href, CANONICAL_BASE).href, {authoredTerm:true});
          }
          const narration = candidate.value.artifacts['composed-frames.json']?.canonical_frames?.flatMap(frame => frame.ai_narration || []) || [];
          if (narration.length) {
            const models = [...new Set(narration.map(item => item.lineage?.model_id).filter(Boolean))];
            const generated = narration.filter(aiNarrationGenerated).length;
            row(generated ? 'AI 旁白（模擬情境；非操作建議）' : '腳本備援（A；模擬情境；非操作建議）', selectedLocale => pond && selectedLocale === 'en'
              ? `${models.join('、') || 'No model response'} · Generated ${generated} / Script fallback ${narration.length - generated} · Full prompt and date`
              : `${models.join('、') || '模型未回覆'} · 生成 ${generated} 筆／腳本備援 ${narration.length - generated} 筆 · 完整提示與日期`,
              new URL(narration[0].lineage.frozen_path, CANONICAL_BASE).href);
          }
        }
        for (const [name, file] of [['作物階段呈現裁示', 'crop-health-presentation-decision.md'],
          ['作物階段裁示', 'crop-health-decision.md'], ['擴散裁示', 'pest-spread-decision.md'],
          ['巡田路線裁示', 'patrol-route-decision.md'], ['情境裁示', 'scenario-decision.md'],
          ['跨農場擴散情境裁示', 'spread-scenario-decision.md'], ['蟲害警示裁示', 'pest-alert-decision.md'],
          ['巡田站點裁示', 'patrol-stops-decision.md'], ['巡田觀察文字裁示', 'patrol-observation-decision.md'],
          ['巡田步道網裁示', 'patrol-network-decision.md'], ['情境文字', 'scenario-narration.json'],
          ['逐日影格', 'daily-frames.json'], ['逐日世界', 'daily-world.json'],
          ['巡田裁示', 'patrol-decision.md'], ['巡田狀態聲明', 'patrol-status-declaration.json'],
          ['巡田歷史來源', 'patrol-history-source.json'],
          ['排程與規則來源', 'patrol-profile-source.json'],
          ['建議依據', 'patrol-plan-basis.json'], ['休巡組合索引', 'patrol-days-off-outcomes.json'],
          ['日曆方向', 'patrol-calendar-direction.md']]) {
          if ((m.files || []).some(f => f.path === file))
            row(name, file, CANONICAL_BASE + file);
        }
      } else failed('候選資料', candidate.reason);

      const generation = runtime.status === 'fulfilled' ? runtime.value : null;
      if (generation) {
        try {
          const inventory = await loadJSON(new URL('generation/inventory.json', DT_BASE).href);
          row(pondPresentation(SITE) ? '檢視器版本' : 'Viewer generation', `${generation.generation} · DT ${short(inventory.sourceRevision)}`);
        } catch (error) { failed(pondPresentation(SITE) ? '檢視器版本' : 'Viewer generation', error); }
        // Copied by run.py or the static build from the generation's staging receipt, which is not served.
        const s = generation.staging;
        if (s) row(pondPresentation(SITE) ? '站點資料' : 'Site data', pondPresentation(SITE)
          ? selectedLocale => `${SITE.label?.split('·')[0].trim() || (selectedLocale === 'en' ? 'Pond site' : '魚塭站點')} ${SITE.site_id} · ${selectedLocale === 'en' ? 'Platform code' : '平台程式'} ${short(s.farm_commit)} · DT ${short(s.dt_commit)}${s.status === 'local-assembled' ? (selectedLocale === 'en' ? ' · Locally assembled' : ' · 本機組裝') : ''}`
          : `farm ${short(s.farm_commit)} · DT ${short(s.dt_commit)} · ${s.status}`);
        else row(pondPresentation(SITE) ? '站點資料' : 'Site data', selectedLocale => pond ? pondText('此 generation 沒有 staging 紀錄', selectedLocale) : '此 generation 沒有 staging 紀錄');
        // Copied by run.py or the static build from vendor/panel-core/VENDOR.json, which is not published.
        const v = generation.panelCore;
        if (v) row('panel-core', selectedLocale => pond && selectedLocale === 'en'
          ? `${short(v.sourceCommit)}${v.sourceDirty ? ' (dirty)' : ''} · Licence: ${licence(v.coreLicense) === '未設定' ? 'Unset' : licence(v.coreLicense)}`
          : `${short(v.sourceCommit)}${v.sourceDirty ? '（dirty）' : ''} · 授權：${licence(v.coreLicense)}`);
        else row('panel-core', selectedLocale => pond ? pondText('無法讀取 VENDOR.json 釘選', selectedLocale) : '無法讀取 VENDOR.json 釘選');
        row('AI 提問', pondPresentation(SITE) ? selectedLocale => pondText('即時問答（實驗）需另設端點與金鑰；離線故事使用凍結旁白與腳本備援。', selectedLocale)
          : generation.static ? '靜態版不提供（本機開發版為「模擬 AI」）' : '模擬 AI（fake 模式，非真實模型）');
      } else {
        failed('Viewer generation', runtime.reason);
        failed('panel-core', runtime.reason);
      }
    })().finally(refreshLocale);
    return {root, ready, close: () => localeObserver?.disconnect()};
  },

  update() {},
  describeForAI() {
    return {schemaVersion: 1, kind: 'pond-provenance', visibleFields: ['notices', 'sources'],
      summary: '模擬標示與資料出處（候選資料、裁示、viewer generation、panel-core 版本）；無即時資料。'};
  },
  dispose(view) { view.close?.(); view.root.remove(); },
};
