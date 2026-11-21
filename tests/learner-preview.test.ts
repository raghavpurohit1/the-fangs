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
