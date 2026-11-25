// Prueba del adaptador frontend ↔ backend con fetch simulado (sin red).
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {JSDOM}=require(process.env.MKT_JSDOM||'jsdom');
const html=fs.readFileSync('index.html','utf8');
const dom=new JSDOM(html,{url:'https://marketing.intercon.com.mx/#solicitar',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,d=w.document;
w.structuredClone=structuredClone;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
w.HTMLElement.prototype.reportValidity=function(){return true;};
const calls=[];
const TOKEN='A'.repeat(43);
const admin={id:'recehRxrSQGPJ3PHo',nombre:'TEST · Admin MKT QA',correo:'qa.admin@intercon.com.mx',roles:['Administrador'],perfiles:['Administración'],vistas:['inicio','solicitar','equipo','usuarios','calendario']};
const sol={id:'rec4sKuk0y2TzzWaE',folio:'MKT-2026-000012',tipo:{valor:'Diseno',etiqueta:'Diseño'},titulo:'QA · Flujo OTP',estado:{valor:'Recibida',etiqueta:'Recibida',grupoPortal:'Pendiente'},area:'RH',solicitante:{id:'recORkVwVfTVf2LgA',nombre:'TEST · Solicitante QA'},responsables:[],fechaCompromiso:null,creadoUTC:'2026-11-17T20:40:29.425Z',relacion:['ambito']};
const ok=b=>({ok:true,status:200,json:async()=>Object.assign({ok:true},b)});
w.fetch=async(url,opt)=>{
  const body=opt.body?JSON.parse(opt.body):undefined;calls.push({url,method:opt.method,headers:opt.headers,body});
  const p=new URL(url).pathname;
  if(p==='/mkt/v1/auth/solicitar-codigo')return ok({reenviarEnSeg:60});
  if(p==='/mkt/v1/auth/verificar-codigo')return ok({token:TOKEN,expiraUTC:new Date(Date.now()+8*3600e3).toISOString(),usuario:admin});
  if(p==='/mkt/v1/auth/cerrar-sesion')return ok({});
  if(p==='/mkt/v1/solicitudes/consultar'){
    if(body.accion==='listar')return ok({resultados:[sol]});
    if(body.accion==='detalle')return ok({solicitud:Object.assign({},sol,{descripcion:'Brief',datos:{format:'Post'},historial:[{evento:'Creacion',estadoAnterior:null,estadoNuevo:{valor:'Recibida',etiqueta:'Recibida'},comentario:'Solicitud creada',fechaUTC:'2026-11-17T20:40:30.451Z',actor:{nombre:'TEST · Solicitante QA'}}],archivos:[]})});
    if(body.accion==='responsables')return ok({responsables:[{id:'recMys8xS4x9jDUKI',nombre:'TEST · Diseñador QA',perfiles:['Diseño'],compatible:true}]});
  }
  if(p==='/mkt/v1/solicitudes/actualizar')return ok({estado:{actual:body.estadoNuevo}});
  if(p==='/mkt/v1/solicitudes')return ok({folio:'MKT-2026-000013',estado:'Recibida'});
  return {ok:false,status:404,json:async()=>({ok:false,error:{code:'NO',mensaje:'no'}})};
};
const ctx=dom.getInternalVMContext();
const scripts=['app.js','project-form.js','detail-enhancements.js','design-process.js','campaign-brief.js','cash-campaign.js','campaign-effectiveness.js','recruitment-budget.js','role-dashboard.js','welcome-screen.js','workspace-shell.js'];
for(const f of scripts)vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
vm.runInContext("window.MKT_CONFIG=Object.freeze({enabled:true,apiBase:'https://api.marketing.intercon.com.mx',timeoutMs:5000});",ctx);
vm.runInContext(fs.readFileSync('mkt-api.js','utf8'),ctx,{filename:'mkt-api.js'});
vm.runInContext(fs.readFileSync('mkt-backend.js','utf8'),ctx,{filename:'mkt-backend.js'});
const tick=async(n=8)=>{for(let i=0;i<n;i++)await new Promise(r=>setTimeout(r,0));};
(async()=>{
  assert.equal(d.body.dataset.backend,'conectado');
  // 1) Correo → solicitar código (sin perfiles simulados)
  vm.runInContext('showAccess()',ctx);
  assert.equal(d.querySelector('#mktLoginOverlay').hidden,false,'La ventana aprobada de acceso debe abrirse');
  d.querySelector('#mktLoginMail').value='externo@gmail.com';
  d.querySelector('#mktLoginEmailForm').dispatchEvent(new w.Event('submit',{cancelable:true,bubbles:true}));await tick();
  assert.equal(calls.length,0,'Dominio no corporativo no debe llamar al backend');
  d.querySelector('#mktLoginMail').value='QA.Admin@intercon.com.mx';
  d.querySelector('#mktLoginEmailForm').dispatchEvent(new w.Event('submit',{cancelable:true,bubbles:true}));await tick();
  assert.equal(calls[0].url,'https://api.marketing.intercon.com.mx/mkt/v1/auth/solicitar-codigo');
  assert.deepEqual(calls[0].body,{correo:'qa.admin@intercon.com.mx'});
  assert.equal(d.querySelector('#mktLoginCodeStage').hidden,false,'Etapa de código visible');
  assert.equal(d.querySelector('#mktLoginProfileStage').hidden,true,'Selector de perfiles demo oculto');
  // 2) Código → sesión, sin enviar roles ni IDs
  d.querySelector('#mktLoginCode').value='123456';
  d.querySelector('#mktLoginCodeForm').dispatchEvent(new w.Event('submit',{cancelable:true,bubbles:true}));await tick(20);
  const ver=calls.find(c=>c.url.endsWith('/verificar-codigo'));
  assert.deepEqual(ver.body,{correo:'qa.admin@intercon.com.mx',codigo:'123456'});
  assert.equal(ver.headers.Authorization,undefined,'Verificar no lleva token');
  assert.ok(w.sessionStorage.getItem('mkt.sesion').includes(TOKEN),'Token en sessionStorage');
  assert.equal(w.localStorage.getItem('mkt.sesion'),null,'Nunca en localStorage');
  const lst=calls.find(c=>c.body&&c.body.accion==='listar');
  assert.equal(lst.headers.Authorization,'Bearer '+TOKEN);
  for(const c of calls.filter(x=>x.url.includes('/solicitudes'))){const s=JSON.stringify(c.body);assert.ok(!/roles|usuario|perfil|correo/i.test(s),'El navegador no envía identidad ni roles: '+s);}
  assert.ok(d.querySelector('#rows').textContent.includes('MKT-2026-000012'),'Bandeja con folio real');
  // UI corporativa conectada: nunca identificar esta sesión como demostración.
  assert.equal(d.querySelector('.mkt-shell-demo').textContent,'ACCESO VERIFICADO');
  assert.equal(d.querySelector('.mkt-side-demo').textContent,'● SESIÓN CORPORATIVA');
  assert.equal(d.querySelector('#mktSideSwitch').hidden,true,'No ofrecer cambio a perfil demo');
  assert.equal(d.querySelector('#mktSidebar').querySelectorAll('[data-side-route="calendario"]').length,0,'No anunciar calendario de datos de referencia');
  assert.equal(d.querySelector('#mktSidebar').querySelectorAll('[data-side-anchor="recruitmentBudget"]').length,0,'No anunciar presupuesto local');
  assert.equal(d.querySelector('#mktRoleDashboard').textContent.includes('Sesión simulada'),false,'Tablero sin sesión simulada');

  // Modo conectado: el directorio demo no representa usuarios reales.
  vm.runInContext("view('usuarios')",ctx);await tick();
  assert.ok(d.querySelector('#userCards').textContent.includes('Directorio corporativo'),'La gestión de usuarios indica dependencia de API real');
  assert.ok(!d.querySelector('#userCards').textContent.includes('@example.com'),'Sin correos simulados');
  assert.equal(d.querySelector('#addUser').hidden,true,'No permite crear usuarios solo en el navegador');
  assert.equal(d.querySelector('#teamFaces').children.length,0,'No muestra equipo ficticio');

  // 3) Detalle: transiciones permitidas y responsables desde el servidor
  vm.runInContext("openDetail('MKT-2026-000012')",ctx);await tick(20);
  const opts=[...d.querySelectorAll('#editStatus option')].map(o=>o.value).filter(Boolean);
  assert.deepEqual(opts,['En revision','Rechazada','Cancelada']);
  assert.ok(calls.some(c=>c.body&&c.body.accion==='responsables'),'Responsables consultados al servidor');
  assert.ok(d.querySelector('#assigned').innerHTML.includes('Diseñador'),'Lista de responsables autorizados');
  assert.ok(d.querySelector('#detailHistory').textContent.includes('Solicitud creada'),'Historial del backend');
  assert.equal(d.querySelector('#evidence').disabled,true,'Sin enlaces públicos de evidencia');
  assert.match(d.querySelector('#detailBody').textContent,/Información completa del formulario/,'Sección de formulario original');
  assert.match(d.querySelector('#detailBody').textContent,/Post/,'Se muestra el campo original devuelto por MKT_03');
  assert.equal(d.querySelector('#mktFechaCompromisoBox').hidden,false,'Administración puede gestionar fecha compromiso');
  // 4) Asignar + cambiar estatus → MKT_04 con claves de idempotencia
  d.querySelector('#assigned').value='recMys8xS4x9jDUKI';
  d.querySelector('#editStatus').value='En revision';
  d.querySelector('#mktFechaCompromiso').value='2026-12-04';
  d.querySelector('#comments').value='Avance QA: se asignó responsable y fecha.';
  d.querySelector('#editForm').dispatchEvent(new w.Event('submit',{cancelable:true,bubbles:true}));await tick(30);
  const upd=calls.filter(c=>c.url.endsWith('/actualizar'));
  assert.deepEqual(upd.map(c=>c.body.accion),['asignar','fechaCompromiso','cambiarEstado','comentar']);
  assert.equal(upd[1].body.fechaCompromiso,'2026-12-04');
  assert.equal(upd[2].body.estadoActual,'Recibida');
  assert.equal(upd[3].body.comentario,'Avance QA: se asignó responsable y fecha.');
  assert.ok(upd.every(c=>/^[A-Za-z0-9_-]{16,64}$/.test(c.body.claveIdempotencia)),'Clave de idempotencia por operación');
  // 5) Rechazo exige motivo (no llama al backend)
  vm.runInContext("openDetail('MKT-2026-000012')",ctx);await tick(20);
  const antes=calls.length;d.querySelector('#editStatus').value='Rechazada';d.querySelector('#editStatus').onchange();
  d.querySelector('#reason').value='';d.querySelector('#editForm').dispatchEvent(new w.Event('submit',{cancelable:true,bubbles:true}));await tick();
  assert.equal(calls.filter(c=>c.url.endsWith('/actualizar')).length,upd.length,'Sin motivo no se envía el rechazo');
  // 6) Creación: el formulario de Diseño se envía a MKT_02 sin archivos
  const form=d.querySelector('#diseno form');
  form.elements.namedItem('area').value=form.elements.namedItem('area').options?.[1]?.value||'IT';
  form.dispatchEvent(new w.Event('submit',{cancelable:true,bubbles:true}));
  vm.runInContext("addDemoRequest({id:'MKT-TEMP-001'})",ctx);await tick(20);
  const crea=calls.find(c=>c.url.endsWith('/mkt/v1/solicitudes'));
  assert.ok(crea,'POST /mkt/v1/solicitudes');assert.equal(crea.body.tipo,'Diseno');
  assert.ok(!('referenceFiles' in crea.body.datos),'Nunca se envían archivos en el cuerpo');
  assert.ok(/^[A-Za-z0-9_-]{16,64}$/.test(crea.body.claveIdempotencia));
  // 7) Cierre de sesión
  vm.runInContext("document.querySelector('#logout').onclick()",ctx);await tick(10);
  assert.ok(calls.some(c=>c.url.endsWith('/cerrar-sesion')),'Logout llama al backend');
  assert.equal(w.sessionStorage.getItem('mkt.sesion'),null,'Token eliminado');
  assert.equal(vm.runInContext('currentUserId',ctx),null);
  console.log('PASS: OTP en la ventana aprobada, sesión Bearer, bandeja, detalle, asignación, transiciones, motivo obligatorio, creación sin archivos, logout. Llamadas:',calls.length);
})().catch(e=>{console.error(e);process.exit(1);});
