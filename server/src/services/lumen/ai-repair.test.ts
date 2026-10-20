import { describe, expect, it, vi } from 'vitest';
import { aiRefine } from './postprocess.js';
import { chatJSON } from '../../lib/openai.js';
import type { DocTemplate, ExtractedValue, PageResult } from './types.js';
vi.mock('../../lib/openai.js', () => ({ chatJSON: vi.fn() }));
const template: DocTemplate = { type: 'TEST', label: 'Test', signals: [], fields: [
  { key: 'name', label: 'Name', type: 'name', anchors: [] },
  { key: 'clean', label: 'Clean name', type: 'name', anchors: [] },
] };
function fields(): ExtractedValue[] {
  return ['name', 'clean'].map((key, i) => ({ key, label: key, value: 'Ravi Kumar', rawValue: 'Ravi Kumar',
    confidence: i ? .99 : .6, ocrConfidence: .9, page: 0, crop: { x: 0, y: 0, w: 1, h: 1 },
    status: 'REVIEW', source: 'OCR', valid: true, corrected: false, expected: true }));
}
const pages: PageResult[] = [{ index: 0, width: 800, height: 1000, source: 'OCR', rotation: 0,
  skewDeg: 0, ocrConfidence: .9, words: [], lines: [], text: 'Ravi Kumar Ravi Kumari', quality: {
  sharpness: 1, contrast: 1, dpi: 300, inkCoverage: .1, verdict: 'GOOD', notes: [],
} }];
describe('Lumen AI response boundary', () => {
  it('applies a supported, valid repair while keeping it in human review', async () => {
    vi.mocked(chatJSON).mockResolvedValue({ fields: [{ key: 'name', value: 'Ravi Kumari' }] });
    const input = fields();
    input[0].confidence = .3;
    const result = await aiRefine(template, input, pages);
    expect(result.fields[0]).toMatchObject({ value: 'Ravi Kumari', source: 'AI', corrected: true, valid: true, status: 'REVIEW' });
  });
  it('ignores malformed shapes and malformed field values instead of breaking extraction', async () => {
    for (const reply of [{ fields: 'invalid' }, { fields: [null, { key: 'name', value: 42 }] }]) {
      vi.mocked(chatJSON).mockResolvedValue(reply);
      const input = fields();
      expect((await aiRefine(template, input, pages)).fields).toEqual(input);
    }
  });
  it('never edits a high-confidence field the model was not asked to repair', async () => {
    vi.mocked(chatJSON).mockResolvedValue({ fields: [{ key: 'clean', value: 'Ravi Kumari' }] });
    const input = fields();
    await aiRefine(template, input, pages);
    expect(input[1].value).toBe('Ravi Kumar');
  });
  it('keeps unsupported fabricated values out of the extracted record', async () => {
    vi.mocked(chatJSON).mockResolvedValue({ fields: [{ key: 'name', value: 'Elizabeth Montgomery' }] });
    const input = fields();
    const result = await aiRefine(template, input, pages);
    expect(result.fields[0].value).toBe('Ravi Kumar');
    expect(result.insights.some(i => i.message.includes('discarded'))).toBe(true);
  });
});
