import { beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createFixture } from './helpers.js';
import { prisma } from '../src/lib/prisma.js';
import { signToken } from '../src/lib/auth.js';
import { checkAIConnection } from '../src/lib/openai.js';

vi.mock('../src/lib/openai.js', async (importOriginal) => ({
  ...await importOriginal<typeof import('../src/lib/openai.js')>(),
  aiConfiguration: () => ({ configured: true, model: 'gpt-4o-mini', timeoutMs: 12000 }),
  checkAIConnection: vi.fn().mockResolvedValue({ ok: true, code: 'connected', message: 'OpenAI responded successfully.' }),
}));
const app = createApp();
let fixture: Awaited<ReturnType<typeof createFixture>>;
let token: string;
beforeAll(async () => {
  fixture = await createFixture();
  const user = await prisma.user.create({ data: {
    schoolId: fixture.school.id, email: `super-${fixture.suffix}@test.school`,
    name: 'Test Super Admin', role: 'SUPER_ADMIN', password: 'not-a-login',
  } });
  token = signToken({ sub: user.id, schoolId: user.schoolId, role: user.role, name: user.name, tv: 0 });
});
describe('OpenAI administrator settings', () => {
  it('requires a live Super Admin session before viewing or testing the provider', async () => {
    expect((await request(app).get('/api/ai/status')).status).toBe(401);
    for (const roleToken of [fixture.admin.token, fixture.principal.token, fixture.teacher.token, fixture.student.userToken]) {
      expect((await request(app).get('/api/ai/status').set('Authorization', `Bearer ${roleToken}`)).status).toBe(403);
      expect((await request(app).post('/api/ai/check').set('Authorization', `Bearer ${roleToken}`)).status).toBe(403);
    }
    expect(checkAIConnection).not.toHaveBeenCalled();
  });
  it('exposes configuration without a secret or automatic paid request', async () => {
    const response = await request(app).get('/api/ai/status').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body).toEqual({ configured: true, model: 'gpt-4o-mini', timeoutMs: 12000 });
    expect(checkAIConnection).not.toHaveBeenCalled();
  });
  it('returns explicit success or provider failure and bounds repeated billable tests', async () => {
    const check = () => request(app).post('/api/ai/check').set('Authorization', `Bearer ${token}`);
    expect((await check()).body).toMatchObject({ ok: true, code: 'connected' });
    vi.mocked(checkAIConnection).mockResolvedValueOnce({ ok: false, code: 'quota', message: 'OpenAI quota is exhausted.' });
    expect((await check()).body).toMatchObject({ ok: false, code: 'quota' });
    expect((await check()).status).toBe(200);
    expect((await check()).status).toBe(429);
    expect(checkAIConnection).toHaveBeenCalledTimes(3);
  });
});
