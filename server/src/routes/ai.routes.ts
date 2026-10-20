import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, authorize } from '../middleware/auth.js';
import { asyncHandler } from '../lib/errors.js';
import { aiConfiguration, checkAIConnection } from '../lib/openai.js';

const router = Router();
router.use(authenticate, authorize('SUPER_ADMIN'));
router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
router.get('/status', (_req, res) => res.json(aiConfiguration()));
router.post('/check', rateLimit({
  windowMs: 60_000, max: 3, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Please wait a minute before testing OpenAI again.' },
}), asyncHandler(async (_req, res) => {
  res.json({ ...aiConfiguration(), ...await checkAIConnection(), checkedAt: new Date().toISOString() });
}));
export default router;
