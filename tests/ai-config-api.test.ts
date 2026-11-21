import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import worker,{type Env} from '../src/index.ts';

test('AI settings are admin-only, keep secrets private, and configure both AI features',async()=>{
  const runtime=new Miniflare(convertV4MiniflareOptions({modules:true,script:'export default {fetch(){return new Response("test")}}',compatibilityDate:'2026-11-21',d1Databases:['DB']}));
  const DB=await runtime.getD1Database('DB');
  const schema=await readFile(new URL('../migrations/schema.sql',import.meta.url),'utf8');
  let statement='',trigger=false;
  for(const line of schema.split('\n')){
    statement+=line+'\n';if(/^CREATE TRIGGER/.test(line))trigger=true;if(/^END;/.test(line))trigger=false;
    if(line.trim().endsWith(';')&&!trigger){await DB.prepare(statement.trim()).run();statement='';}
  }
  const env={DB,ASSETS:{fetch:async()=>new Response('website')},DEMO_MODE:'true',SEED_DEMO_DATA:'false',AI_MODEL:'initial-model',AI_SETTINGS_KEY:'52'.repeat(32)} as unknown as Env;
  function client(){
    let cookie='';
    return async(path:string,method='GET',body?:unknown,origin='https://nextstep.test')=>{
      const response=await worker.fetch(new Request('https://nextstep.test'+path,{method,headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},...(body!==undefined?{body:JSON.stringify(body)}:{})}),env);
      const next=response.headers.get('Set-Cookie');if(next)cookie=next.split(';')[0];
      return {status:response.status,body:await response.json() as any};
    };
  }
  const admin=client(),learner=client(),anonymous=client();
  const key='sk-test-private-nextstep-api-key-not-real';
  const originalFetch=globalThis.fetch;
  const providerCalls:{model:string;authorization:string|null;body:any}[]=[];
  try{
    assert.equal((await anonymous('/api/admin/ai-settings','PUT',{model:'test-model'})).status,401);
    assert.equal((await admin('/api/login','POST',{username:'admin',password:'test1234'})).status,200);
    assert.equal((await learner('/api/register','POST',{name:'Settings test learner',username:'settings-learner',password:'test-password-123',stage:'Exploring tech',goal:''})).status,200);
    assert.equal((await learner('/api/admin/ai-settings','PUT',{model:'test-model',apiKey:key})).status,403);
    assert.equal((await admin('/api/admin/ai-settings','PUT',{model:'test-model',apiKey:key},'https://unrelated.test')).status,403);
    const saved=await admin('/api/admin/ai-settings','PUT',{model:'test-model-nextstep',apiKey:key});
    assert.equal(saved.status,200);
    assert.ok(!JSON.stringify(saved.body).includes(key));
    const adminState=(await admin('/api/state')).body;
    assert.equal(adminState.aiSettings.model,'test-model-nextstep');
    assert.equal(adminState.aiSettings.keyConfigured,true);
    assert.equal(adminState.aiSettings.keySource,'saved');
    assert.ok(!JSON.stringify(adminState).includes(key));
    const learnerState=(await learner('/api/state')).body;
    assert.equal(learnerState.aiAvailable,true);
    assert.equal(learnerState.aiSettings,undefined);
    assert.ok(!JSON.stringify(learnerState).includes(key));
    assert.ok(!JSON.stringify((await anonymous('/api/state')).body).includes(key));
    const stored=await DB.prepare("SELECT value FROM meta WHERE key='ai-settings-v1'").first<{value:string}>();
    assert.ok(stored);
    assert.ok(!stored!.value.includes(key));
    assert.equal((await admin('/api/admin/ai-settings','PUT',{model:'changed-model',apiKey:''})).status,200);
    globalThis.fetch=async(input,init)=>{
      assert.equal(String(input),'https://api.openai.com/v1/responses');
      const body=JSON.parse(String(init?.body));
      providerCalls.push({model:body.model,authorization:new Headers(init?.headers).get('Authorization'),body});
      const text=body.text?JSON.stringify({reply:'A prepared test suggestion.',steps:[{title:'Review your goal',detail:'Choose one topic to discuss.',courseId:null}]}):'Review the lesson and check your sources.';
      return new Response(JSON.stringify({output:[{content:[{type:'output_text',text}]}]}),{headers:{'Content-Type':'application/json'}});
    };
    const plan=await learner('/api/assistant','POST',{message:'Help me choose a next step.'});
    assert.equal(plan.status,200);assert.equal(plan.body.mode,'live-ai');
    const course=learnerState.courses[0];
    const coach=await learner('/api/feedback','POST',{courseId:course.id,lessonId:course.lessons[0].id,question:'How should I use this lesson?'});
    assert.equal(coach.status,200);assert.equal(coach.body.mode,'live-ai');
    assert.equal(providerCalls.length,2);
    for(const call of providerCalls){assert.equal(call.model,'changed-model');assert.equal(call.authorization,'Bearer '+key);assert.equal(call.body.store,false);}
    const removed=await admin('/api/admin/ai-settings','PUT',{model:'changed-model',removeApiKey:true});
    assert.equal(removed.status,200);
    assert.equal((await admin('/api/state')).body.aiSettings.keyConfigured,false);
    assert.equal((await learner('/api/assistant','POST',{message:'Help me plan.'})).body.mode,'program-guide');
    assert.equal(providerCalls.length,2);
  }finally{
    globalThis.fetch=originalFetch;
    await runtime.dispose();
  }
});
