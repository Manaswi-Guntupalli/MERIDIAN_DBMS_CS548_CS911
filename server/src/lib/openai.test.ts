import { beforeEach, describe, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({
  create: vi.fn(), constructor: vi.fn(),
  env: { openaiKey: 'sk-fictional-test-key', openaiModel: 'gpt-4o-mini', aiEnabled: true },
}));
vi.mock('../config/env.js', () => ({ env: mock.env }));
vi.mock('openai', () => ({ default: vi.fn(function (options) {
  mock.constructor(options);
  return { chat: { completions: { create: mock.create } } };
}) }));

let ai: typeof import('./openai.js');
const response = (content: string, finish_reason = 'stop') => ({ choices: [{ finish_reason, message: { content } }] });
beforeEach(async () => {
  vi.resetModules(); vi.clearAllMocks();
  mock.env.aiEnabled = true;
  ai = await import('./openai.js');
});

describe('server OpenAI boundary', () => {
  it('makes no provider calls without configuration', async () => {
    mock.env.aiEnabled = false;
    expect(await ai.chatText('system', 'user')).toBeNull();
    expect(await ai.checkAIConnection()).toMatchObject({ ok: false, code: 'not_configured' });
    expect(mock.constructor).not.toHaveBeenCalled();
  });
  it('bounds latency/output, disables storage/retries and reuses a server-only client', async () => {
    mock.create.mockResolvedValue(response('  A school summary.  '));
    expect(await ai.chatText('system', 'facts')).toBe('A school summary.');
    await ai.chatText('system', 'facts');
    expect(mock.constructor).toHaveBeenCalledTimes(1);
    expect(mock.constructor).toHaveBeenCalledWith({ apiKey: mock.env.openaiKey, timeout: 12000, maxRetries: 0 });
    expect(mock.create).toHaveBeenCalledWith(expect.objectContaining({ model: 'gpt-4o-mini', store: false, max_completion_tokens: 1600 }));
    expect(JSON.stringify(ai.aiConfiguration())).not.toContain(mock.env.openaiKey);
  });
  it('accepts valid JSON objects and rejects malformed/array/null JSON', async () => {
    mock.create.mockResolvedValueOnce(response('{"intent":"fees"}'));
    expect(await ai.chatJSON('Return JSON', 'question')).toEqual({ intent: 'fees' });
    expect(mock.create.mock.calls[0][0].response_format).toEqual({ type: 'json_object' });
    for (const text of ['{bad', '[]', 'null', '42']) {
      mock.create.mockResolvedValueOnce(response(text));
      expect(await ai.chatJSON('Return JSON', 'question')).toBeNull();
    }
  });
  it('discards token-truncated, refused and empty output', async () => {
    for (const result of [response('{"fields":', 'length'), response('', 'stop'),
      { choices: [{ finish_reason: 'stop', message: { content: 'unsafe', refusal: 'refused' } }] }]) {
      mock.create.mockResolvedValueOnce(result);
      expect(await ai.chatText('system', 'user')).toBeNull();
    }
  });
  it.each([
    [{ status: 401 }, 'authentication'], [{ status: 403 }, 'permission'],
    [{ status: 429, code: 'insufficient_quota' }, 'quota'], [{ status: 429 }, 'rate_limit'],
    [{ name: 'APIConnectionTimeoutError' }, 'timeout'], [{ status: 503 }, 'unavailable'],
    [{ name: 'APIConnectionError' }, 'unavailable'], [{ status: 400 }, 'request_failed'],
  ])('classifies provider errors without leaking credentials or prompts (%j)', async (error, code) => {
    const sensitive = 'private-school-text-and-secret';
    mock.create.mockRejectedValue({ ...error, message: sensitive });
    const log = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      expect(await ai.chatText('system', sensitive)).toBeNull();
      const result = await ai.checkAIConnection();
      expect(result).toMatchObject({ ok: false, code });
      expect(JSON.stringify([result, log.mock.calls])).not.toContain(sensitive);
    } finally { log.mockRestore(); }
  });
  it('accepts a valid connection response even when the model adds punctuation', async () => {
    mock.create.mockResolvedValue(response('OK.'));
    expect(await ai.checkAIConnection()).toMatchObject({ ok: true, code: 'connected' });
    expect(mock.create).toHaveBeenCalledWith(expect.objectContaining({ max_completion_tokens: 16, store: false, messages: [{ role: 'user', content: 'Reply with exactly OK.' }] }));
  });
});
