// Portal MKT: configuración pública del frontend.
// La API es el gateway HTTPS MKT_00 de n8n. Sin tokens ni secretos en GitHub.
// Piloto habilitado únicamente para el usuario corporativo autorizado.
// MKT_02, MKT_04 y MKT_06 permanecen limitados por configuración del backend.
window.MKT_CONFIG = Object.freeze({
  enabled: true,
  apiBase: 'https://jmejiaromero.app.n8n.cloud/webhook/gw',
  timeoutMs: 20000,
  maxUploadBytes: 2359296
});
