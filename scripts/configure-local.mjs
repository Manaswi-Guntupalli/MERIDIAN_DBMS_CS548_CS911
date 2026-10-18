// Run before npm ci; uses only Node built-ins and never overwrites local settings.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

function settings(file) {
  if (!existsSync(file)) return {};
  return Object.fromEntries(readFileSync(file, 'utf8').split(/\r?\n/).flatMap(line => {
    const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    return match ? [[match[1], match[2].replace(/^(['"])(.*)\1$/, '$2')]] : [];
  }));
}
export function configureLocal(root) {
  const created = [];
  const create = (relative, value) => {
    const file = path.join(root, relative);
    if (existsSync(file)) return;
    writeFileSync(file, value, { flag: 'wx', mode: 0o600 });
    created.push(relative);
  };
  const existingServer = settings(path.join(root, 'server/.env'));
  let priorUrl;
  try { priorUrl = existingServer.DATABASE_URL ? new URL(existingServer.DATABASE_URL) : undefined; } catch { /* Existing files stay untouched. */ }
  create('.env', `# Local Docker PostgreSQL credentials. Never commit this file.\nPOSTGRES_USER=${priorUrl ? decodeURIComponent(priorUrl.username) : 'meridian'}\nPOSTGRES_PASSWORD=${priorUrl ? decodeURIComponent(priorUrl.password) : randomBytes(20).toString('hex')}\nPOSTGRES_DB=${priorUrl?.pathname.slice(1) || 'meridian'}\n`);
  const config = settings(path.join(root, '.env'));
  if (!existsSync(path.join(root, 'server/.env'))) {
    for (const key of ['POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DB']) {
      if (!config[key]) throw new Error(`Set ${key} in the root .env before configuring the server.`);
    }
    const origin = `postgresql://${encodeURIComponent(config.POSTGRES_USER)}:${encodeURIComponent(config.POSTGRES_PASSWORD)}@localhost:5432`;
    const content = readFileSync(path.join(root, 'server/.env.example'), 'utf8')
      .replace(/^DATABASE_URL=.*$/m, `DATABASE_URL="${origin}/${encodeURIComponent(config.POSTGRES_DB)}?schema=public"`)
      .replace(/^TEST_DATABASE_URL=.*$/m, `TEST_DATABASE_URL="${origin}/meridian_test?schema=public"`)
      .replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${randomBytes(32).toString('hex')}`)
      .replace(/^LUMEN_STORAGE_KEY=.*$/m, `LUMEN_STORAGE_KEY=${randomBytes(32).toString('hex')}`);
    create('server/.env', content);
  }
  create('client/.env.local', readFileSync(path.join(root, 'client/.env.example'), 'utf8'));
  return created;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  try {
    const created = configureLocal(root);
    for (const file of created) console.log(`Created ${file}`);
    console.log('Existing configuration preserved. Next: npm ci, then docker compose up -d --wait.');
    console.log('If an existing Docker volume uses different credentials, keep its matching configuration; changing .env does not change stored PostgreSQL passwords.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
