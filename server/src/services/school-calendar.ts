import { buildGrid, type AcademicConfigShape } from './kairos/input.js';

/** Timetable cell at an instant in the configured school timezone, independent of host timezone. */
export function currentSchoolPeriod(cfg: AcademicConfigShape, now = new Date(), timezone = process.env.SCHOOL_TIMEZONE || 'Asia/Kolkata') {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23',weekday:'short' }).formatToParts(now);
  const values = Object.fromEntries(parts.map(p=>[p.type,p.value]));
  const date = `${values.year}-${values.month}-${values.day}`;
  const dayLabel = values.weekday;
  const day = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].indexOf(dayLabel);
  const minutes = Number(values.hour)*60+Number(values.minute);
  const out = (state: string, period: number | null = null) => ({date,day,dayLabel,period,state,timezone});
  if (day < 0 || day >= cfg.workingDays) return out('CLOSED');
  if (cfg.holidays.includes(date)) return out('HOLIDAY');
  const grid = buildGrid(cfg);
  const mins = (t:string) => { const [h,m]=t.split(':').map(Number); return h*60+m; };
  const period = grid.periodTimes.findIndex(p=>minutes>=mins(p.start) && minutes<mins(p.end));
  if (period < 0) return out(minutes<mins(grid.periodTimes[0].start) || minutes>=mins(grid.periodTimes.at(-1)!.end) ? 'CLOSED' : 'BREAK');
  if (grid.blocked.some(b=>b.day===day && b.period===period)) return out('BLOCKED');
  return out('TEACHING',period);
}
