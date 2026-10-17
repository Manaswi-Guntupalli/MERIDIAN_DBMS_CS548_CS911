import { z } from 'zod';
export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false;
  const parsed = new Date(value + 'T00:00:00Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,10) === value;
}
export const calendarDate = z.string().refine(isCalendarDate, 'Use a valid calendar date (YYYY-MM-DD)');
