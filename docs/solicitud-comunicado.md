# Solicitud de comunicado — inventario del formulario original

Revisado en Microsoft Forms el 5 de octubre de 2026. No se envió ninguna respuesta durante la revisión.

## Preguntas y opciones

| Nº | Pregunta original | Tipo | Obligatoria |
|---|---|---|---|
| 1 | Selecciona tu CIA | Selección única: Inter-Con Mexico S.A de C.V, Embajada, IC Admin | Sí |
| 2 | Selecciona tu área o tu hiperónimo | Catálogo de 25 áreas | Sí |
| 3 | Título del comunicado | Texto de una línea | No |
| 4 | Objetivo de la actividad | Texto de varias líneas | Sí |
| 5 | Fecha requerida para la difusión del comunicado | Fecha | Sí |
| 6 | ¿A quién va dirigido? | Selección múltiple: Inter-Con Mexico S.A de C.V, Inter-Con Foráneos, Embajada, IC Admin, Otra respuesta con texto | Sí |
| 7 | En qué idioma va a ser tu comunicado | Selección única: Ingles, Español, Nom 35 | Sí |
| 8 | Información del comunicado | Texto de varias líneas | Sí |
| 9 | Liga/URL | Texto de varias líneas; admite enlaces | No |
| 10 | Nombre, correo electrónico y número telefónico del contacto para aclaraciones o dudas | Texto de varias líneas | Sí |

Áreas: Atención a personal; ABM; Bienestar; Brigadas; Capacitación Operativa; Calidad; Compras; Control Gubernamental; Desarrollo de negocios; Finanzas; IT; Juridico; Logística; MKT; NOM-035; Nóminas e IMSS; Operaciones; Reclutamiento; Tesorería; Ventas; Seguridad e Higiene; Relaciones Laborales; Salud; RHH; Dirección general.

## Regla e incertidumbres

- El aviso original indica un máximo de dos comunicados por día; si se supera, se debe cambiar la fecha.
- No se observaron nuevas preguntas al seleccionar IC Admin y Nom 35. No se consultó la configuración del propietario: esto no demuestra la ausencia de todas las posibles ramificaciones.
- Nom 35 figura como opción de idioma: confirmar su significado antes de modificar el catálogo.
- El Forms identifica automáticamente al solicitante por su cuenta Microsoft. La captura demo del portal no tiene autenticación; el contacto de aclaraciones no sustituye la identidad del solicitante.
- Confirmar con Marketing si el límite de dos aplica globalmente, por compañía o por público, y qué estados deben reservar cupo.

## Adaptación dentro del portal

- Tres pasos: origen, comunicado, contacto y revisión.
- Se conservan las opciones, las preguntas y la obligatoriedad original; título y enlaces permanecen opcionales.
- La pregunta 10 se divide en nombre, correo y teléfono obligatorios, para mejorar validación y lectura.
- Otro público muestra un campo de texto requerido.
- Guardado solo en memoria durante la visita: se añade la solicitud y el detalle completo a la bandeja demo.
- El control de dos emisiones se simula con los registros demo no rechazados. No representa disponibilidad real.

## Propuesta de datos para SharePoint (pendiente de crear y conectar)

Lista Solicitudes: Folio, Tipo, SolicitanteIdentidad, Compañía, Área, Título, Objetivo, FechaDifusión, Destinatarios, OtroPúblico, IdiomaOpciónOriginal, Información, Enlaces, ContactoNombre, ContactoCorreo, ContactoTeléfono, Responsable, Estado, MotivoRechazo, Comentarios, EvidenciaURL, CreadaEn, ActualizadaEn.

La identidad y los permisos deben validarse en el servicio que recibe solicitudes. El límite por fecha necesita validación concurrente en el servidor: no debe depender del navegador.
