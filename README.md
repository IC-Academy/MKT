# Portal de Marketing · Inter-Con

Portal estático con acceso a los cuatro Microsoft Forms y demo interactiva de gestión del equipo.

## Contenido

- Solicitudes de comunicado, diseño y campaña de reclutamiento.
- Reporte de efectividad de campañas de Facebook Reclutamiento.
- Bandeja de solicitudes de ejemplo con responsables, estados y seguimiento.
- Calendario de entregas de ejemplo.

La gestión es una demo: no contiene autenticación, no recibe respuestas de Forms y no envía notificaciones. Los cambios se mantienen únicamente durante la visita.

## URL oficial

https://marketing.intercon.com.mx/

El archivo `CNAME` y el artefacto de GitHub Pages apuntan al dominio personalizado. La verificación de DNS, HTTPS y configuración de Pages se realiza en GitHub Settings → Pages.

## Publicación

GitHub Pages mediante el workflow `.github/workflows/pages.yml`. Si Pages aún no está habilitado, configurar Settings → Pages → Source: GitHub Actions y ejecutar el workflow.

## Desarrollo

Editar `index.html`, `style.css` y `app.js`. No requiere compilación ni dependencias.

## Diagnóstico de dominio personalizado

La raíz https://marketing.intercon.com.mx/ debe responder HTTP 200 y cargar la misma página que /index.html. Tras un cambio de dominio, GitHub Pages puede conservar respuestas 404 en nodos de su CDN; cada despliegue vuelve a publicar el artefacto, pero no garantiza purgar inmediatamente todas las cachés. Revisar cabeceras Age, X-Cache, X-GitHub-Edge-Region, y validar ambas rutas con GET.
