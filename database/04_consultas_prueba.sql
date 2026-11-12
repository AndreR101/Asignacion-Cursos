-- Consultas parametrizables para pg. Sustituir los valores $1, $2, etc.

-- Usuarios por rol
SELECT u.id_usuario, u.nombre_completo, u.correo, r.nombre AS rol, u.activo
FROM usuarios u JOIN roles r USING (id_rol)
WHERE r.nombre = $1 AND u.activo = true
ORDER BY u.nombre_completo;

-- Cursos de un ciclo
SELECT c.id_curso, c.codigo, c.nombre, c.descripcion
FROM cursos c JOIN pensum p USING (id_curso) JOIN ciclos ci USING (id_ciclo)
WHERE ci.numero = $1 AND c.activo = true ORDER BY c.codigo;

-- Catedráticos activos y búsqueda opcional
SELECT id_catedratico, codigo, nombre_completo, correo, telefono
FROM catedraticos
WHERE activo = true AND (NULLIF($1, '') IS NULL OR nombre_completo ILIKE '%' || $1 || '%' OR codigo ILIKE '%' || $1 || '%')
ORDER BY nombre_completo;

-- Asignaciones de un período
SELECT pa.anio, pa.semestre, ci.numero AS ciclo, s.nombre AS seccion,
       c.codigo AS curso, c.nombre AS curso_nombre, cat.nombre_completo AS catedratico,
       sa.codigo AS salon, b.dia_semana, b.hora_inicio, b.hora_fin
FROM asignaciones a
JOIN periodos_academicos pa USING (id_periodo)
JOIN ciclos ci USING (id_ciclo)
JOIN secciones s USING (id_seccion)
JOIN cursos c USING (id_curso)
JOIN catedraticos cat USING (id_catedratico)
JOIN salones sa USING (id_salon)
JOIN bloques_horarios b USING (id_asignacion)
WHERE a.id_periodo = $1 ORDER BY ci.numero, s.nombre, b.dia_semana, b.hora_inicio;

-- Horarios por sección / catedrático
SELECT * FROM (
  SELECT a.id_periodo, a.id_seccion, a.id_catedratico, s.nombre AS seccion,
         c.codigo, c.nombre AS curso, b.dia_semana, b.hora_inicio, b.hora_fin, sa.codigo AS salon
  FROM asignaciones a JOIN secciones s USING (id_seccion) JOIN cursos c USING (id_curso)
  JOIN bloques_horarios b USING (id_asignacion) JOIN salones sa USING (id_salon)
) horarios
WHERE id_seccion = $1 OR id_catedratico = $2
ORDER BY dia_semana, hora_inicio;

-- Planificaciones pendientes / aprobadas / publicadas
SELECT pl.id_planificacion, pa.anio, pa.semestre, pl.estado,
       pl.fecha_creacion, pl.fecha_envio, pl.fecha_publicacion
FROM planificaciones pl JOIN periodos_academicos pa USING (id_periodo)
WHERE pl.estado = $1 ORDER BY pa.anio DESC, pa.semestre DESC;

-- Rechazos y motivos
SELECT r.id_revision, pl.id_planificacion, pa.anio, pa.semestre,
       u.nombre_completo AS director, r.motivo_rechazo, r.fecha_revision
FROM revisiones_planificacion r
JOIN planificaciones pl USING (id_planificacion)
JOIN periodos_academicos pa USING (id_periodo)
JOIN usuarios u ON u.id_usuario = r.id_director
WHERE r.decision = 'RECHAZADA' ORDER BY r.fecha_revision DESC;

-- Detección de traslape para validar una nueva asignación dentro de una transacción.
SELECT 1
FROM asignaciones a
JOIN bloques_horarios b USING (id_asignacion)
WHERE a.id_periodo = $1 AND a.id_catedratico = $2 AND b.dia_semana = $3
  AND b.hora_inicio < $5::time AND b.hora_fin > $4::time
LIMIT 1;

-- Carga docente: máximo cuatro cursos distintos por catedrático y día.
SELECT a.id_periodo, a.id_catedratico, cat.nombre_completo, b.dia_semana,
       count(DISTINCT a.id_curso) AS cursos_distintos
FROM asignaciones a
JOIN catedraticos cat USING (id_catedratico)
JOIN bloques_horarios b USING (id_asignacion)
WHERE a.id_periodo = $1
GROUP BY a.id_periodo, a.id_catedratico, cat.nombre_completo, b.dia_semana
ORDER BY cursos_distintos DESC;
