import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { configureLocal } from './configure-local.mjs';

const base = path.resolve('tmp/setup-config-tests');
fs.mkdirSync(base, { recursive: true });
function fixture() {
  const root = fs.mkdtempSync(path.join(base, 'clone-'));
  for (const dir of ['server', 'client']) fs.mkdirSync(path.join(root, dir));
  for (const name of ['server/.env.example', 'client/.env.example']) fs.copyFileSync(name, path.join(root, name));
  return root;
}
function cleanup(root) {
  assert(path.resolve(root).startsWith(base + path.sep));
  fs.rmSync(root, { recursive: true });
}
const read = (root, name) => fs.readFileSync(path.join(root, name), 'utf8');
test('fresh clone gets matching credentials and independent generated secrets', () => {
  const root = fixture();
  try {
    assert.equal(configureLocal(root).length, 3);
    const dockerPassword = read(root, '.env').match(/^POSTGRES_PASSWORD=(.*)$/m)[1];
    const server = read(root, 'server/.env');
    assert(server.includes(`:${dockerPassword}@localhost:5432/meridian?schema=public`));
    assert(server.includes('/meridian_test?schema=public'));
    const jwt = server.match(/^JWT_SECRET=(.*)$/m)[1];
    const storage = server.match(/^LUMEN_STORAGE_KEY=(.*)$/m)[1];
    assert.equal(jwt.length, 64); assert.equal(storage.length, 64); assert.notEqual(jwt, storage);
    assert.match(read(root, 'client/.env.local'), /^NEXT_PUBLIC_SOCKET_ORIGIN=\r?$/m);
  } finally { cleanup(root); }
});
test('rerunning preserves every existing env file byte for byte', () => {
  const root = fixture();
  try {
    configureLocal(root);
    const files = ['.env', 'server/.env', 'client/.env.local'];
    const before = files.map(name => read(root, name));
    assert.deepEqual(configureLocal(root), []);
    assert.deepEqual(files.map(name => read(root, name)), before);
  } finally { cleanup(root); }
});
test('existing Docker credentials are URL encoded into new API configuration', () => {
  const root = fixture();
  try {
    fs.writeFileSync(path.join(root, '.env'), 'POSTGRES_USER=demo\nPOSTGRES_PASSWORD="p@ss:word/#"\nPOSTGRES_DB=custom_demo\n');
    configureLocal(root);
    assert(read(root, 'server/.env').includes('postgresql://demo:p%40ss%3Aword%2F%23@localhost:5432/custom_demo?schema=public'));
  } finally { cleanup(root); }
});
test('creating a missing root config preserves existing server credentials and storage key', () => {
  const root = fixture();
  try {
    const existing = 'DATABASE_URL="postgresql://old:old%40pass@localhost:5432/old_db"\nLUMEN_STORAGE_KEY=keep-this-key\n';
    fs.writeFileSync(path.join(root, 'server/.env'), existing);
    configureLocal(root);
    assert.equal(read(root, 'server/.env'), existing);
    assert(read(root, '.env').includes('POSTGRES_PASSWORD=old@pass'));
  } finally { cleanup(root); }
});
