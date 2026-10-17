import {describe,it,expect} from 'vitest';
import {currentSchoolPeriod} from './school-calendar.js';
import {DEFAULT_CONFIG} from './kairos/input.js';
describe('Digital Twin school calendar (F17)',()=>{
  it('does not map Sunday or Saturday to Monday',()=>{
    for(const date of ['2026-10-18T04:30:00Z','2026-10-17T04:30:00Z']) expect(currentSchoolPeriod(DEFAULT_CONFIG,new Date(date)).period).toBeNull();
  });
  it('honors holidays, breaks, blocked cells, custom starts and exact period boundaries',()=>{
    const cfg={...DEFAULT_CONFIG,dayStart:'09:00',periodMinutes:30,blocked:[],breaks:[{after:0,name:'Break',minutes:15}]};
    expect(currentSchoolPeriod(cfg,new Date('2026-10-16T03:29:00Z')).state).toBe('CLOSED');
    expect(currentSchoolPeriod(cfg,new Date('2026-10-16T03:30:00Z')).period).toBe(0);
    expect(currentSchoolPeriod(cfg,new Date('2026-10-16T04:00:00Z')).state).toBe('BREAK');
    expect(currentSchoolPeriod(cfg,new Date('2026-10-16T04:15:00Z')).period).toBe(1);
    expect(currentSchoolPeriod({...cfg,holidays:['2026-10-16']},new Date('2026-10-16T03:30:00Z')).state).toBe('HOLIDAY');
    expect(currentSchoolPeriod({...cfg,blocked:[{day:4,period:0,reason:'Assembly'}]},new Date('2026-10-16T03:30:00Z')).state).toBe('BLOCKED');
  });
});
