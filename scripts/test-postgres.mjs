// Isolated local verification only. Production uses PostgreSQL + pgvector in Compose.
import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite-pgvector';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { readFileSync, mkdirSync, readdirSync } from 'node:fs';
const dataDir=process.env.PGLITE_DATA_DIR || 'tmp/postgres-test/data';
const port=Number(process.env.PGLITE_PORT || 55432);
mkdirSync(dataDir,{recursive:true});
const db=await PGlite.create(dataDir,{extensions:{vector}});
const exists=await db.query(`SELECT to_regclass('public."School"') AS name`);
await db.exec('CREATE TABLE IF NOT EXISTS _meridian_local_migrations (name text PRIMARY KEY)');
if(exists.rows[0].name) await db.query(`INSERT INTO _meridian_local_migrations VALUES ('202610150001_relational') ON CONFLICT DO NOTHING`);
for(const name of readdirSync('server/prisma/migrations').filter(x=>/^\d/.test(x)).sort()) {
  const applied=await db.query('SELECT name FROM _meridian_local_migrations WHERE name=$1',[name]);
  if(!applied.rows.length) await db.transaction(async tx=>{
    await tx.exec(readFileSync(`server/prisma/migrations/${name}/migration.sql`,'utf8'));
    await tx.query('INSERT INTO _meridian_local_migrations VALUES ($1)',[name]);
  });
}
await db.exec(readFileSync('database/advanced.sql','utf8'));
await db.exec(readFileSync('database/integrity.sql','utf8'));
const server=new PGLiteSocketServer({db,host:'127.0.0.1',port,maxConnections:100});
await server.start();
console.log(`Isolated PGlite PostgreSQL/pgvector verification server: 127.0.0.1:${port}`);
process.on('SIGINT',async()=>{await server.stop();await db.close();process.exit(0);});
