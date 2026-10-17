import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth.js';
import { asyncHandler, notFound } from '../lib/errors.js';
import { validateBody } from '../utils/validate.js';
import { embed, knowledgeContext, saveKnowledge, EMBEDDING_MODEL } from '../services/knowledge.js';
import { prisma } from '../lib/prisma.js';
const router=Router();
const admins=['SUPER_ADMIN','ADMIN','PRINCIPAL'];
router.use(authenticate,authorize(...admins,'TEACHER'));
const input=z.object({title:z.string().trim().min(1).max(180),content:z.string().trim().min(20).max(12000),category:z.enum(['POLICY','NOTICE','DOCUMENT']),sourceId:z.string().nullable().optional()});
router.get('/',asyncHandler(async(req,res)=>{
  const items=await knowledgeContext(req.user!,tx=>tx.$queryRaw`SELECT "id","title","content","category","sourceId","model","revision","updatedAt" FROM "KnowledgeItem" ORDER BY "updatedAt" DESC LIMIT 100`);
  res.json({items,model:EMBEDDING_MODEL,dimensions:384,metric:'cosine'});
}));
router.get('/search',asyncHandler(async(req,res)=>{
  const {q,category}=z.object({q:z.string().trim().min(2).max(1000),category:z.enum(['POLICY','NOTICE','DOCUMENT']).optional()}).parse(req.query);
  const vector=await embed(q);
  const items=await knowledgeContext(req.user!,tx=>tx.$queryRaw`SELECT "id","title","content","category","sourceId","revision",1-("embedding" <=> ${vector}::vector) AS similarity FROM "KnowledgeItem" WHERE (${category ?? null}::text IS NULL OR "category"=${category ?? null}) ORDER BY "embedding" <=> ${vector}::vector LIMIT 10`);
  res.json({items,model:EMBEDDING_MODEL,metric:'cosine',note:'Similarity ranks relevance; it is not a probability or proof of correctness.'});
}));
router.post('/',authorize(...admins),validateBody(input),asyncHandler(async(req,res)=>res.status(201).json({item:(await saveKnowledge(req.user!,req.body))[0]})));
router.put('/:id',authorize(...admins),validateBody(input),asyncHandler(async(req,res)=>{
  const rows=await saveKnowledge(req.user!,req.body,req.params.id);if(!rows.length)throw notFound();res.json({item:rows[0]});
}));
router.delete('/:id',authorize(...admins),asyncHandler(async(req,res)=>{
  const rows=await knowledgeContext(req.user!,tx=>tx.$queryRaw<any[]>`DELETE FROM "KnowledgeItem" WHERE "id"=${req.params.id} RETURNING "id"`);
  if(!rows.length)throw notFound();res.json({deleted:rows[0].id});
}));
router.post('/import/:kind/:id',authorize(...admins),asyncHandler(async(req,res)=>{
  const {kind,id}=req.params;
  let data;
  if(kind==='document') {
    const doc=await prisma.document.findFirst({where:{id,schoolId:req.user!.schoolId}});
    if(doc?.rawText) data={title:doc.fileName,content:doc.rawText.slice(0,12000),category:'DOCUMENT',sourceId:doc.id};
  } else if(kind==='notice') {
    const notice=await prisma.notification.findFirst({where:{id,schoolId:req.user!.schoolId,userId:null}});
    if(notice) data={title:notice.title,content:notice.body,category:'NOTICE',sourceId:notice.id};
  }
  if(!data)throw notFound('Readable document or school-wide notice not found');
  const parsed=input.parse(data);
  res.status(201).json({item:(await saveKnowledge(req.user!,parsed))[0]});
}));
export default router;
