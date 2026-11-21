import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import worker, { calculateMetrics, csvCell, hashPassword, verifyPassword, rebaseDemoDates, STAGES, type Env } from '../src/index.ts';
import { courses } from '../src/content.ts';

async function environment(demo=true, password?:string, samples=true, legacy=false) {
  const runtime = new Miniflare(convertV4MiniflareOptions({modules:true,script:'export default { fetch() { return new Response("test"); } };',compatibilityDate:'2026-11-21',d1Databases:['DB']}));
  const DB = await runtime.getD1Database('DB');
  let schema=await readFile(new URL('../migrations/schema.sql',import.meta.url),'utf8');
  if(legacy) schema=schema.replace("CHECK(role IN ('admin','learner','mentor'))","CHECK(role IN ('admin','learner'))").replace(/\nINSERT OR IGNORE INTO meta\(key,value\) VALUES\('migration-0003-applications',[^\n]+\n?/,'\n');
  let statement='',trigger=false;
  for(const line of schema.split('\n')) {
    statement+=line+'\n'; if(/^CREATE TRIGGER/.test(line)) trigger=true;
    if(/^END;/.test(line)) trigger=false;
    if(line.trim().endsWith(';')&&!trigger) { await DB.prepare(statement.trim()).run(); statement=''; }
  }
  const env={DB,ASSETS:{fetch:async()=>new Response('website')},DEMO_MODE:demo?'true':'false',SEED_DEMO_DATA:samples?'true':undefined,ADMIN_PASSWORD:password} as unknown as Env;
  return {runtime,env};
}
class Client {
  cookie='';
  constructor(public env:Env) {}
  async call(path:string, method='GET', data?:unknown, origin='https://nextstep.test') {
    const headers:Record<string,string>={Cookie:this.cookie,Origin:origin};
    if(data!==undefined) headers['Content-Type']='application/json';
    const response=await worker.fetch(new Request('https://nextstep.test'+path,{method,headers,body:data!==undefined?JSON.stringify(data):undefined}),this.env);
    const cookie=response.headers.get('Set-Cookie'); if(cookie) this.cookie=cookie.split(';')[0];
    const raw=await response.text();
    return {status:response.status,headers:response.headers,body:response.headers.get('Content-Type')?.includes('application/json')?JSON.parse(raw):raw};
  }
}

test('local preview starts without sample data and stays empty after reinitialization',async()=>{
  const {runtime,env}=await environment(true,undefined,false);
  try {
    const client=new Client(env);
    const anonymous=(await client.call('/api/state')).body;
    assert.equal(anonymous.demo,true);
    assert.equal(anonymous.sampleData,false);
    assert.equal((await client.call('/api/login','POST',{username:'admin',password:'test1234'})).status,200);
    const initial=(await client.call('/api/state')).body;
    for(const key of ['users','mentors','events','enrollments','requests','programResults','funding','communicationJobs','needs','announcements']) assert.deepEqual(initial[key],[],key);
    assert.equal(initial.courses.length,3);
    assert.equal(initial.resources.length,5);
    assert.equal(initial.settings.membershipTiers.length,3);
    const freshBinding=new Proxy(env.DB,{get(target,key){const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;}});
    const restarted=new Client({...env,DB:freshBinding,SEED_DEMO_DATA:'false'});
    assert.equal((await restarted.call('/api/state')).body.sampleData,false);
    assert.equal((await restarted.call('/api/login','POST',{username:'learner',password:'learn1234'})).status,401);
    assert.equal((await restarted.call('/api/login','POST',{username:'admin',password:'test1234'})).status,200);
    const later=(await restarted.call('/api/state')).body;
    for(const key of ['users','mentors','events','enrollments','requests','programResults','funding']) assert.deepEqual(later[key],[],key);
    assert.equal((await env.DB.prepare('SELECT COUNT(*) AS total FROM users').first<{total:number}>())?.total,1);
  } finally { await runtime.dispose(); }
});

test('passwords use salted PBKDF2 and comparisons reject incorrect values',async()=>{
  const first=await hashPassword('correct horse battery staple'),second=await hashPassword('correct horse battery staple');
  assert.notEqual(first,second); assert.match(first,/^pbkdf2-sha256\$100000\$/);
  assert.equal(await verifyPassword('correct horse battery staple',first),true);
  assert.equal(await verifyPassword('incorrect',first),false);
});

test('paired impact excludes incomplete assessments and cohort filters stay consistent',()=>{
  const users=[{id:'a',cohort:'A',stage:'Exploring tech'},{id:'b',cohort:'B',stage:'Career transition'}];
  const e=[{userId:'a',courseId:'c',baselineScore:25,postScore:75,baselineConfidence:1,postConfidence:4,startedAt:'2026-11-01',completedAt:'2026-11-20'}, {userId:'a',courseId:'c',baselineScore:100,postScore:null,baselineConfidence:5,postConfidence:null,startedAt:'2026-11-20'}, {userId:'b',courseId:'c',baselineScore:75,postScore:100,baselineConfidence:3,postConfidence:4,startedAt:'2026-11-10',completedAt:'2026-11-20'}];
  const result=calculateMetrics(users,e,[{userId:'a',status:'waiting',createdAt:'2026-11-19'}],[{id:'c',title:'AI'}],{cohort:'A'},Date.parse('2026-11-21'));
  assert.equal(result.learnerCount,1); assert.equal(result.activeLearners,1); assert.equal(result.enrollmentCount,2); assert.equal(result.completedCount,1); assert.equal(result.completionRate,50);
  assert.equal(result.pairedCount,1); assert.equal(result.avgBaseline,25); assert.equal(result.avgPost,75); assert.equal(result.scoreChange,50); assert.equal(result.confidenceChange,3); assert.equal(result.avgWaitDays,2);
  assert.equal(result.courseBreakdown[0].avgGain,50);
  const empty=calculateMetrics(users,e,[],[],{cohort:'Unknown'}); assert.equal(empty.pairedCount,0); assert.equal(empty.scoreChange,null); assert.equal(empty.avgBaseline,null);
  assert.match(csvCell('  =HYPERLINK("evil")'),/^"'  =/); assert.equal(csvCell('hello,"world"'),'"hello,""world"""');
});

test('demo timestamps rebase from Workers module epoch to request time',()=>{
  const fixed=Date.parse('2026-11-21T12:00:00Z');
  const result=rebaseDemoDates({users:[{createdAt:'1969-12-31T00:00:00.000Z'}],date:'1970-01-03T00:00:00.000Z',deadline:'1970-02-01',postScore:null},fixed);
  assert.equal(result.users[0].createdAt,'2026-11-20T12:00:00.000Z');
  assert.equal(result.date,'2026-11-23T12:00:00.000Z'); assert.equal(result.deadline,'2026-12-22'); assert.equal(result.postScore,null);
});

test('D1 API supports authorized learning, administration, records, and durable outcomes',async(t)=>{
  const {runtime,env}=await environment(); const anon=new Client(env),admin=new Client(env),learner=new Client(env);
  try {
    await t.test('demo seed is idempotent and anonymous state reveals no learner data',async()=>{
      const first=await anon.call('/api/state'); assert.equal(first.status,200); assert.equal(first.body.demo,true); assert.equal(first.body.user,null); assert.equal(first.body.users,undefined);
      const count=await env.DB.prepare('SELECT count(*) n FROM users').first<any>();
      await anon.call('/api/state'); assert.deepEqual(await env.DB.prepare('SELECT count(*) n FROM users').first(),count);
      assert.equal((await anon.call('/api/admin/settings','PUT',{})).status,401);
      assert.equal((await anon.call('/api/metrics')).status,401);
    });
    await t.test('login uses secure HTTP-only cookie and server-side admin authorization',async()=>{
      assert.equal((await admin.call('/api/login','POST',{username:'admin',password:'incorrect'})).status,401);
      const login=await admin.call('/api/login','POST',{username:'admin',password:'test1234'}); assert.equal(login.status,200); assert.equal(login.body.user.role,'admin');
      assert.match(login.headers.get('Set-Cookie')||'',/HttpOnly/); assert.match(login.headers.get('Set-Cookie')||'',/Secure/); assert.match(login.headers.get('Set-Cookie')||'',/SameSite=Lax/);
      assert.doesNotMatch(JSON.stringify(login.body),/password_hash|pbkdf2/);
      const sessions=await env.DB.prepare('SELECT token_hash FROM sessions').all<any>(); assert.ok(sessions.results.every(s=>!admin.cookie.includes(s.token_hash)));
      const register=await learner.call('/api/register','POST',{name:'Test learner',username:'testlearner',password:'testpassword123',stage:'Exploring tech',goal:'Use AI carefully'}); assert.equal(register.status,200); assert.equal(register.body.user.role,'learner');
      assert.equal((await learner.call('/api/admin/course','POST',{})).status,403);
      assert.equal((await learner.call('/api/metrics')).status,403);
      assert.equal((await learner.call('/api/profile','PUT',{role:'admin'})).status,400);
      assert.equal((await learner.call('/api/profile','PUT',{cohort:'Private cohort'})).status,403);
      assert.equal((await learner.call('/api/profile','PUT',{name:'Hijacked'},'https://attacker.test')).status,403);
    });
    const course=courses[0];
    await t.test('assessment score is server-derived, first baseline stays fixed, and lessons gate completion',async()=>{
      const wrong=course.preQuiz.map(q=>(q.answer+1)%q.options.length);
      assert.equal((await learner.call('/api/enroll','POST',{courseId:course.id,answers:[],confidence:3})).status,400);
      const enrollment=await learner.call('/api/enroll','POST',{courseId:course.id,answers:wrong,confidence:1}); assert.equal(enrollment.status,200); assert.equal(enrollment.body.score,0);
      const repeat=await learner.call('/api/enroll','POST',{courseId:course.id,answers:course.preQuiz.map(q=>q.answer),confidence:5}); assert.equal(repeat.body.score,0); assert.equal(repeat.body.enrollment.baselineConfidence,1);
      assert.equal((await learner.call('/api/course/complete','POST',{courseId:course.id,answers:course.postQuiz.map(q=>q.answer),confidence:5})).status,409);
      const lesson=course.lessons[0]; const incorrect=await learner.call('/api/lesson/complete','POST',{courseId:course.id,lessonId:lesson.id,answer:(lesson.answer+1)%lesson.options.length});
      assert.equal(incorrect.body.correct,false); assert.equal(incorrect.body.enrollment.completedLessons.length,0);
      for(const lesson of course.lessons) assert.equal((await learner.call('/api/lesson/complete','POST',{courseId:course.id,lessonId:lesson.id,answer:lesson.answer})).body.correct,true);
      await learner.call('/api/lesson/complete','POST',{courseId:course.id,lessonId:lesson.id,answer:lesson.answer});
      const final=await learner.call('/api/course/complete','POST',{courseId:course.id,answers:course.postQuiz.map(q=>q.answer),confidence:5}); assert.equal(final.body.score,100); assert.equal(final.body.enrollment.completedLessons.length,course.lessons.length);
      const finalAgain=await learner.call('/api/course/complete','POST',{courseId:course.id,answers:course.postQuiz.map(q=>(q.answer+1)%q.options.length),confidence:1}); assert.equal(finalAgain.body.score,100); assert.equal(finalAgain.body.enrollment.postConfidence,5);
    });
    await t.test('without an API key feedback honestly identifies course-guide mode',async()=>{
      const result=await learner.call('/api/feedback','POST',{courseId:course.id,lessonId:course.lessons[0].id,question:'How can I apply this?'}); assert.equal(result.status,200); assert.equal(result.body.mode,'course-guide'); assert.match(result.body.text,/Course guide/);
    });
    await t.test('admin state, filtering, exports, and course protection preserve evidence',async()=>{
      const state=await admin.call('/api/state'); assert.equal(state.status,200); assert.ok(state.body.users.length>=8); assert.ok(Array.isArray(state.body.programResults)); assert.ok(Array.isArray(state.body.funding)); assert.doesNotMatch(JSON.stringify(state.body),/password_hash|pbkdf2/);
      const metric=await admin.call('/api/metrics?cohort=Independent%20learners'); assert.equal(metric.body.pairedCount,1); assert.equal(metric.body.scoreChange,100); assert.equal(metric.body.activeLearners,1);
      const csv=await admin.call('/api/admin/export.csv?cohort=Independent%20learners'); assert.equal(csv.status,200); assert.match(csv.body,/Test learner/); assert.match(csv.body,/percentage points/);
      const change=structuredClone(course); change.preQuiz[0].answer=(change.preQuiz[0].answer+1)%change.preQuiz[0].options.length;
      const edited=await admin.call('/api/admin/course','POST',change);assert.equal(edited.status,200);
      assert.equal((await admin.call('/api/admin/course','POST',course)).status,409);
      assert.deepEqual((await learner.call('/api/state')).body.courses.find((c:any)=>c.id===course.id).preQuiz,course.preQuiz);
      const safe={...edited.body.course,title:course.title+' updated'};assert.equal((await admin.call('/api/admin/course','POST',safe)).status,200);
    });
    await t.test('mentor requests validate scheduling and meeting URLs',async()=>{
      const state=await admin.call('/api/state'); const mentor=state.body.mentors.find((m:any)=>m.active&&m.capacity>0);
      const result=await learner.call('/api/requests','POST',{mentorId:mentor.id,topic:'Help me use AI in my first internship.'}); assert.equal(result.status,201);
      const requestId=result.body.request.id;
      assert.equal((await learner.call('/api/requests','POST',{mentorId:mentor.id,topic:'Repeat'})).status,409);
      assert.equal((await admin.call('/api/admin/request/'+requestId,'PUT',{status:'scheduled',meetingUrl:'javascript:alert(1)'})).status,400);
      assert.equal((await admin.call('/api/admin/request/'+requestId,'PUT',{status:'completed'})).status,400);
      const scheduled=await admin.call('/api/admin/request/'+requestId,'PUT',{status:'scheduled',sessionAt:'2026-01-01T12:00:00Z',meetingUrl:'https://meet.example.com/demo'}); assert.equal(scheduled.status,200);
      const completed=await admin.call('/api/admin/request/'+requestId,'PUT',{status:'completed',notes:'Demo session completed.'}); assert.equal(completed.status,200);
      const closedMentor=state.body.mentors.find((m:any)=>m.capacity===0);
      assert.equal((await admin.call('/api/admin/request/'+requestId,'PUT',{mentorId:closedMentor.id,status:'scheduled',cadence:'monthly'})).status,409);
      const unchanged=(await admin.call('/api/state')).body.requests.find((r:any)=>r.id===requestId); assert.equal(unchanged.status,'completed'); assert.equal(unchanged.cadence,'one_time');
      const outcomes=await Promise.all([learner.call('/api/requests','POST',{mentorId:mentor.id,topic:'Parallel A'}),learner.call('/api/requests','POST',{mentorId:mentor.id,topic:'Parallel B'})]);
      assert.deepEqual(outcomes.map(r=>r.status).sort(),[201,409]);
    });
    await t.test('announcements enforce cohort targeting and persist one read receipt per user',async()=>{
      const publicData={title:'Welcome',body:'Demo learning update',cohort:'all',active:true};
      assert.equal((await learner.call('/api/admin/announcement','POST',publicData)).status,403);
      const broadcast=await admin.call('/api/admin/announcement','POST',publicData); assert.equal(broadcast.status,200);
      const targeted=await admin.call('/api/admin/announcement','POST',{...publicData,title:'Private cohort update',cohort:'Leadership circle'}); assert.equal(targeted.status,200);
      const learnerState=(await learner.call('/api/state')).body;
      assert.ok(learnerState.announcements.some((a:any)=>a.id===broadcast.body.announcement.id));
      assert.ok(!learnerState.announcements.some((a:any)=>a.id===targeted.body.announcement.id));
      assert.equal((await learner.call('/api/announcements/'+targeted.body.announcement.id+'/read','POST',{})).status,404);
      assert.equal((await anon.call('/api/announcements/'+broadcast.body.announcement.id+'/read','POST',{})).status,401);
      const firstRevision=broadcast.body.announcement.revision; assert.equal(firstRevision,1);
      assert.equal((await learner.call('/api/announcements/'+broadcast.body.announcement.id+'/read','POST',{})).status,409);
      for(let i=0;i<2;i++) assert.equal((await learner.call('/api/announcements/'+broadcast.body.announcement.id+'/read','POST',{revision:firstRevision})).status,200);
      const updated=(await learner.call('/api/state')).body; assert.ok(updated.announcementReads.includes(broadcast.body.announcement.id));
      const adminState=(await admin.call('/api/state')).body, stats=adminState.announcementStats.find((s:any)=>s.id===broadcast.body.announcement.id);
      assert.equal(stats.readCount,1); assert.equal(stats.recipients,adminState.users.filter((u:any)=>u.active).length);
      const edited=await admin.call('/api/admin/announcement','POST',{id:broadcast.body.announcement.id,revision:firstRevision,body:'Revised learning update'}); assert.equal(edited.status,200); assert.equal(edited.body.announcement.revision,2);
      assert.equal((await learner.call('/api/announcements/'+broadcast.body.announcement.id+'/read','POST',{revision:firstRevision})).status,409);
      assert.equal((await admin.call('/api/admin/announcement','POST',{id:broadcast.body.announcement.id,revision:firstRevision,body:'Stale admin overwrite'})).status,409);
      const revised=(await learner.call('/api/state')).body; assert.ok(!revised.announcementReads.includes(broadcast.body.announcement.id));
      const revisedStats=(await admin.call('/api/state')).body.announcementStats.find((s:any)=>s.id===broadcast.body.announcement.id); assert.equal(revisedStats.readCount,0);
      assert.equal((await learner.call('/api/announcements/'+broadcast.body.announcement.id+'/read','POST',{revision:edited.body.announcement.revision})).status,200);
      const currentStats=(await admin.call('/api/state')).body.announcementStats.find((s:any)=>s.id===broadcast.body.announcement.id); assert.equal(currentStats.readCount,1);
      const competing=await Promise.all(['A','B'].map(body=>admin.call('/api/admin/announcement','POST',{id:broadcast.body.announcement.id,revision:edited.body.announcement.revision,body}))); assert.deepEqual(competing.map(r=>r.status).sort(),[200,409]);
      const currentRevision=competing.find(r=>r.status===200)!.body.announcement.revision;
      await admin.call('/api/admin/announcement','POST',{id:broadcast.body.announcement.id,revision:currentRevision,active:false});
      assert.equal((await learner.call('/api/announcements/'+broadcast.body.announcement.id+'/read','POST',{})).status,404);
    });
    await t.test('central records and funding are validated, admin-only, and separate from course metrics',async()=>{
      const before=(await admin.call('/api/metrics')).body;
      assert.equal((await learner.call('/api/admin/learner','POST',{name:'Unauthorized'})).status,403);
      const added=await admin.call('/api/admin/learner','POST',{name:'New program participant',cohort:'Imported workshop'}); assert.equal(added.status,201); const userId=added.body.user.id;
      assert.equal(added.body.user.role,'learner'); assert.doesNotMatch(JSON.stringify(added.body),/password/);
      const resultData={userId,program:'AI workshop',date:'2026-11-20',beforeScore:25,afterScore:75,confidenceBefore:2,confidenceAfter:4,attendance:'attended',notes:'Demo only'};
      assert.equal((await learner.call('/api/admin/result','POST',resultData)).status,403);
      assert.equal((await admin.call('/api/admin/result','POST',{...resultData,beforeScore:101})).status,400);
      const saved=await admin.call('/api/admin/result','POST',resultData); assert.equal(saved.status,200); assert.equal(saved.body.result.afterScore,75);
      assert.equal((await admin.call('/api/admin/result','POST',{id:saved.body.result.id,active:false})).status,409);
      assert.equal((await admin.call('/api/admin/result','POST',{id:saved.body.result.id,revision:saved.body.result.revision,active:false})).body.result.active,false);
      assert.equal((await admin.call('/api/admin/result','POST',{...saved.body.result,notes:'Stale update'})).status,409);
      const audit=(await admin.call('/api/admin/audit')).body.auditLog.filter((a:any)=>a.entityId===saved.body.result.id);
      assert.equal(audit.length,2); assert.ok(audit.every((a:any)=>a.actorId==='admin-demo')); assert.equal(audit.find((a:any)=>a.action==='archive').before.revision,1);
      const funding={organization:'Demo Foundation',opportunity:'AI learning grant',amount:10000,status:'applied',deadline:'2027-01-20',notes:'Demo record'};
      assert.equal((await admin.call('/api/admin/funding','POST',{...funding,amount:-1})).status,400);
      assert.equal((await learner.call('/api/admin/funding','POST',funding)).status,403);
      const grant=await admin.call('/api/admin/funding','POST',funding); assert.equal(grant.status,200); assert.equal(grant.body.funding.status,'applied');
      const after=(await admin.call('/api/metrics')).body; assert.equal(after.enrollmentCount,before.enrollmentCount); assert.equal(after.pairedCount,before.pairedCount); assert.equal(after.learnerCount,before.learnerCount+1);
    });
    await t.test('email and text queue requires contact consent and demo cannot deliver',async()=>{
      const state=(await learner.call('/api/state')).body;
      const ownId=state.user.id;
      assert.equal((await learner.call('/api/profile','PUT',{email:'not an email'})).status,400);
      assert.equal((await learner.call('/api/profile','PUT',{phone:'6025550123'})).status,400);
      assert.equal((await learner.call('/api/profile','PUT',{emailOptIn:true})).status,400);
      assert.equal((await learner.call('/api/admin/message','POST',{requestId:crypto.randomUUID(),channel:'email',userIds:[ownId],subject:'Hello',body:'Demo'})).status,403);
      const omitted=await admin.call('/api/admin/message','POST',{requestId:crypto.randomUUID(),channel:'email',userIds:[ownId],subject:'Hello',body:'Demo'}); assert.equal(omitted.body.jobs.length,0); assert.equal(omitted.body.skipped.length,1);
      assert.equal((await learner.call('/api/profile','PUT',{email:'learner@example.com',emailOptIn:true,phone:'+16025550123',smsOptIn:true})).status,200);
      const queued=await admin.call('/api/admin/message','POST',{requestId:crypto.randomUUID(),channel:'email',userIds:[ownId,ownId],subject:'Demo reminder',body:'Your learning path is waiting.'}); assert.equal(queued.status,200); assert.equal(queued.body.jobs.length,1); assert.equal(queued.body.jobs[0].status,'queued');
      assert.equal((await admin.call('/api/admin/message/'+queued.body.jobs[0].id+'/send','POST',{})).status,403);
      const draft={requestId:crypto.randomUUID(),channel:'email',userIds:[ownId],subject:'Idempotent reminder',body:'One reminder only.'};
      const repeated=await Promise.all([admin.call('/api/admin/message','POST',draft),admin.call('/api/admin/message','POST',draft)]);
      assert.equal(repeated[0].status,200); assert.equal(repeated[1].status,200); assert.equal(repeated[0].body.jobs[0].id,repeated[1].body.jobs[0].id);
      assert.equal((await admin.call('/api/admin/message','POST',{...draft,body:'Different message'})).status,409);
      const cancelId=repeated[0].body.jobs[0].id;
      assert.equal((await learner.call('/api/admin/message/'+cancelId+'/cancel','POST',{})).status,403);
      assert.equal((await admin.call('/api/admin/message/'+cancelId+'/cancel','POST',{})).body.job.status,'canceled');
      assert.equal((await admin.call('/api/admin/message/'+cancelId+'/cancel','POST',{})).body.job.status,'canceled');
      assert.equal((await learner.call('/api/profile','PUT',{email:'different@example.com'})).body.user.emailOptIn,false);
      const consent=(await learner.call('/api/profile','PUT',{emailOptIn:true})).body.user; assert.equal(consent.emailOptIn,true); assert.equal(consent.emailOptInUpdatedBy,ownId); assert.ok(consent.emailOptInUpdatedAt);
      const adminState=(await admin.call('/api/state')).body; assert.ok(adminState.communicationJobs.some((j:any)=>j.id===queued.body.jobs[0].id)); assert.equal(adminState.communicationChannels.email,false);
      assert.equal((await learner.call('/api/state')).body.communicationJobs,undefined);
    });
    await t.test('member needs are private, membership tiers are admin-assigned, and meeting cadence is validated',async()=>{
      const own=(await learner.call('/api/state')).body.user;
      assert.equal(own.membershipTier,'community');
      assert.equal((await learner.call('/api/profile','PUT',{membershipTier:'guided'})).status,400);
      assert.equal((await admin.call('/api/admin/learner/'+own.id,'PUT',{membershipTier:'paid-premium'})).status,400);
      assert.equal((await admin.call('/api/admin/learner/'+own.id,'PUT',{membershipTier:'guided'})).body.user.membershipTier,'guided');
      assert.equal((await learner.call('/api/needs','POST',{category:'invalid',summary:'Help',priority:'routine'})).status,400);
      const created=await learner.call('/api/needs','POST',{category:'learning',summary:'I would like help choosing a short AI learning path.',priority:'soon'}); assert.equal(created.status,201); assert.equal(created.body.need.userId,own.id);
      assert.equal((await learner.call('/api/admin/need/'+created.body.need.id,'PUT',{status:'resolved'})).status,403);
      const other=new Client(env); await other.call('/api/login','POST',{username:'learner',password:'learn1234'});
      assert.ok(!(await other.call('/api/state')).body.needs.some((n:any)=>n.id===created.body.need.id));
      assert.ok((await admin.call('/api/state')).body.needs.some((n:any)=>n.id===created.body.need.id));
      const updated=await admin.call('/api/admin/need/'+created.body.need.id,'PUT',{status:'in_progress',adminNote:'Start with AI foundations; we will check in next week.'}); assert.equal(updated.status,200);
      assert.equal((await learner.call('/api/state')).body.needs.find((n:any)=>n.id===created.body.need.id).adminNote,updated.body.need.adminNote);
      const tiers=(await admin.call('/api/state')).body.settings.membershipTiers; assert.equal(tiers.length,3);
      assert.equal((await learner.call('/api/requests','POST',{topic:'Cadence test',cadence:'daily'})).status,400);
      const meeting=await learner.call('/api/requests','POST',{topic:'Recurring mentoring check-in',cadence:'biweekly'}); assert.equal(meeting.status,201); assert.equal(meeting.body.request.cadence,'biweekly');
      const before=(await admin.call('/api/metrics')).body.completedSessions;
      assert.equal((await admin.call('/api/admin/request/'+meeting.body.request.id,'PUT',{lastMetAt:'2099-01-01T00:00:00Z'})).status,400);
      const cadence=await admin.call('/api/admin/request/'+meeting.body.request.id,'PUT',{cadence:'monthly',lastMetAt:'2026-01-01T00:00:00Z'}); assert.equal(cadence.status,200); assert.equal(cadence.body.request.cadence,'monthly');
      assert.equal((await learner.call('/api/state')).body.requests.find((r:any)=>r.id===meeting.body.request.id).lastMetAt,'2026-01-01T00:00:00.000Z');
      assert.equal((await admin.call('/api/metrics')).body.completedSessions,before);
    });
    await t.test('program assistant requires login and returns an honest read-only plan',async()=>{
      assert.equal((await anon.call('/api/assistant','POST',{message:'Help me learn AI'})).status,401);
      assert.equal((await learner.call('/api/assistant','POST',{message:'Help',resume:'private'})).status,400);
      const plan=await learner.call('/api/assistant','POST',{message:'How do I start learning AI?'}); assert.equal(plan.status,200); assert.equal(plan.body.mode,'program-guide'); assert.ok(plan.body.reply); assert.ok(Array.isArray(plan.body.steps));
      assert.ok(plan.body.steps.every((step:any)=>step.courseId===null||courses.some(c=>c.id===step.courseId)));
    });
    await t.test('deactivated learners lose existing sessions immediately',async()=>{
      const user=(await learner.call('/api/state')).body.user;
      const disabled=await admin.call('/api/admin/learner/'+user.id,'PUT',{active:false}); assert.equal(disabled.status,200);
      assert.equal((await learner.call('/api/state')).body.user,null); assert.equal((await learner.call('/api/profile','PUT',{name:'Blocked'})).status,401);
      assert.equal((await learner.call('/api/login','POST',{username:'testlearner',password:'testpassword123'})).status,401);
    });
    await t.test('password rotation invalidates other sessions and throttles failed logins',async()=>{
      const otherAdmin=new Client(env); await otherAdmin.call('/api/login','POST',{username:'admin',password:'test1234'});
      assert.equal((await admin.call('/api/admin/password','POST',{currentPassword:'test1234',newPassword:'changedpassword123'})).status,200);
      assert.equal((await otherAdmin.call('/api/state')).body.user,null);
      assert.equal((await new Client(env).call('/api/login','POST',{username:'admin',password:'test1234'})).status,401);
      assert.equal((await new Client(env).call('/api/login','POST',{username:'admin',password:'changedpassword123'})).status,200);
      let result:any; for(let i=0;i<11;i++) result=await anon.call('/api/login','POST',{username:'missing-user',password:'badpassword'});
      assert.equal(result.status,429);
    });
    await t.test('database mode cannot change from demo to production after seeding',async()=>{
      const production=new Client({...env,DEMO_MODE:'false',ADMIN_PASSWORD:'Strong-owner-passphrase-2026'});
      assert.equal((await production.call('/api/state')).status,500);
      assert.equal((await production.call('/api/login','POST',{username:'admin',password:'changedpassword123'})).status,500);
    });
  } finally { await runtime.dispose(); }
});

test('production bootstraps only real owner and curriculum; demo credentials cannot log in',async()=>{
  const {runtime,env}=await environment(false,'Strong-owner-passphrase-2026');
  try {
    const client=new Client(env); assert.equal((await client.call('/api/state')).body.demo,false);
    assert.equal((await client.call('/api/login','POST',{username:'admin',password:'test1234'})).status,401);
    assert.equal((await client.call('/api/login','POST',{username:'learner',password:'learn1234'})).status,401);
    assert.equal((await client.call('/api/login','POST',{username:'admin',password:'Strong-owner-passphrase-2026'})).status,200);
    const state=(await client.call('/api/state')).body;
    assert.equal(state.users.length,0); assert.equal(state.mentors.length,0); assert.equal(state.events.length,0); assert.equal(state.programResults.length,0); assert.equal(state.funding.length,0); assert.ok(state.courses.length>0);
    assert.doesNotMatch(JSON.stringify(state),/password_hash|pbkdf2/);
    const participant=await client.call('/api/admin/learner','POST',{name:'Consenting learner',email:'learner@example.com',emailOptIn:true});
    const queued=await client.call('/api/admin/message','POST',{requestId:crypto.randomUUID(),channel:'email',userIds:[participant.body.user.id],subject:'Reminder',body:'Learning reminder'});
    const pending=queued.body.jobs[0];
    const unavailable=await client.call('/api/admin/message/'+pending.id+'/send','POST',{}); assert.equal(unavailable.status,200); assert.equal(unavailable.body.job.status,'unconfigured'); assert.equal(unavailable.body.job.providerId,null);
    await client.call('/api/admin/learner/'+participant.body.user.id,'PUT',{emailOptIn:false});
    const canceled=await client.call('/api/admin/message/'+pending.id+'/send','POST',{}); assert.equal(canceled.body.job.status,'canceled');
    await client.call('/api/admin/learner/'+participant.body.user.id,'PUT',{emailOptIn:true});
    const future=await client.call('/api/admin/message','POST',{requestId:crypto.randomUUID(),channel:'email',userIds:[participant.body.user.id],subject:'Future',body:'Do not send early',scheduledAt:new Date(Date.now()+86400000).toISOString()});
    assert.equal((await client.call('/api/admin/message/'+future.body.jobs[0].id+'/send','POST',{})).status,409);
    const untouched=(await client.call('/api/state')).body.communicationJobs.find((j:any)=>j.id===future.body.jobs[0].id); assert.equal(untouched.status,'queued'); assert.equal(untouched.attempts,0);
    const scheduled=await client.call('/api/admin/message','POST',{requestId:crypto.randomUUID(),channel:'email',userIds:[participant.body.user.id],subject:'Scheduled',body:'A scheduled reminder',scheduledAt:new Date(Date.now()-1000).toISOString()});
    const manual=await client.call('/api/admin/message','POST',{requestId:crypto.randomUUID(),channel:'email',userIds:[participant.body.user.id],subject:'Manual',body:'Manual approval required'});
    await worker.scheduled({} as any,env,{} as any);
    const outbox=(await client.call('/api/state')).body.communicationJobs;
    assert.equal(outbox.find((j:any)=>j.id===scheduled.body.jobs[0].id).status,'unconfigured');
    assert.equal(outbox.find((j:any)=>j.id===manual.body.jobs[0].id).status,'queued');
  } finally { await runtime.dispose(); }
});

test('production without a strong bootstrap credential refuses initialization',async()=>{
  const {runtime,env}=await environment(false,'test1234');
  try { assert.equal((await new Client(env).call('/api/state')).status,500); assert.equal((await env.DB.prepare('SELECT count(*) n FROM users').first<any>())?.n,0); }
  finally { await runtime.dispose(); }
});

test('mentor accounts are admin-provisioned and see only their assigned mentees and sessions',async()=>{
  const {runtime,env}=await environment();
  try {
    const admin=new Client(env),learner=new Client(env),first=new Client(env),second=new Client(env),anon=new Client(env);
    await admin.call('/api/login','POST',{username:'admin',password:'test1234'});
    await learner.call('/api/login','POST',{username:'learner',password:'learn1234'});
    const base=(await admin.call('/api/state')).body.mentors[0];
    const ids=['mentor-access-a','mentor-access-b'];
    for(const mentorId of ids) assert.equal((await admin.call('/api/admin/mentor','POST',{...base,id:mentorId,name:mentorId,active:true,capacity:2})).status,200);
    const credentials={username:'mentor.one',password:'Strong-mentor-password-2026'};
    assert.equal((await learner.call('/api/admin/mentors/'+ids[0]+'/account','POST',credentials)).status,403);
    assert.equal((await admin.call('/api/admin/mentors/missing/account','POST',credentials)).status,404);
    assert.equal((await admin.call('/api/admin/mentors/'+ids[0]+'/account','POST',{...credentials,password:'short'})).status,400);
    assert.equal((await anon.call('/api/register','POST',{name:'Escalation',username:'rogue-mentor',password:'password-1234',stage:'Building skills',role:'mentor'})).status,400);
    const account=await admin.call('/api/admin/mentors/'+ids[0]+'/account','POST',credentials); assert.equal(account.status,201); assert.equal(account.body.account.role,'mentor');
    assert.doesNotMatch(JSON.stringify(account.body),/password|pbkdf2/);
    assert.equal((await admin.call('/api/admin/mentors/'+ids[0]+'/account','POST',{...credentials,username:'duplicate'})).status,409);
    assert.equal((await admin.call('/api/admin/mentors/'+ids[1]+'/account','POST',{...credentials,username:'mentor.two'})).status,201);
    assert.equal((await first.call('/api/login','POST',credentials)).body.user.role,'mentor');
    await second.call('/api/login','POST',{...credentials,username:'mentor.two'});
    const person=(await learner.call('/api/profile','PUT',{goal:'Assigned learner goal',story:'Shared mentoring story',resume:'Shared experience',grades:'PRIVATE-GRADES',email:'private@example.com',phone:'+16025550123'})).body.user;
    assert.equal((await learner.call('/api/applications','POST',{goals:'PRIVATE-APPLICATION-RESPONSE',interests:['AI learning'],supportNeeds:'PRIVATE-APPLICATION-SUPPORT'})).status,201);
    const reqA=(await learner.call('/api/requests','POST',{mentorId:ids[0],topic:'A discussion'})).body.request;
    const reqB=(await learner.call('/api/requests','POST',{mentorId:ids[1],topic:'B discussion'})).body.request;
    const state=(await first.call('/api/state')).body;
    assert.equal(state.mentorProfile.id,ids[0]); assert.deepEqual(state.requests.map((r:any)=>r.id),[reqA.id]); assert.equal(state.mentees.length,1); assert.equal(state.mentees[0].id,person.id);
    assert.deepEqual(Object.keys(state.mentees[0]).sort(),['goal','id','name','resume','stage','story']);
    for(const key of ['users','mentorAccounts','enrollments','courses','funding','programResults','communicationJobs','needs','aiSettings','applications']) assert.equal(state[key],undefined,key);
    assert.doesNotMatch(JSON.stringify(state),/PRIVATE-GRADES|private@example.com|16025550123|PRIVATE-APPLICATION/);
    for(const path of ['/api/metrics','/api/admin/audit']) assert.equal((await first.call(path)).status,403);
    assert.equal((await first.call('/api/profile','PUT',{name:'Wrong profile'})).status,403);
    for(const path of ['/api/enroll','/api/lesson/complete','/api/course/complete','/api/feedback','/api/requests','/api/needs','/api/assistant','/api/applications']) assert.equal((await first.call(path,'POST',{})).status,403,path);
    assert.equal((await first.call('/api/mentor/profile','PUT',{verified:true})).status,400);
    assert.equal((await first.call('/api/mentor/profile','PUT',{active:false})).status,400);
    assert.equal((await learner.call('/api/mentor/profile','PUT',{availability:'Any time'})).status,403);
    const profile=await first.call('/api/mentor/profile','PUT',{availability:'Tuesdays 5 PM',name:'Updated mentor',capacity:1}); assert.equal(profile.status,200); assert.equal(profile.body.mentorProfile.availability,'Tuesdays 5 PM'); assert.equal(profile.body.mentorProfile.verified,base.verified);
    assert.equal((await second.call('/api/state')).body.mentorProfile.name,ids[1]);
    assert.equal((await first.call('/api/mentor/requests/'+reqB.id,'PUT',{notes:'Cannot edit another mentor'})).status,404);
    assert.equal((await first.call('/api/mentor/requests/'+reqA.id,'PUT',{mentorId:ids[1]})).status,400);
    assert.equal((await learner.call('/api/mentor/requests/'+reqA.id,'PUT',{status:'scheduled'})).status,403);
    assert.equal((await first.call('/api/mentor/requests/'+reqA.id,'PUT',{status:'scheduled',sessionAt:new Date(Date.now()+86400000).toISOString(),meetingUrl:'https://meet.example.com/mentor',cadence:'weekly'})).status,200);
    assert.equal((await first.call('/api/mentor/requests/'+reqA.id,'PUT',{status:'completed'})).status,400);
    assert.equal((await first.call('/api/mentor/requests/'+reqA.id,'PUT',{status:'completed',sessionAt:'2026-01-01T12:00:00Z',lastMetAt:'2026-01-01T12:00:00Z'})).status,200);
    const adminState=(await admin.call('/api/state')).body; assert.equal(adminState.mentorAccounts.length,2); assert.ok(!adminState.users.some((u:any)=>u.role==='mentor'));
    assert.equal((await admin.call('/api/admin/mentor','POST',{...profile.body.mentorProfile,active:false})).status,200);
    assert.equal((await first.call('/api/state')).body.user,null);
    assert.equal((await new Client(env).call('/api/login','POST',credentials)).status,401);
    assert.ok((await learner.call('/api/state')).body.mentors.some((m:any)=>m.id===ids[0]&&!m.active));
  } finally {await runtime.dispose();}
});

test('mentor role migration preserves existing users and all dependent records',async()=>{
  const {runtime,env}=await environment(true,undefined,true,true);
  try {
    const admin=new Client(env),learner=new Client(env);
    await admin.call('/api/login','POST',{username:'admin',password:'test1234'});
    await learner.call('/api/login','POST',{username:'learner',password:'learn1234'});
    const person=(await learner.call('/api/profile','PUT',{email:'migration@example.com',emailOptIn:true})).body.user;
    await learner.call('/api/needs','POST',{category:'learning',summary:'Keep this support record',priority:'routine'});
    const req=(await learner.call('/api/requests','POST',{topic:'Keep this request',cadence:'monthly'})).body.request;
    const announcement=(await admin.call('/api/admin/announcement','POST',{title:'Keep this announcement',body:'Read me',cohort:'all',active:true})).body.announcement;
    await learner.call('/api/announcements/'+announcement.id+'/read','POST',{revision:announcement.revision});
    await admin.call('/api/admin/message','POST',{requestId:crypto.randomUUID(),channel:'email',userIds:[person.id],subject:'Keep this message',body:'Keep the queued record'});
    const names=['users','sessions','enrollments','lesson_completions','mentor_requests','announcement_reads','communication_jobs','communication_batches','communication_batch_jobs','member_needs','mentorship_preferences','mentor_accounts'];
    const snapshot=async()=>Object.fromEntries(await Promise.all(names.map(async name=>[name,(await env.DB.prepare('SELECT * FROM '+name+' ORDER BY rowid').all()).results])));
    const before=await snapshot();
    const migration=await readFile(new URL('../migrations/0002_mentor_accounts.sql',import.meta.url),'utf8');
    const statements=migration.split(';').map(s=>s.trim()).filter(Boolean);
    await env.DB.batch(statements.map(sql=>env.DB.prepare(sql)));
    assert.deepEqual(await snapshot(),before);
    assert.deepEqual((await env.DB.prepare('PRAGMA foreign_key_check').all()).results,[]);
    assert.equal((await admin.call('/api/state')).status,200); assert.equal((await learner.call('/api/state')).body.requests.some((r:any)=>r.id===req.id),true);
    const mentor=(await admin.call('/api/state')).body.mentors.find((m:any)=>m.active);
    const account=await admin.call('/api/admin/mentors/'+mentor.id+'/account','POST',{username:'migrated.mentor',password:'Migrated-mentor-password-2026'}); assert.equal(account.status,201);
    const after=await snapshot(); await env.DB.batch(statements.map(sql=>env.DB.prepare(sql))); assert.deepEqual(await snapshot(),after);
    assert.deepEqual((await env.DB.prepare('PRAGMA foreign_key_check').all()).results,[]);
  } finally {await runtime.dispose();}
});

test('learner applications enforce ownership, manual review, revisions and one active application',async(t)=>{
  const {runtime,env}=await environment(true,undefined,false);
  try {
    const admin=new Client(env),learner=new Client(env),other=new Client(env),anonymous=new Client(env);
    await admin.call('/api/login','POST',{username:'admin',password:'test1234'});
    const registration={name:'Application test learner',username:'application.learner',password:'Learner-application-password',stage:'Career transition',goal:'Build confidence using AI.'};
    const person=(await learner.call('/api/register','POST',registration)).body.user;
    await other.call('/api/register','POST',{...registration,name:'Other applicant',username:'application.other'});
    const answers={goals:'Use AI thoughtfully in my next role.',interests:['AI foundations','Career confidence'],experience:'I am changing careers.',availability:'A short lesson on weekday evenings.',supportNeeds:''};
    let application:any;
    await t.test('survey is learner-only, bounded and does not accept roles, grades or decisions',async()=>{
      assert.equal((await anonymous.call('/api/applications','POST',answers)).status,401);
      assert.equal((await admin.call('/api/applications','POST',answers)).status,403);
      for(const data of [{...answers,goals:''},{...answers,interests:[]},{...answers,interests:Array(13).fill('AI')},{...answers,supportNeeds:'x'.repeat(2001)},{...answers,applicationType:'mentor'},{...answers,status:'accepted'},{...answers,grades:'A'},{...answers,role:'admin'}]) {
        assert.equal((await learner.call('/api/applications','POST',data)).status,400);
      }
      assert.deepEqual((await learner.call('/api/state')).body.applications,[]);
    });
    await t.test('parallel submits create one application and expose it only to owner and staff',async()=>{
      const created=await Promise.all([learner.call('/api/applications','POST',answers),learner.call('/api/applications','POST',answers)]);
      assert.deepEqual(created.map(r=>r.status).sort(),[201,409]);
      application=created.find(r=>r.status===201)!.body.application;
      assert.equal(application.userId,person.id); assert.equal(application.applicationType,'learner'); assert.equal(application.status,'submitted'); assert.equal(application.revision,1);
      assert.equal((await learner.call('/api/state')).body.applications.length,1);
      assert.equal((await admin.call('/api/state')).body.applications[0].id,application.id);
      assert.deepEqual((await other.call('/api/state')).body.applications,[]);
      assert.equal('applications' in (await anonymous.call('/api/state')).body,false);
      assert.equal((await other.call('/api/applications/'+application.id,'PUT',{...answers,revision:1})).status,404);
      assert.equal((await learner.call('/api/admin/application/'+application.id,'PUT',{status:'accepted',revision:1})).status,403);
    });
    await t.test('owner edits preserve unedited answers and stale versions cannot overwrite review',async()=>{
      assert.equal((await learner.call('/api/applications/'+application.id,'PUT',{goals:'Changed without a version'})).status,409);
      assert.equal((await learner.call('/api/applications/'+application.id,'PUT',{applicationType:'mentor',revision:1})).status,400);
      const update=await learner.call('/api/applications/'+application.id,'PUT',{goals:'Learn responsible AI for a career transition.',revision:1}); assert.equal(update.status,200);
      application=update.body.application; assert.equal(application.revision,2); assert.deepEqual(application.interests,answers.interests);
      const review=await admin.call('/api/admin/application/'+application.id,'PUT',{status:'in_review',staffNote:'We are reviewing your goals.',revision:2}); assert.equal(review.status,200);
      application=review.body.application;
      assert.equal((await learner.call('/api/applications/'+application.id,'PUT',{availability:'Weekends',revision:2})).status,409);
      assert.equal((await learner.call('/api/applications/'+application.id,'PUT',{availability:'Weekends',revision:application.revision})).status,409);
      assert.equal((await admin.call('/api/admin/application/'+application.id,'PUT',{status:'accepted',revision:2})).status,409);
      assert.equal((await admin.call('/api/admin/application/'+application.id,'PUT',{staffNote:'x'.repeat(3001),revision:application.revision})).status,400);
    });
    await t.test('follow-up permits resubmission and keeps the visible staff response',async()=>{
      const followup=await admin.call('/api/admin/application/'+application.id,'PUT',{status:'follow_up',staffNote:'Please clarify when you can participate.',revision:application.revision}); assert.equal(followup.status,200);
      application=followup.body.application;
      const saved=await learner.call('/api/applications/'+application.id,'PUT',{availability:'Tuesday evenings for 20 minutes.',revision:application.revision}); assert.equal(saved.status,200);
      application=saved.body.application;
      assert.equal(application.status,'submitted'); assert.equal(application.staffNote,'Please clarify when you can participate.');
      assert.equal((await learner.call('/api/state')).body.applications[0].staffNote,application.staffNote);
    });
    await t.test('decisions use compare-and-set and never change role or membership access',async()=>{
      const results=await Promise.all(['accepted','declined'].map(status=>admin.call('/api/admin/application/'+application.id,'PUT',{status,revision:application.revision})));
      assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
      application=results.find(r=>r.status===200)!.body.application;
      const state=(await learner.call('/api/state')).body;
      assert.equal(state.user.role,'learner'); assert.equal(state.user.membershipTier,'community'); assert.equal(state.courses.length,3);
      assert.equal((await learner.call('/api/applications/'+application.id,'PUT',{goals:'Try changing a final decision',revision:application.revision})).status,409);
      const next=await learner.call('/api/applications','POST',answers); assert.equal(next.status,201); assert.notEqual(next.body.application.id,application.id);
      assert.equal((await admin.call('/api/admin/application/'+application.id,'PUT',{status:'in_review',revision:application.revision})).status,409);
      assert.equal((await learner.call('/api/state')).body.applications.length,2);
    });
    await t.test('additive migration is repeatable and old role migration refuses newer application data',async()=>{
      const before=(await env.DB.prepare('SELECT * FROM applications ORDER BY id').all()).results;
      const migration=await readFile(new URL('../migrations/0003_applications.sql',import.meta.url),'utf8');
      const statements=migration.split(';').map(s=>s.trim()).filter(Boolean);
      await env.DB.batch(statements.map(sql=>env.DB.prepare(sql)));
      await env.DB.batch(statements.map(sql=>env.DB.prepare(sql)));
      assert.deepEqual((await env.DB.prepare('SELECT * FROM applications ORDER BY id').all()).results,before);
      const old=await readFile(new URL('../migrations/0002_mentor_accounts.sql',import.meta.url),'utf8');
      await assert.rejects(env.DB.batch(old.split(';').map(s=>s.trim()).filter(Boolean).map(sql=>env.DB.prepare(sql))),/application_migration_already_applied/);
      assert.deepEqual((await env.DB.prepare('SELECT * FROM applications ORDER BY id').all()).results,before);
      assert.deepEqual((await env.DB.prepare('PRAGMA foreign_key_check').all()).results,[]);
      assert.equal((await learner.call('/api/state')).body.user.id,person.id);
    });
  } finally {await runtime.dispose();}
});

test('membership plans support prices, defaults, archives and concurrent review-safe edits',async(t)=>{
  const {runtime,env}=await environment(true,undefined,false);
  try {
    const admin=new Client(env),learner=new Client(env),anon=new Client(env);
    await admin.call('/api/login','POST',{username:'admin',password:'test1234'});
    await learner.call('/api/register','POST',{name:'Plan test',username:'plan.test',password:'A-test-password',stage:'Student or recent graduate',goal:'Explore tech'});
    const originalUser=(await learner.call('/api/state')).body.user;
    const plans=async()=> (await admin.call('/api/state')).body.settings.membershipTiers as any[];
    const starter=await plans();
    assert.equal(starter.length,3);assert.equal(starter.filter(p=>p.isDefault).length,1);
    assert.ok(starter.every(p=>p.active&&p.priceAmount===0&&p.currency==='USD'&&p.billingPeriod==='free'&&p.revision===1));
    const payload={name:'Career coaching',description:'Monthly group coaching with program staff.',benefits:['Monthly group session','Career planning'],priceAmount:29.95,currency:'USD',billingPeriod:'monthly',active:true,isDefault:false};
    let paid:any;
    await t.test('only admins can create plans and invalid prices are rejected',async()=>{
      assert.equal((await anon.call('/api/admin/membership-plan','POST',payload)).status,401);
      assert.equal((await learner.call('/api/admin/membership-plan','POST',payload)).status,403);
      for(const change of [{priceAmount:-1},{priceAmount:1.001},{priceAmount:1000001},{priceAmount:'20'},{currency:'XXX'},{billingPeriod:'weekly'},{priceAmount:0},{billingPeriod:'free'},{active:false,isDefault:true},{id:'Invalid ID'},{benefits:Array(11).fill('Too many')}]) {
        assert.equal((await admin.call('/api/admin/membership-plan','POST',{...payload,...change})).status,400);
      }
      const created=await admin.call('/api/admin/membership-plan','POST',payload);assert.equal(created.status,201);
      paid=created.body.plan;assert.match(paid.id,/^plan-/);assert.equal(paid.priceAmount,29.95);assert.equal(paid.revision,1);
    });
    await t.test('atomic revisions preserve one winning edit and other plan fields',async()=>{
      const results=await Promise.all(['Coaching A','Coaching B'].map(name=>admin.call('/api/admin/membership-plan/'+paid.id,'PUT',{name,revision:1})));
      assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);paid=results.find(r=>r.status===200)!.body.plan;
      assert.equal(paid.priceAmount,29.95);assert.equal(paid.revision,2);
      assert.equal((await admin.call('/api/admin/membership-plan/'+paid.id,'PUT',{name:'Stale',revision:1})).status,409);
      assert.equal((await admin.call('/api/admin/membership-plan/'+paid.id,'PUT',{id:'changed',revision:2})).status,400);
    });
    await t.test('a new default affects new learners without billing or access changes',async()=>{
      const changed=await admin.call('/api/admin/membership-plan/'+paid.id,'PUT',{isDefault:true,revision:paid.revision});assert.equal(changed.status,200);paid=changed.body.plan;
      assert.equal((await plans()).filter(p=>p.isDefault).length,1);
      assert.equal((await learner.call('/api/state')).body.user.membershipTier,'community');
      const newcomer=new Client(env);
      assert.equal((await newcomer.call('/api/register','POST',{name:'New member',username:'plan.new',password:'A-test-password',stage:'Returning to work',goal:'Return to tech'})).status,200);
      const state=(await newcomer.call('/api/state')).body;assert.equal(state.user.membershipTier,paid.id);assert.equal(state.courses.length,3);
      assert.equal((await admin.call('/api/admin/membership-plan/'+paid.id,'PUT',{active:false,revision:paid.revision})).status,400);
      assert.equal((await admin.call('/api/admin/membership-plan/'+paid.id,'PUT',{isDefault:false,revision:paid.revision})).status,400);
      const added=await admin.call('/api/admin/learner','POST',{name:'Program participant'});assert.equal(added.status,201);assert.equal(added.body.user.membershipTier,paid.id);
    });
    await t.test('archiving preserves existing assignments but blocks new ones',async()=>{
      const community=(await plans()).find(p=>p.id==='community');
      assert.equal((await admin.call('/api/admin/membership-plan/community','PUT',{active:false,revision:community.revision})).status,200);
      assert.equal((await admin.call('/api/admin/learner/'+originalUser.id,'PUT',{membershipTier:'community',name:'Still assigned'})).status,200);
      const newUser=(await admin.call('/api/state')).body.users.find((u:any)=>u.username==='plan.new');
      assert.equal((await admin.call('/api/admin/learner/'+newUser.id,'PUT',{membershipTier:'community'})).status,400);
      assert.equal((await admin.call('/api/admin/learner/'+originalUser.id,'PUT',{membershipTier:paid.id})).status,200);
      assert.equal((await learner.call('/api/profile','PUT',{membershipTier:'community'})).status,400);
    });
    await t.test('general settings cannot remove plans or silently reset their prices',async()=>{
      const state=(await admin.call('/api/state')).body;
      const {programName,description,weeklyGoal,contactUrl}=state.settings;
      const body={programName,description,weeklyGoal,contactUrl};
      assert.equal((await admin.call('/api/admin/settings','PUT',{...body,membershipTiers:starter})).status,400);
      assert.equal((await admin.call('/api/admin/settings','PUT',{...body,programName:'Updated program'})).status,200);
      assert.deepEqual(await plans(),state.settings.membershipTiers);
    });
    await t.test('all twelve career stages work for learner profiles and new mentor records',async()=>{
      assert.equal(STAGES.length,12);assert.equal(new Set(STAGES).size,12);
      for(const stage of STAGES) assert.equal((await learner.call('/api/profile','PUT',{stage})).status,200,stage);
      assert.equal((await learner.call('/api/profile','PUT',{stage:'Not a real stage'})).status,400);
      const mentor={name:'Test mentor',role:'Engineer',company:'Test company',story:'Professional experience',expertise:['AI'],experiences:['Career transition'],stage:'Technical specialist',availability:'By arrangement',capacity:2,verified:false,active:true};
      assert.equal((await admin.call('/api/admin/mentor','POST',mentor)).status,200);
    });
  } finally { await runtime.dispose(); }
});

test('plan entitlements are enforced, existing learning is preserved, and editing creates isolated course versions',async()=>{
 const {runtime,env}=await environment(true,undefined,false);const admin=new Client(env),learner=new Client(env),newLearner=new Client(env);
 try {
  await admin.call('/api/login','POST',{username:'admin',password:'test1234'});
  await learner.call('/api/register','POST',{name:'Access tester',username:'access-test',password:'example-password',stage:STAGES[0],goal:'Learn'});
  const course=courses[0];
  assert.equal((await learner.call('/api/enroll','POST',{courseId:course.id,answers:course.preQuiz.map(q=>q.answer),confidence:3})).status,200);
  let plan=(await admin.call('/api/state')).body.settings.membershipTiers.find((p:any)=>p.id==='community');
  const access={courses:'none',courseIds:[],mentoring:false,aiHelp:false};
  assert.equal((await admin.call('/api/admin/membership-plan/community','PUT',{access,revision:plan.revision})).status,200);
  const state=(await learner.call('/api/state')).body;
  assert.deepEqual(state.access,access);assert.deepEqual(state.courses.map((c:any)=>c.id),[course.id]);
  assert.equal((await learner.call('/api/enroll','POST',{courseId:courses[1].id,answers:courses[1].preQuiz.map(q=>q.answer),confidence:3})).status,403);
  assert.equal((await learner.call('/api/requests','POST',{topic:'New meeting'})).status,403);
  assert.equal((await learner.call('/api/feedback','POST',{courseId:course.id,lessonId:course.lessons[0].id,question:'Explain'})).status,403);
  assert.equal((await learner.call('/api/assistant','POST',{message:'Help me'})).status,403);
  assert.equal((await learner.call('/api/profile','PUT',{membershipTier:'guided'})).status,400);
  assert.equal((await learner.call('/api/needs','POST',{category:'learning',priority:'routine',summary:'Please change my plan'})).status,201);
  const rewritten=structuredClone(course);rewritten.lessons=[{...course.lessons[0],id:'new-lesson',body:'A completely revised lesson.'}];rewritten.preQuiz[0].answer=(rewritten.preQuiz[0].answer+1)%rewritten.preQuiz[0].options.length;
  const saved=await admin.call('/api/admin/course','POST',rewritten);assert.equal(saved.status,200);assert.equal(saved.body.course.revision,2);
  assert.equal((await admin.call('/api/admin/course','POST',rewritten)).status,409);
  assert.deepEqual((await learner.call('/api/state')).body.courses[0].lessons,course.lessons);
  for(const lesson of course.lessons)assert.equal((await learner.call('/api/lesson/complete','POST',{courseId:course.id,lessonId:lesson.id,answer:lesson.answer})).body.correct,true);
  assert.equal((await learner.call('/api/course/complete','POST',{courseId:course.id,answers:course.postQuiz.map(q=>q.answer),confidence:5})).body.score,100);
  plan=(await admin.call('/api/state')).body.settings.membershipTiers.find((p:any)=>p.id==='community');
  assert.equal((await admin.call('/api/admin/membership-plan/community','PUT',{access:{...access,courses:'selected',courseIds:['missing']},revision:plan.revision})).status,400);
  assert.equal((await admin.call('/api/admin/membership-plan/community','PUT',{access:{...access,courses:'selected',courseIds:[course.id]},revision:plan.revision})).status,200);
  await newLearner.call('/api/register','POST',{name:'New version tester',username:'new-version',password:'example-password',stage:STAGES[0],goal:'Learn'});
  assert.equal((await newLearner.call('/api/state')).body.courses[0].lessons[0].id,'new-lesson');
  assert.equal((await newLearner.call('/api/enroll','POST',{courseId:course.id,answers:rewritten.preQuiz.map(q=>q.answer),confidence:3})).body.score,100);
  assert.equal((await admin.call('/api/enroll','POST',{courseId:course.id,answers:course.preQuiz.map(q=>q.answer),confidence:3})).status,403);
 } finally {await runtime.dispose();}
});

test('course generation is admin-only, validates AI output, never publishes automatically and hides provider secrets',async()=>{
 const {runtime,env}=await environment(true,undefined,false);const admin=new Client(env),anon=new Client(env);const originalFetch=globalThis.fetch;
 try {
  await admin.call('/api/login','POST',{username:'admin',password:'test1234'});
  const input={brief:'Teach safe AI prompting',audience:'Beginners',lessonCount:3};
  assert.equal((await anon.call('/api/admin/course/generate','POST',input)).status,401);
  assert.equal((await admin.call('/api/admin/course/generate','POST',input)).status,503);
  env.OPENAI_API_KEY='synthetic-test-key-do-not-use';env.AI_MODEL='configured-model';
  globalThis.fetch=async(url,options)=>{assert.equal(String(url),'https://api.openai.com/v1/responses');const body=JSON.parse(options!.body as string);assert.equal(body.model,'configured-model');assert.equal(body.store,false);assert.equal(body.text.format.strict,true);assert.equal(body.tools,undefined);return new Response(JSON.stringify({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(courses[0])}]}]}));};
  const generated=await admin.call('/api/admin/course/generate','POST',input);assert.equal(generated.status,200);assert.equal(generated.body.course.published,false);assert.notEqual(generated.body.course.id,courses[0].id);
  assert.doesNotMatch(JSON.stringify(generated.body),/synthetic-test-key/);
  assert.equal((await admin.call('/api/state')).body.courses.length,3);
  globalThis.fetch=async()=>new Response(JSON.stringify({status:'incomplete',output:[]}));
  assert.equal((await admin.call('/api/admin/course/generate','POST',input)).status,502);
  globalThis.fetch=async()=>new Response(JSON.stringify({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({...courses[0],minutes:-10})}]}]}));
  assert.equal((await admin.call('/api/admin/course/generate','POST',input)).status,502);
  globalThis.fetch=async()=>new Response('secret-provider-error',{status:401});
  const failed=await admin.call('/api/admin/course/generate','POST',input);assert.equal(failed.status,502);assert.doesNotMatch(JSON.stringify(failed.body),/secret-provider-error/);
 } finally {globalThis.fetch=originalFetch;await runtime.dispose();}
});

test('program agent prepares without writing, blocks unauthorized actions, checks freshness and applies each proposal once',async()=>{
 const {runtime,env}=await environment(true,undefined,false);const admin=new Client(env),learner=new Client(env);const originalFetch=globalThis.fetch;
 try {
  await admin.call('/api/login','POST',{username:'admin',password:'test1234'});
  await learner.call('/api/register','POST',{name:'Agent learner',username:'agent-learner',password:'example-password',stage:STAGES[0],goal:'Learn'});
  assert.equal((await learner.call('/api/admin/agent/propose','POST',{message:'Change a plan'})).status,403);
  assert.equal((await learner.call('/api/admin/agent/history')).status,403);
  assert.equal((await admin.call('/api/admin/agent/propose','POST',{message:'Create a plan'})).status,503);
  env.OPENAI_API_KEY='synthetic-test-key';
  let commands:any[]=[];
  globalThis.fetch=async(_url,options)=>{const request=JSON.parse(options!.body as string);assert.equal(request.store,false);assert.doesNotMatch(request.input,/synthetic-test-key|password_hash/);return new Response(JSON.stringify({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({reply:'Review these proposed changes.',commands})}]}]}));};
  const command=(operation:string,targetId:string,changes:any)=>({operation,targetId,changes:Object.entries(changes).map(([field,value])=>({field,value:JSON.stringify(value)}))});
  commands=[command('plan','',{name:'AI prepared plan',description:'A new community plan',priceAmount:0})];
  const proposed=await admin.call('/api/admin/agent/propose','POST',{message:'Create a plan'});assert.equal(proposed.status,200);assert.equal(proposed.body.proposal.status,'pending');
  assert.equal((await admin.call('/api/state')).body.settings.membershipTiers.length,3);
  const proposalId=proposed.body.proposal.id;
  assert.equal((await learner.call(`/api/admin/agent/${proposalId}/apply`,'POST',{})).status,403);
  const responses=await Promise.all([admin.call(`/api/admin/agent/${proposalId}/apply`,'POST',{}),admin.call(`/api/admin/agent/${proposalId}/apply`,'POST',{})]);assert.ok(responses.some(r=>r.status===200));
  assert.equal((await admin.call('/api/state')).body.settings.membershipTiers.length,4);
  assert.equal((await admin.call(`/api/admin/agent/${proposalId}/apply`,'POST',{})).body.proposal.status,'applied');
  assert.equal((await admin.call('/api/state')).body.settings.membershipTiers.length,4);
  commands=[command('plan','community',{description:'Agent proposed change'})];
  const stale=(await admin.call('/api/admin/agent/propose','POST',{message:'Change community'})).body.proposal;
  let community=(await admin.call('/api/state')).body.settings.membershipTiers.find((p:any)=>p.id==='community');
  await admin.call('/api/admin/membership-plan/community','PUT',{description:'A human changed it',revision:community.revision});
  assert.equal((await admin.call(`/api/admin/agent/${stale.id}/apply`,'POST',{})).status,409);
  community=(await admin.call('/api/state')).body.settings.membershipTiers.find((p:any)=>p.id==='community');assert.equal(community.description,'A human changed it');
  commands=[command('learner',(await learner.call('/api/state')).body.user.id,{role:'admin'})];
  assert.equal((await admin.call('/api/admin/agent/propose','POST',{message:'Change roles'})).status,400);
  commands=[command('settings','',{apiKey:'do-not-save'})];
  assert.equal((await admin.call('/api/admin/agent/propose','POST',{message:'Change key'})).status,400);
  commands=[command('announcement','',{title:'Prepared update',body:'Update your goals.',active:false})];
  const cancel=(await admin.call('/api/admin/agent/propose','POST',{message:'Draft an update'})).body.proposal;
  assert.equal((await admin.call(`/api/admin/agent/${cancel.id}/cancel`,'POST',{})).body.proposal.status,'canceled');
  assert.equal((await admin.call(`/api/admin/agent/${cancel.id}/apply`,'POST',{})).body.proposal.status,'canceled');
  assert.equal((await admin.call('/api/state')).body.announcements.length,0);
  const history=await admin.call('/api/admin/agent/history');assert.ok(history.body.proposals.length>=3);assert.doesNotMatch(JSON.stringify(history.body),/password_hash|synthetic-test-key|payload|actorId/);
 } finally {globalThis.fetch=originalFetch;await runtime.dispose();}
});
