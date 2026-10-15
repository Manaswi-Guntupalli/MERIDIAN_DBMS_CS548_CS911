// Isolated local verification only. Production uses PostgreSQL + pgvector in Compose.
import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite-pgvector';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { readFileSync, mkdirSync } from 'node:fs';
mkdirSync('tmp/postgres-test',{recursive:true});
const db=await PGlite.create('tmp/postgres-test/data',{extensions:{vector}});
const exists=await db.query(`SELECT to_regclass('public."School"') AS name`);
if(!exists.rows[0].name)await db.exec(readFileSync('server/prisma/migrations/202610150001_relational/migration.sql','utf8'));
await db.exec(readFileSync('database/advanced.sql','utf8'));
const server=new PGLiteSocketServer({db,host:'127.0.0.1',port:55432,maxConnections:100});
await server.start();
console.log('Isolated PGlite PostgreSQL/pgvector verification server: 127.0.0.1:55432');
process.on('SIGINT',async()=>{await server.stop();await db.close();process.exit(0);});
