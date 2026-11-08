-- Verificación de solo lectura. Ejecutar conectado a planificacion_cursos.
\pset null '(NULL)'
\echo '=== CONEXION ==='
SELECT current_database(), current_user, inet_server_addr(), inet_server_port();

\echo '=== CONTEO DE REGISTROS ==='
SELECT 'roles' AS tabla, count(*) FROM roles
UNION ALL SELECT 'usuarios', count(*) FROM usuarios
UNION ALL SELECT 'catedraticos', count(*) FROM catedraticos
UNION ALL SELECT 'ciclos', count(*) FROM ciclos
UNION ALL SELECT 'cursos', count(*) FROM cursos
UNION ALL SELECT 'pensum', count(*) FROM pensum
UNION ALL SELECT 'periodos_academicos', count(*) FROM periodos_academicos
UNION ALL SELECT 'secciones', count(*) FROM secciones
UNION ALL SELECT 'salones', count(*) FROM salones
UNION ALL SELECT 'planificaciones', count(*) FROM planificaciones
UNION ALL SELECT 'asignaciones', count(*) FROM asignaciones
UNION ALL SELECT 'bloques_horarios', count(*) FROM bloques_horarios
UNION ALL SELECT 'revisiones_planificacion', count(*) FROM revisiones_planificacion
ORDER BY tabla;

\echo '=== VISTAS ==='
SELECT schemaname, viewname
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN ('v_horarios', 'v_cursos_asignados',
                   'v_planificaciones_pendientes', 'v_planificaciones_publicadas')
ORDER BY viewname;

\echo '=== ROLES Y USUARIOS DEMO ==='
SELECT u.correo, r.nombre AS rol, u.activo,
       (u.password_hash LIKE '$2%') AS parece_bcrypt,
       (crypt('Demo123', u.password_hash) = u.password_hash) AS valida_demo123
FROM usuarios u
JOIN roles r USING (id_rol)
ORDER BY r.nombre;

\echo '=== RELACION CATEDRATICO-USUARIO ==='
SELECT c.id_catedratico, c.codigo, c.nombre_completo,
       c.id_usuario, u.correo
FROM catedraticos c
LEFT JOIN usuarios u ON u.id_usuario = c.id_usuario
ORDER BY c.id_catedratico;

\echo '=== IDS REALES DE REFERENCIA ==='
SELECT 'id_periodo' AS tipo, id_periodo::text AS id, anio::text || '-' || semestre::text AS descripcion
FROM periodos_academicos
UNION ALL
SELECT 'id_ciclo', id_ciclo::text, numero::text || ' - ' || nombre FROM ciclos
UNION ALL
SELECT 'id_seccion', id_seccion::text, nombre FROM secciones
UNION ALL
SELECT 'id_salon', id_salon::text, codigo FROM salones
UNION ALL
SELECT 'id_curso', id_curso::text, codigo || ' - ' || nombre FROM cursos
UNION ALL
SELECT 'id_catedratico', id_catedratico::text, codigo || ' - ' || nombre_completo FROM catedraticos
ORDER BY tipo, id;

\echo '=== INCONSISTENCIAS ESPERADAS: ESTAS REGLAS DEBEN DEVOLVER CERO ==='
SELECT 'pensum_con_curso_inexistente' AS regla, count(*) AS errores
FROM pensum p LEFT JOIN cursos c USING (id_curso) LEFT JOIN ciclos ci USING (id_ciclo)
WHERE c.id_curso IS NULL OR ci.id_ciclo IS NULL
UNION ALL
SELECT 'secciones_con_periodo_o_ciclo_inexistente', count(*)
FROM secciones s LEFT JOIN periodos_academicos p USING (id_periodo) LEFT JOIN ciclos c USING (id_ciclo)
WHERE p.id_periodo IS NULL OR c.id_ciclo IS NULL
UNION ALL
SELECT 'planificaciones_con_periodo_inexistente', count(*)
FROM planificaciones pl LEFT JOIN periodos_academicos p USING (id_periodo)
WHERE p.id_periodo IS NULL
UNION ALL
SELECT 'asignaciones_incompatibles_con_seccion', count(*)
FROM asignaciones a
LEFT JOIN secciones s ON s.id_seccion = a.id_seccion
 AND s.id_periodo = a.id_periodo AND s.id_ciclo = a.id_ciclo
WHERE s.id_seccion IS NULL
;

\echo '=== VISTAS CONSULTABLES: DEBE DEVOLVER CUATRO ==='
SELECT count(*) AS vistas_consultables
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN ('v_horarios', 'v_cursos_asignados',
                   'v_planificaciones_pendientes', 'v_planificaciones_publicadas');

\echo '=== MUESTRAS DE VISTAS ==='
SELECT * FROM v_horarios LIMIT 10;
SELECT * FROM v_cursos_asignados LIMIT 10;
SELECT * FROM v_planificaciones_pendientes LIMIT 10;
SELECT * FROM v_planificaciones_publicadas LIMIT 10;
