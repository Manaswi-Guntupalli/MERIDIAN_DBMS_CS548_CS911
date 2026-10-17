import {afterAll,it,expect,vi} from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const mock=vi.hoisted(()=>({find:vi.fn().mockResolvedValue([])}));
vi.mock('../src/lib/prisma.js',()=>({prisma:{document:{findMany:mock.find}}}));
let root:string;
afterAll(async()=>{
  vi.unstubAllEnvs();
  if(root && path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep)) await fs.rm(root,{recursive:true,force:true});
});
it('retention preserves unknown storage by default and only purges old orphans after explicit opt-in',async()=>{
  root=await fs.mkdtemp(path.join(os.tmpdir(),'meridian-retention-'));
  vi.stubEnv('LUMEN_STORAGE_DIR',root);vi.stubEnv('LUMEN_PURGE_ORPHANS','false');
  const old=path.join(root,'old-orphan');const fresh=path.join(root,'fresh-orphan');
  await fs.mkdir(old);await fs.mkdir(fresh);await fs.writeFile(path.join(old,'original.pdf'),'synthetic');
  await fs.utimes(old,new Date('2000-01-01'),new Date('2000-01-01'));
  const {runRetentionSweep}=await import('../src/services/lumen/storage.js');
  expect((await runRetentionSweep()).removedOrphans).toBe(0);
  expect(await fs.readFile(path.join(old,'original.pdf'),'utf8')).toBe('synthetic');
  vi.stubEnv('LUMEN_PURGE_ORPHANS','true');expect((await runRetentionSweep()).removedOrphans).toBe(1);
  expect((await fs.stat(fresh)).isDirectory()).toBe(true);
});
