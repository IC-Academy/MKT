// Portal MKT · Cliente del API (contratos v1). Sin dependencias.
// Reglas: el navegador nunca envía usuario, correo de sesión ni roles; solo el token Bearer emitido por el OTP.
// El token se guarda en sessionStorage (se borra al cerrar la pestaña) y nunca en localStorage ni en la URL.
(function () {
  'use strict';
  const CFG = window.MKT_CONFIG || { enabled: false };
  const KEY = 'mkt.sesion';
  const enabled = !!(CFG.enabled && /^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(String(CFG.apiBase || '').replace(/\/$/, '')));
  const base = String(CFG.apiBase || '').replace(/\/$/, '');

  class ApiError extends Error {
    constructor(status, code, mensaje, detalles, datos) { super(mensaje || code); this.status = status; this.code = code; this.detalles = detalles || []; this.datos = datos || {}; }
  }
  const store = {
    get() { try { const s = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (!s || !s.token || Date.parse(s.expiraUTC) <= Date.now()) return null; return s; } catch (e) { return null; } },
    set(token, expiraUTC) { try { sessionStorage.setItem(KEY, JSON.stringify({ token, expiraUTC })); } catch (e) { /* sin almacenamiento: sesión solo en memoria */ } memoria = { token, expiraUTC }; },
    clear() { try { sessionStorage.removeItem(KEY); } catch (e) { /* noop */ } memoria = null; }
  };
  let memoria = null;
  const token = () => (store.get() || memoria || {}).token || null;
  const nuevaClave = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).slice(2)).padEnd(24, '0');

  async function call(method, path, body, auth, opciones) {
    if (!enabled) throw new ApiError(0, 'BACKEND_DESACTIVADO', 'La conexión con el backend no está habilitada.');
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), (opciones && opciones.timeoutMs) || CFG.timeoutMs || 20000);
    const headers = { 'Accept': 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (auth) { const tk = token(); if (!tk) throw new ApiError(401, 'SESION_INVALIDA', 'Inicia sesión para continuar.'); headers.Authorization = 'Bearer ' + tk; }
    let res;
    try {
      res = await fetch(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: ctrl.signal, credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer' });
    } catch (e) {
      throw new ApiError(0, e.name === 'AbortError' ? 'TIEMPO_AGOTADO' : 'RED_NO_DISPONIBLE', e.name === 'AbortError' ? 'El servidor tardó demasiado en responder.' : 'No fue posible conectar con el servidor.');
    } finally { clearTimeout(t); }
    // Descarga autorizada: el servidor entrega el binario (nunca un enlace).
    if (opciones && opciones.binario && res.ok && !/application\/json/i.test(res.headers.get('Content-Type') || '')) {
      const disp = res.headers.get('Content-Disposition') || '';
      const m = disp.match(/filename\*=UTF-8''([^;]+)/i) || disp.match(/filename="([^"]+)"/i);
      let nombre = 'archivo'; try { nombre = m ? decodeURIComponent(m[1]) : nombre; } catch (e) { /* nombre por defecto */ }
      return { binario: true, blob: await res.blob(), nombre };
    }
    let data = null;
    try { data = await res.json(); } catch (e) { data = null; }
    if (!res.ok || !data || data.ok === false) {
      const err = (data && data.error) || {};
      if (res.status === 401 && auth) store.clear();
      throw new ApiError(res.status, err.code || 'ERROR_' + res.status, err.mensaje || 'Ocurrió un error inesperado.', err.detalles, err);
    }
    return data;
  }

  // ---------- MKT_06 · Archivos ----------
  const MB = 1048576;
  const LIMITE_TRANSPORTE = 15 * MB; // límite del puente por correo (tamaño real; el codificado se valida en el servidor)
  const TIPOS = {
    pdf: ['application/pdf'], docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'], pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    png: ['image/png'], jpg: ['image/jpeg'], jpeg: ['image/jpeg'], webp: ['image/webp'], gif: ['image/gif'],
    mp4: ['video/mp4'], mov: ['video/quicktime'], zip: ['application/zip', 'application/x-zip-compressed'],
    ai: ['application/postscript', 'application/illustrator', 'application/pdf', 'application/octet-stream'],
    psd: ['image/vnd.adobe.photoshop', 'application/octet-stream'], eps: ['application/postscript', 'application/octet-stream']
  };
  const REGLAS = {
    Referencia: { ext: ['pdf', 'docx', 'xlsx', 'pptx', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'mp4', 'mov'], max: 25 * MB },
    Brief: { ext: ['pdf', 'docx', 'xlsx', 'pptx', 'png', 'jpg', 'jpeg'], max: 10 * MB },
    Entregable: { ext: ['pdf', 'docx', 'xlsx', 'pptx', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'mp4', 'mov', 'zip', 'ai', 'psd', 'eps'], max: 250 * MB }
  };
  const espera = ms => new Promise(r => setTimeout(r, ms));
  const mbTexto = n => (n / MB).toFixed(1) + ' MB';
  const hex = buf => Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
  function base64(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }
  // Revisión previa (la definitiva ocurre en el servidor: extensión, MIME, firma y tamaño).
  function revisarArchivo(file, categoria) {
    const regla = REGLAS[categoria];
    if (!regla) return { ok: false, mensaje: 'Categoría no válida.' };
    const m = String(file.name || '').match(/\.([A-Za-z0-9]{2,5})$/);
    const ext = m ? m[1].toLowerCase() : '';
    if (!regla.ext.includes(ext)) return { ok: false, mensaje: 'Tipo no permitido para ' + categoria + '. Formatos: ' + regla.ext.join(', ') + '.' };
    const mime = (file.type || '').toLowerCase() || (TIPOS[ext] || [])[0] || '';
    if (!(TIPOS[ext] || []).includes(mime)) return { ok: false, mensaje: 'El tipo del archivo no corresponde a la extensión .' + ext + '.' };
    if (!file.size) return { ok: false, mensaje: 'El archivo está vacío.' };
    if (file.size > regla.max) return { ok: false, mensaje: 'El archivo pesa ' + mbTexto(file.size) + '; el máximo para ' + categoria + ' es ' + (regla.max / MB) + ' MB.' };
    if (file.size > LIMITE_TRANSPORTE) return { ok: false, mensaje: 'El archivo pesa ' + mbTexto(file.size) + '; por ahora el portal acepta hasta 15 MB por archivo. Para archivos mayores, solicita a Marketing la carga directa en SharePoint.' };
    return { ok: true, ext, mime };
  }
  const archivoCall = (body, opciones) => call('POST', '/mkt/v1/archivos', body, true, Object.assign({ timeoutMs: 60000 }, opciones || {}));
  const archivos = {
    REGLAS, LIMITE_TRANSPORTE, revisar: revisarArchivo,
    listar: solicitudId => archivoCall({ accion: 'listar', solicitudId }),
    // Carga completa: huella SHA-256 → iniciar → partes en orden → confirmación verificada por el servidor (Disponible).
    async subir(solicitudId, categoria, file, onProgreso) {
      const avisar = (fase, pct, extra) => { try { onProgreso && onProgreso(Object.assign({ fase, pct }, extra || {})); } catch (e) { /* UI */ } };
      const rev = revisarArchivo(file, categoria);
      if (!rev.ok) throw new ApiError(400, 'ARCHIVO_RECHAZADO', rev.mensaje);
      avisar('preparando', 0);
      const bytes = new Uint8Array(await file.arrayBuffer());
      const sha256 = hex(await crypto.subtle.digest('SHA-256', bytes));
      // Clave estable por contenido: reintentar la misma carga no duplica registros.
      const claveCliente = (categoria.charAt(0) + sha256.slice(0, 47));
      let r = await archivoCall({ accion: 'iniciar', solicitudId, categoria, nombre: file.name, mimeType: rev.mime, tamanoBytes: file.size, sha256, claveCliente });
      const archivoId = r.archivoId;
      if (r.estado === 'Disponible' || r.estado === 'Validado') { avisar('listo', 100, { archivoId }); return { archivoId, estado: r.estado }; }
      const tam = r.tamanoParte || 2359296;
      const total = r.partesTotales || Math.ceil(file.size / tam);
      let i = r.fase === 'confirmando' ? total : (r.partesRecibidas || 0);
      while (i < total) {
        avisar('cargando', Math.round(5 + 80 * i / total), { parte: i + 1, partes: total });
        try {
          r = await archivoCall({ accion: 'parte', archivoId, indice: i, contenidoBase64: base64(bytes.subarray(i * tam, Math.min(file.size, (i + 1) * tam))) });
          i = r.partesRecibidas || (i + 1);
        } catch (e) {
          if (e.code === 'PARTE_FUERA_DE_ORDEN' && Number.isInteger(e.datos.esperada)) { i = e.datos.esperada; continue; }
          throw e;
        }
      }
      // Confirmación de SharePoint (el servidor no marca Disponible sin verificarla).
      const limite = Date.now() + 12 * 60 * 1000;
      while (Date.now() < limite) {
        avisar('confirmando', 90);
        await espera(((r && r.reintentarEnSeg) ?? 10) * 1000);
        r = await archivoCall({ accion: 'estado', archivoId });
        const est = r.archivo && r.archivo.estado;
        if (est === 'Disponible' || est === 'Validado') { avisar('listo', 100, { archivoId }); return { archivoId, estado: est, archivo: r.archivo }; }
        if (est === 'Rechazado' || est === 'Expirado') throw new ApiError(422, 'CARGA_' + est.toUpperCase(), est === 'Expirado' ? 'SharePoint no confirmó la carga a tiempo. Intenta de nuevo.' : 'SharePoint no confirmó el archivo correctamente. Intenta de nuevo.');
      }
      throw new ApiError(504, 'CONFIRMACION_PENDIENTE', 'La confirmación de SharePoint está tardando. Revisa la lista de archivos en unos minutos.');
    },
    // Descarga autorizada en el servidor (sesión + relación con la solicitud). Sin enlaces anónimos.
    async descargar(archivoId, onEstado) {
      const limite = Date.now() + 4 * 60 * 1000;
      while (Date.now() < limite) {
        const r = await archivoCall({ accion: 'descargar', archivoId }, { binario: true, timeoutMs: 90000 });
        if (r.binario) {
          const url = URL.createObjectURL(r.blob);
          const a = document.createElement('a'); a.href = url; a.download = r.nombre; a.rel = 'noopener';
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 30000);
          return { nombre: r.nombre, bytes: r.blob.size };
        }
        try { onEstado && onEstado('preparando'); } catch (e) { /* UI */ }
        await espera((r.reintentarEnSeg ?? 8) * 1000);
      }
      throw new ApiError(504, 'DESCARGA_PENDIENTE', 'La descarga está tardando más de lo normal. Intenta de nuevo.');
    }
  };

  const api = {
    enabled, ApiError, nuevaClave,
    sesionGuardada: () => store.get(),
    // MKT_01 · OTP
    solicitarCodigo: correo => call('POST', '/mkt/v1/auth/solicitar-codigo', { correo }),
    async verificarCodigo(correo, codigo) {
      const r = await call('POST', '/mkt/v1/auth/verificar-codigo', { correo, codigo });
      store.set(r.token, r.expiraUTC);
      return { usuario: r.usuario, expiraUTC: r.expiraUTC };
    },
    // MKT_01B · sesión
    sesion: () => call('GET', '/mkt/v1/auth/sesion', undefined, true),
    async cerrarSesion() { try { await call('POST', '/mkt/v1/auth/cerrar-sesion', {}, true); } catch (e) { /* idempotente */ } store.clear(); },
    // MKT_02 · creación
    crearSolicitud: ({ tipo, datos, prioridad, titulo, claveIdempotencia }) =>
      call('POST', '/mkt/v1/solicitudes', Object.assign({ tipo, datos, prioridad: prioridad || 'Media', claveIdempotencia: claveIdempotencia || nuevaClave() }, titulo ? { titulo } : {}), true),
    // MKT_03 · consulta
    listar: ({ filtros, pagina, orden } = {}) => call('POST', '/mkt/v1/solicitudes/consultar', { accion: 'listar', filtros: filtros || {}, pagina: pagina || { tamano: 50 }, orden: orden || 'recientes' }, true),
    detalle: solicitudId => call('POST', '/mkt/v1/solicitudes/consultar', { accion: 'detalle', solicitudId }, true),
    historial: solicitudId => call('POST', '/mkt/v1/solicitudes/consultar', { accion: 'historial', solicitudId }, true),
    responsables: solicitudId => call('POST', '/mkt/v1/solicitudes/consultar', { accion: 'responsables', solicitudId }, true),
    // MKT_04 · actualización (cada llamada lleva su propia clave de idempotencia)
    asignar: (solicitudId, responsableId, comentario) => call('POST', '/mkt/v1/solicitudes/actualizar', { accion: 'asignar', solicitudId, responsableId, comentario, claveIdempotencia: nuevaClave() }, true),
    cambiarEstado: (solicitudId, estadoActual, estadoNuevo, comentario) => call('POST', '/mkt/v1/solicitudes/actualizar', { accion: 'cambiarEstado', solicitudId, estadoActual, estadoNuevo, comentario, claveIdempotencia: nuevaClave() }, true),
    comentar: (solicitudId, tipo, comentario, porcentajeAvance) => call('POST', '/mkt/v1/solicitudes/actualizar', Object.assign({ accion: 'comentar', solicitudId, tipo, comentario, claveIdempotencia: nuevaClave() }, porcentajeAvance === undefined ? {} : { porcentajeAvance }), true),
    fechaCompromiso: (solicitudId, fechaCompromiso) => call('POST', '/mkt/v1/solicitudes/actualizar', { accion: 'fechaCompromiso', solicitudId, fechaCompromiso, claveIdempotencia: nuevaClave() }, true),
    // Solo archivoId (ARC-…) cargado y verificado por MKT_06; el navegador nunca envía IDs de SharePoint.
    entregable: (solicitudId, archivoId, comentario) => call('POST', '/mkt/v1/solicitudes/actualizar', { accion: 'entregable', solicitudId, archivoId, comentario, claveIdempotencia: nuevaClave() }, true),
    // MKT_06 · archivos (puente Power Automate → SharePoint)
    archivos: archivos
  };
  window.MKT_API = Object.freeze(api);
})();
