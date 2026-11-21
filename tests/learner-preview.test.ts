import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {courses} from '../src/content.ts';

test('browser preview intercepts requests, keeps practice temporary, and blocks real mutations',async()=>{
 const builder=await readFile(new URL('../public/course-builder.js',import.meta.url),'utf8');
 const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
 const api=app.slice(app.indexOf('async function api('),app.indexOf('async function refreshState'));
 let networkCalls=0;
 const context=vm.createContext({document:{addEventListener(){}},fetch:()=>{networkCalls++;throw new Error('Network is forbidden in preview');},structuredClone,console});
 vm.runInContext(builder+`\nlet data=${JSON.stringify({user:{id:'practice'},courses:[courses[0]],access:{aiHelp:true},enrollments:[]})};learnerPreview={};function enrollment(id){return data.enrollments.find(e=>e.courseId===id);}function esc(s){return s;}\n`+api,context);
 const call=(path:string,body:unknown={})=>vm.runInContext(`api(${JSON.stringify(path)},'POST',${JSON.stringify(body)})`,context);
 const c=courses[0];
 const baseline=await call('/api/enroll',{courseId:c.id,answers:c.preQuiz.map(q=>q.answer),confidence:3});assert.equal(baseline.score,100);
 await assert.rejects(call('/api/course/complete',{courseId:c.id,answers:c.postQuiz.map(q=>q.answer),confidence:5}),/Complete every lesson/);
 for(const l of c.lessons){assert.equal((await call('/api/lesson/complete',{courseId:c.id,lessonId:l.id,answer:l.answer})).correct,true);}
 const final=await call('/api/course/complete',{courseId:c.id,answers:c.postQuiz.map(q=>q.answer),confidence:5});assert.equal(final.score,100);
 for(const path of ['/api/requests','/api/admin/course','/api/profile','/api/assistant','/api/applications','/api/logout'])await assert.rejects(call(path),/learner preview/);
 assert.match((await call('/api/feedback',{courseId:c.id,lessonId:c.lessons[0].id,question:'Explain'})).text,/Preview course guide/);
 assert.equal(networkCalls,0);
});

test('course editor preserves commas inside skills through edits and preview',async()=>{
 const builder=await readFile(new URL('../public/course-builder.js',import.meta.url),'utf8');
 const skills=['Interpret controls, calibration, and uncertainty.','Write a report with observations, interpretations, and limits.'];
 const source={...courses[0],skills};
 const values=new Map<string,string>(Object.entries({title:source.title,category:source.category,level:source.level,description:source.description,minutes:String(source.minutes),skills:skills.join('\r\n'),published:'on'}));
 for(const group of ['lessons','preQuiz','postQuiz'] as const)source[group].forEach((q,i)=>{
  for(const key of ['question','explanation','answer'] as const)values.set(`${group}-${i}-${key}`,String(q[key]));
  q.options.forEach((option,j)=>values.set(`${group}-${i}-option-${j}`,option));
  if(group==='lessons'){const l=source.lessons[i];values.set(`lessons-${i}-title`,l.title);values.set(`lessons-${i}-body`,l.body);}
 });
 const context=vm.createContext({document:{addEventListener(){}},structuredClone,FormData:class{get(key:string){return values.get(key);}has(key:string){return values.has(key);}}});
 vm.runInContext(builder+`\ncourseDraft=${JSON.stringify(source)};`,context);
 const saved=vm.runInContext('readCourseEditor({})',context);
 assert.deepEqual(Array.from(saved.skills),skills);
});
