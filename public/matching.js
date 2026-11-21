'use strict';
function matchingPanel(learnerId=''){
 const admin=data.user?.role==='admin';
 return `<section class="panel mb-16" data-matching-panel><h2>Find your connections</h2><p class="small muted">Find real mentors in this program who share your interests. Review their experience, request an introduction, and follow the connection in Your connections. AI uses matching preferences, never grades, résumés, stories or contact details.</p>${admin&&!learnerId?`<div class="field"><label for="match-learner">Learner</label><select id="match-learner" name="matchLearner">${(data.users||[]).filter(u=>u.active).map(u=>`<option value="${esc(u.id)}">${esc(u.name)}</option>`).join('')}</select></div>`:''}<button type="button" class="btn btn-primary" data-action="find-ai-matches" data-id="${esc(learnerId)}" ${!admin&&data.access?.mentoring===false?'disabled':''}>Find people</button>${!admin?'<button class="btn btn-ghost" data-action="navigate" data-view="profile">Edit my interests</button>':''}<p class="help">This searches the program’s mentor profiles. It does not search external networks or expose other learners’ private profiles.</p><div data-match-results role="status"></div><div data-match-composer></div></section>`;
}
function matchPersonCard(match,learnerId,unconfirmed=false){
 const mentor=(data.mentors||[]).find(m=>m.id===match.id&&m.active&&m.capacity>0);if(!mentor)return '';
 const learner=data.user.role==='learner',existing=(data.requests||[]).find(r=>r.userId===(learner?data.user.id:learnerId)&&r.mentorId===mentor.id&&['waiting','scheduled'].includes(r.status));
 const action=learner?existing?'<button class="btn btn-secondary" data-action="view-connections">View your request</button>':`<button class="btn btn-secondary" data-action="open-match-request" data-id="${esc(mentor.id)}">Request an introduction</button>`:existing?`<button class="btn btn-secondary" data-action="edit-request" data-id="${esc(existing.id)}">Coordinate this connection</button>`:`<button class="btn btn-secondary" data-action="open-match-request" data-id="${esc(mentor.id)}" data-learner-id="${esc(learnerId)}">Request an introduction</button>`;
 return `<article class="task-card mt-16"><span class="badge ${unconfirmed?'outline':'green'}">${unconfirmed?'No confirmed shared-interest match':'Shared interests'}</span><h3 class="mt-16">${esc(mentor.name)}</h3><p>${esc([mentor.role,mentor.company].filter(Boolean).join(' · '))}</p><p><strong>Expertise:</strong> ${esc((mentor.expertise||[]).join(', ')||'Ask staff to confirm this mentor’s expertise.')}</p><p>${esc(match.reason)}</p>${!unconfirmed&&match.sharedInterests?.length?`<p class="small"><strong>Shared topics:</strong> ${esc(match.sharedInterests.join(', '))}</p>`:''}<p class="small"><strong>Availability:</strong> ${esc(mentor.availability||'To be confirmed together.')}</p><p class="small">${esc((match.questions||[]).join(' '))}</p>${action}</article>`;
}
function matchingResults(result,learnerId=''){
 const matches=result.mentors||[],others=result.otherMentors||[],learner=data.user.role==='learner';
 const current=(data.requests||[]).find(r=>r.userId===(learner?data.user.id:learnerId)&&!r.mentorId&&['waiting','scheduled'].includes(r.status));
 return `<p class="badge ${result.mode==='ai'?'purple':'outline'}">${result.mode==='ai'?'AI-assisted mentor matching':'Mentor profile matching'}</p><p>${esc(result.summary)}</p>${result.notice?`<p class="note">${esc(result.notice)}</p>`:''}${matches.length?'<h3 class="mt-16">People with shared interests</h3>':''}${matches.map(match=>matchPersonCard(match,learnerId)).join('')}${others.length?'<h3 class="mt-16">Other available people</h3><p class="small muted">These are real mentor profiles, but we have not confirmed a fit for your interests.</p>':''}${others.map(match=>matchPersonCard(match,learnerId,true)).join('')}<section class="task-card mt-16"><h3>${matches.length?'Want a different connection?':'Let staff find the right person'}</h3><p>Tell the program team what you need. A saved request stays in Your connections until staff assign a mentor and arrange the introduction.</p>${learner?current?'<p class="badge outline">Your staff matching request is already saved</p><button class="btn btn-secondary" data-action="view-connections">View your request</button>':'<button class="btn btn-primary" data-action="open-match-request">Ask staff to find a mentor</button>':current?`<button class="btn btn-primary" data-action="edit-request" data-id="${esc(current.id)}">Coordinate the open request</button>`:`<button class="btn btn-primary" data-action="open-match-request" data-learner-id="${esc(learnerId)}">Create a staff matching request</button>`}</section>`;
}
async function matchingAction(action,button){
 if(action==='course-mentor-request'){
  if(openMentorRequest(null)){await navigate('mentors');notify('You already have an open match request. The program team can coordinate your course support there.');return true;}
  const course=data.courses.find(c=>c.id===button.dataset.id);openModal('request',null);modalRoot.querySelector('[name=topic]').value=`Course: ${course.title}\n${course.mentorPrompt||'Please connect me with a mentor to review my practice project.'}\nSkills: ${(course.skills||[]).join(', ')}`.slice(0,2000);modalDirty=true;return true;
 }
 if(action==='open-match-request'){
  if(!['learner','admin'].includes(data.user.role))return true;
  const mentorId=button.dataset.id||null,panel=button.closest('[data-matching-panel]'),composer=panel.querySelector('[data-match-composer]'),learnerId=data.user.role==='admin'?button.dataset.learnerId:data.user.id,profile=data.user.role==='admin'?(data.users||[]).find(u=>u.id===learnerId&&u.active):data.user;
  if(!profile)throw new Error('Select an active learner before requesting an introduction.');
  if((data.requests||[]).some(r=>r.userId===learnerId&&(r.mentorId||null)===mentorId&&['waiting','scheduled'].includes(r.status))){await navigate('mentors');notify('Your request is already saved in Your connections.');return true;}
  const mentor=mentorId?(data.mentors||[]).find(m=>m.id===mentorId&&m.active&&m.capacity>0):null;if(mentorId&&!mentor)throw new Error('This mentor is no longer accepting requests. Find people again to refresh availability.');
  const topic=[mentor?`Please introduce me to ${mentor.name}.`:'Please help me find a mentor with relevant experience.',profile.goal?`My goal: ${profile.goal}`:'',profile.interests?`My interests: ${profile.interests}`:''].filter(Boolean).join('\n').slice(0,2000);
  composer.innerHTML=`<section class="task-card mt-16"><h3>${mentor?`Request an introduction to ${esc(mentor.name)}`:'Ask staff to find your mentor'}</h3><p>${data.user.role==='admin'?`For ${esc(profile.name)}. `:''}Review the topic, then send it to program staff. This creates a waiting request; it does not promise a meeting or contact anyone outside the app.</p><div class="field"><label for="match-request-topic">What would you like support with?</label><textarea id="match-request-topic" name="matchTopic" maxlength="2000" required>${esc(topic)}</textarea></div><p data-match-error role="alert"></p><button class="btn btn-primary" data-action="send-match-request" data-id="${esc(mentorId||'')}" data-learner-id="${esc(learnerId)}">Send request to staff</button></section>`;
  composer.querySelector('textarea')?.focus();return true;
 }
 if(action==='send-match-request'){
  if(!['learner','admin'].includes(data.user.role))return true;
  const panel=button.closest('[data-matching-panel]'),composer=panel.querySelector('[data-match-composer]'),topic=composer.querySelector('[name=matchTopic]').value.trim(),error=composer.querySelector('[data-match-error]');
  if(!topic){error.textContent='Tell staff what you would like support with.';return true;}
  button.disabled=true;error.textContent='';
  try{
   const admin=data.user.role==='admin',result=await api(admin?'/api/admin/connection-request':'/api/requests','POST',{...(admin?{userId:button.dataset.learnerId}:{}),...(button.dataset.id?{mentorId:button.dataset.id}:{}),topic,cadence:'one_time'});
   if(!result.request?.id)throw new Error('The server did not confirm this request. Refresh Your connections before trying again.');
   data.requests=[...(data.requests||[]).filter(r=>r.id!==result.request.id),result.request];
   await navigate('mentors');notify('Request saved. Program staff can now arrange your introduction. Find it in Your connections.');
  }catch(e){error.textContent=e.message;}finally{button.disabled=false;}return true;
 }
 if(action!=='find-ai-matches')return false;
 const panel=button.closest('[data-matching-panel]'),host=panel.querySelector('[data-match-results]');button.disabled=true;host.textContent='Checking real mentor profiles…';
 try{const learnerId=button.dataset.id||panel.querySelector('[name=matchLearner]')?.value,result=await api('/api/matches','POST',data.user.role==='admin'?{learnerId}:{});host.innerHTML=matchingResults(result,learnerId);panel.querySelector('[data-match-composer]').innerHTML='';}
 catch(e){host.textContent=e.message;}finally{button.disabled=false;}return true;
}
function courseConnection(c){return `<section class="panel mb-16"><h2>Study with a mentor</h2><p>${esc(c.mentorPrompt||'Bring one question and your practice work. Ask the program team to connect you with a mentor.')}</p><button class="btn btn-secondary" data-action="course-mentor-request" data-id="${esc(c.id)}" ${data.access?.mentoring===false?'disabled':''}>Request a course mentor</button><p class="help">Open requests go to program staff. They will assign a real mentor and confirm a meeting time.</p>${(c.sources||[]).length?`<details><summary>Further reading</summary><ul>${c.sources.map(s=>`<li><a href="${safeUrl(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a></li>`).join('')}</ul></details>`:''}</section>`;}
function renderLessonBody(body){
 const inline=s=>esc(s).replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/`([^`]+)`/g,'<code>$1</code>');
 let code=false,buffer=[],out=[];
 for(const line of String(body).split('\n')){
  if(/^\s*```/.test(line)){if(code){out.push('<pre><code>'+esc(buffer.join('\n'))+'</code></pre>');buffer=[];}code=!code;continue;}
  if(code){buffer.push(line);continue;}
  if(!line.trim())continue;
  if(/^#{1,6}\s/.test(line)){out.push('<h3>'+inline(line.replace(/^#{1,6}\s+/,''))+'</h3>');continue;}
  out.push('<p'+(/^\s*[-*]\s/.test(line)?' class="study-list-item"':'')+'>'+inline(line.replace(/^\s*[-*]\s/,'• '))+'</p>');
 }
 if(buffer.length)out.push('<pre><code>'+esc(buffer.join('\n'))+'</code></pre>');
 return out.join('');
}
