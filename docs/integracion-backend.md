# Integración con el backend (n8n + Airtable)

Estado: **preparada y desactivada**. Con `mkt-config.js` en `enabled: false` el portal funciona igual que la demostración.

## Archivos

| Archivo | Función |
|---|---|
| `mkt-config.js` | `enabled` y `apiBase` (URL del proxy). Sin secretos. |
| `mkt-api.js` | Cliente de los contratos v1 (OTP, sesión, crear, consultar, actualizar). Token en `sessionStorage`. |
| `mkt-backend.js` | Adaptador: OTP en la ventana de acceso aprobada, bandeja real, detalle con historial, asignación, estatus, comentarios y creación. |
| `infra/api-proxy/` | Cloudflare Worker: oculta n8n, limita peticiones, restringe origen, métodos y tamaño. |
| `tests/backend-adapter.cjs` | Prueba del adaptador con `fetch` simulado (se ejecuta en el workflow de Pages). |

## Endpoints (vía proxy `https://api.marketing.intercon.com.mx`)

| Método y ruta | Workflow n8n |
|---|---|
| `POST /mkt/v1/auth/solicitar-codigo` · `POST /mkt/v1/auth/verificar-codigo` | MKT_01_AuthOTP |
| `GET /mkt/v1/auth/sesion` · `POST /mkt/v1/auth/cerrar-sesion` | MKT_01B_Sesion |
| `POST /mkt/v1/solicitudes` | MKT_02_CrearSolicitud |
| `POST /mkt/v1/solicitudes/consultar` (`listar`, `detalle`, `historial`, `responsables`) | MKT_03_ConsultarSolicitudes |
| `POST /mkt/v1/solicitudes/actualizar` (`asignar`, `cambiarEstado`, `comentar`, `fechaCompromiso`, `entregable`) | MKT_04_ActualizarSolicitud |

Reglas: el navegador solo envía `Authorization: Bearer <token>`; nunca usuario, correo de sesión ni roles. Cada escritura lleva `claveIdempotencia` propia.

## Activación para pruebas de aceptación (no productiva)

1. Desplegar el proxy (`infra/api-proxy`) con `PROXY_SECRET` y límites.
2. Publicar los workflows MKT en n8n con `produccionHabilitada` según el checklist de liberación.
3. En una rama de aceptación, poner `enabled: true` y `apiBase` del proxy.
4. Ejecutar `tests/portal-smoke.cjs` y `tests/backend-adapter.cjs`.

No fusionar a `main` (publica GitHub Pages) hasta completar el checklist del documento técnico.

## Pendiente en el frontend

- Formularios sin tipo de backend (fotografía, cobertura, prototipado, brief de campaña) muestran «aún no conectado».
- Adjuntos/entregables: requieren la integración con SharePoint (subida mediante sesión de carga generada por el backend).
- Textos de éxito de los formularios: hoy dicen «guardada temporalmente»; el adaptador los sustituye por el folio real.
