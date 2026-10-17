import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { asyncHandler, badRequest } from '../lib/errors.js';
import { sqlLab } from '../services/sqlLab.js';
import rateLimit from 'express-rate-limit';
const router=Router();
router.use(authenticate,authorize('SUPER_ADMIN','ADMIN','PRINCIPAL'));
// Live website queries remain fixed. Editable SQL goes ONLY to disposable demo clusters.
const labLimiter=rateLimit({windowMs:60_000,max:30,standardHeaders:true,legacyHeaders:false,
  message:{error:'Please wait a moment before running more playground queries.'}});
router.use('/lab',labLimiter);
router.get('/lab/schema',asyncHandler(async(req,res)=>{
  res.set('Cache-Control','no-store').json(await sqlLab(`${req.user!.schoolId}:${req.user!.sub}`,'schema'));
}));
router.post('/lab/execute',asyncHandler(async(req,res)=>{
  res.set('Cache-Control','no-store').json(await sqlLab(`${req.user!.schoolId}:${req.user!.sub}`,'execute',req.body?.sql));
}));
router.post('/lab/reset',asyncHandler(async(req,res)=>{
  res.set('Cache-Control','no-store').json(await sqlLab(`${req.user!.schoolId}:${req.user!.sub}`,'reset'));
}));
const queries:Record<string,{label:string;sql:string}>={
  'fee-summary':{label:'View + GROUP BY + aggregates',sql:'SELECT * FROM school_fee_summary WHERE "schoolId"=$1'},
  'class-balances':{label:'JOIN + GROUP BY + HAVING + ORDER BY',sql:`SELECT c."name", count(DISTINCT s."id")::integer AS students, sum(f."amount"-f."paid") AS outstanding FROM "Class" c JOIN "Student" s ON s."classId"=c."id" AND s."schoolId"=c."schoolId" JOIN "Fee" f ON f."studentId"=s."id" AND f."schoolId"=s."schoolId" WHERE c."schoolId"=$1 GROUP BY c."id",c."name" HAVING sum(f."amount"-f."paid")>0 ORDER BY outstanding DESC`},
  'above-average':{label:'Nested subquery',sql:`SELECT "title","amount","paid" FROM "Fee" WHERE "schoolId"=$1 AND "amount">(SELECT avg("amount") FROM "Fee" WHERE "schoolId"=$1) ORDER BY "amount" DESC LIMIT 30`},
  'unpaid-students':{label:'Correlated EXISTS subquery',sql:`SELECT s."admissionNo",s."name" FROM "Student" s WHERE s."schoolId"=$1 AND EXISTS(SELECT 1 FROM "Fee" f WHERE f."studentId"=s."id" AND f."schoolId"=s."schoolId" AND f."paid"<f."amount") ORDER BY s."name" LIMIT 50`},
  'attendance-cte':{label:'CTE + LEFT JOIN + aggregates',sql:`WITH counts AS (SELECT "studentId",count(*) AS total,count(*) FILTER(WHERE "status" IN ('PRESENT','LATE')) AS present FROM "Attendance" WHERE "schoolId"=$1 GROUP BY "studentId") SELECT s."name",coalesce(c.total,0)::integer AS recorded,round(100.0*c.present/nullif(c.total,0),2) AS percentage FROM "Student" s LEFT JOIN counts c ON c."studentId"=s."id" WHERE s."schoolId"=$1 ORDER BY percentage ASC NULLS LAST LIMIT 50`},
  'weekly-recursive':{label:'Recursive CTE + date series + attendance JOIN',sql:`WITH RECURSIVE days(day) AS (SELECT current_date-6 UNION ALL SELECT day+1 FROM days WHERE day<current_date) SELECT d.day::text,count(a."id")::integer AS records FROM days d LEFT JOIN "Attendance" a ON a."date"=d.day::text AND a."schoolId"=$1 GROUP BY d.day ORDER BY d.day`},
};
router.get('/queries',(_req,res)=>res.json({queries:Object.entries(queries).map(([id,q])=>({id,...q}))}));
router.get('/queries/:id',asyncHandler(async(req,res)=>{
  const q=queries[req.params.id];if(!q)throw badRequest('Unknown query');
  const rows=await prisma.$queryRawUnsafe(q.sql,req.user!.schoolId);
  res.json({label:q.label,sql:q.sql,rows});
}));
router.get('/features',asyncHandler(async(req,res)=>{
  const extension=await prisma.$queryRaw`SELECT extname,extversion FROM pg_extension WHERE extname='vector'`;
  const indexes=await prisma.$queryRaw`SELECT indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND tablename='KnowledgeItem'`;
  const policies=await prisma.$queryRaw`SELECT policyname,cmd,qual,with_check FROM pg_policies WHERE tablename='KnowledgeItem'`;
  const revisions=await prisma.$queryRaw`SELECT "operation",count(*)::integer AS count FROM "KnowledgeRevision" WHERE "schoolId"=${req.user!.schoolId} GROUP BY "operation"`;
  res.json({extension,indexes,policies,revisions});
}));
export default router;
