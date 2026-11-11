(()=>{
  'use strict';
  const $=s=>document.querySelector(s);
  const escaped=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const roleMap={
    'Solicitante':[{section:'MI ACTIVIDAD',items:[['⌂','Resumen','equipo'],['✎','Nueva solicitud','solicitar'],['▤','Mis solicitudes','equipo','inbox'],['▦','Calendario','calendario']]}],
    'Comunicados':[{section:'COMUNICACIÓN',items:[['⌂','Mi bandeja','equipo'],['▤','Comunicados','comunicado'],['✎','Nueva solicitud','solicitar'],['▦','Calendario','calendario']]}],
    'Diseño':[{section:'ESTUDIO CREATIVO',items:[['⌂','Mi bandeja','equipo'],['✦','Diseño y prototipado','diseno'],['✎','Nueva solicitud','solicitar'],['▦','Calendario','calendario']]}],
    'Reclutamiento digital':[{section:'CAMPAÑAS',items:[['⌂','Resumen de campañas','equipo'],['◈','Presupuestos regionales','equipo','recruitmentBudget'],['✚','Solicitar campaña','campana'],['▤','Efectividad','reporte'],['▦','Calendario','calendario']]}],
    'Gestión de proyectos':[{section:'PROYECTOS',items:[['⌂','Mis proyectos','equipo'],['▤','Solicitudes de proyectos','proyectos'],['✎','Nueva solicitud','solicitar'],['▦','Calendario','calendario']]}],
    'Administración':[{section:'OPERACIÓN',items:[['⌂','Resumen general','equipo'],['▤','Bandeja de solicitudes','equipo','inbox'],['◈','Presupuesto de campañas','equipo','recruitmentBudget'],['▦','Calendario','calendario']]},{section:'GESTIÓN',items:[['♙','Equipo y asignaciones','usuarios'],['✎','Nueva solicitud','solicitar']]}],
    'Super Admin':[{section:'DIRECCIÓN DEL PORTAL',items:[['⌂','Resumen general','equipo'],['▤','Todas las solicitudes','equipo','inbox'],['◈','Campañas y presupuesto','equipo','recruitmentBudget'],['▦','Calendario','calendario']]},{section:'ADMINISTRACIÓN',items:[['♙','Usuarios y perfiles','usuarios'],['✎','Formularios','solicitar']]}]
  };
  const root=document.createElement('aside');root.id='mktSidebar';root.setAttribute('aria-label','Módulos del portal');
  root.innerHTML='<div class="mkt-side-brand"><img src="assets/mkt-area-logo.svg" alt="Marketing Inter-Con" class="mkt-side-logo"><span class="mkt-side-brand-name">PORTAL DE MARKETING</span></div><div id="mktSideNav"></div><div class="mkt-side-bottom"><div id="mktSideProfile"></div><button id="mktSideSwitch" type="button">⇄ Cambiar perfil</button><button id="mktSideExit" type="button">↪ Cerrar sesión</button><div class="mkt-side-demo">● ENTORNO DE DEMOSTRACIÓN</div></div>';
  document.body.prepend(root);
  const topbar=document.createElement('div');topbar.id='mktShellTopbar';topbar.innerHTML='<button type="button" id="mktMobileMenu" aria-expanded="false" aria-controls="mktSidebar">☰ <span>Menú</span></button><div class="mkt-shell-heading"><strong id="mktShellTitle">Mi espacio</strong><small>INTER-CON · MARKETING</small></div><span class="mkt-shell-demo">MODO DEMO</span>';
  document.querySelector('main')?.prepend(topbar);
  const scrim=document.createElement('button');scrim.id='mktShellScrim';scrim.setAttribute('aria-label','Cerrar menú');document.body.append(scrim);
  const compactRole={'Administración':'ADMIN','Super Admin':'SUPER ADMIN','Reclutamiento digital':'MKT DIGITAL','Gestión de proyectos':'PROYECTOS','Diseño':'DISEÑO','Comunicados':'COMUNICACIÓN','Solicitante':'SOLICITANTE'};
  const currentView=()=>document.body.dataset.view||'equipo';
  function route(target,anchor){
    document.body.classList.remove('mkt-sidebar-expanded');
    $('#mktMobileMenu')?.setAttribute('aria-expanded','false');
    if(typeof view==='function')view(target);
    if(anchor){setTimeout(()=>$('#'+anchor)?.scrollIntoView({behavior:'smooth',block:'start'}),30)}
    if(target==='solicitar'){setTimeout(()=>$('#services')?.scrollIntoView({behavior:'smooth',block:'start'}),30)}
  }
  function draw(){
    const u=typeof currentUser==='function'?currentUser():null;
    if(!u){document.body.classList.remove('mkt-shell-active','mkt-sidebar-expanded');return;}
    document.body.classList.add('mkt-shell-active');
    document.body.classList.toggle('mkt-form-focused',['diseno','comunicado','campana','reporte','proyectos'].includes(currentView()));
    const sections=roleMap[u.role]||roleMap.Solicitante;
    $('#mktSideNav').innerHTML=sections.map(group=>'<div class="mkt-side-section"><p>'+escaped(group.section)+'</p>'+group.items.map(([icon,label,target,anchor])=>'<button type="button" title="'+escaped(label)+'" aria-label="'+escaped(label)+'" data-side-route="'+escaped(target)+'" '+(anchor?'data-side-anchor="'+escaped(anchor)+'" ':'')+'class="'+(currentView()===target&&!anchor?'is-active':'')+'"><span class="mkt-side-icon" aria-hidden="true">'+escaped(icon)+'</span><span>'+escaped(label)+'</span></button>').join('')+'</div>').join('');
    $('#mktSideProfile').innerHTML='<span class="mkt-side-avatar">'+escaped(u.name.split(' ').map(s=>s.charAt(0)).slice(0,2).join('').toUpperCase())+'</span><span><strong>'+escaped(u.name)+'</strong><small>'+escaped(compactRole[u.role]||u.role)+'</small></span>';
    const labels={equipo:'Mi espacio de trabajo',usuarios:'Administración de usuarios',solicitar:'Solicitudes de Marketing',calendario:'Calendario',diseno:'Diseño y prototipado',comunicado:'Comunicados',campana:'Campañas de reclutamiento',reporte:'Efectividad de campañas',proyectos:'Proyectos'};
    $('#mktShellTitle').textContent=labels[currentView()]||'Portal MKT';
    $('#mktSideNav').querySelectorAll('[data-side-route]').forEach(b=>b.addEventListener('click',()=>route(b.dataset.sideRoute,b.dataset.sideAnchor)));
    $('#mktSideNav').querySelectorAll('[data-side-route]').forEach(b=>{b.classList.toggle('is-active',b.dataset.sideRoute===currentView()&&!b.dataset.sideAnchor)});
  }
  $('#mktSideSwitch').onclick=()=>$('#accessButton')?.click();
  $('#mktSideExit').onclick=()=>{if(typeof currentUser==='function'&&currentUser()){ $('#accessButton')?.click();$('#logout')?.click(); }};
  $('#mktMobileMenu').onclick=()=>{const show=!document.body.classList.contains('mkt-sidebar-expanded');document.body.classList.toggle('mkt-sidebar-expanded',show);$('#mktMobileMenu').setAttribute('aria-expanded',String(show))};
  scrim.onclick=()=>{document.body.classList.remove('mkt-sidebar-expanded');$('#mktMobileMenu').setAttribute('aria-expanded','false')};
  document.addEventListener('mkt:role-view',draw);
  document.addEventListener('click',e=>{if(e.target.closest('[data-profile],#logout,[data-view]'))setTimeout(draw,10)});
  draw();
})();