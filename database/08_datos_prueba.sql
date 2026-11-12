-- Datos de prueba realistas para Planificación de Cursos.
-- No crea ni modifica tablas, columnas, relaciones ni vistas.
-- Ejecutar conectado a planificacion_cursos:
-- psql -U postgres -h localhost -p 5433 -d planificacion_cursos -f database/08_datos_prueba.sql
\set ON_ERROR_STOP on

BEGIN;

-- Roles y usuarios demo. crypt() almacena únicamente hashes bcrypt.
INSERT INTO roles (nombre, descripcion) VALUES
  ('DIRECTOR', 'Revisa y decide sobre las planificaciones'),
  ('COORDINADOR', 'Construye y envía la planificación académica'),
  ('CATEDRATICO', 'Consulta sus cursos y horarios')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO usuarios (id_rol, nombre_completo, correo, password_hash)
SELECT r.id_rol, v.nombre_completo, v.correo, crypt('Demo123', gen_salt('bf', 12))
FROM (VALUES
  ('DIRECTOR', 'Dr. Ricardo Valdés', 'director@universidad.edu.gt'),
  ('COORDINADOR', 'Lic. Elena Ramírez', 'coordinador@universidad.edu.gt'),
  ('CATEDRATICO', 'Ana Lucía Méndez', 'docente@universidad.edu.gt')
) AS v(nombre_rol, nombre_completo, correo)
JOIN roles r ON r.nombre = v.nombre_rol
ON CONFLICT (correo) DO NOTHING;

DO $$
DECLARE
  v_row record;
  v_id_ciclo integer;
  v_id_curso bigint;
  v_id_periodo bigint;
  v_id_planificacion bigint;
  v_id_seccion bigint;
  v_id_catedratico bigint;
  v_id_salon bigint;
  v_id_asignacion bigint;
  v_id_director bigint;
  v_id_coordinador bigint;
BEGIN
  -- Ciclos faltantes.
  FOR v_row IN
    SELECT * FROM (VALUES
      (1, 'Primer ciclo'), (2, 'Segundo ciclo'), (3, 'Tercer ciclo'),
      (4, 'Cuarto ciclo'), (5, 'Quinto ciclo')
    ) AS x(numero, nombre)
  LOOP
    INSERT INTO ciclos (numero, nombre)
    VALUES (v_row.numero, v_row.nombre)
    ON CONFLICT (numero) DO NOTHING;
  END LOOP;

  -- Cursos base existentes más cuatro cursos nuevos, distribuidos por ciclo.
  FOR v_row IN
    SELECT * FROM (VALUES
      ('MAT-201', 'Matemática II', 'Continuación de cálculo y álgebra', 2),
      ('PRO-303', 'Programación III', 'Aplicaciones y estructuras avanzadas', 3),
      ('BDD-302', 'Bases de Datos II', 'Diseño avanzado y administración de datos', 3),
      ('SEG-501', 'Seguridad Informática', 'Principios de seguridad de sistemas', 5)
    ) AS x(codigo, nombre, descripcion, numero_ciclo)
  LOOP
    INSERT INTO cursos (codigo, nombre, descripcion)
    VALUES (v_row.codigo, v_row.nombre, v_row.descripcion)
    ON CONFLICT (codigo) DO NOTHING;

    SELECT id_ciclo INTO v_id_ciclo FROM ciclos WHERE numero = v_row.numero_ciclo;
    SELECT id_curso INTO v_id_curso FROM cursos WHERE codigo = v_row.codigo;
    INSERT INTO pensum (id_curso, id_ciclo)
    VALUES (v_id_curso, v_id_ciclo)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Pensum de los cursos base, por si faltara alguna relación.
  FOR v_row IN
    SELECT * FROM (VALUES
      ('MAT-101', 1), ('PRO-101', 1), ('FIS-201', 2), ('PRO-202', 2),
      ('BDD-301', 3), ('EST-301', 3), ('RED-401', 4), ('ING-402', 4)
    ) AS x(codigo, numero_ciclo)
  LOOP
    SELECT id_ciclo INTO v_id_ciclo FROM ciclos WHERE numero = v_row.numero_ciclo;
    SELECT id_curso INTO v_id_curso FROM cursos WHERE codigo = v_row.codigo;
    INSERT INTO pensum (id_curso, id_ciclo)
    VALUES (v_id_curso, v_id_ciclo)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Cuatro períodos requeridos y uno adicional para representar cinco estados
  -- sin violar la regla de una planificación por período.
  INSERT INTO periodos_academicos (anio, semestre, fecha_inicio, fecha_fin, estado) VALUES
    (2027, 1, '2027-01-15', '2027-06-30', 'PLANIFICACION'),
    (2027, 2, '2027-07-15', '2027-12-15', 'PLANIFICACION'),
    (2028, 1, '2028-01-15', '2028-06-30', 'PLANIFICACION'),
    (2028, 2, '2028-07-15', '2028-12-15', 'PLANIFICACION'),
    (2026, 2, '2026-07-15', '2026-12-15', 'CERRADO')
  ON CONFLICT (anio, semestre) DO NOTHING;

  -- Dos salones adicionales para disponer de al menos seis espacios.
  INSERT INTO salones (codigo, descripcion, capacidad) VALUES
    ('B-105', 'Edificio B, aula 105', 25),
    ('AUD-01', 'Auditorio académico principal', 120)
  ON CONFLICT (codigo) DO NOTHING;

  -- Catedráticos adicionales. Los cuatro existentes se conservan.
  INSERT INTO catedraticos (codigo, nombre_completo, correo, telefono) VALUES
    ('CAT-005', 'Sofía Alejandra Morales', 'smorales@universidad.edu.gt', '5551-1205'),
    ('CAT-006', 'Luis Alberto Gómez', 'lgomez@universidad.edu.gt', '5551-1206'),
    ('CAT-007', 'Paola Andrea Herrera', 'pherrera@universidad.edu.gt', '5551-1207'),
    ('CAT-008', 'Diego Estuardo Pérez', 'dperez@universidad.edu.gt', '5551-1208')
  ON CONFLICT (codigo) DO NOTHING;

  -- Relación requerida entre el usuario demo docente y CAT-001.
  UPDATE catedraticos c
  SET id_usuario = u.id_usuario
  FROM usuarios u
  WHERE c.codigo = 'CAT-001'
    AND u.correo = 'docente@universidad.edu.gt';

  -- Secciones A, B y C para cada período de prueba y ciclo 1..5.
  FOR v_row IN
    SELECT p.id_periodo, c.id_ciclo, letras.nombre
    FROM periodos_academicos p
    CROSS JOIN ciclos c
    CROSS JOIN (VALUES ('A'), ('B'), ('C')) AS letras(nombre)
    WHERE (p.anio, p.semestre) IN ((2027, 1), (2027, 2), (2028, 1), (2028, 2), (2026, 2))
      AND c.numero BETWEEN 1 AND 5
  LOOP
    INSERT INTO secciones (id_periodo, id_ciclo, nombre, cupo_estimado)
    VALUES (v_row.id_periodo, v_row.id_ciclo, v_row.nombre,
            CASE WHEN v_row.nombre = 'C' THEN 25 ELSE 35 END)
    ON CONFLICT (id_periodo, id_ciclo, nombre) DO NOTHING;
  END LOOP;

  SELECT id_usuario INTO v_id_director FROM usuarios WHERE correo = 'director@universidad.edu.gt';
  SELECT id_usuario INTO v_id_coordinador FROM usuarios WHERE correo = 'coordinador@universidad.edu.gt';

  -- Un estado por período. 2026/2 es el período adicional documentado para
  -- representar PUBLICADA sin crear dos planificaciones para el mismo período.
  FOR v_row IN
    SELECT * FROM (VALUES
      (2027, 1, 'BORRADOR'),
      (2027, 2, 'PENDIENTE_APROBACION'),
      (2028, 1, 'RECHAZADA'),
      (2028, 2, 'APROBADA'),
      (2026, 2, 'PUBLICADA')
    ) AS x(anio, semestre, estado)
  LOOP
    SELECT id_periodo INTO v_id_periodo
    FROM periodos_academicos WHERE anio = v_row.anio AND semestre = v_row.semestre;

    INSERT INTO planificaciones (id_periodo, id_coordinador, estado, fecha_envio, fecha_publicacion)
    SELECT v_id_periodo, v_id_coordinador, v_row.estado,
           CASE WHEN v_row.estado IN ('PENDIENTE_APROBACION', 'APROBADA', 'RECHAZADA', 'PUBLICADA')
                THEN now() ELSE NULL END,
           CASE WHEN v_row.estado = 'PUBLICADA' THEN now() ELSE NULL END
    WHERE NOT EXISTS (
      SELECT 1 FROM planificaciones WHERE id_periodo = v_id_periodo
    );
  END LOOP;

  -- Decisiones históricas para la planificación rechazada, aprobada y publicada.
  INSERT INTO revisiones_planificacion (id_planificacion, id_director, decision, motivo_rechazo)
  SELECT p.id_planificacion, v_id_director, 'RECHAZADA',
         'Revisar la distribución de salones y equilibrar la carga docente.'
  FROM planificaciones p JOIN periodos_academicos pa USING (id_periodo)
  WHERE pa.anio = 2028 AND pa.semestre = 1
    AND NOT EXISTS (
      SELECT 1 FROM revisiones_planificacion r
      WHERE r.id_planificacion = p.id_planificacion AND r.decision = 'RECHAZADA'
    );

  INSERT INTO revisiones_planificacion (id_planificacion, id_director, decision)
  SELECT p.id_planificacion, v_id_director, 'APROBADA'
  FROM planificaciones p JOIN periodos_academicos pa USING (id_periodo)
  WHERE (pa.anio, pa.semestre) IN ((2028, 2), (2026, 2))
    AND NOT EXISTS (
      SELECT 1 FROM revisiones_planificacion r
      WHERE r.id_planificacion = p.id_planificacion AND r.decision = 'APROBADA'
    );

  -- Asignaciones y bloques de prueba. Cada fila usa búsquedas por código y
  -- contexto para no asumir valores de identity.
  FOR v_row IN
    SELECT * FROM (VALUES
      -- BORRADOR: cuatro cursos distintos, CAT-001, lunes consecutivo.
      (2027, 1, 'MAT-101', 1, 'CAT-001', 'A', 'A-101', 1, '07:00'::time, '08:00'::time),
      (2027, 1, 'FIS-201', 2, 'CAT-001', 'A', 'A-202', 1, '08:00'::time, '09:00'::time),
      (2027, 1, 'BDD-301', 3, 'CAT-001', 'A', 'LAB-01', 1, '09:00'::time, '10:00'::time),
      (2027, 1, 'RED-401', 4, 'CAT-001', 'A', 'LAB-02', 1, '10:00'::time, '11:00'::time),
      -- PENDIENTE_APROBACION: días y docentes diferentes.
      (2027, 2, 'PRO-202', 2, 'CAT-002', 'B', 'A-101', 2, '08:00'::time, '09:30'::time),
      (2027, 2, 'EST-301', 3, 'CAT-003', 'A', 'A-202', 3, '10:00'::time, '11:30'::time),
      -- APROBADA: información para reportes.
      (2028, 2, 'PRO-303', 3, 'CAT-005', 'B', 'LAB-01', 2, '13:00'::time, '14:30'::time),
      (2028, 2, 'SEG-501', 5, 'CAT-006', 'A', 'AUD-01', 4, '15:00'::time, '16:30'::time),
      -- PUBLICADA: planificación completa para reportes.
      (2026, 2, 'MAT-101', 1, 'CAT-002', 'A', 'A-101', 1, '07:00'::time, '08:30'::time),
      (2026, 2, 'PRO-101', 1, 'CAT-003', 'B', 'A-202', 2, '08:30'::time, '10:00'::time),
      (2026, 2, 'BDD-302', 3, 'CAT-005', 'A', 'LAB-01', 3, '10:00'::time, '11:30'::time),
      (2026, 2, 'ING-402', 4, 'CAT-006', 'C', 'LAB-02', 4, '13:00'::time, '14:30'::time),
      (2026, 2, 'SEG-501', 5, 'CAT-007', 'A', 'AUD-01', 5, '15:00'::time, '16:30'::time)
    ) AS x(anio, semestre, curso_codigo, numero_ciclo, cat_codigo, seccion_nombre,
           salon_codigo, dia_semana, hora_inicio, hora_fin)
  LOOP
    SELECT p.id_periodo, c.id_ciclo, cu.id_curso, cat.id_catedratico, s.id_seccion, sa.id_salon
    INTO v_id_periodo, v_id_ciclo, v_id_curso, v_id_catedratico, v_id_seccion, v_id_salon
    FROM periodos_academicos p
    JOIN ciclos c ON c.numero = v_row.numero_ciclo
    JOIN cursos cu ON cu.codigo = v_row.curso_codigo
    JOIN catedraticos cat ON cat.codigo = v_row.cat_codigo
    JOIN secciones s ON s.id_periodo = p.id_periodo
                     AND s.id_ciclo = c.id_ciclo
                     AND s.nombre = v_row.seccion_nombre
    JOIN salones sa ON sa.codigo = v_row.salon_codigo
    WHERE p.anio = v_row.anio AND p.semestre = v_row.semestre;

    SELECT id_planificacion INTO v_id_planificacion
    FROM planificaciones WHERE id_periodo = v_id_periodo;

    INSERT INTO asignaciones
      (id_planificacion, id_periodo, id_curso, id_ciclo, id_catedratico, id_seccion, id_salon)
    VALUES
      (v_id_planificacion, v_id_periodo, v_id_curso, v_id_ciclo,
       v_id_catedratico, v_id_seccion, v_id_salon)
    ON CONFLICT (id_planificacion, id_curso, id_seccion, id_catedratico) DO NOTHING
    RETURNING id_asignacion INTO v_id_asignacion;

    IF v_id_asignacion IS NULL THEN
      SELECT id_asignacion INTO v_id_asignacion
      FROM asignaciones
      WHERE id_planificacion = v_id_planificacion
        AND id_curso = v_id_curso
        AND id_seccion = v_id_seccion
        AND id_catedratico = v_id_catedratico;
    END IF;

    INSERT INTO bloques_horarios (id_asignacion, dia_semana, hora_inicio, hora_fin)
    VALUES (v_id_asignacion, v_row.dia_semana, v_row.hora_inicio, v_row.hora_fin)
    ON CONFLICT (id_asignacion, dia_semana, hora_inicio, hora_fin) DO NOTHING;
  END LOOP;
END $$;

-- Consultas de verificación solicitadas.
SELECT u.correo, r.nombre AS rol, u.activo
FROM usuarios u JOIN roles r USING (id_rol)
WHERE u.correo IN ('director@universidad.edu.gt', 'coordinador@universidad.edu.gt', 'docente@universidad.edu.gt')
ORDER BY r.nombre;

SELECT c.codigo, c.nombre_completo, c.id_usuario, u.correo
FROM catedraticos c LEFT JOIN usuarios u ON u.id_usuario = c.id_usuario
ORDER BY c.codigo;

SELECT c.codigo, c.nombre, ci.numero AS ciclo
FROM cursos c JOIN pensum p USING (id_curso) JOIN ciclos ci USING (id_ciclo)
ORDER BY ci.numero, c.codigo;

SELECT id_periodo, anio, semestre, estado FROM periodos_academicos ORDER BY anio, semestre;
SELECT id_seccion, id_periodo, id_ciclo, nombre, cupo_estimado FROM secciones ORDER BY id_periodo, id_ciclo, nombre;
SELECT id_salon, codigo, capacidad, estado FROM salones ORDER BY codigo;
SELECT pl.id_planificacion, pa.anio, pa.semestre, pl.estado
FROM planificaciones pl JOIN periodos_academicos pa USING (id_periodo)
ORDER BY pa.anio, pa.semestre;

SELECT id_asignacion, id_planificacion, id_periodo, id_curso, id_ciclo,
       id_catedratico, id_seccion, id_salon
FROM asignaciones ORDER BY id_asignacion;

SELECT * FROM bloques_horarios ORDER BY id_asignacion, dia_semana, hora_inicio;
SELECT * FROM v_horarios ORDER BY anio, semestre, dia_semana, hora_inicio;
SELECT * FROM v_cursos_asignados ORDER BY anio, semestre, curso_codigo;
SELECT * FROM v_planificaciones_pendientes ORDER BY anio, semestre;
SELECT * FROM v_planificaciones_publicadas ORDER BY anio, semestre;

-- Evidencia de las validaciones que debe completar el backend.
SELECT a.id_periodo, a.id_catedratico, b.dia_semana,
       count(DISTINCT a.id_curso) AS cursos_distintos,
       min(b.hora_inicio) AS primera_hora, max(b.hora_fin) AS ultima_hora
FROM asignaciones a
JOIN bloques_horarios b USING (id_asignacion)
WHERE a.id_periodo = (SELECT id_periodo FROM periodos_academicos WHERE anio = 2027 AND semestre = 1)
  AND a.id_catedratico = (SELECT id_catedratico FROM catedraticos WHERE codigo = 'CAT-001')
GROUP BY a.id_periodo, a.id_catedratico, b.dia_semana;

-- Debe devolver cero: no hay traslapes docentes en los datos de prueba.
SELECT a1.id_asignacion AS asignacion_1, a2.id_asignacion AS asignacion_2
FROM asignaciones a1
JOIN bloques_horarios b1 USING (id_asignacion)
JOIN asignaciones a2 ON a2.id_asignacion > a1.id_asignacion
                    AND a2.id_periodo = a1.id_periodo
                    AND a2.id_catedratico = a1.id_catedratico
JOIN bloques_horarios b2 USING (id_asignacion)
WHERE b1.dia_semana = b2.dia_semana
  AND b1.hora_inicio < b2.hora_fin
  AND b1.hora_fin > b2.hora_inicio;

-- Debe devolver cero: no hay traslapes de salón en los datos de prueba.
SELECT a1.id_asignacion AS asignacion_1, a2.id_asignacion AS asignacion_2
FROM asignaciones a1
JOIN bloques_horarios b1 USING (id_asignacion)
JOIN asignaciones a2 ON a2.id_asignacion > a1.id_asignacion
                    AND a2.id_periodo = a1.id_periodo
                    AND a2.id_salon = a1.id_salon
JOIN bloques_horarios b2 USING (id_asignacion)
WHERE b1.dia_semana = b2.dia_semana
  AND b1.hora_inicio < b2.hora_fin
  AND b1.hora_fin > b2.hora_inicio;

SELECT r.id_revision, pa.anio, pa.semestre, r.decision, r.motivo_rechazo
FROM revisiones_planificacion r
JOIN planificaciones p USING (id_planificacion)
JOIN periodos_academicos pa USING (id_periodo)
ORDER BY r.fecha_revision;

COMMIT;
