import assert from 'node:assert/strict';
import test from 'node:test';
import {agentContext,prepareAgentAction} from '../src/program-agent.ts';
import type {AISettingsEnv} from '../src/ai-settings.ts';
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
