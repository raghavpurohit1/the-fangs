import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
test('expired browser session reconnects the same account before retrying the unchanged form payload',async()=>{
 const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');const code=app.slice(app.indexOf('async function api('),app.indexOf('async function refreshState'));
 const calls:any[]=[];let recoveries=0,status=401;
 const context=vm.createContext({learnerPreview:null,data:{user:{id:'admin-1',username:'admin',role:'admin'}},window:{NextStepSession:{recover:async(user:any)=>{assert.equal(user.id,'admin-1');recoveries++;status=201;}}},fetch:async(path:string,options:any)=>{calls.push({path,...options});return new Response(JSON.stringify(status===201?{user:{id:'created'}}:{error:'Please sign in to continue.'}),{status});},Response});
 vm.runInContext(code,context);
 const result=await vm.runInContext("api('/api/admin/learner','POST',{name:'Draft kept',stage:'Exploring tech'})",context);
 assert.equal(result.user.id,'created');assert.equal(recoveries,1);assert.equal(calls.length,2);assert.equal(calls[0].body,calls[1].body);assert.equal(calls[0].credentials,'same-origin');
 status=500;await assert.rejects(vm.runInContext("api('/api/admin/learner','POST',{name:'No retry'})",context));assert.equal(calls.length,3);assert.equal(recoveries,1);
 status=401;await assert.rejects(vm.runInContext("api('/api/login','POST',{username:'admin',password:'wrong'})",context));assert.equal(recoveries,1);
});
