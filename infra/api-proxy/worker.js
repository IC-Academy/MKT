// Portal MKT · Proxy de API (Cloudflare Worker) delante de n8n Cloud.
// Ruta prevista: https://api.marketing.intercon.com.mx/mkt/v1/*  →  https://<instancia>.app.n8n.cloud/webhook/mkt/v1/*
// Objetivos: ocultar la URL de n8n, limitar peticiones por IP y por ruta, restringir orígenes, métodos y tamaño,
// y añadir un encabezado secreto que n8n puede validar (X-MKT-Proxy). Ningún secreto vive en el frontend.
// Bindings requeridos (wrangler.toml): N8N_WEBHOOK_BASE (var), PROXY_SECRET (secret), RL_AUTH y RL_API (rate limiting).

const ORIGENES = ['https://marketing.intercon.com.mx'];
const RUTAS = {
  'POST /mkt/v1/auth/solicitar-codigo': 'auth',
  'POST /mkt/v1/auth/verificar-codigo': 'auth',
  'GET /mkt/v1/auth/sesion': 'api',
  'POST /mkt/v1/auth/cerrar-sesion': 'api',
  'POST /mkt/v1/solicitudes': 'api',
  'POST /mkt/v1/solicitudes/consultar': 'api',
  'POST /mkt/v1/solicitudes/actualizar': 'api',
  'POST /mkt/v1/archivos': 'archivos'
};
const MAX_BYTES = 60 * 1024;
// Archivos: cada parte es de 2.25 MiB (≈3 MiB en base64) + JSON. El límite de 15 MB por archivo lo aplica n8n.
const MAX_BYTES_ARCHIVOS = 3.5 * 1024 * 1024;

function cors(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Expose-Headers': 'Content-Disposition',
    'Access-Control-Max-Age': '600',
    'Vary': 'Origin'
  };
}
const json = (status, code, mensaje, origin, extra) => new Response(JSON.stringify({ ok: false, error: { code, mensaje } }), {
  status, headers: Object.assign({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }, origin ? cors(origin) : {}, extra || {})
});

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const permitido = ORIGENES.includes(origin);
    if (request.method === 'OPTIONS') return permitido ? new Response(null, { status: 204, headers: cors(origin) }) : new Response(null, { status: 403 });
    if (!permitido) return json(403, 'ORIGEN_NO_PERMITIDO', 'Origen no permitido.');
    const clase = RUTAS[request.method + ' ' + url.pathname];
    if (!clase) return json(404, 'RUTA_NO_ENCONTRADA', 'Ruta no disponible.', origin);
    const maximo = clase === 'archivos' ? MAX_BYTES_ARCHIVOS : MAX_BYTES;
    const largo = Number(request.headers.get('Content-Length') || 0);
    if (largo > maximo) return json(413, 'PAYLOAD_TOO_LARGE', 'La solicitud excede el tamaño permitido.', origin);

    // Limitación por IP + clase de ruta (auth más estricto: protege OTP contra fuerza bruta distribuida).
    const ip = request.headers.get('CF-Connecting-IP') || 'desconocida';
    const limitador = clase === 'auth' ? env.RL_AUTH : clase === 'archivos' ? (env.RL_ARCHIVOS || env.RL_API) : env.RL_API;
    const { success } = await limitador.limit({ key: clase + ':' + ip });
    if (!success) return json(429, 'DEMASIADAS_PETICIONES', 'Demasiadas solicitudes. Intenta de nuevo en un minuto.', origin, { 'Retry-After': '60' });

    const cuerpo = request.method === 'GET' ? undefined : await request.arrayBuffer();
    if (cuerpo && cuerpo.byteLength > maximo) return json(413, 'PAYLOAD_TOO_LARGE', 'La solicitud excede el tamaño permitido.', origin);
    const destino = env.N8N_WEBHOOK_BASE.replace(/\/$/, '') + url.pathname;
    const headers = new Headers({ 'Content-Type': 'application/json', 'X-MKT-Proxy': env.PROXY_SECRET, 'X-MKT-Client-IP': ip });
    const auth = request.headers.get('Authorization');
    if (auth && /^Bearer [A-Za-z0-9_-]{43}$/.test(auth)) headers.set('Authorization', auth);
    let res;
    try {
      res = await fetch(destino, { method: request.method, headers, body: cuerpo });
    } catch (e) {
      return json(502, 'BACKEND_UNAVAILABLE', 'No fue posible conectar con el servicio.', origin);
    }
    const out = new Headers(cors(origin));
    const tipo = res.headers.get('Content-Type') || 'application/json';
    // Respuesta binaria solo para la descarga autorizada de MKT_06; se reenvía como adjunto, nunca como enlace.
    if (clase === 'archivos' && !/application\/json/i.test(tipo)) {
      const disp = res.headers.get('Content-Disposition') || '';
      out.set('Content-Type', 'application/octet-stream');
      if (/^attachment;/i.test(disp)) out.set('Content-Disposition', disp);
      out.set('Content-Security-Policy', "default-src 'none'; sandbox");
    } else out.set('Content-Type', 'application/json');
    out.set('Cache-Control', 'no-store');
    out.set('X-Content-Type-Options', 'nosniff');
    return new Response(res.body, { status: res.status, headers: out });
  }
};
