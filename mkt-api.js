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
    constructor(status, code, mensaje, detalles) { super(mensaje || code); this.status = status; this.code = code; this.detalles = detalles || []; }
  }
  const store = {
    get() { try { const s = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (!s || !s.token || Date.parse(s.expiraUTC) <= Date.now()) return null; return s; } catch (e) { return null; } },
    set(token, expiraUTC) { try { sessionStorage.setItem(KEY, JSON.stringify({ token, expiraUTC })); } catch (e) { /* sin almacenamiento: sesión solo en memoria */ } memoria = { token, expiraUTC }; },
    clear() { try { sessionStorage.removeItem(KEY); } catch (e) { /* noop */ } memoria = null; }
  };
  let memoria = null;
  const token = () => (store.get() || memoria || {}).token || null;
  const nuevaClave = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).slice(2)).padEnd(24, '0');

  async function call(method, path, body, auth) {
    if (!enabled) throw new ApiError(0, 'BACKEND_DESACTIVADO', 'La conexión con el backend no está habilitada.');
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), CFG.timeoutMs || 20000);
    const headers = { 'Accept': 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (auth) { const tk = token(); if (!tk) throw new ApiError(401, 'SESION_INVALIDA', 'Inicia sesión para continuar.'); headers.Authorization = 'Bearer ' + tk; }
    let res;
    try {
      res = await fetch(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: ctrl.signal, credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer' });
    } catch (e) {
      throw new ApiError(0, e.name === 'AbortError' ? 'TIEMPO_AGOTADO' : 'RED_NO_DISPONIBLE', e.name === 'AbortError' ? 'El servidor tardó demasiado en responder.' : 'No fue posible conectar con el servidor.');
    } finally { clearTimeout(t); }
    let data = null;
    try { data = await res.json(); } catch (e) { data = null; }
    if (!res.ok || !data || data.ok === false) {
      const err = (data && data.error) || {};
      if (res.status === 401 && auth) store.clear();
      throw new ApiError(res.status, err.code || 'ERROR_' + res.status, err.mensaje || 'Ocurrió un error inesperado.', err.detalles);
    }
    return data;
  }

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
    entregable: (solicitudId, archivo, comentario) => call('POST', '/mkt/v1/solicitudes/actualizar', { accion: 'entregable', solicitudId, archivo, comentario, claveIdempotencia: nuevaClave() }, true)
  };
  window.MKT_API = Object.freeze(api);
})();
