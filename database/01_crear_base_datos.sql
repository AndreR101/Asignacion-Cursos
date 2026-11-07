-- Ejecutar con psql conectado a una base administrativa (postgres).
-- Este script no elimina ni modifica una base existente.
SELECT 'CREATE DATABASE planificacion_cursos'
WHERE NOT EXISTS (
  SELECT FROM pg_database WHERE datname = 'planificacion_cursos'
)\gexec

\connect planificacion_cursos

-- La extensión es usada por las restricciones de traslape de horarios.
CREATE EXTENSION IF NOT EXISTS btree_gist;
