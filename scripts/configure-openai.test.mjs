import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { saveOpenAIKey } from './configure-openai.mjs';

test('rotates only the OpenAI key, preserving DB, auth and document encryption settings', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'meridian-ai-'));
  try {
    const file = path.join(dir, '.env');
    const other = 'DATABASE_URL=postgresql://localhost/demo\r\nJWT_SECRET=unchanged\r\nLUMEN_STORAGE_KEY=unchanged\r\n';
    writeFileSync(file, other + 'OPENAI_API_KEY=old\r\nOPENAI_MODEL=gpt-4o-mini\r\n');
    saveOpenAIKey(file, 'sk-fictional-test-key-not-a-real-credential');
    assert.equal(readFileSync(file, 'utf8'), other + 'OPENAI_API_KEY=sk-fictional-test-key-not-a-real-credential\r\nOPENAI_MODEL=gpt-4o-mini\r\n');
    assert.throws(() => saveOpenAIKey(file, 'bad\nJWT_SECRET=changed'));
    assert.ok(readFileSync(file, 'utf8').startsWith(other));
    saveOpenAIKey(file, 'sk-another-fictional-test-credential');
    assert.equal((readFileSync(file, 'utf8').match(/OPENAI_API_KEY=/g) ?? []).length, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
