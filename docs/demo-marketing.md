# Experiencia demo de Marketing

La demo contiene solicitudes ficticias y perfiles de Nydia, Veronica, Jessica, Roxana y Abigail. Los correos visibles de ejemplo usan example.com. No existe autenticación real, persistencia, envío de notificaciones ni integración con SharePoint o Forms.

## Recorrido

1. Entrar en «Ingresar · demo» y elegir Nydia.
2. Abrir un diseño y asignarlo a Jessica conservando su especialidad de Reclutamiento digital.
3. Cambiar al perfil de Jessica desde el botón de perfil.
4. El diseño aparece en su bandeja y en «Otras actividades asignadas». «Mi especialidad» muestra sus campañas y reportes asignados.
5. Cambiar estado, agregar una nota y consultar el historial.
6. Desde Nydia, abrir Administración para agregar o editar personas, su rol y su estado activo.

Desactivar personas con pendientes exige reasignar primero. El administrador no puede retirar su propio perfil administrativo. Los perfiles inactivos no aparecen en el acceso demo.

«Restablecer demo» devuelve solicitudes y perfiles a los ejemplos iniciales. Recargar también elimina todos los cambios y la selección de perfil. Los borradores de formularios se conservan al navegar durante la visita.

## Validación realizada

Sintaxis JavaScript e identificadores HTML sin duplicados. Recorrido de reasignación Nydia → Jessica, separación de especialidad y actividades delegadas, seguimiento e historial, alta y desactivación de una persona ficticia. Conservación de ayudas de orientación y N/A únicamente para diseño digital; impresión exige medidas.

Los filtros de esta demo simulan permisos para mostrar la experiencia. En producción estos permisos deberán verificarse en la API junto con Microsoft Entra.
