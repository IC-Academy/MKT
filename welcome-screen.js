(()=>{
 'use strict';
 const $=s=>document.querySelector(s);
 if(!$('#goForms')||!$('#accessButton'))return;
 let intent='solicitar', stage='email', email='';
 const profiles=[
  {id:'requester-demo',initials:'SO',title:'Colaborador solicitante',role:'Solicitante',details:'Crear y consultar mis solicitudes'},
  {id:'veronica',initials:'DI',title:'Diseño',role:'Diseño',details:'Diseño, fotografía y prototipado'},
  {id:'jessica',initials:'MD',title:'Marketing Digital',role:'Reclutamiento digital',details:'Campañas, presupuesto y efectividad'},
  {id:'abigail',initials:'CO',title:'Comunicación',role:'Comunicados',details:'Comunicados y calendario'},
  {id:'projects-demo',initials:'PR',title:'Gestor de Proyectos',role:'Gestión de proyectos',details:'Solicitudes y seguimiento de proyectos'},
  {id:'nydia',initials:'AD',title:'Administrador',role:'Administración',details:'Bandeja de trabajo y asignaciones'},
  {id:'super-demo',initials:'SA',title:'Super Admin',role:'Super Admin',details:'Usuarios, roles y administración'}
 ];
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const overlay=document.createElement('div');
 overlay.id='mktLoginOverlay';
 overlay.hidden=true;
 overlay.innerHTML=`<div class="mkt-login-scrim" data-login-close></div>
 <section class="mkt-login-window" role="dialog" aria-modal="true" aria-labelledby="mktLoginHeading">
  <div class="mkt-login-top"><span class="mkt-login-wordmark"><span class="mkt-login-grid" aria-hidden="true"><i></i><i></i><i></i><i></i></span> Inter-Con <span class="mkt-login-muted">Marketing</span></span><button type="button" class="mkt-login-x" data-login-close aria-label="Cerrar acceso">×</button></div>
  <div id="mktLoginEmailStage">
   <span class="mkt-login-kicker">Acceso al portal</span>
   <h2 id="mktLoginHeading">Iniciar sesión</h2>
   <p class="mkt-login-subtitle">Introduce tu correo corporativo para continuar con la demostración.</p>
   <form id="mktLoginEmailForm">
    <label for="mktLoginMail">Correo electrónico corporativo</label>
    <input id="mktLoginMail" name="email" type="email" autocomplete="off" spellcheck="false" placeholder="nombre@intercon.com.mx" required>
    <p class="mkt-login-message" id="mktLoginError" aria-live="polite"></p>
    <div class="mkt-login-actions"><button type="submit" class="mkt-login-primary">Siguiente <span>→</span></button></div>
   </form>
   <p class="mkt-login-advice">Este acceso es simulado. No se verifica la cuenta ni se solicita contraseña.</p>
  </div>
  <div id="mktLoginProfileStage" hidden>
   <button type="button" id="mktLoginBack" class="mkt-login-back">← Cambiar correo</button>
   <h2>Selecciona tu perfil</h2>
   <p class="mkt-login-subtitle">Así se verá el espacio de trabajo según el rol asignado.</p>
   <div class="mkt-login-account"><span class="mkt-login-usericon">◎</span><span id="mktLoginAccountText"></span><strong>DEMO</strong></div>
   <div class="mkt-login-profile-list" id="mktLoginProfiles"></div>
   <p class="mkt-login-advice">La selección de perfiles es ilustrativa y no otorga permisos reales.</p>
  </div>
  <div class="mkt-login-foot"><span>ENTORNO DE DEMOSTRACIÓN</span><span>Entra ID pendiente de integración</span></div>
 </section>`;
 document.body.appendChild(overlay);
 const mail=$('#mktLoginMail');
 const emailStage=$('#mktLoginEmailStage'),profileStage=$('#mktLoginProfileStage');
 const form=$('#mktLoginEmailForm');
 const list=$('#mktLoginProfiles');
 const cleanup=()=>{overlay.hidden=true;document.body.classList.remove('mkt-login-active');};
 const showStage=n=>{
  stage=n;emailStage.hidden=n!=='email';profileStage.hidden=n!=='profiles';
  if(n==='profiles')list.querySelector('button')?.focus();else mail.focus();
 };
 const open=kind=>{
  intent=kind;
  if(typeof currentUser==='function'&&currentUser()){
   if(kind==='solicitar'){view('solicitar');requestAnimationFrame(()=>$('#services')?.scrollIntoView({behavior:'smooth'}))}
   else view('equipo');
   return;
  }
  overlay.hidden=false;document.body.classList.add('mkt-login-active');
  showStage('email');
 };
 const escapeClose=()=>cleanup();
 overlay.querySelectorAll('[data-login-close]').forEach(b=>b.addEventListener('click',escapeClose));
 document.addEventListener('keydown',e=>{if(!overlay.hidden&&e.key==='Escape'){e.preventDefault();cleanup();}});
 list.innerHTML=profiles.map(p=>`<button type="button" class="mkt-login-profile" data-mkt-login-profile="${p.id}">
    <span class="mkt-login-profile-icon">${esc(p.initials)}</span>
    <span><strong>${esc(p.title)}</strong><small>${esc(p.details)}</small></span><span class="mkt-login-chevron">→</span>
  </button>`).join('');
 const select=id=>{
  // Reuse the existing demo profile selection; no identity or server permissions are asserted.
  $('#accessButton').click();
  const choice=$('#profileChoices [data-profile="'+id+'"]');
  if(!choice){$('#closeAccess')?.click();$('#mktLoginError').textContent='Este perfil de demostración no está disponible.';showStage('email');return;}
  choice.click();
  cleanup();
  if(intent==='solicitar'){
    view('solicitar');
    requestAnimationFrame(()=>$('#services')?.scrollIntoView({behavior:'smooth'}));
  }
 };
 list.querySelectorAll('[data-mkt-login-profile]').forEach(button=>button.addEventListener('click',()=>select(button.dataset.mktLoginProfile)));
 form.addEventListener('submit',event=>{
  event.preventDefault();
  email=mail.value.trim().toLowerCase();
  if(!/^[^\s@]+@intercon\.com\.mx$/.test(email)){
    $('#mktLoginError').textContent='Introduce un correo con formato @intercon.com.mx para la demostración.';
    mail.focus();return;
  }
  $('#mktLoginError').textContent='';
  $('#mktLoginAccountText').textContent=email;
  showStage('profiles');
 });
 $('#mktLoginBack').addEventListener('click',()=>showStage('email'));
 // Capture clicks before the old landing navigation handlers. Both actions open the same login.
 document.addEventListener('click',event=>{
  const trigger=event.target.closest('#goForms,.hero-actions [data-view="equipo"]');
  if(!trigger)return;
  event.preventDefault();event.stopImmediatePropagation();
  open(trigger.id==='goForms'?'solicitar':'equipo');
 },true);
 // When log out, return to the uncluttered home instead of an empty role dashboard.
 $('#logout')?.addEventListener('click',cleanup);
})();