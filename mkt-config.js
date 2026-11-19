// Portal MKT · Configuración pública del frontend.
// Integración real preparada: NO utilizar webhooks de n8n directamente ni publicar secretos aquí.
// Los endpoints fallan cerrados hasta que TI despliegue el proxy y Claude habilite n8n.
// Carga limitada temporalmente a una parte: Power Automate aún falla al confirmar archivos grandes.
window.MKT_CONFIG = Object.freeze({
  enabled: true,
  apiBase: 'https://api.marketing.intercon.com.mx',
  timeoutMs: 20000,
  maxUploadBytes: 2359296
});
