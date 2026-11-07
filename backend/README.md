# Backend local

API Node.js + Express + PostgreSQL para el esquema aprobado en `database/`.

## Ejecución

1. Crear la base y aplicar `database/schema.sql` y `database/seed.sql`.
2. Copiar `.env.example` como `.env` y ajustar `DB_PASSWORD` si corresponde.
3. Ejecutar `npm install`.
4. Ejecutar `npm start`.

Las cuentas demo del seed usan `Demo123` únicamente en desarrollo local:

- `director@universidad.edu.gt`
- `coordinador@universidad.edu.gt`
- `docente@universidad.edu.gt`

Las contraseñas se validan contra `usuarios.password_hash` con bcrypt. El backend no guarda contraseñas en texto plano.

Las sesiones usan cookies HttpOnly. En producción debe configurarse un `SESSION_SECRET` fuerte y un almacén de sesiones persistente compatible con la política de infraestructura; el backend no crea tablas adicionales sobre el esquema aprobado.
