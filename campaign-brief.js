(() => {
  const root=document.querySelector('#campana');
  const projects=document.querySelector('#proyectos');
  const recruitment=document.createElement('div');
  while(root.firstChild)recruitment.append(root.firstChild);
  const brief=document.createElement('div');
  root.append(recruitment);projects.append(brief);
  const f=(key,label,type='text',options=[],required=true,help='',when=null)=>({key,label,type,options,required,help,when});
  const sections=[
    ['Información general',[
      f('company','Compañía solicitante','select',['Inter-Con México','Embajada','IC Admin']),
      f('area','Área solicitante','select',['Comercial / Ventas','Recursos Humanos','Reclutamiento','Operaciones','Capacitación','Calidad y Procesos','Dirección','Otra']),
      f('otherArea','Especifica tu área','text',[],true,'',d=>d.area==='Otra'),
      f('person','Responsable del proyecto','text',[],true,'Nombre de la persona que dará seguimiento.'),
      f('title','Nombre del proyecto','text',[],true,'Ej. Lanzamiento del nuevo SOC'),
      f('campaignType','Tipo de proyecto','select',['Interno','Externo','Mixto'])
    ]],
    ['Cuéntanos tu idea',[
      f('description','¿Qué necesitas realizar y qué quieres lograr?','textarea',[],true,'Explica tu idea con tus propias palabras. Marketing definirá la estrategia.')
    ]],
    ['Público y alcance',[
      f('audience','¿A quién quieres llegar?','checks',['Colaboradores administrativos','Personal operativo','Todos los colaboradores','Clientes actuales','Prospectos comerciales','Candidatos / Talento','Público general','Varios públicos / Por definir'],true,'Selecciona el público al que se dirige el proyecto.'),
      f('zone','Zonas donde se llevará a cabo','checks',['Nacional','Nor Este','Nor Oeste','Metropolitana','Metropolitana Norte','Bajío - Centro - Sur','Otra'],false,'Selecciona la cobertura geográfica si la conoces.'),
      f('otherZone','Especifica la zona','text',[],true,'',d=>d.zone?.includes('Otra'))
    ]],
    ['Tiempos y recursos',[
      f('date','Fecha prevista de lanzamiento o inicio','date',[],true,'Se refiere al inicio de la iniciativa, no al inicio del trabajo de Marketing.'),
      f('end','Fecha prevista de finalización','date',[],false,'Opcional: fin de la iniciativa o campaña.'),
      f('budget','¿El proyecto cuenta con presupuesto?','select',['Sí, ya está autorizado','Está pendiente de autorización','No requiere inversión adicional','Necesito apoyo para determinarlo']),
      f('amount','Monto autorizado (MXN)','number',[],true,'',d=>d.budget==='Sí, ya está autorizado')
    ]],
    ['Materiales y apoyo',[
      f('materials','¿Qué materiales o actividades consideras que necesitarás?','checks',['Diseño gráfico','Video','Fotografía','Publicaciones en redes','Campaña de difusión','Material impreso','Evento o actividad','Presentación','Otro','Necesito asesoría de Marketing'],false,'Puedes seleccionar varias opciones. Marketing validará los entregables.'),
      f('otherMaterial','Especifica el material o actividad','text',[],true,'',d=>d.materials?.includes('Otro')),
      f('additional','Archivos de referencia (opcional)','file',[],false,'Puedes adjuntar ejemplos o documentos. La carga permanente estará disponible al conectar almacenamiento.')
    ]]
  ];
  function openBrief(){let step=0;const data={};const fields=sections.flatMap(s=>s[1]);
    brief.innerHTML='<button type="button" class="back-link" data-view="solicitar">Volver a solicitudes</button><div class="section-head"><div><p class="eyebrow">PROYECTOS DE MARKETING</p><h1>Solicitud de proyecto</h1><p>Comparte la información para evaluar, planear y dar seguimiento al proyecto.</p></div></div><div class="demo-banner"><strong>Conexión pendiente</strong><span>El almacenamiento permanente todavía no está conectado. Nada se enviará a Marketing y los datos se perderán al recargar.</span></div><div class="comm-layout"><div class="comm-main"><ol class="steps brief-steps">'+[...sections.map(s=>s[0]),'Revisión'].map((label,i)=>'<li data-brief-label="'+i+'"><span>'+(i+1)+'</span>'+label+'</li>').join('')+'</ol><form novalidate>'+sections.map(([label,fs],i)=>'<fieldset data-brief-step="'+i+'"><legend>'+label+'</legend>'+fs.map(f=>controlHTML(f,'brief')).join('')+(i===0?'<p class="field-help"><strong>Prioridad: pendiente de valoración por Marketing.</strong></p>':'')+'</fieldset>').join('')+'<fieldset data-brief-step="5"><legend>Revisa el brief completo</legend><div data-review></div></fieldset><div class="comm-actions"><button type="button" data-prev>Anterior</button><span data-progress></span><button type="button" class="primary" data-next>Continuar</button><button type="submit" class="primary" data-save hidden>Guardar proyecto</button></div></form><div data-success hidden><h2>Proyecto guardado temporalmente.</h2><p>Aparece en la bandeja de esta visita para que puedas revisar el recorrido.</p><p data-folio></p><p>No se ha enviado al equipo ni reservado una llamada; se perderá al recargar.</p><button type="button" data-home>Crear otro proyecto</button></div></div><aside class="comm-aside"><p class="eyebrow">ANTES DE SOLICITAR</p><h2>Un objetivo claro orienta el proyecto.</h2><p>Cuéntanos qué necesitas, a quién va dirigido y cuándo quieres lanzarlo. Marketing definirá la estrategia y el cronograma.</p><p>No necesitas definir tareas ni fechas internas de producción.</p></aside></div>';
    const form=brief.querySelector('form');
    for(const f of fields.filter(f=>f.type==='checks'&&!f.required))form.querySelector('[data-field="'+f.key+'"] .field-label').textContent=f.label+' (opcional)';
    form.querySelectorAll('[data-check-error]').forEach(e=>{e.textContent='Selecciona al menos una opción.';});
    form.elements.additional.accept='.pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.webp';
    const counter=document.createElement('span');counter.className='field-help';counter.setAttribute('aria-live','polite');form.elements.description.after(counter);
    function capture(){for(const f of fields){const els=[...form.querySelectorAll('[name="'+f.key+'"]')];data[f.key]=f.type==='checks'?els.filter(e=>e.checked).map(e=>e.value):f.type==='checkbox'?els[0].checked:f.type==='file'?[...els[0].files].map(x=>({name:x.name,size:x.size})):els[0].value.trim();}return data;}
    const visible=f=>!f.when||f.when(data);const wordCount=()=>data.description?.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu)?.length||0;
    function sync(){capture();for(const f of fields){const wrap=form.querySelector('[data-field="'+f.key+'"]');wrap.hidden=!visible(f);wrap.querySelectorAll('input,textarea,select').forEach(e=>e.disabled=!visible(f)||Number(wrap.closest('fieldset').dataset.briefStep)!==step);}counter.textContent='Explica la idea con claridad; no hay un mínimo de palabras.';}
    function pairs(){capture();return [['Tipo de solicitud','Proyecto de Marketing'],['Nivel de prioridad','Pendiente de valoración por Marketing'],...fields.filter(visible).map(f=>[f.label,f.type==='checkbox'?(data[f.key]?'Sí':'No'):f.type==='file'?data[f.key].map(x=>x.name):data[f.key]])];}
    function show(n){step=n;form.querySelectorAll('fieldset').forEach((e,i)=>e.hidden=i!==n);sync();brief.querySelectorAll('[data-brief-label]').forEach((e,i)=>{e.classList.toggle('current',i===n);if(i===n)e.setAttribute('aria-current','step');else e.removeAttribute('aria-current');});brief.querySelector('[data-prev]').hidden=n===0;brief.querySelector('[data-next]').hidden=n===5;brief.querySelector('[data-save]').hidden=n!==5;brief.querySelector('[data-progress]').textContent='Paso '+(n+1)+' de 6';if(n===5)brief.querySelector('[data-review]').innerHTML=pairsHTML(pairs());const l=form.querySelector('[data-brief-step="'+n+'"] legend');l.tabIndex=-1;l.focus();}
    function fail(el,msg){el.setCustomValidity(msg);el.reportValidity();return false;}
    function validate(){sync();for(const f of sections[step]?.[1]||[]){if(!visible(f))continue;const el=form.querySelector('[name="'+f.key+'"]');el.setCustomValidity('');if(f.type==='checks'){const ok=!f.required||data[f.key].length>0;form.querySelector('[data-field="'+f.key+'"] [data-check-error]').hidden=ok;if(!ok)return fail(el,'Selecciona al menos una opción.');}else if(f.type==='file'){if(f.required&&!el.files.length)return fail(el,'Selecciona al menos un archivo.');const patterns={informationFile:/\.(pdf|txt|docx?|rtf)$/i,termsFile:/\.(pdf|txt|docx?|rtf)$/i,additional:/\.(pdf|txt|docx?|rtf)$/i,logos:/\.(png|jpe?g|webp|svg|pdf|ai|eps)$/i,photos:/\.(png|jpe?g|webp)$/i};if([...el.files].some(file=>!(patterns[f.key]||/\.(pdf|docx?|pptx?|png|jpe?g|webp)$/i).test(file.name)))return fail(el,'Selecciona un archivo del formato indicado.');}else if(f.required&&!data[f.key])return fail(el,'Completa este campo.');if(!el.reportValidity())return false;}
      if(step===3&&data.end&&data.end<data.date)return fail(form.elements.end,'La fecha de finalización debe ser igual o posterior al inicio.');return true;}
    form.addEventListener('input',e=>{e.target.setCustomValidity?.('');sync();});form.addEventListener('change',e=>{e.target.setCustomValidity?.('');sync();});
    brief.querySelector('[data-next]').onclick=()=>{if(validate())show(step+1);};brief.querySelector('[data-prev]').onclick=()=>show(step-1);
    form.onsubmit=e=>{e.preventDefault();if(step!==5){if(validate())show(step+1);return;}const answers=pairs();const r={id:'MKT-TEMP-'+String(requests.length+1).padStart(3,'0'),title:data.title,type:'Proyecto',owner:'Marketing',date:data.date,status:'Pendiente',person:data.person,area:data.area==='Otro'?data.otherArea:data.area,brief:data.description,format:'Proyecto '+data.campaignType.toLowerCase(),comments:'',reason:'',evidence:'',answers,priority:'Pendiente de valoración',campaignBrief:true};addDemoRequest(r);form.hidden=true;brief.querySelector('.steps').hidden=true;brief.querySelector('[data-success]').hidden=false;brief.querySelector('[data-folio]').textContent=r.id+' · '+r.title;render();};
    brief.querySelector('[data-view="solicitar"]').onclick=()=>view('solicitar');brief.querySelectorAll('[data-home]').forEach(b=>b.onclick=openBrief);show(0);
  }
  openBrief();
  // Priority belongs to Marketing and does not change the requester's original answers.
  const label=document.createElement('label');label.textContent='Prioridad valorada por Marketing';const priority=document.createElement('select');priority.id='editCampaignPriority';label.htmlFor=priority.id;priority.innerHTML=['Pendiente de valoración','Baja','Media','Alta','Urgente'].map(x=>'<option>'+x+'</option>').join('');label.append(priority);label.hidden=true;document.querySelector('#editStatus').closest('.edit-grid').after(label);
  const previousOpen=openDetail;openDetail=function(id){previousOpen(id);const r=scoped().find(x=>x.id===id);label.hidden=!r?.campaignBrief;if(r?.campaignBrief){priority.value=r.priority||'Pendiente de valoración';priority.disabled=!isAdmin();}};
  const previousSave=document.querySelector('#editForm').onsubmit;document.querySelector('#editForm').onsubmit=function(e){const r=scoped().find(x=>x.id===selected);const next=priority.value;previousSave.call(this,e);if(r?.campaignBrief&&isAdmin()&&!document.querySelector('#detail').open&&r.priority!==next){r.priority=next;(r.history??=[]).push({actor:currentUser().name,text:'Prioridad de Marketing: '+next,date:new Date().toLocaleString('es-MX')+' · temporal'});render();toast('Seguimiento guardado temporalmente.');}};
})();
