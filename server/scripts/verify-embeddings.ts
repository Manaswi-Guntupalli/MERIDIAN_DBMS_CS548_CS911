import assert from 'node:assert/strict';
import {embed,EMBEDDING_MODEL} from '../src/services/knowledge.js';
const query=JSON.parse(await embed('What should I do when my child misses school?')) as number[];
const absence=JSON.parse(await embed('Reporting student absence. A parent should notify the class teacher before morning attendance when a child is absent from school.')) as number[];
const unrelated=JSON.parse(await embed('Canteen menu. Lunch includes rice, vegetables and fresh fruit. Meals are served in the dining hall.')) as number[];
const dot=(v:number[])=>query.reduce((sum,x,i)=>sum+x*v[i],0);
assert.equal(query.length,384);
assert.ok(dot(absence)>dot(unrelated),'Absence policy should rank above unrelated canteen menu');
console.log(JSON.stringify({model:EMBEDDING_MODEL,dimensions:query.length,absenceSimilarity:dot(absence),unrelatedSimilarity:dot(unrelated),passed:true},null,2));
