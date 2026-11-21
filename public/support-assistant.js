(() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  window.NextStepSupport = {mount(host, context) {
    const admin=context.state.user.role==='admin';
    if(!admin&&context.state.access?.aiHelp===false){host.innerHTML='<div class="note">AI help is not included in your plan. You can still share a need with the program team below.</div>';return;}
    host.innerHTML=`<section class="ns-assistant"><div class="ns-assistant-heading"><div><p class="ns-assistant-eyebrow">YOUR NEXT STEP</p><h2>Plan your next step</h2><p>${admin?'Plan support, prepare follow-ups, and make the most of your program evidence.':'Turn a goal into a small learning plan and a better mentor conversation.'}</p></div><span class="ns-assistant-badge">${context.state.aiAvailable?'AI planning assistant':'Prepared program guide'}</span></div><form class="ns-assistant-form"><label for="ns-assistant-message">What would you like help with?</label><textarea id="ns-assistant-message" name="message" rows="3" maxlength="2000" required placeholder="${admin?'How can we follow up with members who are waiting for a mentor?':'I want to build confidence using AI and prepare for my first mentor meeting.'}"></textarea><p class="ns-assistant-help">${context.state.aiAvailable?'Your question and saved goal go to OpenAI with the course list. Keep personal records and contact details out of your question.':'Live AI is not connected. This guide can suggest steps using the program’s learning paths.'} Suggestions need your review; this assistant does not send messages or change records.</p><button type="submit" class="ns-assistant-button">Create my plan</button><p class="ns-assistant-error" role="alert"></p></form><div class="ns-assistant-result" aria-live="polite"></div></section>`;
    const form=host.querySelector('form'),button=form.querySelector('button'),error=host.querySelector('.ns-assistant-error'),output=host.querySelector('.ns-assistant-result');
    form.onsubmit=async event=>{
      event.preventDefault();event.stopPropagation();
      const message=form.elements.message.value.trim();if(!message)return;
      button.disabled=true;button.textContent='Creating your plan…';error.textContent='';output.setAttribute('aria-busy','true');
      try{
        const result=await context.request('/api/assistant','POST',{message});
        output.innerHTML=`<div class="ns-plan"><span class="ns-assistant-badge">${result.mode==='live-ai'?'AI suggestion · review before using':'Prepared program guide'}</span><div class="ns-plan-reply"></div><ol>${result.steps.map((step,index)=>`<li><div><h3>${esc(step.title)}</h3><div class="ns-plan-detail" data-step="${index}"></div>${step.courseId&&context.openCourse?`<button type="button" class="ns-course-button" data-course="${esc(step.courseId)}">${admin?'Review course':'Open course'}</button>`:''}</div></li>`).join('')}</ol><p class="ns-assistant-help">Your plan is shown for this visit. ${admin?'Record the follow-up on the relevant member need.':'Choose Share a need when you want the program team to follow up.'}</p></div>`;
        const format=(element,text)=>{if(window.NextStepMarkdown)window.NextStepMarkdown.render(element,text);else{element.classList.add('assistant-plain-text');element.textContent=text;}};
        format(output.querySelector('.ns-plan-reply'),result.reply);
        output.querySelectorAll('[data-step]').forEach(element=>format(element,result.steps[Number(element.dataset.step)].detail));
        output.querySelectorAll('[data-course]').forEach(control=>control.onclick=()=>context.openCourse(control.dataset.course));
      }catch(e){error.textContent=e.message||'The plan could not be loaded. Please try again.';}
      finally{button.disabled=false;button.innerHTML='Create my plan';output.removeAttribute('aria-busy');}
    };
  }};
})();
