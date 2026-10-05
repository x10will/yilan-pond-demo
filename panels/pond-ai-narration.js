import {CANONICAL_BASE, el} from './farm-data.js';

// Old fixture candidates retain their historical bytes. Their author-recorded
// text is a scripted fallback, regardless of the old generated status.
export const aiNarrationGenerated = row => row.status === 'generated'
  && row.lineage?.source_kind !== 'recorded-fixture'
  && !/fixture/i.test(row.lineage?.model_id || '');

// The adapter selects narration baked for the reached canonical beat. Rendering
// never changes the original scripted suggestion, operator decision or response.
// The optional factory translates chrome only; authored labels and text use el.
export function appendAINarration(content, projection, {ui = el} = {}) {
  const narration = projection.aiNarration;
  const rows = narration ? [narration.chapter, narration.suggestion].filter(Boolean) : [];
  for (const row of rows.filter(item => item.chapter_id === projection.story?.chapter?.id)) {
    const box = el('article', null, 'pond-suggestion pond-generated-narration');
    const generated = aiNarrationGenerated(row);
    const codexFallback = row.status === 'fallback' && row.lineage?.backend === 'codex-exec';
    const label = generated || codexFallback ? row.label : '腳本備援（A；模擬情境；非操作建議）';
    box.dataset.aiBeat = row.beat_id; box.dataset.aiStatus = generated ? 'generated' : 'fallback';
    box.append(ui('strong', label),
      el('p', row.text, 'pond-event-detail'));
    const chapter = projection.story?.chapters?.find(item => item.id === row.chapter_id) || projection.story?.chapter;
    const event = projection.notifications?.find(item => `event:${item.id}` === row.beat_id);
    const timestamp = row.kind === 'suggestion' ? event?.sampledAt : chapter?.scenario_time;
    const moment = String(timestamp || '').match(/T(\d{2}:\d{2})/)?.[1];
    if (moment) box.append(ui('small', row.kind === 'suggestion' ? `${moment} 提案時` : `章節開始 ${moment}`, 'pond-narration-moment'));
    const info = el('details', null, 'pond-event-source'); info.dataset.detailKey = `ai:${row.beat_id}`;
    info.append(ui('summary', generated ? 'ⓘ AI 生成與出處' : 'ⓘ 腳本備援（A）與出處'));
    const lineage = row.lineage || {};
    info.append(ui('p', `模型：${lineage.model_id || '未生成'} · ${lineage.endpoint_host || lineage.backend || '離線備援'}`),
      ui('p', `日期：${lineage.generated_at || '未提供'} · 人工審閱：${lineage.human_review ? '已標記' : '未標記'}`),
      ui('p', `提示 SHA-256：${lineage.prompt_sha256 || '未提供'}`));
    if (lineage.effort) info.append(ui('p', `推理強度：${lineage.effort}`));
    for (const [scope, accounting] of [['此段', lineage], ['整次生成', lineage.generation_cost_accounting]]) {
      const tokens = accounting?.token_usage?.total_tokens;
      const cost = accounting?.equivalent_cost;
      if (Number.isFinite(tokens)) info.append(ui('p', `${scope} Token 用量：${tokens}`));
      if (Number.isFinite(cost?.low) && Number.isFinite(cost?.high)) {
        const value = `${cost.low.toFixed(2)}–${cost.high.toFixed(2)}`;
        info.append(ui('p', `${scope}等值費用估計：${value} ${cost.unit || ''}`.trim()));
      }
    }
    if (row.validation?.reasons?.length) info.append(ui('p', `保留腳本原因：${row.validation.reasons.join('、')}`));
    if (!generated) info.append(ui('p', codexFallback
      ? '此段沒有採用模型生成文字；凍結檔保留驗證原因與原始腳本備援。'
      : '此段沒有真實模型生成；凍結檔保留備援或作者編寫的測試文字。'));
    const source = ui('a', '完整提示、原始回覆與凍結紀錄');
    source.href = new URL(lineage.frozen_path, CANONICAL_BASE).href;
    source.target = '_blank'; source.rel = 'noopener'; info.append(source);
    box.append(info); content.append(box);
  }
}
