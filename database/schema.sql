-- Punto de entrada para crear el esquema completo.
-- Ejecutar conectado a la base planificacion_cursos:
--   psql -U postgres -d planificacion_cursos -f database/schema.sql
\set ON_ERROR_STOP on
\ir 02_crear_tablas.sql
