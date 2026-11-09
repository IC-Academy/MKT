/* Portal MKT: migración SQL de usuarios, roles y reclutadores.
   Ejecutar en Microsoft Fabric SQL Database MKT_DB, no en SQL Analytics.
   Archivo instalable: MKT_DB_06_Usuarios_Roles_Reclutadores.sql, entregado en conversación.

   MKT_Usuarios y MKT_Reclutadores ya existen desde el esquema inicial.
   Esta migración incorpora MKT_Roles, MKT_UsuarioRoles,
   vw_MKT_AccesoUsuarios y usp_MKT_ObtenerAcceso.
   La API comprobará el token corporativo Entra ID y resolverá aquí los roles.
   No se permite que el frontend determine sus privilegios.
*/