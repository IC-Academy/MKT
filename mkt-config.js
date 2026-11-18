// Portal MKT · Configuración de integración con el backend (n8n).
// Por defecto DESACTIVADO: el portal funciona en modo demostración y no llama a ningún endpoint.
// Para pruebas de aceptación: definir apiBase con la URL del proxy protegido (nunca la URL directa de n8n)
// y enabled: true. No colocar aquí tokens, claves ni secretos: este archivo es público.
window.MKT_CONFIG = Object.freeze({
  enabled: false,
  // Ejemplo: 'https://api.marketing.intercon.com.mx' (proxy con limitación de peticiones → n8n /webhook)
  apiBase: '',
  timeoutMs: 20000
});
