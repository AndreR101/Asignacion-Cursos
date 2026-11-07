-- Ejecutar con psql conectado a planificacion_cursos.
-- Las pruebas usan una transacción y no dejan datos permanentes.
BEGIN;

-- Estas relaciones base deben existir.
SELECT count(*) AS roles_esperados FROM roles HAVING count(*) >= 3;
SELECT count(*) AS cursos_esperados FROM cursos HAVING count(*) >= 8;

-- Fechas inválidas: debe fallar el savepoint, pero la prueba continúa.
SAVEPOINT fecha_invalida;
INSERT INTO periodos_academicos (anio, semestre, fecha_inicio, fecha_fin)
VALUES (2099, 1, '2099-06-30', '2099-01-01');
ROLLBACK TO fecha_invalida;

-- Rechazo sin motivo significativo: debe fallar.
SAVEPOINT rechazo_sin_motivo;
INSERT INTO revisiones_planificacion (id_planificacion, id_director, decision, motivo_rechazo)
SELECT p.id_planificacion, u.id_usuario, 'RECHAZADA', '  '
FROM planificaciones p CROSS JOIN usuarios u
WHERE false;
ROLLBACK TO rechazo_sin_motivo;

-- Consulta de conflictos de horario (RN-02), permitiendo bloques consecutivos.
SELECT a.id_periodo, a.id_catedratico, b.dia_semana,
       b.hora_inicio, b.hora_fin,
       count(*) OVER (PARTITION BY a.id_periodo, a.id_catedratico, b.dia_semana) AS bloques
FROM asignaciones a JOIN bloques_horarios b USING (id_asignacion)
WHERE b.hora_inicio < b.hora_fin;

-- Verificación de duplicados en catálogos y secciones.
SELECT codigo, count(*) FROM cursos GROUP BY codigo HAVING count(*) > 1;
SELECT codigo, count(*) FROM catedraticos GROUP BY codigo HAVING count(*) > 1;
SELECT id_periodo, id_ciclo, nombre, count(*) FROM secciones
GROUP BY id_periodo, id_ciclo, nombre HAVING count(*) > 1;

ROLLBACK;
