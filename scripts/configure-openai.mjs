// Hidden terminal input: credentials never belong in a command argument or chat.
import { readFileSync, writeFileSync } from 'node:fs';
import { emitKeypressEvents } from 'node:readline';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export function saveOpenAIKey(file, key) {
  if (!/^sk-[A-Za-z0-9_-]{20,}$/.test(key)) throw new Error('That does not look like an OpenAI API key. Nothing was changed.');
  const previous = readFileSync(file, 'utf8');
  const lines = previous.split(/\r?\n/);
  let found = false;
  const updated = lines.map(line => {
    if (!/^\s*(?:export\s+)?OPENAI_API_KEY\s*=/.test(line)) return line;
    if (found) return null;
    found = true;
    return `OPENAI_API_KEY=${key}`;
  }).filter(line => line !== null);
  if (!found) updated.push(`OPENAI_API_KEY=${key}`);
  writeFileSync(file, updated.join(previous.includes('\r\n') ? '\r\n' : '\n'), { mode: 0o600 });
}

async function hiddenKey() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('Run this command in an interactive terminal.');
  process.stdout.write('Paste your NEW OpenAI API key (hidden), then press Enter: ');
  emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    const finish = () => {
      process.stdin.off('keypress', onKey);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write('\n');
    };
    function onKey(text, key) {
      if (key?.ctrl && key.name === 'c') { finish(); reject(new Error('Cancelled. Nothing was changed.')); }
      else if (key?.name === 'return' || key?.name === 'enter') { finish(); resolve(value.trim()); }
      else if (key?.name === 'backspace') value = value.slice(0, -1);
      else if (!key?.ctrl && !key?.meta && text && !/[\x00-\x1f\x7f]/.test(text)) value += text;
    }
    process.stdin.on('keypress', onKey);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const file = fileURLToPath(new URL('../server/.env', import.meta.url));
    // Fail before asking for the key if local configuration is absent.
    readFileSync(file, 'utf8');
    saveOpenAIKey(file, await hiddenKey());
    console.log('Saved in the ignored server/.env only. Restart API and intelligence services.');
    console.log('Super Admin: Settings → OpenAI connection → Test connection.');
  } catch (error) {
    console.error(error.code === 'ENOENT' ? 'Run npm run configure:local first.' : error.message);
    process.exitCode = 1;
  }
}
