import assert from 'node:assert/strict';
import test from 'node:test';
import {agentContext,prepareAgentAction} from '../src/program-agent.ts';
import type {AISettingsEnv} from '../src/ai-settings.ts';
import {readFile} from 'node:fs/promises';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import worker,{type Env} from '../src/index.ts';
const env={} as AISettingsEnv;
const state:any={settings:{programName:'NextStep',membershipTiers:[{id:'community',name:'Community'}]},users:[{id:'u1',name:'Member',stage:'Exploring tech',email:'private@example.test',phone:'private-phone',story:'PRIVATE_STORY',resume:'PRIVATE_RESUME',grades:'PRIVATE_GRADES'}],courses:[],mentors:[],applications:[{id:'a',userId:'u1',status:'submitted',goals:'PRIVATE_GOALS'}],needs:[{id:'n',userId:'u1',status:'open',summary:'PRIVATE_NEED'}]};
test('agent receives a limited index without credentials, contacts or private answers',()=>{
 const context=JSON.stringify(agentContext({...state,aiSettings:{apiKey:'SECRET'}}));
 assert.match(context,/Member/);assert.doesNotMatch(context,/private@example|private-phone|PRIVATE_|SECRET/);
});
test('agent cannot choose arbitrary endpoints or create unsupported records',async()=>{
 for(const operation of ['password','api-key','message','delete','../../logout'])await assert.rejects(prepareAgentAction(env,{operation,targetId:'',changes:[]},state),/unsupported action/);
 await assert.rejects(prepareAgentAction(env,{operation:'learner',targetId:'u1',changes:[{field:'emailOptIn',value:'true'}]},state),/cannot change/);
 await assert.rejects(prepareAgentAction(env,{operation:'meeting',targetId:'not-found',changes:[{field:'status',value:'"completed"'}]},state),/not available/);
});
test('agent settings actions use the supported endpoint and persist the requested program name',async()=>{
 const runtime=new Miniflare(convertV4MiniflareOptions({modules:true,script:'export default {fetch(){return new Response("test")}}',compatibilityDate:'2026-11-21',d1Databases:['DB']}));
 try{
  const DB=await runtime.getD1Database('DB');
  const schema=await readFile(new URL('../migrations/schema.sql',import.meta.url),'utf8');
  let statement='',trigger=false;
  for(const line of schema.split('\n')){statement+=line+'\n';if(/^CREATE TRIGGER/.test(line))trigger=true;if(/^END;/.test(line))trigger=false;if(line.trim().endsWith(';')&&!trigger){await DB.prepare(statement.trim()).run();statement='';}}
  const integrationEnv={DB,DEMO_MODE:'true',SEED_DEMO_DATA:'false',ASSETS:{fetch:async()=>new Response('website')}} as unknown as Env;
  const login=await worker.fetch(new Request('https://nextstep.test/api/login',{method:'POST',headers:{Origin:'https://nextstep.test','Content-Type':'application/json'},body:JSON.stringify({username:'admin',password:'test1234'})}),integrationEnv);
  assert.equal(login.status,200);
  const cookie=login.headers.get('Set-Cookie')!.split(';')[0];
  const current:any=await (await worker.fetch(new Request('https://nextstep.test/api/state',{headers:{Cookie:cookie}}),integrationEnv)).json();
  const action=await prepareAgentAction(integrationEnv,{operation:'settings',targetId:'',changes:[{field:'programName',value:JSON.stringify('Updated mentoring program')}]},current);
  const saved=await worker.fetch(new Request('https://nextstep.test'+action.path,{method:action.method,headers:{Cookie:cookie,Origin:'https://nextstep.test','Content-Type':'application/json'},body:JSON.stringify(action.payload)}),integrationEnv);
  assert.equal(saved.status,200);
  const stored=JSON.parse((await DB.prepare('SELECT data FROM settings WHERE id=1').first<any>()).data);
  assert.equal(stored.programName,'Updated mentoring program');
  assert.deepEqual(stored.membershipTiers,current.settings.membershipTiers);
 }finally{await runtime.dispose();}
});
