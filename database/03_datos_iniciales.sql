-- Datos de referencia y demostración. Las contraseñas nunca se almacenan en texto plano.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO roles (nombre, descripcion) VALUES
  ('DIRECTOR', 'Revisa y decide sobre las planificaciones'),
  ('COORDINADOR', 'Construye y envía la planificación académica'),
  ('CATEDRATICO', 'Consulta sus cursos y horarios')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO ciclos (numero, nombre) VALUES
  (1, 'Primer ciclo'), (2, 'Segundo ciclo'), (3, 'Tercer ciclo'),
  (4, 'Cuarto ciclo'), (5, 'Quinto ciclo')
ON CONFLICT (numero) DO NOTHING;

INSERT INTO periodos_academicos (anio, semestre, fecha_inicio, fecha_fin, estado)
VALUES (2027, 1, '2027-01-15', '2027-06-30', 'PLANIFICACION')
ON CONFLICT (anio, semestre) DO NOTHING;

INSERT INTO salones (codigo, descripcion, capacidad) VALUES
  ('A-101', 'Edificio A, aula 101', 35),
  ('A-202', 'Edificio A, aula 202', 40),
  ('LAB-01', 'Laboratorio de informática 1', 28),
  ('LAB-02', 'Laboratorio de informática 2', 28)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO cursos (codigo, nombre, descripcion) VALUES
  ('MAT-101', 'Matemática I', 'Fundamentos de cálculo y álgebra'),
  ('PRO-101', 'Introducción a la Programación', 'Algoritmos y programación estructurada'),
  ('FIS-201', 'Física I', 'Mecánica y mediciones'),
  ('PRO-202', 'Programación II', 'Programación orientada a objetos'),
  ('BDD-301', 'Bases de Datos I', 'Modelado relacional y SQL'),
  ('EST-301', 'Estadística', 'Estadística descriptiva e inferencial'),
  ('RED-401', 'Redes de Computadoras', 'Fundamentos de redes'),
  ('ING-402', 'Ingeniería de Software', 'Procesos y calidad de software')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO catedraticos (codigo, nombre_completo, correo, telefono) VALUES
  ('CAT-001', 'Ana Lucía Méndez', 'amendez@universidad.edu.gt', '5551-1201'),
  ('CAT-002', 'Carlos Roberto López', 'clopez@universidad.edu.gt', '5551-1202'),
  ('CAT-003', 'María Fernanda Ruiz', 'mruiz@universidad.edu.gt', '5551-1203'),
  ('CAT-004', 'Jorge Estuardo Castillo', 'jcastillo@universidad.edu.gt', '5551-1204')
ON CONFLICT (codigo) DO NOTHING;

-- Usuarios demo. pgcrypto genera y almacena únicamente hashes bcrypt.
-- Contraseña inicial de las tres cuentas: Demo123 (debe cambiarse en un entorno real).
INSERT INTO usuarios (id_rol, nombre_completo, correo, password_hash)
SELECT r.id_rol, v.nombre_completo, v.correo, crypt('Demo123', gen_salt('bf', 12))
FROM (VALUES
  ('DIRECTOR', 'Dr. Ricardo Valdés', 'director@universidad.edu.gt'),
  ('COORDINADOR', 'Lic. Elena Ramírez', 'coordinador@universidad.edu.gt'),
  ('CATEDRATICO', 'Ana Lucía Méndez', 'docente@universidad.edu.gt')
) AS v(nombre_rol, nombre_completo, correo)
JOIN roles r ON r.nombre = v.nombre_rol
ON CONFLICT (correo) DO NOTHING;

UPDATE catedraticos c
SET id_usuario = u.id_usuario
FROM usuarios u
WHERE c.codigo = 'CAT-001' AND u.correo = 'docente@universidad.edu.gt';

INSERT INTO pensum (id_curso, id_ciclo)
SELECT c.id_curso, ci.id_ciclo
FROM (VALUES
  ('MAT-101', 1), ('PRO-101', 1), ('FIS-201', 2), ('PRO-202', 2),
  ('BDD-301', 3), ('EST-301', 3), ('RED-401', 4), ('ING-402', 4)
) AS v(codigo, numero_ciclo)
JOIN cursos c ON c.codigo = v.codigo
JOIN ciclos ci ON ci.numero = v.numero_ciclo
ON CONFLICT DO NOTHING;

INSERT INTO secciones (id_periodo, id_ciclo, nombre, cupo_estimado)
SELECT p.id_periodo, c.id_ciclo, v.nombre, v.cupo
FROM (VALUES (1, 'A', 35), (2, 'A', 35), (3, 'A', 30), (4, 'A', 30)) AS v(numero_ciclo, nombre, cupo)
JOIN periodos_academicos p ON p.anio = 2027 AND p.semestre = 1
JOIN ciclos c ON c.numero = v.numero_ciclo
ON CONFLICT (id_periodo, id_ciclo, nombre) DO NOTHING;
