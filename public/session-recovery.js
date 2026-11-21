(() => {
 let pending;
 window.NextStepSession={recover(user){
  if(pending)return pending;
  pending=new Promise((resolve,reject)=>{
   const dialog=document.createElement('dialog');dialog.className='session-recovery';
   dialog.innerHTML='<form><h2>Reconnect your session</h2><p>Your session ended or changed in another tab. Sign in again to continue. Your open form is kept in this tab.</p><label>Username<input name="username" autocomplete="username" readonly></label><label>Password<input name="password" type="password" autocomplete="current-password" required></label><p role="alert"></p><div class="row wrap"><button class="btn btn-primary" type="submit">Sign in and continue</button><button class="btn btn-secondary" type="button">Keep editing</button></div></form>';
   const form=dialog.querySelector('form'),error=form.querySelector('[role=alert]');form.elements.username.value=user.username;
   const finish=(ok)=>{form.reset();dialog.close();dialog.remove();pending=null;ok?resolve():reject(new Error('Your changes are still in the form. Reconnect your session when you are ready to save.'));};
   dialog.addEventListener('cancel',e=>{e.preventDefault();finish(false);});form.querySelector('[type=button]').onclick=()=>finish(false);
   form.onsubmit=async e=>{e.preventDefault();e.stopPropagation();const button=form.querySelector('[type=submit]');button.disabled=true;error.textContent='';try{
    const response=await fetch('/api/login',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:user.username,password:form.elements.password.value})});
    const result=await response.json();form.elements.password.value='';
    if(!response.ok)throw new Error(result.error||'Could not sign in. Try again.');
    if(result.user.id!==user.id||result.user.role!==user.role)throw new Error('The account changed. Reload the workspace before continuing.');
    finish(true);
   }catch(e){error.textContent=e.message;}finally{button.disabled=false;}};
   document.body.append(dialog);dialog.showModal();form.elements.password.focus();
  });return pending;
 }};
})();
