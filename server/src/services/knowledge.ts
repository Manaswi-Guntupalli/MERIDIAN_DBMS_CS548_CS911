import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
export const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';
let extractor: Promise<any> | undefined;
export async function embed(text: string): Promise<string> {
  try {
    extractor ??= import('@huggingface/transformers').then(m => {
      m.env.cacheDir = resolve(process.env.EMBEDDING_CACHE_DIR ?? 'storage/model-cache');
      return m.pipeline('feature-extraction', EMBEDDING_MODEL, {dtype:'fp32'});
    });
    const model = await extractor;
    const output = await model(text, {pooling:'mean',normalize:true,truncation:true});
    const values = Array.from(output.data as Float32Array);
    if(values.length!==384 || values.some(x=>!Number.isFinite(x))) throw new Error('Invalid embedding');
    return `[${values.join(',')}]`;
  } catch (e) {
    extractor = undefined;
    console.error('Embedding model unavailable:', e instanceof Error ? e.message : e);
    throw new AppError(503,'Embedding model unavailable. Allow the initial Hugging Face model download and retry. No substitute vectors were stored.');
  }
}
export interface Actor { sub: string; schoolId: string }
export function knowledgeContext<T>(actor: Actor, fn: (tx: Prisma.TransactionClient)=>Promise<T>) {
  return prisma.$transaction(async tx=>{
    await tx.$executeRaw`SELECT set_config('meridian.user_id', ${actor.sub}, true)`;
    await tx.$executeRaw`SELECT set_config('meridian.school_id', ${actor.schoolId}, true)`;
    await tx.$executeRawUnsafe('SET LOCAL ROLE meridian_knowledge');
    return fn(tx);
  });
}
export interface KnowledgeInput { title:string; content:string; category:string; sourceId?:string }
export async function saveKnowledge(actor:Actor, input:KnowledgeInput, id?:string) {
  const vector = await embed(input.title+'\n'+input.content);
  const key = id || randomUUID();
  return knowledgeContext(actor, async tx => {
    if(id) return tx.$queryRaw<any[]>`UPDATE "KnowledgeItem" SET "title"=${input.title},"content"=${input.content},"category"=${input.category},"embedding"=${vector}::vector,"sourceId"=${input.sourceId ?? null} WHERE "id"=${id} RETURNING "id","title","category","revision"`;
    return tx.$queryRaw<any[]>`INSERT INTO "KnowledgeItem"("id","schoolId","title","content","category","sourceId","createdBy","embedding") VALUES(${key},${actor.schoolId},${input.title},${input.content},${input.category},${input.sourceId ?? null},${actor.sub},${vector}::vector) RETURNING "id","title","category","revision"`;
  });
}
