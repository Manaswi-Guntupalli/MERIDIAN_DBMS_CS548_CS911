import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors.js';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof Prisma.PrismaClientKnownRequestError && ['P2002','P2003'].includes(err.code)) {
    res.status(409).json({error: err.code === 'P2002' ? 'A record with these unique details already exists.' : 'This record is referenced by existing records; withdraw it instead of deleting.'});
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
    return;
  }
  if (err instanceof AppError) {
    res.status(err.status).json({ error: err.message, details: err.details });
    return;
  }
  // Never leak internal error details (stack traces, SQL, file paths) to
  // clients in production — log server-side, return a generic message.
  const isProd = process.env.NODE_ENV === 'production';
  console.error('[error]', err);
  res.status(500).json({
    error: isProd ? 'Internal server error' : err instanceof Error ? err.message : 'Internal server error',
  });
}
