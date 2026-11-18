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

## Preparación del frontend operativo (revisión de aceptación)

- Rama de trabajo: `feature/mkt-frontend-real-qa` (derivada de `feature/integracion-backend`). No se despliega sobre `main`.
- Cuando `MKT_CONFIG.enabled === true` y `apiBase` apunta al proxy protegido, el acceso usa OTP y la sesión devuelta por MKT_01/MKT_01B; nunca permite seleccionar perfiles simulados.
- En modo conectado, los formularios no pueden guardar solicitudes en el array demo como alternativa silenciosa a un fallo de validación.
- El panel **Equipo y asignaciones / Usuarios** no crea ni edita usuarios en el navegador. Los registros reales ya existen en `MKT_Usuarios` y `MKT_UsuarioRoles`; la edición web se habilitará solo tras exponer una API administrativa protegida por RBAC. Hasta entonces muestra un aviso informativo sin tarjetas ficticias.
- Las pruebas `tests/backend-adapter.cjs` incluyen comprobaciones de eliminación de perfiles `@example.com` y desactivación de altas locales en modo conectado.

**Para habilitar el portal operativo:** se requiere desplegar el proxy con limitación de peticiones y protección de la ruta directa de n8n, configurar `MKT_AUTH_SECRET_V2`, activar los workflows bajo un entorno de aceptación y disponer de usuarios reales con roles activos. No cambiar simplemente `enabled: true` en `main`: sin el proxy y los workflows listos no habría autenticación utilizable.
