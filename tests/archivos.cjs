// Prueba del cliente de archivos (MKT_06) y del panel del detalle con fetch simulado (sin red).
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const nodeCrypto=require('node:crypto');
const {JSDOM}=require(process.env.MKT_JSDOM||'jsdom');
const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://marketing.intercon.com.mx/#equipo',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,d=w.document;
w.structuredClone=structuredClone;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
Object.defineProperty(w.crypto,'subtle',{value:nodeCrypto.webcrypto.subtle});
w.URL.createObjectURL=()=>'blob:x';w.URL.revokeObjectURL=()=>{};
const TOKEN='B'.repeat(43);
w.sessionStorage.setItem('mkt.sesion',JSON.stringify({token:TOKEN,expiraUTC:new Date(Date.now()+3600e3).toISOString()}));
const disenador={id:'recMys8xS4x9jDUKI',nombre:'TEST · Diseñador QA',correo:'qa.d@intercon.com.mx',roles:['Disenador'],perfiles:['Diseño'],vistas:['inicio','solicitar','equipo']};
const sol={id:'recn5sL1t3OdxRvYj',folio:'MKT-2026-000011',tipo:{valor:'Diseno',etiqueta:'Diseño'},titulo:'QA',estado:{valor:'En proceso',etiqueta:'En proceso',grupoPortal:'En proceso'},area:'RH',solicitante:{id:'recORkVwVfTVf2LgA',nombre:'Sol'},responsables:[{id:disenador.id,nombre:disenador.nombre}],relacion:['responsable']};
const calls=[];let partes=[],estadoArc='Pendiente',descargas=0;
const json=(b,status=200)=>({ok:status<300,status,headers:{get:k=>/content-type/i.test(k)?'application/json':null},json:async()=>b});
w.fetch=async(url,opt)=>{
  const body=opt.body?JSON.parse(opt.body):undefined;calls.push({url,headers:opt.headers,body});
  const p=new URL(url).pathname;
  if(p==='/mkt/v1/auth/sesion')return json({ok:true,usuario:disenador});
  if(p==='/mkt/v1/solicitudes/consultar'){
    if(body.accion==='listar')return json({ok:true,resultados:[sol]});
    if(body.accion==='detalle')return json({ok:true,solicitud:Object.assign({},sol,{historial:[],datos:{}})});
  }
  if(p==='/mkt/v1/solicitudes/actualizar')return json({ok:true,archivoEstado:'Validado'});
  if(p==='/mkt/v1/archivos'){
    const a=body.accion;
    if(a==='iniciar')return json({ok:true,archivoId:'ARC-11111111-2222-4333-8444-555555555555',estado:'Pendiente',fase:'cargando',partesTotales:2,partesRecibidas:0,tamanoParte:2359296},201);
    if(a==='parte'){if(body.indice===1&&partes.length===0)return json({ok:false,error:{code:'PARTE_FUERA_DE_ORDEN',mensaje:'x',esperada:0}},409);partes[body.indice]=body.contenidoBase64;return json({ok:true,partesRecibidas:partes.filter(Boolean).length,partesTotales:2,fase:partes.filter(Boolean).length===2?'confirmando':'cargando',reintentarEnSeg:0},partes.length===2?202:200);}
    if(a==='estado'){estadoArc='Disponible';return json({ok:true,archivo:{archivoId:body.archivoId,estado:'Disponible'},reintentarEnSeg:0});}
    if(a==='listar')return json({ok:true,archivos:[{archivoId:'ARC-11111111-2222-4333-8444-555555555555',nombre:'entrega.pdf',categoria:'Entregable',estado:estadoArc,tamanoBytes:3000000,descargable:true}]});
    if(a==='descargar'){descargas++;if(descargas===1)return json({ok:true,estado:'preparando',reintentarEnSeg:0},202);
      return {ok:true,status:200,headers:{get:k=>/content-type/i.test(k)?'application/octet-stream':/disposition/i.test(k)?"attachment; filename=\"entrega.pdf\"; filename*=UTF-8''entrega.pdf":null},blob:async()=>new w.Blob(['%PDF'])};}
  }
  return json({ok:false,error:{code:'NO',mensaje:'no'}},404);
};
const ctx=dom.getInternalVMContext();
for(const f of ['app.js','project-form.js','detail-enhancements.js','design-process.js','campaign-brief.js','cash-campaign.js','campaign-effectiveness.js','recruitment-budget.js','role-dashboard.js','welcome-screen.js','workspace-shell.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
vm.runInContext("window.MKT_CONFIG=Object.freeze({enabled:true,apiBase:'https://api.marketing.intercon.com.mx',timeoutMs:5000});",ctx);
vm.runInContext(fs.readFileSync('mkt-api.js','utf8'),ctx,{filename:'mkt-api.js'});
vm.runInContext(fs.readFileSync('mkt-backend.js','utf8'),ctx,{filename:'mkt-backend.js'});
const tick=async(n=10)=>{for(let i=0;i<n;i++)await new Promise(r=>setTimeout(r,0));};
const archivo=(nombre,tipo,bytes)=>({name:nombre,type:tipo,size:bytes.length,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length)});
(async()=>{
  await tick(30);
  const A=w.MKT_API.archivos;
  // Límites en el cliente (mensajes claros, sin llamar al servidor)
  assert.match(A.revisar({name:'x.exe',type:'application/x-msdownload',size:10},'Referencia').mensaje,/Tipo no permitido/);
  assert.match(A.revisar({name:'v.mp4',type:'video/mp4',size:16*1048576},'Referencia').mensaje,/hasta 15 MB/);
  assert.match(A.revisar({name:'b.pdf',type:'application/pdf',size:11*1048576},'Brief').mensaje,/máximo para Brief es 10 MB/);
  assert.match(A.revisar({name:'a.pdf',type:'image/png',size:10},'Brief').mensaje,/no corresponde/);
  assert.equal(calls.filter(c=>c.url.endsWith('/archivos')).length,0);
  // Carga en 2 partes con SHA-256, orden y confirmación
  const bytes=new Uint8Array(3000000);bytes.set([0x25,0x50,0x44,0x46]);for(let i=4;i<bytes.length;i++)bytes[i]=i%251;
  const prog=[];
  const r=await A.subir(sol.id,'Entregable',archivo('entrega.pdf','application/pdf',bytes),p=>prog.push(p.fase));
  assert.equal(r.estado,'Disponible');
  const ini=calls.find(c=>c.body&&c.body.accion==='iniciar').body;
  assert.equal(ini.sha256,nodeCrypto.createHash('sha256').update(bytes).digest('hex'),'SHA-256 del archivo completo');
  assert.ok(!/sharePoint|itemId|driveId|url|ruta/i.test(JSON.stringify(ini)),'Sin identificadores de SharePoint');
  assert.equal(Buffer.from(partes[0]+partes[1].replace(/^/,''),'base64').length>0,true);
  assert.deepEqual(Buffer.concat([Buffer.from(partes[0],'base64'),Buffer.from(partes[1],'base64')]),Buffer.from(bytes),'Las partes reconstruyen el archivo exacto');
  assert.equal(Buffer.from(partes[0],'base64').length,2359296,'Parte de 2.25 MiB');
  assert.deepEqual([...new Set(prog)],['preparando','cargando','confirmando','listo']);
  assert.ok(calls.filter(c=>c.url.endsWith('/archivos')).every(c=>c.headers.Authorization==='Bearer '+TOKEN),'Siempre con sesión');
  // Panel del detalle: lista, descarga (202 → binario) y registrar entregable con archivoId
  vm.runInContext("openDetail('MKT-2026-000011')",ctx);await tick(40);
  assert.ok(d.querySelector('#mktArchivos'),'Panel de archivos');
  assert.ok([...d.querySelectorAll('#mktArchivoCat option')].map(o=>o.value).includes('Entregable'),'Responsable puede subir entregables');
  assert.equal(d.querySelector('#evidence').closest('label').hidden,true,'Sin campo de enlace');
  const btn=d.querySelector('[data-descargar]');assert.ok(btn,'Botón de descarga');
  btn.click();await new Promise(r=>setTimeout(r,50));await tick(20);
  assert.equal(descargas,2,'Sondea hasta recibir el binario');
  d.querySelector('[data-entregar]').click();await tick(20);
  const ent=calls.find(c=>c.body&&c.body.accion==='entregable').body;
  assert.equal(ent.archivoId,'ARC-11111111-2222-4333-8444-555555555555');
  assert.ok(!('archivo' in ent),'Entregable solo con archivoId');
  console.log('PASS: límites en cliente, carga por partes con SHA-256 y confirmación, panel de archivos, descarga autorizada, entregable con archivoId. Llamadas:',calls.length);
})().catch(e=>{console.error(e);process.exit(1);});
