import { prisma } from '../lib/prisma.js';
import { fromJson } from '../lib/json.js';
import { env } from '../config/env.js';
import { AppError, badRequest } from '../lib/errors.js';

// Presence · Face Recognition — the matching engine.
//
// Embeddings are 512-D ArcFace descriptors produced by the Python face service
// from pixels the browser sends over TLS; the image is embedded in memory and
// discarded — only the vector is ever stored. Matching is cosine
// nearest-neighbour over the school's enrolled vectors (a linear scan; pgvector
// is the drop-in scale option). Vectors carry their model id so a model upgrade
// can never silently compare across incompatible spaces.

export const EMBED_MODEL = 'insightface-buffalo_l';
export const EMBED_DIM = 512;
export const MATCH_THRESHOLD = 0.42; // cosine similarity for a confident ArcFace match

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

export interface EmbedResult {
  found: boolean;
  embedding?: number[];
  detScore?: number;
  model?: string;
  qualityOk?: boolean;
  guidance?: string;
  faceCount?: number;
  elapsedMs?: number;
  bbox?: [number, number, number, number];
  imageWidth?: number;
  imageHeight?: number;
}

/**
 * Turn an image (base64 JPEG/PNG) into a face embedding via the Python face
 * service. This is the ONLY place the raw image is handled server-side; it is
 * never persisted. Returns { found: false } when no face is in the frame, and
 * throws only when the service itself is unreachable — the caller decides how
 * to degrade (the engine renders an explicit "face service offline", never a
 * fabricated match).
 */
export async function embedImage(imageBase64: string, enrollment = false): Promise<EmbedResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(`${env.faceServiceUrl}/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageBase64, purpose: enrollment ? 'enroll' : 'recognize' }),
      signal: controller.signal,
    });
    if (!res.ok) throw new AppError(502, 'The face engine could not process this frame. Please retry.');
    const data = (await res.json()) as EmbedResult & { ok: boolean; error?: string };
    if (!data.ok) throw badRequest(data.error ?? 'The camera frame could not be read. Please retake it.');
    if (data.found && (!enrollment || data.qualityOk !== false) && (!Array.isArray(data.embedding) || data.embedding.length !== EMBED_DIM || data.embedding.some(n => !Number.isFinite(n)) || !data.embedding.some(n => n !== 0) || data.model !== EMBED_MODEL)) {
      throw new AppError(502, 'The face engine returned an invalid template. Please retry.');
    }
    return data;
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (controller.signal.aborted) throw new AppError(504, 'Face processing timed out. The engine may be busy; wait a moment and retake the frame.');
    throw new AppError(503, 'The face engine is unavailable. Start the local services, then retry.');
  } finally {
    clearTimeout(timer);
  }
}

export function checkEnrollmentFrames(embeddings: { vector: number[] }[]) {
  for (let i = 1; i < embeddings.length; i++) {
    if (cosine(embeddings[0].vector, embeddings[i].vector) < MATCH_THRESHOLD) {
      throw badRequest('The captured frames do not show a consistent face. Retake all frames with only the same person in view.');
    }
  }
}

export interface MatchResult {
  matched: boolean;
  subjectType?: 'STUDENT' | 'TEACHER';
  subjectId?: string;
  name?: string;
  confidence: number; // 0..1 (cosine of best match)
  margin: number; // gap to the runner-up — a quality signal
}

/** Load a school's enrolled embeddings for the current model only. */
async function enrolledVectors(schoolId: string, subjectType?: 'STUDENT' | 'TEACHER') {
  return prisma.faceEmbedding.findMany({
    where: { schoolId, model: EMBED_MODEL, ...(subjectType ? { subjectType } : {}) },
  });
}

// 1:N — "who is this face?" Search all enrolled embeddings for the best match.
export async function matchFace(schoolId: string, query: number[], subjectType?: 'STUDENT' | 'TEACHER'): Promise<MatchResult> {
  const rows = await enrolledVectors(schoolId, subjectType);
  if (!rows.length) return { matched: false, confidence: 0, margin: 0 };

  const bestBySubject = new Map<string, { sim: number; name: string; type: string; id: string }>();
  for (const r of rows) {
    const vec = fromJson<number[]>(r.vectorString, []);
    if (vec.length !== query.length) continue;
    const sim = cosine(query, vec);
    const key = `${r.subjectType}:${r.subjectId}`;
    const prev = bestBySubject.get(key);
    if (!prev || sim > prev.sim) bestBySubject.set(key, { sim, name: r.name, type: r.subjectType, id: r.subjectId });
  }

  const ranked = [...bestBySubject.values()].sort((a, b) => b.sim - a.sim);
  const top = ranked[0];
  if (!top) return { matched: false, confidence: 0, margin: 0 };
  const second = ranked[1];
  const margin = second ? top.sim - second.sim : top.sim;
  return {
    matched: top.sim >= MATCH_THRESHOLD,
    subjectType: top.type as 'STUDENT' | 'TEACHER',
    subjectId: top.id,
    name: top.name,
    confidence: Math.round(top.sim * 1000) / 1000,
    margin: Math.round(margin * 1000) / 1000,
  };
}

/**
 * 1:1 verification — the anti-proxy half. "Is this face the specific person the
 * QR claims?" Returns the best cosine similarity against ONLY that subject's
 * templates. `samples === 0` means "cannot verify" (un-enrolled), which callers
 * must not treat as "failed to verify".
 */
export async function verifyFaceAgainst(
  schoolId: string,
  subjectType: 'STUDENT' | 'TEACHER',
  subjectId: string,
  query: number[],
): Promise<{ similarity: number; samples: number; threshold: number }> {
  const rows = await prisma.faceEmbedding.findMany({ where: { schoolId, subjectType, subjectId, model: EMBED_MODEL } });
  let best = 0;
  let samples = 0;
  for (const r of rows) {
    const vec = fromJson<number[]>(r.vectorString, []);
    if (vec.length !== query.length) continue;
    samples++;
    const sim = cosine(query, vec);
    if (sim > best) best = sim;
  }
  return { similarity: Math.round(best * 1000) / 1000, samples, threshold: MATCH_THRESHOLD };
}

export interface EnrollInput {
  schoolId: string;
  subjectType: 'STUDENT' | 'TEACHER';
  subjectId: string;
  name: string;
  embeddings: { vector: number[]; label?: string; quality?: number }[];
  consentBy?: string;
}

/**
 * Store a subject's face templates, consent-first. Creates (or refreshes) the
 * FaceEnrollment consent record, then the embeddings linked to it. Old
 * embeddings for the subject are cleared so a re-enroll fully replaces them.
 */
export async function enrollFace(input: EnrollInput) {
  const valid = input.embeddings.filter((e) => Array.isArray(e.vector) && e.vector.length === EMBED_DIM);
  if (!valid.length) throw new Error(`No valid ${EMBED_DIM}-D embeddings provided`);

  const { enrollmentId, total } = await prisma.$transaction(async (tx) => {
    // Fresh templates replace any prior ones for this subject.
    await tx.faceEmbedding.deleteMany({ where: { schoolId: input.schoolId, subjectType: input.subjectType, subjectId: input.subjectId } });
    const enrollment = await tx.faceEnrollment.upsert({
      where: { subjectType_subjectId: { subjectType: input.subjectType, subjectId: input.subjectId } },
      create: { schoolId: input.schoolId, subjectType: input.subjectType, subjectId: input.subjectId, name: input.name, model: EMBED_MODEL, consentBy: input.consentBy },
      update: { name: input.name, model: EMBED_MODEL, consentBy: input.consentBy, consentAt: new Date() },
    });
    await tx.faceEmbedding.createMany({
      data: valid.map((e) => ({
        schoolId: input.schoolId,
        enrollmentId: enrollment.id,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        name: input.name,
        vectorString: JSON.stringify(e.vector),
        model: EMBED_MODEL,
        dim: EMBED_DIM,
        label: e.label ?? 'front',
        quality: e.quality ?? 0,
      })),
    });
    const flag = { faceEnrolled: true, faceCount: valid.length };
    if (input.subjectType === 'STUDENT') await tx.student.update({ where: { id: input.subjectId }, data: flag });
    else await tx.teacher.update({ where: { id: input.subjectId }, data: flag });
    return { enrollmentId: enrollment.id, total: valid.length };
  });

  return { stored: valid.length, total, enrollmentId };
}

export async function clearFace(schoolId: string, subjectType: 'STUDENT' | 'TEACHER', subjectId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.faceEmbedding.deleteMany({ where: { schoolId, subjectType, subjectId } });
    await tx.faceEnrollment.deleteMany({ where: { subjectType, subjectId } });
    if (subjectType === 'STUDENT') await tx.student.update({ where: { id: subjectId }, data: { faceEnrolled: false, faceCount: 0 } });
    else await tx.teacher.update({ where: { id: subjectId }, data: { faceEnrolled: false, faceCount: 0 } });
  });
}
