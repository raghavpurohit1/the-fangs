import {readdir,readFile} from 'node:fs/promises';
const base=process.env.NEXTSTEP_URL||'http://127.0.0.1:8787';
const password=process.env.NEXTSTEP_ADMIN_PASSWORD;
if(!password)throw new Error('Set NEXTSTEP_ADMIN_PASSWORD in your environment. Credentials are not printed or saved.');
let cookie='';
async function call(path,data){const response=await fetch(new URL(path,base),{method:data?'POST':'GET',headers:{Origin:new URL(base).origin,Cookie:cookie,'Content-Type':'application/json'},...(data?{body:JSON.stringify(data)}:{})});if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];const result=await response.json();if(!response.ok)throw new Error(result.error||'Request failed');return result;}
await call('/api/login',{username:process.env.NEXTSTEP_ADMIN_USERNAME||'admin',password});
const state=await call('/api/state');if(state.user?.role!=='admin')throw new Error('Administrator access is required.');
const existing=new Set(state.courses.map(c=>c.id));
for(const file of (await readdir(new URL('../curriculum/',import.meta.url))).filter(f=>f.endsWith('.json')).sort()){
 const course=JSON.parse(await readFile(new URL('../curriculum/'+file,import.meta.url),'utf8'));if(!course.id||!Array.isArray(course.lessons))continue;
 if(existing.has(course.id)){console.log('Preserved existing:',course.id);continue;}
 await call('/api/admin/course',course);existing.add(course.id);console.log('Imported:',course.id);
}
