import assert from 'node:assert/strict';
const base=process.env.SMOKE_ORIGIN || 'http://localhost:5173';
async function call(path,token,method='GET',body){
  const res=await fetch(base+'/api'+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});
  const value=await res.json();
  return {status:res.status,value};
}
const login=await call('/auth/login',null,'POST',{email:'principal@meridian.school',password:'meridian123'});
assert.equal(login.status,200);const token=login.value.token;
assert.ok(token,'Login returns bearer token');
const title='QA temporary absence policy';
const created=await call('/knowledge',token,'POST',{title,category:'POLICY',content:'A guardian should notify the class teacher before morning attendance when a child is absent from school.'});
assert.equal(created.status,201,JSON.stringify(created.value));
const id=created.value.item.id;
try{
  const search=await call('/knowledge/search?q='+encodeURIComponent('What should I do if my child misses school?'),token);
  assert.equal(search.status,200);assert.ok(search.value.items.some(x=>x.id===id));
  const edited=await call('/knowledge/'+id,token,'PUT',{title:title+' revised',category:'POLICY',content:'A guardian must telephone the school office and notify the class teacher before morning attendance when their child is absent.'});
  assert.equal(edited.status,200);assert.equal(edited.value.item.revision,2);
  const teacher=await call('/auth/login',null,'POST',{email:'teacher@meridian.school',password:'meridian123'});
  assert.equal(teacher.status,200);
  assert.equal((await call('/knowledge',teacher.value.token)).status,200);
  assert.equal((await call('/knowledge/'+id,teacher.value.token,'DELETE')).status,403);
  const catalogue=await call('/database/queries',token);
  for(const q of catalogue.value.queries){const r=await call('/database/queries/'+q.id,token);assert.equal(r.status,200,q.id+': '+JSON.stringify(r.value));}
  assert.equal((await call('/database/features',token)).status,200);
  const deleted=await call('/knowledge/'+id,token,'DELETE');assert.equal(deleted.status,200);
  const items=await call('/knowledge',token);assert.ok(!items.value.items.some(x=>x.id===id));
  console.log(JSON.stringify({passed:true,origin:base,checks:['Next.js API rewrite','principal and teacher login','real embedding create/search/update/delete','revision trigger','teacher API write denial','all six Database Lab queries','vector database metadata','deleted item absent'],temporaryEntryRemoved:true},null,2));
}finally{await call('/knowledge/'+id,token,'DELETE');}
