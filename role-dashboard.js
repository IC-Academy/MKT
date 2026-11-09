(()=>{
  'use strict';
  const roles=[
    {role:'Solicitante',title:'Portal de solicitudes',description:'Levanta solicitudes de Marketing y consulta su historial.',actions:[['Crear solicitud','solicitar'],['Mis solicitudes','equipo']]},
    {role:'Comunicados',title:'Comunicación interna',description:'Consulta comunicados y las actividades asignadas a tu perfil.',actions:[['Bandeja de trabajo','equipo'],['Nuevo comunicado','comunicado'],['Calendario','calendario']]},
    {role:'Diseño',title:'Estudio de diseño',description:'Organiza solicitudes de diseño, prototipado y fotografía.',actions:[['Solicitudes asignadas','equipo'],['Formulario de diseño','diseno']]},
    {role:'Reclutamiento digital',title:'Reclutamiento digital',description:'Gestiona campañas, efectividad y presupuestos de reclutamiento.',actions:[['Bandeja de campañas','equipo'],['Crear campaña','campana'],['Registrar efectividad','reporte']]},
    {role:'Gestión de proyectos',title:'Gestión de proyectos',description:'Revisa iniciativas de Marketing y el seguimiento de proyectos.',actions:[['Bandeja de proyectos','equipo'],['Nueva solicitud de proyecto','proyectos']]},
    {role:'Administración',title:'Administración de Marketing',description:'Supervisa solicitudes, asignaciones y la operación del equipo.',actions:[['Bandeja general','equipo'],['Gestionar equipo','usuarios'],['Calendario','calendario']]},
    {role:'Super Admin',title:'Administración general',description:'Configura perfiles de demostración y revisa las vistas administrativas.',actions:[['Administrar usuarios','usuarios'],['Bandeja general','equipo'],['Calendario','calendario']]}
  ];
  const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const root=document.querySelector('#equipo .workspace-top');
  if(!root)return;
  const band=document.createElement('div');band.id='mktRoleDashboard';band.className='mkt-role-dashboard';
  root.after(band);
  const header=document.querySelector('.site-header');
  const marker=document.createElement('span');marker.className='mkt-demo-marker';marker.textContent='ENTORNO DEMO · Sin autenticación real';header?.append(marker);
  const userSection=document.querySelector('#usuarios .section-head');
  const note=document.createElement('div');note.className='mkt-demo-roles-note';
  note.innerHTML='<strong>Roles en demostración</strong><p>Los perfiles son simulados. El acceso real se habilitará con Entra ID y permisos validados en la API y MKT_DB. Seleccionar un perfil no demuestra identidad corporativa.</p>';
  userSection?.after(note);
  function draw(){
    const u=typeof currentUser==='function'?currentUser():null;
    if(!u){band.hidden=true;return}
    const p=roles.find(x=>x.role===u.role)||roles[0];band.hidden=false;
    const chosen=p.actions.filter(([label,location])=>location!=='usuarios'||['Administración','Super Admin'].includes(u.role));
    band.innerHTML='<div class="mkt-role-dashboard-main"><div><span class="mkt-role-caption">PANEL SEGÚN ROL · DEMOSTRACIÓN</span><h2>'+safe(p.title)+'</h2><p>'+safe(p.description)+'</p><div class="mkt-role-badges"><span>'+safe(u.role)+'</span><span>Sesión simulada</span></div></div><div class="mkt-role-icon" aria-hidden="true">'+safe(u.name.split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase())+'</div></div><div class="mkt-role-actions">'+chosen.map(([label,location])=>'<button type="button" data-mkt-target="'+safe(location)+'">'+safe(label)+' <span aria-hidden="true">↗</span></button>').join('')+'</div>';
    band.querySelectorAll('[data-mkt-target]').forEach(b=>b.onclick=()=>{const target=b.dataset.mktTarget;if(target==='equipo'){document.querySelector('.inbox-panel')?.scrollIntoView({behavior:'smooth'});}else if(typeof view==='function')view(target)});
    const reset=document.querySelector('#reset');if(reset)reset.hidden=u.role==='Solicitante';
    const tabs=document.querySelector('.workspace-tabs');if(tabs)tabs.hidden=u.role==='Solicitante';
    const budget=document.querySelector('#recruitmentBudget');
    if(budget)budget.hidden=!['Reclutamiento digital','Administración','Super Admin'].includes(u.role);
    const budgetNav=document.querySelector('.mkt-budget-nav');if(budgetNav)budgetNav.hidden=!['Reclutamiento digital','Administración','Super Admin'].includes(u.role);
  }
  document.addEventListener('mkt:role-view',draw);
  document.addEventListener('click',e=>{if(e.target.closest('[data-profile],#accessButton,#logout,[data-view]'))setTimeout(draw,10)});
  draw();
})();