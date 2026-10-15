import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { splitSql } from './sql-statements.js';
const db = new PrismaClient();
try {
  const sql = readFileSync(new URL('../../database/advanced.sql', import.meta.url), 'utf8');
  await db.$transaction(async tx => {
    for (const statement of splitSql(sql)) await tx.$executeRawUnsafe(statement);
  }, {timeout: 60000});
  console.log('Installed pgvector, RLS policies, constraints, indexes, views, functions and audit trigger.');
} finally { await db.$disconnect(); }
