import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createFixture } from './helpers.js';
import { createApp } from '../src/app.js';
import { getDashboardIntelligence } from '../src/services/intelligence.js';
import { chatText } from '../src/lib/openai.js';

vi.mock('../src/services/intelligence.js', () => ({ getDashboardIntelligence: vi.fn() }));
vi.mock('../src/lib/openai.js', () => ({ chatText: vi.fn() }));

const app = createApp();
let fixture: Awaited<ReturnType<typeof createFixture>>;
beforeAll(async () => { fixture = await createFixture(); });
beforeEach(() => {
  vi.mocked(chatText).mockResolvedValue(null);
  vi.mocked(getDashboardIntelligence).mockResolvedValue({ engine: 'online', payload: { forecasts: {} } });
});

describe('Operations report regeneration', () => {
  it('requires authentication', async () => {
    expect((await request(app).get('/api/reports/summary')).status).toBe(401);
  });

  it('requests fresh forecasts and identifies the data-based fallback', async () => {
    const response = await request(app).get('/api/reports/summary').set('Authorization', `Bearer ${fixture.admin.token}`);
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(getDashboardIntelligence).toHaveBeenLastCalledWith(fixture.school.id, { fresh: true });
    expect(response.body.narrativeSource).toBe('template');
    expect(response.body.metrics.students).toBe(2);
    expect(response.body.metrics.attendanceRate).toBeNull();
    expect(Number.isNaN(Date.parse(response.body.generatedAt))).toBe(false);
  });

  it('identifies an AI narrative and reports forecast service unavailability', async () => {
    vi.mocked(chatText).mockResolvedValue('A generated school operations summary.');
    vi.mocked(getDashboardIntelligence).mockResolvedValue({ engine: 'offline' });
    const response = await request(app).get('/api/reports/summary').set('Authorization', `Bearer ${fixture.admin.token}`);
    expect(response.status).toBe(200);
    expect(response.body.narrativeSource).toBe('ai');
    expect(response.body.narrative).toBe('A generated school operations summary.');
    expect(response.body.engineOnline).toBe(false);
    expect(response.body.predictions).toEqual([]);
  });
});
