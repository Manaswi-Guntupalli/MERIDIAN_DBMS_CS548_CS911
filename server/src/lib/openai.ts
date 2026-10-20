import OpenAI from 'openai';
import { env } from '../config/env.js';

// Server only. Website and Flutter consumers use authenticated Meridian APIs.
// Keep individual generation calls short for web and mobile consumers.
let client: OpenAI | null = null;
const TIMEOUT_MS = 12_000;
const MAX_TOKENS = 1_600;

export function getOpenAI(): OpenAI | null {
  if (!env.aiEnabled) return null;
  if (!client) client = new OpenAI({ apiKey: env.openaiKey, timeout: TIMEOUT_MS, maxRetries: 0 });
  return client;
}

export type AIErrorCode = 'not_configured' | 'authentication' | 'permission' | 'quota' |
  'rate_limit' | 'timeout' | 'unavailable' | 'invalid_response' | 'request_failed';

// Never return or log provider error messages: they may contain request details.
function errorCode(error: unknown): AIErrorCode {
  const e = error as { status?: number; code?: string; name?: string } | null;
  if (e?.status === 401) return 'authentication';
  if (e?.status === 403) return 'permission';
  if (e?.status === 429) return e.code === 'insufficient_quota' ? 'quota' : 'rate_limit';
  if (e?.name === 'APIConnectionTimeoutError' || e?.code === 'ETIMEDOUT') return 'timeout';
  if ((e?.status ?? 0) >= 500 || e?.name === 'APIConnectionError') return 'unavailable';
  return 'request_failed';
}

const MESSAGES: Record<AIErrorCode, string> = {
  not_configured: 'OpenAI is disabled. Add a server API key and restart the API and intelligence services.',
  authentication: 'OpenAI rejected the API key. Replace it in server/.env and restart the services.',
  permission: 'The OpenAI project cannot access this model. Check project permissions and OPENAI_MODEL.',
  quota: 'OpenAI quota is exhausted. Check project billing and usage limits.',
  rate_limit: 'OpenAI is rate limited. Wait a moment before trying again.',
  timeout: 'OpenAI took too long to respond. Please try again.',
  unavailable: 'OpenAI is temporarily unreachable. Data-based fallbacks remain available.',
  invalid_response: 'OpenAI returned an incomplete or invalid response. Please try again.',
  request_failed: 'The OpenAI request failed. Check the configured model and project access.',
};

export function aiConfiguration() {
  return { configured: env.aiEnabled, model: env.openaiModel, timeoutMs: TIMEOUT_MS };
}

async function complete(system: string, user: string, json: boolean, temperature: number): Promise<string | null> {
  const ai = getOpenAI();
  if (!ai) return null;
  try {
    const res = await ai.chat.completions.create({
      model: env.openaiModel,
      temperature, max_completion_tokens: MAX_TOKENS, store: false,
      ...(json ? { response_format: { type: 'json_object' as const } } : {}),
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });
    const choice = res.choices[0];
    if (choice?.finish_reason !== 'stop' || choice.message.refusal) return null;
    return choice.message.content?.trim() || null;
  } catch (err) {
    console.warn('[openai] request failed:', errorCode(err));
    return null;
  }
}

/** Invalid/provider-failed JSON never breaks the deterministic pipeline. */
export async function chatJSON<T = unknown>(system: string, user: string, opts: { temperature?: number } = {}): Promise<T | null> {
  const text = await complete(system, user, true, opts.temperature ?? 0.2);
  if (!text) return null;
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as T : null;
  } catch { return null; }
}

export async function chatText(system: string, user: string): Promise<string | null> {
  return complete(system, user, false, 0.4);
}

/** Explicit admin action: fixed synthetic prompt, never school data. */
export async function checkAIConnection() {
  const ai = getOpenAI();
  if (!ai) return { ok: false, code: 'not_configured', message: MESSAGES.not_configured };
  try {
    const res = await ai.chat.completions.create({
      model: env.openaiModel,
      max_completion_tokens: 16, store: false, temperature: 0,
      messages: [{ role: 'user', content: 'Reply with exactly OK.' }],
    });
    const choice = res.choices[0];
    if (choice?.finish_reason !== 'stop' || choice.message.refusal || !choice.message.content?.trim()) {
      return { ok: false, code: 'invalid_response', message: MESSAGES.invalid_response };
    }
    return { ok: true, code: 'connected', message: 'OpenAI responded successfully.' };
  } catch (error) {
    const code = errorCode(error);
    return { ok: false, code, message: MESSAGES[code] };
  }
}
