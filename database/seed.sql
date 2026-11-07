-- Punto de entrada para cargar catálogos y datos demo.
-- Ejecutar conectado a la base planificacion_cursos:
--   psql -U postgres -d planificacion_cursos -f database/seed.sql
\set ON_ERROR_STOP on
\ir 03_datos_iniciales.sql
