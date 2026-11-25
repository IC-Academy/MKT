// Portal MKT · Adaptador frontend ↔ backend (n8n). Solo actúa si MKT_API.enabled === true.
// Con el backend desactivado no modifica nada y el portal conserva el modo demostración.
// Conserva la identidad visual: reutiliza la ventana de acceso (#mktLoginOverlay), el diálogo de detalle y las clases existentes.
(function () {
  'use strict';
  const api = window.MKT_API;
  if (!api || !api.enabled) return;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const aviso = m => (typeof toast === 'function' ? toast(m) : alert(m));
  const errorTexto = e => e && (e.code === 'RED_NO_DISPONIBLE' || e.code === 'TIEMPO_AGOTADO') ? 'El acceso corporativo todavía no está disponible. La conexión con el servidor de autenticación debe ser habilitada por TI.' : ((e && e.mensaje) || (e && e.message) || 'Ocurrió un error inesperado.');
  document.body.dataset.backend = 'conectado';

  // ---------- Catálogos de presentación (el backend decide permisos; esto solo es UX) ----------
  const PRIORIDAD_ROL = ['Super Admin', 'Administración', 'Diseño', 'Comunicados', 'Reclutamiento digital', 'Gestión de proyectos', 'Solicitante'];
  const TIPO_UI = { Comunicado: 'Comunicado', Diseno: 'Diseño', CampanaPago: 'Campaña', CampanaCajaChica: 'Campaña', Efectividad: 'Reporte', Proyecto: 'Proyecto' };
  const GRUPO_UI = { 'Pendiente': 'Pendiente', 'En revisión': 'En revisión', 'En proceso': 'En proceso', 'Realizado': 'Realizado', 'Rechazado': 'Rechazado', 'Cancelado': 'Rechazado' };
  const ETQ = { 'En revision': 'En revisión', 'Pendiente informacion': 'Pendiente información', 'En validacion': 'En validación' };
  const etq = e => ETQ[e] || e;
  const TRANSICIONES = {
    'Recibida': ['En revision', 'Rechazada', 'Cancelada'], 'En revision': ['Pendiente informacion', 'Aprobada', 'Rechazada', 'Cancelada'],
    'Pendiente informacion': ['En revision', 'Cancelada'], 'Aprobada': ['En proceso', 'Cancelada'],
    'En proceso': ['En validacion', 'Pendiente informacion', 'Cancelada'], 'En validacion': ['Finalizada', 'En proceso'],
    'Finalizada': [], 'Rechazada': [], 'Cancelada': []
  };
  const DEL_RESPONSABLE = ['Aprobada>En proceso', 'En proceso>En validacion', 'En proceso>Pendiente informacion'];
  const REQUIERE_MOTIVO = ['Rechazada', 'Cancelada', 'Pendiente informacion'];

  let perfil = null;          // usuario devuelto por el backend
  let cache = {};             // solicitudId -> registro del backend
  const esAdmin = () => !!perfil && perfil.roles.some(r => r === 'Administrador' || r === 'SuperAdmin');

  // El directorio y sus roles existen en Airtable, pero esta versión aún no tiene API
  // para editar usuarios. Nunca usar el formulario demo como sustituto.
  renderUsers = function () {
    const cards = $('#userCards');
    if (!cards) return;
    if (!perfil || !esAdmin()) { cards.replaceChildren(); return; }
    cards.innerHTML = '<section role="status" class="user-card" style="grid-column:1/-1;padding:28px">'
      + '<h2>Directorio corporativo</h2>'
      + '<p>Los usuarios y sus roles están registrados en Airtable. Para consultar o modificar el directorio desde aquí falta habilitar el endpoint administrativo con autorización por rol.</p>'
      + '<p class="secondary">No se muestran personas simuladas ni se guardan cambios locales.</p></section>';
    const add = $('#addUser'); if (add) { add.hidden = true; add.disabled = true; }
  };
  $('#userForm')?.addEventListener('submit', ev => {
    ev.preventDefault(); ev.stopImmediatePropagation();
    aviso('La administración de usuarios requiere una API protegida.');
  }, true);
  $('#addUser')?.addEventListener('click', ev => {
    ev.preventDefault(); ev.stopImmediatePropagation();
    aviso('La administración de usuarios requiere una API protegida.');
  }, true);
  const renderDemo = render;
  render = function () {
    const result = renderDemo();
    const faces = $('#teamFaces'); if (faces) faces.replaceChildren();
    const access = $('#accessButton');
    const subtitle = access && access.querySelector('small');
    if (subtitle && perfil) subtitle.textContent = 'Sesión corporativa';
    return result;
  };

  // ---------- Sesión ----------
  function aplicarPerfil(u) {
    perfil = u;
    const rolUI = PRIORIDAD_ROL.find(r => (u.perfiles || []).includes(r)) || 'Solicitante';
    users = [{ id: u.id, name: u.nombre || u.correo, email: u.correo, role: rolUI, active: true }];
    currentUserId = u.id;
    scope = 'all';
  }
  function limpiarSesion() { perfil = null; cache = {}; users = []; requests = []; currentUserId = null; }

  async function cargarSolicitudes() {
    const res = await api.listar({ pagina: { tamano: 50 } });
    cache = {};
    requests = res.resultados.map(s => {
      cache[s.id] = s;
      return {
        id: s.folio, backendId: s.id, type: TIPO_UI[s.tipo && s.tipo.valor] || 'Diseño', title: s.titulo || s.folio,
        status: GRUPO_UI[s.estado && s.estado.grupoPortal] || 'Pendiente', estado: s.estado && s.estado.valor,
        person: (s.solicitante && s.solicitante.nombre) || '—', area: s.area || '—',
        date: s.fechaCompromiso || String(s.creadoUTC || '').slice(0, 10), format: s.tipo ? s.tipo.etiqueta : '',
        brief: '', comments: '', reason: '', evidence: '',
        assignee: (s.responsables[0] && s.responsables[0].id) || '',
        // El servidor ya filtró por alcance; se marca como visible para la vista local.
        createdBy: currentUserId, relacion: s.relacion, history: []
      };
    });
    // Nombres de responsables para personName()
    res.resultados.forEach(s => s.responsables.forEach(p => { if (!users.some(u => u.id === p.id)) users.push({ id: p.id, name: p.nombre || 'Responsable', role: '', email: '', active: false }); }));
    if (typeof render === 'function') render();
  }

  async function iniciarConPerfil(u, destino) {
    aplicarPerfil(u);
    try { await cargarSolicitudes(); } catch (e) { aviso('No se pudieron consultar las solicitudes: ' + errorTexto(e)); }
    view(destino || ((perfil.vistas || []).includes('equipo') ? 'equipo' : 'solicitar'));
  }

  // ---------- Inicio de sesión OTP en la ventana aprobada ----------
  const overlay = $('#mktLoginOverlay');
  const emailForm = $('#mktLoginEmailForm');
  let correoOTP = '';
  let destinoTrasLogin = 'equipo';
  if (overlay && emailForm) {
    overlay.querySelector('.mkt-login-subtitle').textContent = 'Introduce tu correo corporativo. Te enviaremos un código de acceso de 6 dígitos.';
    overlay.querySelector('#mktLoginEmailStage .mkt-login-advice').textContent = 'El código vence en 5 minutos y solo puede usarse una vez.';
    const foot = overlay.querySelector('.mkt-login-foot');
    if (foot) foot.innerHTML = '<span>ACCESO SEGURO</span><span>Código de un solo uso</span>';
    const codeStage = document.createElement('div');
    codeStage.id = 'mktLoginCodeStage'; codeStage.hidden = true;
    codeStage.innerHTML = '<button type="button" id="mktLoginCodeBack" class="mkt-login-back">← Cambiar correo</button>'
      + '<span class="mkt-login-kicker">Verificación</span><h2>Escribe tu código</h2>'
      + '<p class="mkt-login-subtitle">Si el correo está autorizado, recibirás un código de 6 dígitos.</p>'
      + '<div class="mkt-login-account"><span class="mkt-login-usericon">◎</span><span id="mktLoginCodeAccount"></span></div>'
      + '<form id="mktLoginCodeForm"><label for="mktLoginCode">Código de acceso</label>'
      + '<input id="mktLoginCode" name="codigo" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required placeholder="000000">'
      + '<p class="mkt-login-message" id="mktLoginCodeError" aria-live="polite"></p>'
      + '<div class="mkt-login-actions"><button type="button" id="mktLoginResend" class="mkt-login-back">Reenviar código</button><button type="submit" class="mkt-login-primary">Entrar <span>→</span></button></div></form>';
    overlay.querySelector('.mkt-login-window').insertBefore(codeStage, foot || null);
    const mostrar = etapa => { $('#mktLoginEmailStage').hidden = etapa !== 'email'; $('#mktLoginProfileStage').hidden = true; codeStage.hidden = etapa !== 'codigo'; (etapa === 'codigo' ? $('#mktLoginCode') : $('#mktLoginMail')).focus(); };
    const cerrar = () => { overlay.hidden = true; document.body.classList.remove('mkt-login-active'); };
    const abrir = destino => { destinoTrasLogin = destino || 'equipo'; overlay.hidden = false; document.body.classList.add('mkt-login-active'); mostrar('email'); };
    let reenvioHasta = 0;
    async function pedirCodigo() {
      const r = await api.solicitarCodigo(correoOTP);
      reenvioHasta = Date.now() + (r.reenviarEnSeg || 60) * 1000;
    }
    // Captura antes que el flujo de demostración (welcome-screen.js) para que no se muestren perfiles simulados.
    emailForm.addEventListener('submit', async ev => {
      ev.preventDefault(); ev.stopImmediatePropagation();
      const err = $('#mktLoginError');
      correoOTP = $('#mktLoginMail').value.trim().toLowerCase();
      if (!/^[^\s@]+@intercon\.com\.mx$/.test(correoOTP)) { err.textContent = 'Usa tu correo corporativo @intercon.com.mx.'; return; }
      err.textContent = '';
      const btn = emailForm.querySelector('[type="submit"]');
      if (btn.disabled) return;
      btn.disabled = true; btn.textContent = 'Enviando código…';
      try { await pedirCodigo(); $('#mktLoginCodeAccount').textContent = correoOTP; mostrar('codigo'); }
      catch (e) { err.textContent = errorTexto(e); }
      finally { btn.disabled = false; btn.innerHTML = 'Siguiente <span>→</span>'; }
    }, true);
    $('#mktLoginCodeBack').onclick = () => mostrar('email');
    $('#mktLoginResend').onclick = async () => {
      const err = $('#mktLoginCodeError');
      if (Date.now() < reenvioHasta) { err.textContent = 'Espera ' + Math.ceil((reenvioHasta - Date.now()) / 1000) + ' s para solicitar otro código.'; return; }
      try { await pedirCodigo(); err.textContent = 'Si el correo está autorizado, enviamos un nuevo código.'; } catch (e) { err.textContent = errorTexto(e); }
    };
    $('#mktLoginCodeForm').addEventListener('submit', async ev => {
      ev.preventDefault();
      const err = $('#mktLoginCodeError'), codigo = $('#mktLoginCode').value.trim();
      if (!/^\d{6}$/.test(codigo)) { err.textContent = 'El código tiene 6 dígitos.'; return; }
      const btn = $('#mktLoginCodeForm button[type="submit"]');
      if (btn.disabled) return;
      btn.disabled = true; btn.textContent = 'Validando acceso…';
      try {
        const { usuario } = await api.verificarCodigo(correoOTP, codigo);
        $('#mktLoginCode').value = ''; err.textContent = ''; cerrar();
        await iniciarConPerfil(usuario, destinoTrasLogin === 'solicitar' ? 'solicitar' : null);
      } catch (e) { err.textContent = errorTexto(e); $('#mktLoginCode').select(); }
      finally { btn.disabled = false; btn.innerHTML = 'Entrar <span>→</span>'; }
    });
    // Sustituye el selector de perfiles de demostración.
    window.showAccess = () => abrir(['equipo', 'calendario', 'usuarios'].includes(document.body.dataset.view) ? document.body.dataset.view : 'equipo');
    $('#accessButton').onclick = () => { if (perfil) view('equipo'); else window.showAccess(); };
    document.addEventListener('click', ev => {
      const t = ev.target.closest('#goForms,.hero-actions [data-view="equipo"]');
      if (!t || perfil) return;
      ev.preventDefault(); ev.stopImmediatePropagation(); abrir(t.id === 'goForms' ? 'solicitar' : 'equipo');
    }, true);
  }
  const salir = async () => { await api.cerrarSesion(); limpiarSesion(); $('#accessDialog')?.close(); view('solicitar'); aviso('Sesión cerrada.'); };
  $('#logout').onclick = salir;

  // ---------- Creación de solicitudes (MKT_02) ----------
  let capturado = null;
  const tipoDeFormulario = form => {
    const vista = form.closest('.view')?.id;
    if (form.id === 'cashCampaignForm') return 'CampanaCajaChica';
    if (form.id === 'effectForm') return 'Efectividad';
    if (vista === 'comunicado') return 'Comunicado';
    if (vista === 'diseno' && form.elements.namedItem('delivery')) return 'Diseno';
    if (vista === 'campana' && form.elements.namedItem('employeeNumber')) return 'CampanaPago';
    if (vista === 'proyectos' && form.elements.namedItem('projectType')) return 'Proyecto';
    return null;
  };
  const serializar = form => {
    const datos = {};
    for (const el of form.elements) {
      if (!el.name || el.disabled || el.type === 'file' || el.type === 'submit' || el.type === 'button') continue;
      const grupo = form.elements.namedItem(el.name);
      const multiple = typeof RadioNodeList !== 'undefined' && grupo instanceof RadioNodeList && grupo.length > 1;
      if (el.type === 'checkbox') {
        if (multiple) { if (!Array.isArray(datos[el.name])) datos[el.name] = []; if (el.checked) datos[el.name].push(el.value); }
        else datos[el.name] = el.checked;
      } else if (el.type === 'radio') { if (el.checked) datos[el.name] = el.value; }
      else if (String(el.value).trim() !== '') datos[el.name] = el.value.trim();
    }
    return datos;
  };
  document.addEventListener('submit', ev => {
    const form = ev.target;
    if (!(form instanceof HTMLFormElement) || !form.closest('.view')) return;
    const tipo = tipoDeFormulario(form);
    const adjuntos = Array.from(form.querySelectorAll('input[type="file"]')).flatMap(i => Array.from(i.files || []));
    capturado = tipo ? { tipo, datos: serializar(form), form, en: Date.now(), clave: api.nuevaClave(), adjuntos } : { tipo: null, form, en: Date.now() };
  }, true);
  window.addDemoRequest = function (r) {
    const c = capturado; capturado = null;
    if (!perfil) { aviso('Inicia sesión para enviar la solicitud.'); window.showAccess(); return; }
    if (!c || Date.now() - c.en > 10000) { aviso('No se pudo validar el formulario. No se registró la solicitud. Vuelve a intentarlo.'); return; }
    if (!c.tipo) { aviso('Este formulario aún no está conectado al backend. No se guardó la solicitud.'); return; }
    const panel = c.form.closest('.view')?.querySelector('[data-success]');
    const folioEl = panel && panel.querySelector('[data-folio]');
    if (folioEl) folioEl.textContent = 'Registrando solicitud…';
    api.crearSolicitud({ tipo: c.tipo, datos: c.datos, claveIdempotencia: c.clave })
      .then(res => {
        if (folioEl) folioEl.textContent = 'Folio ' + res.folio + ' · ' + res.estado + '. Marketing recibió tu solicitud.';
        aviso('Solicitud registrada con folio ' + res.folio + '.');
        return subirAdjuntos(res.solicitudId, c.adjuntos || [], folioEl, res.folio).then(cargarSolicitudes);
      })
      .catch(e => {
        const det = (e.detalles || []).slice(0, 3).map(d => d.campo + ': ' + d.mensaje).join(' · ');
        if (folioEl) folioEl.textContent = 'No se registró: ' + errorTexto(e) + (det ? ' (' + det + ')' : '');
        aviso('No se registró la solicitud: ' + errorTexto(e));
      });
  };

  // ---------- Archivos (MKT_06: puente Power Automate → SharePoint) ----------
  const A = api.archivos;
  const kb = n => n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round((n || 0) / 1024)) + ' KB';
  const ESTADO_ARCHIVO = { Pendiente: 'Cargando', Disponible: 'Disponible', Validado: 'Entregable registrado', Rechazado: 'Rechazado', Expirado: 'Expirado' };
  const FASE = { preparando: 'Calculando huella del archivo…', cargando: 'Enviando', confirmando: 'Esperando confirmación de SharePoint…', listo: 'Archivo verificado en SharePoint.' };
  const textoProgreso = p => (FASE[p.fase] || '') + (p.fase === 'cargando' && p.partes > 1 ? ' parte ' + p.parte + ' de ' + p.partes + '…' : p.fase === 'cargando' ? '…' : '');

  // Adjuntos capturados en el formulario de creación → Referencia (uno a uno; un error no cancela los demás).
  async function subirAdjuntos(solicitudId, lista, folioEl, folio) {
    if (!lista.length || !solicitudId) return;
    const fallidos = [];
    for (let i = 0; i < lista.length; i++) {
      const f = lista[i];
      const rev = A.revisar(f, 'Referencia');
      if (!rev.ok) { fallidos.push(f.name + ': ' + rev.mensaje); continue; }
      try {
        await A.subir(solicitudId, 'Referencia', f, p => { if (folioEl) folioEl.textContent = 'Folio ' + folio + ' · adjunto ' + (i + 1) + ' de ' + lista.length + ' (' + f.name + '): ' + textoProgreso(p); });
      } catch (e) { fallidos.push(f.name + ': ' + errorTexto(e)); }
    }
    const ok = lista.length - fallidos.length;
    if (folioEl) folioEl.textContent = 'Folio ' + folio + ' registrado. Adjuntos verificados: ' + ok + ' de ' + lista.length + '.' + (fallidos.length ? ' No se cargaron: ' + fallidos.join(' · ') : '');
    if (fallidos.length) aviso('Algunos adjuntos no se cargaron. Puedes agregarlos desde el detalle de la solicitud.');
  }

  function panelArchivos(r, s, esResp, esSol) {
    let caja = $('#mktArchivos');
    if (!caja) {
      caja = document.createElement('section'); caja.id = 'mktArchivos';
      $('#detailHistory').previousElementSibling.insertAdjacentElement('beforebegin', caja);
    }
    const puedeEntregar = esAdmin() || esResp;
    const cats = ['Referencia', 'Brief'].concat(puedeEntregar ? ['Entregable'] : []);
    const terminal = ['Finalizada', 'Rechazada', 'Cancelada'].includes(r.estado);
    caja.innerHTML = '<h3>Archivos</h3><div id="mktArchivosLista" class="history-list"><p class="secondary">Cargando archivos…</p></div>'
      + (terminal ? '' : '<div class="edit-grid"><label>Tipo de archivo<select id="mktArchivoCat">' + cats.map(c => '<option>' + c + '</option>').join('') + '</select></label>'
      + '<label>Archivo<input id="mktArchivoInput" type="file"></label></div>'
      + '<p class="field-help" id="mktArchivoAyuda"></p>'
      + '<div class="dialog-actions"><button type="button" id="mktArchivoSubir">Subir archivo</button></div>'
      + '<progress id="mktArchivoProgreso" max="100" value="0" hidden style="width:100%"></progress><p class="secondary" id="mktArchivoEstado" aria-live="polite"></p>');
    const ayuda = () => { const c = $('#mktArchivoCat').value, g = A.REGLAS[c]; $('#mktArchivoAyuda').textContent = 'Formatos: ' + g.ext.join(', ') + '. Máximo ' + Math.min(g.max, A.LIMITE_TRANSPORTE) / 1048576 + ' MB por archivo.'; $('#mktArchivoInput').accept = g.ext.map(e => '.' + e).join(','); };
    if (!terminal) {
      $('#mktArchivoCat').onchange = () => { ayuda(); revisarSeleccion(); };
      const revisarSeleccion = () => { const f = $('#mktArchivoInput').files[0]; const rv = f ? A.revisar(f, $('#mktArchivoCat').value) : null; $('#mktArchivoEstado').textContent = rv && !rv.ok ? rv.mensaje : ''; $('#mktArchivoSubir').disabled = !f || !rv.ok; };
      $('#mktArchivoInput').onchange = revisarSeleccion;
      ayuda(); revisarSeleccion();
      $('#mktArchivoSubir').onclick = async () => {
        const f = $('#mktArchivoInput').files[0], cat = $('#mktArchivoCat').value;
        if (!f) return;
        const btn = $('#mktArchivoSubir'), pr = $('#mktArchivoProgreso'), st = $('#mktArchivoEstado');
        btn.disabled = true; pr.hidden = false; pr.value = 0;
        try {
          await A.subir(r.backendId, cat, f, p => { pr.value = p.pct; st.textContent = textoProgreso(p); });
          st.textContent = '«' + f.name + '» quedó disponible.'; $('#mktArchivoInput').value = '';
          aviso('Archivo cargado y verificado.');
        } catch (e) {
          st.textContent = e.code === 'DUPLICADO_CONTENIDO' ? 'Este archivo ya está cargado en la solicitud.' : errorTexto(e);
        } finally { pr.hidden = true; btn.disabled = false; listarArchivos(r, esResp); }
      };
    }
    listarArchivos(r, esResp);
  }

  function listarArchivos(r, esResp) {
    const caja = $('#mktArchivosLista'); if (!caja) return;
    A.listar(r.backendId).then(res => {
      const lista = res.archivos || [];
      if (!lista.length) { caja.innerHTML = '<p class="secondary">Sin archivos.</p>'; return; }
      const entregable = (esAdmin() || esResp) && ['En proceso', 'En validacion'].includes(r.estado);
      caja.innerHTML = lista.map(a => '<div><span class="history-dot"></span><p><strong>' + esc(a.nombre) + '</strong><span>'
        + esc(a.categoria + ' · ' + (ESTADO_ARCHIVO[a.estado] || a.estado) + ' · ' + kb(a.tamanoBytes)) + '</span>'
        + (a.descargable ? '<button type="button" class="text-button" data-descargar="' + esc(a.archivoId) + '">Descargar</button>' : '')
        + (entregable && a.categoria === 'Entregable' && a.estado === 'Disponible' ? ' <button type="button" class="text-button" data-entregar="' + esc(a.archivoId) + '">Registrar como entregable</button>' : '')
        + '</p></div>').join('');
      caja.querySelectorAll('[data-descargar]').forEach(b => b.onclick = async () => {
        const t = b.textContent; b.disabled = true; b.textContent = 'Solicitando…';
        try { await A.descargar(b.dataset.descargar, () => { b.textContent = 'Preparando descarga…'; }); b.textContent = t; }
        catch (e) { aviso(errorTexto(e)); b.textContent = t; } finally { b.disabled = false; }
      });
      caja.querySelectorAll('[data-entregar]').forEach(b => b.onclick = async () => {
        b.disabled = true;
        try { await api.entregable(r.backendId, b.dataset.entregar, $('#comments').value.trim() || undefined); aviso('Entregable registrado. Se notificó al solicitante.'); listarArchivos(r, esResp); }
        catch (e) { aviso(errorTexto(e)); b.disabled = false; }
      });
    }).catch(e => { caja.innerHTML = '<p class="secondary">' + esc(errorTexto(e)) + '</p>'; });
  }

  // Representación completa de datos de formulario devueltos por MKT_03.
  // Se conserva la estructura del brief y se escapa cualquier texto del solicitante.
  const nombresBrief = {
    title: 'Título', objective: 'Objetivo', description: 'Descripción',
    delivery: 'Tipo de entregable', format: 'Formato',
    quantity: 'Cantidad', language: 'Idioma',
    comments: 'Instrucciones adicionales', client: 'Cliente'
  };
  const etiquetaDato = clave => nombresBrief[clave] || String(clave).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/^./, c => c.toUpperCase());
  function paresBrief(datos) {
    const filas = [];
    const recorrer = (obj, prefijo, nivel) => {
      if (nivel > 5 || filas.length >= 150 || obj === null || obj === undefined || obj === '') return;
      if (Array.isArray(obj)) {
        if (!obj.length) return;
        if (obj.every(v => v === null || ['string', 'number', 'boolean'].includes(typeof v))) {
          filas.push([prefijo || 'Elementos', obj.map(v => v === null ? '—' : String(v)).join(', ')]);
        } else obj.forEach((v, i) => recorrer(v, prefijo + ' · ' + (i + 1), nivel + 1));
      } else if (typeof obj === 'object') {
        Object.entries(obj).forEach(([k,v]) => recorrer(v, prefijo ? prefijo + ' / ' + etiquetaDato(k) : etiquetaDato(k), nivel + 1));
      } else filas.push([prefijo || 'Dato', typeof obj === 'boolean' ? (obj ? 'Sí' : 'No') : String(obj)]);
    };
    recorrer(datos, '', 0);
    return filas.length ? '<section class="mkt-full-brief" aria-label="Datos del formulario"><h3>Información completa del formulario</h3><dl class="comm-review">'
      + filas.map(([k,v]) => '<div><dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd></div>').join('')
      + '</dl></section>' : '<p class="secondary">El formulario no contiene campos adicionales registrados.</p>';
  }

  // ---------- Detalle, historial y actualización (MKT_03 / MKT_04) ----------
  const openOriginal = window.openDetail;
  window.openDetail = function (folio) {
    openOriginal(folio);
    const r = requests.find(x => x.id === folio);
    if (!r || !r.backendId) return;
    const s = cache[r.backendId] || {};
    const yo = perfil.id, esResp = (s.responsables || []).some(p => p.id === yo), esSol = (s.relacion || []).includes('propia');
    $('#folio').textContent = folio + ' · ' + (s.tipo ? s.tipo.etiqueta : r.type) + ' · ' + etq(r.estado);
    // Estatus: solo transiciones permitidas para la relación del usuario (el backend vuelve a validar)
    const permitidas = (TRANSICIONES[r.estado] || []).filter(a => esAdmin() || (esResp && DEL_RESPONSABLE.includes(r.estado + '>' + a)));
    const sel = $('#editStatus');
    sel.innerHTML = '<option value="">Sin cambio · ' + esc(etq(r.estado)) + '</option>' + permitidas.map(a => '<option value="' + esc(a) + '">' + esc(etq(a)) + '</option>').join('');
    sel.disabled = !permitidas.length;
    sel.onchange = () => { const req = REQUIERE_MOTIVO.includes(sel.value); $('#reasonLabel').hidden = !req; $('#reason').required = req; };
    sel.onchange();
    // Sin enlaces de evidencia: los archivos se cargan y descargan mediante MKT_06 (SharePoint, sin enlaces públicos).
    const ev = $('#evidence'); ev.value = ''; ev.disabled = true; ev.closest('label').hidden = true;
    panelArchivos(r, s, esResp, esSol);
    // Fecha compromiso editable exclusivamente por Administración; MKT_04 valida de nuevo el rol.
    let fechaBox = $('#mktFechaCompromisoBox');
    if (!fechaBox) {
      fechaBox = document.createElement('label'); fechaBox.id = 'mktFechaCompromisoBox';
      fechaBox.innerHTML = 'Fecha compromiso<input id="mktFechaCompromiso" type="date"><small class="secondary">La fecha se registra en el historial del backend.</small>';
      $('#editForm .follow-up-section')?.append(fechaBox);
    }
    if (fechaBox) {
      fechaBox.hidden = !esAdmin();
      const fecha = $('#mktFechaCompromiso');
      fecha.value = s.fechaCompromiso || '';
      fecha.disabled = !esAdmin();
    }
    $('#comments').placeholder = esSol && !esAdmin() ? (r.estado === 'Pendiente informacion' ? 'Responde la información solicitada.' : 'Agrega una observación para Marketing.') : 'Agrega un avance o una nota para el equipo.';
    // Responsables (solo Administración): candidatos activos con rol compatible, calculados en el servidor
    const asg = $('#assigned');
    asg.innerHTML = '<option value="">' + esc(r.assignee ? (users.find(u => u.id === r.assignee)?.name || 'Asignado') : 'Sin asignar') + '</option>';
    asg.value = ''; asg.disabled = true;
    $('#assignmentHelp').textContent = esAdmin() ? 'Cargando responsables autorizados…' : 'Administración define a la persona responsable.';
    if (esAdmin()) api.responsables(r.backendId).then(res => {
      asg.innerHTML = '<option value="">Sin cambio</option>' + res.responsables.map(p => '<option value="' + esc(p.id) + '"' + (p.compatible ? '' : ' disabled') + '>' + esc(p.nombre) + ' · ' + esc(p.perfiles.join(', ')) + (p.compatible ? '' : ' · sin permiso para este servicio') + '</option>').join('');
      asg.disabled = false; $('#assignmentHelp').textContent = 'Solo se listan personas activas; el servidor valida el permiso por servicio.';
    }).catch(e => { $('#assignmentHelp').textContent = errorTexto(e); });
    // Historial y datos completos
    $('#detailHistory').innerHTML = '<p class="secondary">Cargando historial…</p>';
    const detalleId = r.backendId;
    const cuerpo = $('#detailBody');
    cuerpo.querySelector('.mkt-full-brief')?.remove();
    cuerpo.insertAdjacentHTML('beforeend', '<p id="mktBriefLoading" class="secondary" role="status">Consultando el formulario original…</p>');
    api.detalle(detalleId).then(res => {
      // No mezclar respuestas tardías al cambiar rápidamente de solicitud.
      if (selected !== folio || !$('#detail').open) return;
      const d = res.solicitud || {};
      const brief = cuerpo.querySelector('.brief'); if (brief) brief.textContent = d.descripcion || 'Sin instrucciones principales registradas.';
      cuerpo.querySelector('#mktBriefLoading')?.remove();
      cuerpo.querySelector('.mkt-full-brief')?.remove();
      cuerpo.insertAdjacentHTML('beforeend', paresBrief(d.datos || {}));
      $('#detailHistory').innerHTML = (d.historial || []).slice().reverse().map(h => '<div><span class="history-dot"></span><p><strong>' + esc(h.actor ? h.actor.nombre : 'Sistema') + '</strong><span>'
        + esc(h.evento + (h.estadoNuevo && h.estadoAnterior && h.estadoNuevo.valor !== h.estadoAnterior.valor ? ': ' + h.estadoAnterior.etiqueta + ' → ' + h.estadoNuevo.etiqueta : '') + (h.comentario ? ' · ' + h.comentario : ''))
        + '</span><small>' + esc(h.fechaUTC ? new Date(h.fechaUTC).toLocaleString('es-MX') : 'Sin fecha') + '</small></p></div>').join('') || '<p class="secondary">Sin eventos.</p>';
    }).catch(e => { if (selected !== folio || !$('#detail').open) return; cuerpo.querySelector('#mktBriefLoading')?.remove(); cuerpo.insertAdjacentHTML('beforeend','<p class="secondary">No se pudo cargar el formulario: ' + esc(errorTexto(e)) + '</p>'); $('#detailHistory').innerHTML = '<p class="secondary">' + esc(errorTexto(e)) + '</p>'; });
  };

  $('#editForm').onsubmit = async ev => {
    ev.preventDefault();
    const r = requests.find(x => x.id === selected);
    if (!r || !r.backendId) return;
    const s = cache[r.backendId] || {};
    const esResp = (s.responsables || []).some(p => p.id === perfil.id), esSol = (s.relacion || []).includes('propia');
    const nuevo = $('#editStatus').value, motivo = $('#reason').value.trim(), nota = $('#comments').value.trim(), resp = $('#assigned').value;
    const fecha = esAdmin() ? ($('#mktFechaCompromiso')?.value || '') : '';
    const cambiaFecha = esAdmin() && fecha && fecha !== (s.fechaCompromiso || '');
    if (REQUIERE_MOTIVO.includes(nuevo) && !motivo) { $('#reason').setCustomValidity('Escribe el motivo.'); $('#reason').reportValidity(); return; }
    const boton = $('#editForm button[type="submit"]'); boton.disabled = true;
    const hechos = [];
    try {
      if (esAdmin() && resp && resp !== r.assignee) { await api.asignar(r.backendId, resp); hechos.push('responsable asignado'); }
      if (cambiaFecha) { await api.fechaCompromiso(r.backendId, fecha); hechos.push('fecha compromiso: ' + fecha); }
      if (nuevo) { await api.cambiarEstado(r.backendId, r.estado, nuevo, motivo || undefined); hechos.push('estatus: ' + etq(nuevo)); }
      // Las notas son eventos propios: no se pierden al asignar o cambiar el estado.
      if (nota) {
        const tipo = esAdmin() ? 'comentario' : esResp ? 'avance' : esSol ? (r.estado === 'Pendiente informacion' ? 'respuestaInformacion' : 'observacion') : 'comentario';
        await api.comentar(r.backendId, tipo, nota); hechos.push('comentario registrado');
      }
      $('#detail').close();
      aviso(hechos.length ? 'Guardado: ' + hechos.join(', ') + '.' : 'No había cambios por guardar.');
    } catch (e) {
      aviso((hechos.length ? 'Guardado parcial (' + hechos.join(', ') + '). ' : '') + errorTexto(e));
    } finally {
      boton.disabled = false;
      try { await cargarSolicitudes(); } catch (e) { /* se mostrará en la siguiente acción */ }
    }
  };
  // Restablecer datos demo no aplica con backend.
  const reset = $('#reset'); if (reset) reset.hidden = true;

  // ---------- Restaurar sesión al cargar ----------
  if (api.sesionGuardada()) {
    api.sesion().then(r => iniciarConPerfil(r.usuario, location.hash.slice(1) || null)).catch(() => limpiarSesion());
  } else { limpiarSesion(); if (typeof render === 'function') render(); }
  window.MKT_BACKEND = Object.freeze({ recargar: cargarSolicitudes, salir });
})();
