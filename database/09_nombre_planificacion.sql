-- Migración 09: agrega un nombre descriptivo a cada planificación.
-- No crea tablas paralelas ni modifica relaciones existentes.
-- La unicidad de una planificación por período se conserva mediante la
-- restricción UNIQUE existente sobre planificaciones.id_periodo.
\set ON_ERROR_STOP on

BEGIN;

ALTER TABLE planificaciones
  ADD COLUMN IF NOT EXISTS nombre varchar(150);

UPDATE planificaciones pl
SET nombre = format(
  'Planificación %s - %s semestre',
  pa.anio,
  CASE pa.semestre
    WHEN 1 THEN 'Primer'
    WHEN 2 THEN 'Segundo'
  END
)
FROM periodos_academicos pa
WHERE pa.id_periodo = pl.id_periodo
  AND (pl.nombre IS NULL OR btrim(pl.nombre) = '');

ALTER TABLE planificaciones
  ALTER COLUMN nombre SET NOT NULL;

COMMENT ON COLUMN planificaciones.nombre IS
  'Nombre descriptivo de la planificación académica del período';

-- Consultas de verificación solicitadas.
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'planificaciones'
  AND column_name = 'nombre';

SELECT pl.id_planificacion, pl.nombre, pl.id_periodo,
       pa.anio, pa.semestre
FROM planificaciones pl
JOIN periodos_academicos pa USING (id_periodo)
ORDER BY pa.anio, pa.semestre;

SELECT conname, pg_get_constraintdef(oid) AS definicion
FROM pg_constraint
WHERE conrelid = 'public.planificaciones'::regclass
  AND conname LIKE '%id_periodo%';

COMMIT;
