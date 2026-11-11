(()=>{
  'use strict';
  const $=s=>document.querySelector(s);
  if(!$('#accessDialog')||!$('#accessButton'))return;
  const escape=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[x]));
  const scenarios=[
    {id:'requester-demo',initials:'SO',title:'Colaborador solicitante',sub:'Solicitud e historial',type:'Solicitante'},
    {id:'jessica',initials:'MD',title:'Marketing Digital',sub:'Campañas y presupuesto',type:'Marketing digital'},
    {id:'veronica',initials:'DI',title:'Diseñador',sub:'Diseños y entregables',type:'Diseño'},
    {id:'super-demo',initials:'SA',title:'Super Admin',sub:'Administración general',type:'Superadministrador'}
  ];
  const splash=document.createElement('div');
  splash.id='mktWelcome';
  splash.setAttribute('aria-label','Bienvenida al Portal MKT');
  splash.innerHTML=`<div class="mkt-welcome-art">
     <div class="mkt-welcome-art-inner">
       <div class="mkt-welcome-brand"><img class="mkt-welcome-actual-logo" src="assets/mkt-logo-source.png" alt="Marketing Inter-Con"><div><strong>INTER-CON</strong><small>PORTAL DE MARKETING</small></div></div>
       <div class="mkt-welcome-copy">
         <p class="mkt-welcome-overline">PLATAFORMA DE SERVICIOS DE MARKETING</p>
         <h1>De una idea<br>a una solicitud.<br><em>Todo conectado.</em></h1>
         <p class="mkt-welcome-intro">Centraliza las solicitudes de comunicación, diseño, reclutamiento digital y proyectos. Un solo espacio para dar seguimiento a cada entrega.</p>
         <div class="mkt-welcome-benefits"><span><b>01</b> Solicitudes centralizadas</span><span><b>02</b> Seguimiento por responsable</span><span><b>03</b> Visibilidad de cada avance</span></div>
       </div>
       <div class="mkt-welcome-art-footer"><span>INTER-CON · MARKETING</span><span>2026</span></div>
     </div>
   </div>
   <div class="mkt-welcome-login">
     <div class="mkt-welcome-login-inner">
       <p class="mkt-welcome-kicker">ACCESO AL PORTAL</p>
       <h2>Bienvenido al<br>Portal MKT</h2>
       <p class="mkt-welcome-description">Conoce cómo será la experiencia de cada colaborador. Por ahora puedes ingresar con un perfil de demostración.</p>
       <form id="mktWelcomeForm">
         <label for="mktWelcomeEmail">Correo electrónico corporativo</label>
         <div class="mkt-welcome-input"><span aria-hidden="true">✉</span><input id="mktWelcomeEmail" type="email" autocomplete="off" placeholder="nombre@intercon.com.mx" required></div>
         <button type="submit" class="mkt-welcome-continue">Continuar como solicitante <span aria-hidden="true">→</span></button>
         <p class="mkt-welcome-hint">La dirección es ilustrativa y no se verifica. Continuar abre el perfil de solicitante de prueba.</p>
       </form>
       <div class="mkt-welcome-divider"><span>ESCENARIOS PARA LA PRESENTACIÓN</span></div>
       <div class="mkt-welcome-scenarios">${scenarios.map(x=>`<button type="button" data-welcome-profile="${x.id}"><span class="mkt-welcome-initials">${escape(x.initials)}</span><span><strong>${escape(x.title)}</strong><small>${escape(x.sub)}</small></span><span class="mkt-welcome-arrow" aria-hidden="true">↗</span></button>`).join('')}</div>
       <button type="button" class="mkt-welcome-other" id="mktWelcomeOther">Explorar otros perfiles de demostración <span aria-hidden="true">↗</span></button>
       <div class="mkt-welcome-demo-info"><strong>● ENTORNO DE DEMOSTRACIÓN</strong><p>Los perfiles y el correo son simulados. Todavía no hay autenticación Microsoft Entra ID ni conexión operativa con Fabric desde este formulario.</p></div>
       <p class="mkt-welcome-bottom">Acceso real previsto: Microsoft Entra ID · Datos: Microsoft Fabric</p>
     </div>
   </div>`;
  document.body.prepend(splash);
  const sessionKey='mkt-welcome-complete-v1';
  const open=()=>{document.body.classList.add('mkt-welcome-open');splash.hidden=false};
  const close=()=>{document.body.classList.remove('mkt-welcome-open');splash.hidden=true;sessionStorage.setItem(sessionKey,'1')};
  function selectProfile(id){
    try{
      $('#accessButton').click();
      const choice=$('#profileChoices [data-profile="'+id+'"]');
      if(!choice){$('#closeAccess')?.click();throw new Error('Perfil de prueba no disponible')}
      close();choice.click();
    }catch(e){const note=$('#mktWelcomeError');if(note)note.textContent=e.message;else alert(e.message)}
  }
  splash.querySelectorAll('[data-welcome-profile]').forEach(b=>b.addEventListener('click',()=>selectProfile(b.dataset.welcomeProfile)));
  $('#mktWelcomeForm').addEventListener('submit',e=>{
    e.preventDefault();
    const email=$('#mktWelcomeEmail').value.trim().toLowerCase();
    if(!/^[^\s@]+@intercon\.com\.mx$/.test(email)){
      $('#mktWelcomeEmail').setCustomValidity('Usa un formato de correo @intercon.com.mx para esta demostración.');
      $('#mktWelcomeEmail').reportValidity();
      return;
    }
    $('#mktWelcomeEmail').setCustomValidity('');
    selectProfile('requester-demo');
  });
  $('#mktWelcomeEmail').addEventListener('input',()=>$('#mktWelcomeEmail').setCustomValidity(''));
  $('#mktWelcomeOther').addEventListener('click',()=>{
    $('#accessButton').click();
    splash.hidden=true;
    document.body.classList.remove('mkt-welcome-open');
  });
  $('#closeAccess')?.addEventListener('click',()=>{if(!sessionStorage.getItem(sessionKey))open()});
  $('#logout')?.addEventListener('click',()=>{sessionStorage.removeItem(sessionKey);setTimeout(open,20)});
  const reset=()=>{if(!sessionStorage.getItem(sessionKey))open();else{close();}};
  reset();
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('mkt-welcome-open'))e.preventDefault()});
})();