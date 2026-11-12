-- Migración 12: información de laboratorio de los cursos.
-- No elimina ni modifica columnas existentes y no crea tablas paralelas.
-- Ejecutar conectado a planificacion_cursos:
-- psql -U postgres -h localhost -p 5433 -d planificacion_cursos -f database/12_laboratorios_cursos.sql
\set ON_ERROR_STOP on

BEGIN;

ALTER TABLE cursos
  ADD COLUMN IF NOT EXISTS tiene_laboratorio boolean NOT NULL DEFAULT false;

ALTER TABLE cursos
  ADD COLUMN IF NOT EXISTS costo_laboratorio numeric(10, 2);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.cursos'::regclass
      AND conname = 'cursos_costo_laboratorio_no_negativo'
  ) THEN
    ALTER TABLE cursos
      ADD CONSTRAINT cursos_costo_laboratorio_no_negativo
      CHECK (costo_laboratorio IS NULL OR costo_laboratorio >= 0);
  END IF;
END $$;

COMMENT ON COLUMN cursos.tiene_laboratorio IS
  'Indica si el curso requiere sesiones o recursos de laboratorio';

COMMENT ON COLUMN cursos.costo_laboratorio IS
  'Costo de laboratorio del curso, cuando corresponda';

-- Consultas de verificación solicitadas.
SELECT column_name, data_type, numeric_precision, numeric_scale,
       is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'cursos'
  AND column_name IN ('tiene_laboratorio', 'costo_laboratorio')
ORDER BY ordinal_position;

SELECT conname, pg_get_constraintdef(oid) AS definicion
FROM pg_constraint
WHERE conrelid = 'public.cursos'::regclass
  AND conname = 'cursos_costo_laboratorio_no_negativo';

SELECT codigo, nombre, tiene_laboratorio, costo_laboratorio
FROM cursos
ORDER BY codigo;

COMMIT;
