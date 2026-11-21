import test from 'node:test';
import assert from 'node:assert/strict';
import {planNextSteps,preparedPlan,type PlanInput} from '../src/assistant';

const input:PlanInput={message:'Help me learn AI',role:'learner',goal:'AI confidence',courses:[{id:'ai',title:'Practical AI',description:'Learn safe AI prompting',skills:['AI']},{id:'lead',title:'Leadership',description:'Practice leadership',skills:['Leadership']}]};
test('program guide uses only available courses and makes no completed-action claims',async()=>{
  let calls=0;const original=globalThis.fetch;globalThis.fetch=async()=>{calls++;throw new Error('unexpected request');};
  try{
    const plan=await planNextSteps({},input);assert.equal(plan.mode,'program-guide');assert.equal(calls,0);assert.equal(plan.steps[0].courseId,'ai');assert.match(plan.reply,/Nothing has been/);
    assert.equal(preparedPlan({...input,courses:[]}).sources.length,0);
    assert.equal(preparedPlan({...input,role:'admin'}).steps[0].title,'Start with unanswered needs');
  }finally{globalThis.fetch=original;}
});
test('AI planner validates structured results and limits data sent to the provider',async(t)=>{
  const original=globalThis.fetch;let captured:any;
  try{
    await t.test('valid plan returns live output without private caller properties',async()=>{
      globalThis.fetch=async(url,init)=>{assert.equal(url,'https://api.openai.com/v1/responses');captured=JSON.parse(String(init?.body));return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:JSON.stringify({reply:'Try a short learning session.',steps:[{title:'Learn prompting',detail:'Open the AI course.',courseId:'ai'}]})}]}]}));};
      const result=await planNextSteps({OPENAI_API_KEY:'test-key'},{...input,resume:'PRIVATE',email:'PRIVATE'} as PlanInput);
      assert.equal(result.mode,'live-ai');assert.deepEqual(result.sources,['ai']);assert.equal(captured.store,false);assert.equal(captured.text.format.strict,true);assert.doesNotMatch(captured.input,/PRIVATE/);
    });
    await t.test('invented course IDs fall back instead of generating broken actions',async()=>{
      globalThis.fetch=async()=>new Response(JSON.stringify({output:[{content:[{type:'output_text',text:JSON.stringify({reply:'An invalid plan',steps:[{title:'Open',detail:'Open a made-up course',courseId:'nonexistent'}]})}]}]}));
      assert.equal((await planNextSteps({OPENAI_API_KEY:'test-key'},input)).mode,'program-guide');
    });
    await t.test('provider errors do not expose error bodies or keys',async()=>{
      globalThis.fetch=async()=>new Response('PRIVATE PROVIDER BODY',{status:429});
      const result=await planNextSteps({OPENAI_API_KEY:'test-key'},input);assert.equal(result.mode,'program-guide');assert.doesNotMatch(JSON.stringify(result),/PRIVATE|test-key/);
    });
  }finally{globalThis.fetch=original;}
});
