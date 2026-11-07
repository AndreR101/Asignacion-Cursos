# Diccionario de datos

| Tabla | Propósito | Columnas principales |
| --- | --- | --- |
| `roles` | Catálogo de perfiles | `id_rol`, `nombre`, `descripcion` |
| `usuarios` | Cuentas institucionales | `id_usuario`, `id_rol`, `nombre_completo`, `correo`, `password_hash`, `activo` |
| `catedraticos` | Docentes que pueden impartir cursos | `id_catedratico`, `id_usuario`, `codigo`, `nombre_completo`, `correo`, `activo` |
| `ciclos` | Ciclos académicos | `id_ciclo`, `numero`, `nombre`, `activo` |
| `cursos` | Catálogo de cursos | `id_curso`, `codigo`, `nombre`, `descripcion`, `activo` |
| `pensum` | Relación curso-ciclo | `id_curso`, `id_ciclo`, `obligatorio` |
| `periodos_academicos` | Semestres planificables | `id_periodo`, `anio`, `semestre`, `fecha_inicio`, `fecha_fin`, `estado` |
| `secciones` | Grupos por período y ciclo | `id_seccion`, `id_periodo`, `id_ciclo`, `nombre`, `cupo_estimado`, `estado` |
| `salones` | Espacios físicos | `id_salon`, `codigo`, `descripcion`, `capacidad`, `estado` |
| `planificaciones` | Propuesta general del período | `id_planificacion`, `id_periodo`, `id_coordinador`, `estado`, fechas de proceso |
| `asignaciones` | Relación curso-docente-sección-salón | `id_asignacion`, `id_planificacion`, `id_periodo`, `id_curso`, `id_ciclo`, `id_catedratico`, `id_seccion`, `id_salon` |
| `bloques_horarios` | Días y horas de una asignación | `id_bloque`, `id_asignacion`, `dia_semana`, `hora_inicio`, `hora_fin`, `horario` |
| `revisiones_planificacion` | Historial básico de decisiones | `id_revision`, `id_planificacion`, `id_director`, `decision`, `motivo_rechazo`, `fecha_revision` |

## Restricciones relevantes

- `codigo` es único para cursos, catedráticos y salones.
- `(anio, semestre)` es único para períodos.
- `(id_periodo, id_ciclo, nombre)` es único para secciones.
- Solo existe una planificación por período.
- Una asignación solo puede referenciar un curso del pensum del ciclo de su sección.
- `hora_inicio` debe ser menor que `hora_fin`; los bloques del mismo día no se traslapan dentro de una asignación.
- Una revisión rechazada necesita un motivo de al menos cinco caracteres no vacíos; una aprobada no acepta motivo.
- Las relaciones históricas usan `ON DELETE RESTRICT` para evitar destruir planificaciones anteriores.
