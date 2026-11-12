import express from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import "dotenv/config";
import { query, pool, withTransaction } from "./db.js";

const app = express();
const port = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === "production";

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  }
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(session({
  name: "planificacion.sid",
  secret: process.env.SESSION_SECRET || "local-development-secret",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: isProduction, maxAge: 8 * 60 * 60 * 1000 },
}));

const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const id = (value, name) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw httpError(400, `${name} inválido`);
  return parsed;
};
const httpError = (status, message) => Object.assign(new Error(message), { status });
const bodyRequired = (body, fields) => {
  for (const field of fields) if (body[field] === undefined || body[field] === null || body[field] === "") throw httpError(400, `Falta el campo ${field}`);
};
const booleanField = (value, name) => {
  if (value === true || value === false) return value;
  if (value === "true" || value === "1" || value === 1) return true;
  if (value === "false" || value === "0" || value === 0) return false;
  throw httpError(400, `${name} debe ser booleano`);
};
const courseFields = (body) => {
  const tieneLaboratorio = booleanField(body.tiene_laboratorio ?? false, "tiene_laboratorio");
  const rawCost = body.costo_laboratorio;
  const costoLaboratorio = rawCost === undefined || rawCost === null || rawCost === "" ? null : Number(rawCost);
  if (costoLaboratorio !== null && (!Number.isFinite(costoLaboratorio) || costoLaboratorio < 0)) {
    throw httpError(400, "costo_laboratorio debe ser un número mayor o igual a cero");
  }
  return { tieneLaboratorio, costoLaboratorio };
};
const WORKDAY_START = "07:00";
const WORKDAY_END = "18:00";
const CLASS_BLOCKS = new Set(["07:00-09:00", "09:00-11:00", "11:00-13:00", "14:00-16:00", "16:00-18:00"]);
const VALID_SECTION_NAMES = new Set(["A", "B", "C", "D", "E", "F", "G"]);
const sectionName = (value) => {
  const normalized = String(value || "").trim().toUpperCase();
  if (!VALID_SECTION_NAMES.has(normalized)) throw httpError(400, "La sección debe ser una letra de A a G");
  return normalized;
};
const validateWorkdayBlock = (block) => {
  const start = String(block?.hora_inicio || "").slice(0, 5);
  const end = String(block?.hora_fin || "").slice(0, 5);
  const day = Number(block?.dia_semana);
  if (day !== 6) throw httpError(400, "Las asignaciones de este sistema deben programarse únicamente para sábado");
  if (!Number.isInteger(day) || day < 1 || day > 7) throw httpError(400, "El día de la semana no es válido");
  if (!CLASS_BLOCKS.has(`${start}-${end}`)) {
    throw httpError(400, "El horario debe utilizar un bloque institucional: 07:00-09:00, 09:00-11:00, 11:00-13:00, 14:00-16:00 o 16:00-18:00");
  }
};
const currentUser = (req) => req.session.user;
async function notifyUser(client, userId, tipo, titulo, mensaje, planId = null) {
  if (!userId) return;
  await client.query(`INSERT INTO notificaciones (id_usuario, tipo, titulo, mensaje, id_planificacion)
    VALUES ($1, $2, $3, $4, $5)`, [userId, tipo, titulo, mensaje, planId]);
}

async function provisionTeacherUsers() {
  const passwordHash = await bcrypt.hash("Demo123", 10);
  const result = await withTransaction(async (client) => {
    const role = await client.query("SELECT id_rol FROM roles WHERE nombre = 'CATEDRATICO'");
    if (!role.rowCount) throw new Error("No existe el rol CATEDRATICO");
    const teachers = await client.query("SELECT id_catedratico, codigo, nombre_completo, correo FROM catedraticos WHERE id_usuario IS NULL FOR UPDATE");
    let linked = 0;
    for (const teacher of teachers.rows) {
      const baseEmail = String(teacher.correo || `${teacher.codigo.toLowerCase()}@universidad.edu.gt`).trim().toLowerCase();
      let email = baseEmail;
      let existing = await client.query("SELECT u.id_usuario, r.nombre AS rol FROM usuarios u JOIN roles r USING (id_rol) WHERE lower(u.correo) = lower($1)", [email]);
      if (existing.rowCount && existing.rows[0].rol !== "CATEDRATICO") {
        email = `${teacher.codigo.toLowerCase()}@universidad.edu.gt`;
        existing = await client.query("SELECT u.id_usuario, r.nombre AS rol FROM usuarios u JOIN roles r USING (id_rol) WHERE lower(u.correo) = lower($1)", [email]);
      }
      let userId = existing.rows[0]?.id_usuario;
      if (!userId) {
        const inserted = await client.query(`INSERT INTO usuarios (id_rol, nombre_completo, correo, password_hash)
          VALUES ($1, $2, $3, $4) RETURNING id_usuario`, [role.rows[0].id_rol, teacher.nombre_completo, email, passwordHash]);
        userId = inserted.rows[0].id_usuario;
      }
      await client.query("UPDATE catedraticos SET id_usuario = $1 WHERE id_catedratico = $2", [userId, teacher.id_catedratico]);
      linked += 1;
    }
    return linked;
  });
  if (result) console.log(`${result} usuario(s) de catedrático vinculado(s)`);
}

function requireAuth(req, res, next) {
  if (!currentUser(req)) return res.status(401).json({ error: "Autenticación requerida" });
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!currentUser(req)) return res.status(401).json({ error: "Autenticación requerida" });
    if (!roles.includes(currentUser(req).rol)) return res.status(403).json({ error: "Permisos insuficientes" });
    next();
  };
}

function sendError(res, error) {
  if (error.code === "23505") return res.status(409).json({ error: "El registro ya existe" });
  if (error.code === "23503") return res.status(409).json({ error: "El registro está relacionado con otros datos" });
  if (error.code === "23514") return res.status(400).json({ error: "El registro viola una regla de integridad" });
  return res.status(error.status || 500).json({ error: error.status ? error.message : "Error interno del servidor" });
}

async function databaseHealth(_req, res) {
  await query("SELECT 1");
  res.json({ database: process.env.DB_NAME || "planificacion_cursos", connected: true });
}

app.get("/api/health", asyncRoute(databaseHealth));
app.get("/api/health/db", asyncRoute(databaseHealth));
app.get("/api/periodo-actual", asyncRoute(async (_req, res) => {
  const result = await query(`SELECT anio, semestre
    FROM periodos_academicos
    WHERE fecha_inicio <= CURRENT_DATE
    ORDER BY fecha_inicio DESC
    LIMIT 1`);
  if (!result.rowCount) return res.json({ anio: 2026, semestre: 2 });
  res.json(result.rows[0]);
}));

app.post("/api/auth/login", asyncRoute(async (req, res) => {
  bodyRequired(req.body, ["correo", "password"]);
  const result = await query(`
    SELECT u.id_usuario, u.nombre_completo, u.correo, u.password_hash, u.activo,
           r.nombre AS rol
    FROM usuarios u JOIN roles r USING (id_rol)
    WHERE lower(u.correo) = lower($1)
  `, [req.body.correo]);
  const user = result.rows[0];
  if (!user || !user.activo || !(await bcrypt.compare(String(req.body.password), user.password_hash))) {
    return res.status(401).json({ error: "Credenciales inválidas" });
  }
  req.session.user = { id_usuario: user.id_usuario, nombre_completo: user.nombre_completo, correo: user.correo, rol: user.rol };
  res.json({ user: req.session.user });
}));

const createRecoveryRequest = asyncRoute(async (req, res) => {
  bodyRequired(req.body, ["correo"]);
  const correo = String(req.body.correo).trim().toLowerCase();
  const user = await query("SELECT id_usuario FROM usuarios WHERE lower(correo) = $1 AND activo = true", [correo]);
  await query(`INSERT INTO solicitudes_recuperacion (id_usuario, correo, mensaje)
    VALUES ($1, $2, $3)`, [user.rows[0]?.id_usuario || null, correo, String(req.body.mensaje || "Solicitud de cambio de contraseña").trim()]);
  res.status(201).json({ received: true, message: "Solicitud enviada al coordinador" });
});
app.post("/api/auth/forgot-password", createRecoveryRequest);
app.post("/api/recuperacion", createRecoveryRequest);

app.post("/api/auth/logout", (req, res) => req.session.destroy((error) => {
  if (error) return res.status(500).json({ error: "No se pudo cerrar la sesión" });
  res.clearCookie("planificacion.sid");
  res.status(204).end();
}));

app.get("/api/auth/me", requireAuth, (req, res) => res.json({ user: currentUser(req) }));

app.get("/api/usuarios", requireRole("DIRECTOR", "COORDINADOR"), asyncRoute(async (req, res) => {
  const params = [req.query.rol || ""];
  const result = await query(`
    SELECT u.id_usuario, u.nombre_completo, u.correo, u.activo, u.fecha_creacion, r.id_rol, r.nombre AS rol
    FROM usuarios u JOIN roles r USING (id_rol)
    WHERE (NULLIF($1, '') IS NULL OR r.nombre = $1)
    ORDER BY u.nombre_completo
  `, params);
  res.json(result.rows);
}));

app.patch("/api/usuarios/:id/estado", requireRole("DIRECTOR", "COORDINADOR"), asyncRoute(async (req, res) => {
  bodyRequired(req.body, ["activo"]);
  const result = await query("UPDATE usuarios SET activo = $1 WHERE id_usuario = $2 RETURNING id_usuario, nombre_completo, correo, activo", [Boolean(req.body.activo), id(req.params.id, "id_usuario")]);
  if (!result.rowCount) throw httpError(404, "Usuario no encontrado");
  res.json(result.rows[0]);
}));
app.patch("/api/usuarios/:id/password", requireRole("DIRECTOR", "COORDINADOR"), asyncRoute(async (req, res) => {
  bodyRequired(req.body, ["password"]);
  if (String(req.body.password).length < 8) throw httpError(400, "La contraseña debe tener al menos ocho caracteres");
  const passwordHash = await bcrypt.hash(String(req.body.password), 10);
  const result = await query("UPDATE usuarios SET password_hash = $1 WHERE id_usuario = $2 RETURNING id_usuario, correo", [passwordHash, id(req.params.id, "id_usuario")]);
  if (!result.rowCount) throw httpError(404, "Usuario no encontrado");
  res.json({ id_usuario: result.rows[0].id_usuario, correo: result.rows[0].correo, updated: true });
}));
app.get("/api/solicitudes-recuperacion", requireRole("DIRECTOR", "COORDINADOR"), asyncRoute(async (_req, res) => {
  const result = await query(`SELECT s.id_solicitud, s.id_usuario, s.correo, s.mensaje, s.estado,
      s.fecha_solicitud, s.fecha_atencion, s.id_coordinador, u.nombre_completo
    FROM solicitudes_recuperacion s LEFT JOIN usuarios u ON u.id_usuario = s.id_usuario
    ORDER BY CASE WHEN s.estado = 'PENDIENTE' THEN 0 ELSE 1 END, s.fecha_solicitud DESC`);
  res.json(result.rows);
}));
app.patch("/api/solicitudes-recuperacion/:id/atender", requireRole("DIRECTOR", "COORDINADOR"), asyncRoute(async (req, res) => {
  const result = await query(`UPDATE solicitudes_recuperacion
    SET estado = 'ATENDIDA', fecha_atencion = now(), id_coordinador = $1
    WHERE id_solicitud = $2 AND estado = 'PENDIENTE'
    RETURNING id_solicitud, estado, fecha_atencion`, [currentUser(req).id_usuario, id(req.params.id, "id_solicitud")]);
  if (!result.rowCount) throw httpError(404, "Solicitud no encontrada o ya atendida");
  res.json(result.rows[0]);
}));
app.get("/api/recuperacion", requireRole("DIRECTOR", "COORDINADOR"), asyncRoute(async (req, res) => {
  const result = await query(`SELECT s.*, u.nombre_completo
    FROM solicitudes_recuperacion s LEFT JOIN usuarios u ON u.id_usuario = s.id_usuario
    WHERE ($1 = '' OR s.estado = $1)
    ORDER BY s.fecha_solicitud DESC`, [req.query.estado || ""]);
  res.json(result.rows);
}));
app.patch("/api/recuperacion/:id/atender", requireRole("DIRECTOR", "COORDINADOR"), asyncRoute(async (req, res) => {
  const result = await query(`UPDATE solicitudes_recuperacion SET estado = 'ATENDIDA', fecha_atencion = now(), id_coordinador = $1
    WHERE id_solicitud = $2 AND estado = 'PENDIENTE' RETURNING *`, [currentUser(req).id_usuario, id(req.params.id, "id_solicitud")]);
  if (!result.rowCount) throw httpError(404, "Solicitud no encontrada o ya atendida");
  res.json(result.rows[0]);
}));
app.patch("/api/recuperacion/:id/cancelar", requireRole("DIRECTOR", "COORDINADOR"), asyncRoute(async (req, res) => {
  const result = await query("UPDATE solicitudes_recuperacion SET estado = 'CANCELADA', fecha_atencion = now(), id_coordinador = $1 WHERE id_solicitud = $2 AND estado = 'PENDIENTE' RETURNING *", [currentUser(req).id_usuario, id(req.params.id, "id_solicitud")]);
  if (!result.rowCount) throw httpError(404, "Solicitud no encontrada o ya atendida");
  res.json(result.rows[0]);
}));

app.get("/api/notificaciones", requireAuth, asyncRoute(async (req, res) => {
  const result = await query(`SELECT id_notificacion, id_usuario, tipo, titulo, mensaje, id_planificacion,
      leida, fecha_creacion, fecha_lectura
    FROM notificaciones
    WHERE id_usuario = $1 AND ($2 = '' OR leida = ($2 = 'true'))
    ORDER BY fecha_creacion DESC`, [currentUser(req).id_usuario, req.query.leida || ""]);
  let rows = result.rows;
  if (["COORDINADOR", "DIRECTOR"].includes(currentUser(req).rol) && (!req.query.leida || req.query.leida === "false")) {
    const recovery = await query(`SELECT -id_solicitud AS id_notificacion, $1::bigint AS id_usuario,
        'RECUPERACION_CONTRASENA' AS tipo, 'Solicitud de contraseña olvidada' AS titulo,
        'El usuario ' || correo || ' solicita asistencia para recuperar su acceso.' AS mensaje,
        NULL::bigint AS id_planificacion, false AS leida, fecha_solicitud AS fecha_creacion,
        NULL::timestamptz AS fecha_lectura
      FROM solicitudes_recuperacion
      WHERE estado = 'PENDIENTE'`, [currentUser(req).id_usuario]);
    rows = [...rows, ...recovery.rows].sort((a, b) => new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime());
  }
  res.json(rows);
}));
app.patch("/api/notificaciones/:id/leida", requireAuth, asyncRoute(async (req, res) => {
  const notificationId = Number(req.params.id);
  if (notificationId < 0) {
    const recovery = await query(`UPDATE solicitudes_recuperacion SET estado = 'ATENDIDA', fecha_atencion = now(), id_coordinador = $1
      WHERE id_solicitud = $2 AND estado = 'PENDIENTE' RETURNING id_solicitud`, [currentUser(req).id_usuario, Math.abs(notificationId)]);
    if (!recovery.rowCount) throw httpError(404, "Notificación no encontrada");
    return res.json({ id_notificacion: notificationId, leida: true });
  }
  const result = await query(`UPDATE notificaciones SET leida = true, fecha_lectura = now()
    WHERE id_notificacion = $1 AND id_usuario = $2 RETURNING *`, [id(notificationId, "id_notificacion"), currentUser(req).id_usuario]);
  if (!result.rowCount) throw httpError(404, "Notificación no encontrada");
  res.json(result.rows[0]);
}));
app.patch("/api/notificaciones/marcar-todas-leidas", requireAuth, asyncRoute(async (req, res) => {
  await query("UPDATE notificaciones SET leida = true, fecha_lectura = now() WHERE id_usuario = $1 AND leida = false", [currentUser(req).id_usuario]);
  if (["COORDINADOR", "DIRECTOR"].includes(currentUser(req).rol)) await query("UPDATE solicitudes_recuperacion SET estado = 'ATENDIDA', fecha_atencion = now(), id_coordinador = $1 WHERE estado = 'PENDIENTE'", [currentUser(req).id_usuario]);
  res.json({ updated: true });
}));

app.get("/api/catedraticos", requireAuth, asyncRoute(async (req, res) => {
  const ownOnly = currentUser(req).rol === "CATEDRATICO";
  const result = await query(`
    SELECT id_catedratico, id_usuario, codigo, nombre_completo, correo, telefono, activo
    FROM catedraticos
    WHERE ($2 = false AND (NULLIF($1, '') IS NULL OR nombre_completo ILIKE '%' || $1 || '%' OR codigo ILIKE '%' || $1 || '%'))
       OR ($2 = true AND id_usuario = $3)
    ORDER BY nombre_completo
  `, [req.query.buscar || "", ownOnly, currentUser(req).id_usuario]);
  res.json(result.rows);
}));

app.post("/api/catedraticos", requireRole("COORDINADOR"), asyncRoute(async (req, res) => {
  bodyRequired(req.body, ["codigo", "nombre_completo"]);
  const result = await query(`INSERT INTO catedraticos (codigo, nombre_completo, correo, telefono)
    VALUES ($1, $2, $3, $4)
    RETURNING id_catedratico, id_usuario, codigo, nombre_completo, correo, telefono, activo`, [req.body.codigo, req.body.nombre_completo, req.body.correo || null, req.body.telefono || null]);
  await provisionTeacherUsers();
  const linked = await query(`SELECT id_catedratico, id_usuario, codigo, nombre_completo, correo, telefono, activo
    FROM catedraticos WHERE id_catedratico = $1`, [result.rows[0].id_catedratico]);
  res.status(201).json(linked.rows[0]);
}));

app.get("/api/catedraticos/:id", requireAuth, asyncRoute(async (req, res) => {
  const result = await query(`SELECT id_catedratico, id_usuario, codigo, nombre_completo, correo, telefono, activo
    FROM catedraticos WHERE id_catedratico = $1
    AND ($2 = false OR id_usuario = $3)`, [id(req.params.id, "id_catedratico"), currentUser(req).rol === "CATEDRATICO", currentUser(req).id_usuario]);
  if (!result.rowCount) throw httpError(404, "Catedrático no encontrado");
  res.json(result.rows[0]);
}));

app.put("/api/catedraticos/:id", requireRole("COORDINADOR"), asyncRoute(async (req, res) => {
  bodyRequired(req.body, ["codigo", "nombre_completo"]);
  const result = await query(`UPDATE catedraticos SET codigo = $1, nombre_completo = $2, correo = $3, telefono = $4
    WHERE id_catedratico = $5
    RETURNING id_catedratico, id_usuario, codigo, nombre_completo, correo, telefono, activo`, [req.body.codigo, req.body.nombre_completo, req.body.correo || null, req.body.telefono || null, id(req.params.id, "id_catedratico")]);
  if (!result.rowCount) throw httpError(404, "Catedrático no encontrado");
  res.json(result.rows[0]);
}));

app.patch("/api/catedraticos/:id/estado", requireRole("COORDINADOR"), asyncRoute(async (req, res) => {
  bodyRequired(req.body, ["activo"]);
  const result = await query("UPDATE catedraticos SET activo = $1 WHERE id_catedratico = $2 RETURNING id_catedratico, codigo, nombre_completo, activo", [Boolean(req.body.activo), id(req.params.id, "id_catedratico")]);
  if (!result.rowCount) throw httpError(404, "Catedrático no encontrado");
  res.json(result.rows[0]);
}));

app.get("/api/cursos", requireAuth, asyncRoute(async (req, res) => {
  const result = await query(`SELECT c.id_curso, c.codigo, c.nombre, c.descripcion, c.tiene_laboratorio, c.costo_laboratorio, c.activo,
      COALESCE(json_agg(json_build_object('id_ciclo', ci.id_ciclo, 'numero', ci.numero, 'nombre', ci.nombre)) FILTER (WHERE ci.id_ciclo IS NOT NULL), '[]') AS ciclos
    FROM cursos c LEFT JOIN pensum p USING (id_curso) LEFT JOIN ciclos ci USING (id_ciclo)
    WHERE (NULLIF($1, '') IS NULL OR c.nombre ILIKE '%' || $1 || '%' OR c.codigo ILIKE '%' || $1 || '%')
    GROUP BY c.id_curso ORDER BY c.codigo`, [req.query.buscar || ""]);
  res.json(result.rows);
}));

app.get("/api/cursos/ciclo/:id", requireAuth, asyncRoute(async (req, res) => {
  const result = await query(`SELECT c.id_curso, c.codigo, c.nombre, c.descripcion, c.tiene_laboratorio, c.costo_laboratorio, c.activo
    FROM cursos c JOIN pensum p USING (id_curso) WHERE p.id_ciclo = $1 AND c.activo = true ORDER BY c.codigo`, [id(req.params.id, "id_ciclo")]);
  res.json(result.rows);
}));

app.get("/api/pensum", requireAuth, asyncRoute(async (req, res) => {
  const result = await query(`SELECT p.id_curso, p.id_ciclo, p.obligatorio,
      c.codigo AS curso_codigo, c.nombre AS curso_nombre,
      ci.numero AS ciclo_numero, ci.nombre AS ciclo_nombre
    FROM pensum p JOIN cursos c USING (id_curso) JOIN ciclos ci USING (id_ciclo)
    WHERE ($1::integer IS NULL OR p.id_ciclo = $1)
    ORDER BY ci.numero, c.codigo`, [req.query.id_ciclo ? id(req.query.id_ciclo, "id_ciclo") : null]);
  res.json(result.rows);
}));

app.post("/api/cursos", requireRole("COORDINADOR"), asyncRoute(async (req, res) => {
  bodyRequired(req.body, ["codigo", "nombre"]);
  const { tieneLaboratorio, costoLaboratorio } = courseFields(req.body);
  const result = await withTransaction(async (client) => {
    const inserted = await client.query("INSERT INTO cursos (codigo, nombre, descripcion, tiene_laboratorio, costo_laboratorio) VALUES ($1, $2, $3, $4, $5) RETURNING id_curso, codigo, nombre, descripcion, tiene_laboratorio, costo_laboratorio, activo", [req.body.codigo, req.body.nombre, req.body.descripcion || null, tieneLaboratorio, costoLaboratorio]);
    if (req.body.id_ciclo) await client.query("INSERT INTO pensum (id_curso, id_ciclo) VALUES ($1, $2)", [inserted.rows[0].id_curso, id(req.body.id_ciclo, "id_ciclo")]);
    return inserted;
  });
  res.status(201).json(result.rows[0]);
}));

app.get("/api/cursos/:id", requireAuth, asyncRoute(async (req, res) => {
  const result = await query(`SELECT c.id_curso, c.codigo, c.nombre, c.descripcion, c.tiene_laboratorio, c.costo_laboratorio, c.activo,
      COALESCE(json_agg(p.id_ciclo) FILTER (WHERE p.id_ciclo IS NOT NULL), '[]') AS id_ciclos
    FROM cursos c LEFT JOIN pensum p USING (id_curso) WHERE c.id_curso = $1 GROUP BY c.id_curso`, [id(req.params.id, "id_curso")]);
  if (!result.rowCount) throw httpError(404, "Curso no encontrado");
  res.json(result.rows[0]);
}));

app.put("/api/cursos/:id", requireRole("COORDINADOR"), asyncRoute(async (req, res) => {
  bodyRequired(req.body, ["codigo", "nombre"]);
  const { tieneLaboratorio, costoLaboratorio } = courseFields(req.body);
  const result = await query("UPDATE cursos SET codigo = $1, nombre = $2, descripcion = $3, tiene_laboratorio = $4, costo_laboratorio = $5 WHERE id_curso = $6 RETURNING id_curso, codigo, nombre, descripcion, tiene_laboratorio, costo_laboratorio, activo", [req.body.codigo, req.body.nombre, req.body.descripcion || null, tieneLaboratorio, costoLaboratorio, id(req.params.id, "id_curso")]);
  if (!result.rowCount) throw httpError(404, "Curso no encontrado");
  res.json(result.rows[0]);
}));

app.patch("/api/cursos/:id/estado", requireRole("COORDINADOR"), asyncRoute(async (req, res) => {
  bodyRequired(req.body, ["activo"]);
  const result = await query("UPDATE cursos SET activo = $1 WHERE id_curso = $2 RETURNING id_curso, codigo, nombre, activo", [Boolean(req.body.activo), id(req.params.id, "id_curso")]);
  if (!result.rowCount) throw httpError(404, "Curso no encontrado");
  res.json(result.rows[0]);
}));

app.get("/api/roles", requireAuth, asyncRoute(async (_req, res) => res.json((await query("SELECT id_rol, nombre, descripcion FROM roles ORDER BY nombre")).rows)));
app.get("/api/ciclos", requireAuth, asyncRoute(async (_req, res) => res.json((await query("SELECT id_ciclo, numero, nombre, activo FROM ciclos ORDER BY numero")).rows)));
app.get("/api/periodos", requireAuth, asyncRoute(async (_req, res) => res.json((await query("SELECT id_periodo, anio, semestre, fecha_inicio, fecha_fin, estado FROM periodos_academicos WHERE fecha_inicio <= CURRENT_DATE ORDER BY fecha_inicio DESC")).rows)));
app.post("/api/periodos", requireRole("COORDINADOR"), asyncRoute(async (req, res) => {
  bodyRequired(req.body, ["anio", "semestre", "fecha_inicio", "fecha_fin"]);
  const result = await query(`INSERT INTO periodos_academicos (anio, semestre, fecha_inicio, fecha_fin, estado)
    VALUES ($1, $2, $3, $4, COALESCE($5, 'PLANIFICACION'))
    RETURNING id_periodo, anio, semestre, fecha_inicio, fecha_fin, estado`, [Number(req.body.anio), Number(req.body.semestre), req.body.fecha_inicio, req.body.fecha_fin, req.body.estado || null]);
  res.status(201).json(result.rows[0]);
}));
app.put("/api/periodos/:id", requireRole("COORDINADOR"), asyncRoute(async (req, res) => {
  bodyRequired(req.body, ["anio", "semestre", "fecha_inicio", "fecha_fin", "estado"]);
  const result = await query(`UPDATE periodos_academicos SET anio = $1, semestre = $2, fecha_inicio = $3, fecha_fin = $4, estado = $5
    WHERE id_periodo = $6 RETURNING id_periodo, anio, semestre, fecha_inicio, fecha_fin, estado`, [Number(req.body.anio), Number(req.body.semestre), req.body.fecha_inicio, req.body.fecha_fin, req.body.estado, id(req.params.id, "id_periodo")]);
  if (!result.rowCount) throw httpError(404, "Período no encontrado");
  res.json(result.rows[0]);
}));
app.get("/api/secciones", requireAuth, asyncRoute(async (req, res) => {
  const result = await query(`SELECT s.id_seccion, s.id_periodo, s.id_ciclo, s.nombre, s.cupo_estimado, s.estado,
      p.anio, p.semestre, c.numero AS ciclo_numero, c.nombre AS ciclo_nombre
    FROM secciones s JOIN periodos_academicos p USING (id_periodo) JOIN ciclos c USING (id_ciclo)
    WHERE ($1::bigint IS NULL OR s.id_periodo = $1) AND ($2::integer IS NULL OR s.id_ciclo = $2)
    ORDER BY p.anio DESC, p.semestre DESC, c.numero, s.nombre`, [req.query.id_periodo ? id(req.query.id_periodo, "id_periodo") : null, req.query.id_ciclo ? id(req.query.id_ciclo, "id_ciclo") : null]);
  res.json(result.rows);
}));
app.post("/api/secciones", requireRole("COORDINADOR"), asyncRoute(async (req, res) => {
  bodyRequired(req.body, ["id_periodo", "id_ciclo", "nombre", "cupo_estimado"]);
  const nombre = sectionName(req.body.nombre);
  const result = await query(`INSERT INTO secciones (id_periodo, id_ciclo, nombre, cupo_estimado)
    VALUES ($1, $2, $3, $4) RETURNING id_seccion, id_periodo, id_ciclo, nombre, cupo_estimado, estado`, [id(req.body.id_periodo, "id_periodo"), id(req.body.id_ciclo, "id_ciclo"), nombre, Number(req.body.cupo_estimado)]);
  res.status(201).json(result.rows[0]);
}));
app.put("/api/secciones/:id", requireRole("COORDINADOR"), asyncRoute(async (req, res) => {
  bodyRequired(req.body, ["id_periodo", "id_ciclo", "nombre", "cupo_estimado", "estado"]);
  const nombre = sectionName(req.body.nombre);
  const result = await query(`UPDATE secciones SET id_periodo = $1, id_ciclo = $2, nombre = $3, cupo_estimado = $4, estado = $5
    WHERE id_seccion = $6 RETURNING id_seccion, id_periodo, id_ciclo, nombre, cupo_estimado, estado`, [id(req.body.id_periodo, "id_periodo"), id(req.body.id_ciclo, "id_ciclo"), nombre, Number(req.body.cupo_estimado), req.body.estado, id(req.params.id, "id_seccion")]);
  if (!result.rowCount) throw httpError(404, "Sección no encontrada");
  res.json(result.rows[0]);
}));
app.get("/api/salones", requireAuth, asyncRoute(async (_req, res) => res.json((await query("SELECT id_salon, codigo, descripcion, capacidad, estado FROM salones ORDER BY codigo")).rows)));
app.post("/api/salones", requireRole("COORDINADOR"), asyncRoute(async (req, res) => {
  bodyRequired(req.body, ["codigo", "capacidad"]);
  const result = await query("INSERT INTO salones (codigo, descripcion, capacidad) VALUES ($1, $2, $3) RETURNING id_salon, codigo, descripcion, capacidad, estado", [req.body.codigo, req.body.descripcion || null, Number(req.body.capacidad)]);
  res.status(201).json(result.rows[0]);
}));
app.put("/api/salones/:id", requireRole("COORDINADOR"), asyncRoute(async (req, res) => {
  bodyRequired(req.body, ["codigo", "capacidad", "estado"]);
  const result = await query(`UPDATE salones SET codigo = $1, descripcion = $2, capacidad = $3, estado = $4
    WHERE id_salon = $5 RETURNING id_salon, codigo, descripcion, capacidad, estado`, [req.body.codigo, req.body.descripcion || null, Number(req.body.capacidad), req.body.estado, id(req.params.id, "id_salon")]);
  if (!result.rowCount) throw httpError(404, "Salón no encontrado");
  res.json(result.rows[0]);
}));

app.get("/api/planificaciones", requireAuth, asyncRoute(async (req, res) => {
  const params = [req.query.estado || ""];
  let where = "(NULLIF($1, '') IS NULL OR pl.estado = $1)";
  if (currentUser(req).rol === "COORDINADOR") { params.push(currentUser(req).id_usuario); where += ` AND pl.id_coordinador = $${params.length}`; }
    const result = await query(`SELECT pl.id_planificacion, pl.id_periodo, pl.nombre, p.anio, p.semestre, pl.id_coordinador,
      u.nombre_completo AS coordinador_nombre, pl.estado, pl.fecha_creacion, pl.fecha_envio, pl.fecha_publicacion
    FROM planificaciones pl JOIN periodos_academicos p USING (id_periodo) JOIN usuarios u ON u.id_usuario = pl.id_coordinador
    WHERE ${where} ORDER BY p.anio DESC, p.semestre DESC`, params);
  res.json(result.rows);
}));

app.post("/api/planificaciones", requireRole("COORDINADOR"), asyncRoute(async (req, res) => {
  bodyRequired(req.body, ["id_periodo", "nombre"]);
  const result = await query(`INSERT INTO planificaciones (id_periodo, id_coordinador, nombre) VALUES ($1, $2, $3)
    RETURNING id_planificacion, id_periodo, nombre, id_coordinador, estado, fecha_creacion, fecha_envio, fecha_publicacion`, [id(req.body.id_periodo, "id_periodo"), currentUser(req).id_usuario, String(req.body.nombre).trim()]);
  res.status(201).json(result.rows[0]);
}));

app.get("/api/planificaciones/:id", requireAuth, asyncRoute(async (req, res) => {
  if (currentUser(req).rol === "CATEDRATICO") throw httpError(403, "Los catedráticos consultan únicamente sus cursos publicados");
  const planId = id(req.params.id, "id_planificacion");
  const result = await query(`SELECT pl.id_planificacion, pl.id_periodo, pl.nombre, p.anio, p.semestre, pl.id_coordinador,
      u.nombre_completo AS coordinador_nombre, pl.estado, pl.fecha_creacion, pl.fecha_envio, pl.fecha_publicacion
    FROM planificaciones pl JOIN periodos_academicos p USING (id_periodo) JOIN usuarios u ON u.id_usuario = pl.id_coordinador
    WHERE pl.id_planificacion = $1`, [planId]);
  if (!result.rowCount) throw httpError(404, "Planificación no encontrada");
  const assignments = await query("SELECT * FROM v_horarios WHERE id_planificacion = $1 ORDER BY id_ciclo, id_seccion, dia_semana, hora_inicio", [planId]);
  res.json({ ...result.rows[0], asignaciones: assignments.rows });
}));

app.post("/api/planificaciones/:id/enviar", requireRole("COORDINADOR"), asyncRoute(async (req, res) => {
  const result = await withTransaction(async (client) => {
    const planId = id(req.params.id, "id_planificacion");
    const updated = await client.query(`UPDATE planificaciones SET estado = 'PENDIENTE_APROBACION', fecha_envio = now()
      WHERE id_planificacion = $1 AND id_coordinador = $2 AND estado IN ('BORRADOR', 'RECHAZADA')
      RETURNING id_planificacion, nombre, estado, fecha_envio`, [planId, currentUser(req).id_usuario]);
    if (!updated.rowCount) throw httpError(409, "La planificación no puede enviarse en su estado actual");
    const directors = await client.query("SELECT u.id_usuario FROM usuarios u JOIN roles r USING (id_rol) WHERE r.nombre = 'DIRECTOR' AND u.activo = true");
    for (const director of directors.rows) await notifyUser(client, director.id_usuario, "PLANIFICACION_ENVIADA", "Planificación pendiente de aprobación", `La planificación ${updated.rows[0].nombre} fue enviada para revisión.`, planId);
    return updated;
  });
  res.json(result.rows[0]);
}));

app.post("/api/planificaciones/:id/aprobar", requireRole("DIRECTOR"), asyncRoute(async (req, res) => {
  const result = await withTransaction(async (client) => {
    const planId = id(req.params.id, "id_planificacion");
    const locked = await client.query("SELECT estado, id_coordinador, nombre FROM planificaciones WHERE id_planificacion = $1 FOR UPDATE", [planId]);
    if (!locked.rowCount || locked.rows[0].estado !== "PENDIENTE_APROBACION") throw httpError(409, "La planificación no está pendiente de aprobación");
    await client.query("INSERT INTO revisiones_planificacion (id_planificacion, id_director, decision, motivo_rechazo) VALUES ($1, $2, 'APROBADA', NULL)", [planId, currentUser(req).id_usuario]);
    const updated = await client.query("UPDATE planificaciones SET estado = 'APROBADA' WHERE id_planificacion = $1 RETURNING id_planificacion, estado", [planId]);
    await notifyUser(client, locked.rows[0].id_coordinador, "PLANIFICACION_APROBADA", "Planificación aprobada", `La planificación ${locked.rows[0].nombre} fue aprobada por el Director.`, planId);
    return updated;
  });
  res.json(result.rows[0]);
}));

app.post("/api/planificaciones/:id/rechazar", requireRole("DIRECTOR"), asyncRoute(async (req, res) => {
  bodyRequired(req.body, ["motivo_rechazo"]);
  if (String(req.body.motivo_rechazo).trim().length < 5) throw httpError(400, "El motivo debe tener al menos cinco caracteres");
  const result = await withTransaction(async (client) => {
    const planId = id(req.params.id, "id_planificacion");
    const locked = await client.query("SELECT estado, id_coordinador, nombre FROM planificaciones WHERE id_planificacion = $1 FOR UPDATE", [planId]);
    if (!locked.rowCount || locked.rows[0].estado !== "PENDIENTE_APROBACION") throw httpError(409, "La planificación no está pendiente de aprobación");
    await client.query("INSERT INTO revisiones_planificacion (id_planificacion, id_director, decision, motivo_rechazo) VALUES ($1, $2, 'RECHAZADA', $3)", [planId, currentUser(req).id_usuario, String(req.body.motivo_rechazo).trim()]);
    const updated = await client.query("UPDATE planificaciones SET estado = 'RECHAZADA' WHERE id_planificacion = $1 RETURNING id_planificacion, estado", [planId]);
    await notifyUser(client, locked.rows[0].id_coordinador, "PLANIFICACION_RECHAZADA", "Planificación rechazada", `La planificación ${locked.rows[0].nombre} fue rechazada por el Director.`, planId);
    return updated;
  });
  res.json(result.rows[0]);
}));

app.post("/api/planificaciones/:id/publicar", requireRole("COORDINADOR"), asyncRoute(async (req, res) => {
  const result = await withTransaction(async (client) => {
    const planId = id(req.params.id, "id_planificacion");
    const updated = await client.query(`UPDATE planificaciones SET estado = 'PUBLICADA', fecha_publicacion = now()
      WHERE id_planificacion = $1 AND id_coordinador = $2 AND estado = 'APROBADA'
      RETURNING id_planificacion, nombre, estado, fecha_publicacion`, [planId, currentUser(req).id_usuario]);
    if (!updated.rowCount) throw httpError(409, "Solo se pueden publicar planificaciones aprobadas propias");
    const teachers = await client.query(`SELECT DISTINCT u.id_usuario
      FROM asignaciones a JOIN catedraticos c USING (id_catedratico) JOIN usuarios u ON u.id_usuario = c.id_usuario
      WHERE a.id_planificacion = $1`, [planId]);
    for (const teacher of teachers.rows) await notifyUser(client, teacher.id_usuario, "HORARIO_PUBLICADO", "Horario publicado", `El horario de la planificación ${updated.rows[0].nombre} ya está publicado.`, planId);
    return updated;
  });
  res.json(result.rows[0]);
}));

function expandWeeklyBlocks(blocks) {
  return [...new Map(blocks.map((block) => [`${block.dia_semana}|${block.hora_inicio}|${block.hora_fin}`, block])).values()];
}

async function validateAssignment(client, data, planId, assignmentId = null) {
  bodyRequired(data, ["id_curso", "id_ciclo", "id_catedratico", "id_seccion", "id_salon", "bloques"]);
  if (!Array.isArray(data.bloques) || data.bloques.length === 0) throw httpError(400, "Debe incluir al menos un bloque horario");
  const bloques = expandWeeklyBlocks(data.bloques);
  bloques.forEach(validateWorkdayBlock);
  if (new Set(bloques.map((block) => Number(block.dia_semana))).size !== bloques.length) {
    throw httpError(409, "Un curso solo puede tener una asignación por día");
  }
  const plan = await client.query("SELECT id_periodo, estado FROM planificaciones WHERE id_planificacion = $1 FOR UPDATE", [planId]);
  if (!plan.rowCount) throw httpError(404, "Planificación no encontrada");
  if (!['BORRADOR', 'RECHAZADA'].includes(plan.rows[0].estado)) throw httpError(409, "La planificación no puede editarse en su estado actual");
  const values = [id(data.id_curso, "id_curso"), id(data.id_ciclo, "id_ciclo"), id(data.id_seccion, "id_seccion"), id(data.id_periodo || plan.rows[0].id_periodo, "id_periodo")];
  const teacherId = id(data.id_catedratico, "id_catedratico");
  await client.query("SELECT id_catedratico FROM catedraticos WHERE id_catedratico = $1 FOR UPDATE", [teacherId]);
  const section = await client.query(`SELECT s.id_periodo, s.id_ciclo FROM secciones s WHERE s.id_seccion = $1`, [values[2]]);
  if (!section.rowCount || Number(section.rows[0].id_periodo) !== Number(values[3]) || Number(section.rows[0].id_ciclo) !== Number(values[1])) throw httpError(400, "La sección no pertenece al mismo período y ciclo de la asignación");
  const pensum = await client.query("SELECT 1 FROM pensum WHERE id_curso = $1 AND id_ciclo = $2", values.slice(0, 2));
  if (!pensum.rowCount) {
    const course = await client.query(`SELECT c.codigo, c.nombre, COALESCE(string_agg(ci.numero::text, ', ' ORDER BY ci.numero), 'ningún ciclo') AS ciclos
      FROM cursos c LEFT JOIN pensum p USING (id_curso) LEFT JOIN ciclos ci USING (id_ciclo)
      WHERE c.id_curso = $1 GROUP BY c.id_curso, c.codigo, c.nombre`, [values[0]]);
    const courseName = course.rows[0] ? `${course.rows[0].codigo} - ${course.rows[0].nombre}` : `ID ${values[0]}`;
    const validCycles = course.rows[0]?.ciclos || "ningún ciclo";
    throw httpError(400, `El curso ${courseName} pertenece al ciclo(s) ${validCycles}, pero se seleccionó el ciclo ${values[1]}`);
  }
  const conflicts = await client.query(`SELECT a.id_asignacion, a.id_catedratico, a.id_salon, b.dia_semana, b.hora_inicio, b.hora_fin
    FROM asignaciones a JOIN bloques_horarios b USING (id_asignacion)
    WHERE a.id_periodo = $1 AND a.id_planificacion = $2 AND ($3::bigint IS NULL OR a.id_asignacion <> $3)
      AND (a.id_catedratico = $4 OR a.id_salon = $5) AND b.dia_semana = ANY($6::smallint[])
      AND b.hora_inicio < ANY($7::time[]) AND b.hora_fin > ANY($8::time[])`, [values[3], planId, assignmentId, teacherId, id(data.id_salon, "id_salon"), bloques.map((b) => Number(b.dia_semana)), bloques.map((b) => b.hora_fin), bloques.map((b) => b.hora_inicio)]);
  if (conflicts.rows.some((row) => bloques.some((b) => Number(b.dia_semana) === Number(row.dia_semana) && b.hora_inicio < String(row.hora_fin) && b.hora_fin > String(row.hora_inicio)))) {
    throw httpError(409, "Existe un traslape de horario docente o un conflicto de salón");
  }
  const repeatedCourse = await client.query(`SELECT a.id_asignacion
    FROM asignaciones a JOIN bloques_horarios b USING (id_asignacion)
    WHERE a.id_periodo = $1 AND a.id_planificacion = $2
      AND a.id_curso = $3 AND a.id_ciclo = $4 AND a.id_seccion = $5
      AND ($6::bigint IS NULL OR a.id_asignacion <> $6)
      AND b.dia_semana = ANY($7::smallint[])`, [values[3], planId, values[0], values[1], values[2], assignmentId, bloques.map((block) => Number(block.dia_semana))]);
  if (repeatedCourse.rowCount) {
    throw httpError(409, "El curso ya está asignado a esta sección durante la jornada seleccionada");
  }
  const days = [...new Set(bloques.map((block) => Number(block.dia_semana)))];
  for (const day of days) {
    const load = await client.query(`SELECT count(*)::integer AS total
      FROM asignaciones a JOIN bloques_horarios b USING (id_asignacion)
      WHERE a.id_periodo = $1 AND a.id_catedratico = $2 AND b.dia_semana = $3
        AND ($4::bigint IS NULL OR a.id_asignacion <> $4)`, [values[3], teacherId, day, assignmentId]);
    if (Number(load.rows[0].total) >= 4) {
      throw httpError(409, `El catedrático no puede superar cuatro clases el día ${day}`);
    }
  }
  return { periodo: values[3], planEstado: plan.rows[0].estado, bloques };
}

app.post("/api/planificaciones/:id/asignaciones", requireRole("COORDINADOR"), asyncRoute(async (req, res) => {
  const result = await withTransaction(async (client) => {
    const planId = id(req.params.id, "id_planificacion");
    const validated = await validateAssignment(client, req.body, planId);
    const inserted = await client.query(`INSERT INTO asignaciones (id_planificacion, id_periodo, id_curso, id_ciclo, id_catedratico, id_seccion, id_salon)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id_asignacion`, [planId, validated.periodo, id(req.body.id_curso, "id_curso"), id(req.body.id_ciclo, "id_ciclo"), id(req.body.id_catedratico, "id_catedratico"), id(req.body.id_seccion, "id_seccion"), id(req.body.id_salon, "id_salon")]);
    for (const block of validated.bloques) await client.query("INSERT INTO bloques_horarios (id_asignacion, dia_semana, hora_inicio, hora_fin) VALUES ($1, $2, $3, $4)", [inserted.rows[0].id_asignacion, Number(block.dia_semana), block.hora_inicio, block.hora_fin]);
    const teacher = await client.query("SELECT u.id_usuario FROM catedraticos c JOIN usuarios u ON u.id_usuario = c.id_usuario WHERE c.id_catedratico = $1", [id(req.body.id_catedratico, "id_catedratico")]);
    await notifyUser(client, teacher.rows[0]?.id_usuario, "ASIGNACION_DOCENTE", "Nueva asignación docente", "Se le asignó un curso en una planificación académica.", planId);
    return client.query("SELECT * FROM v_horarios WHERE id_asignacion = $1 ORDER BY dia_semana, hora_inicio", [inserted.rows[0].id_asignacion]);
  });
  res.status(201).json({ id_asignacion: result.rows[0]?.id_asignacion, bloques: result.rows });
}));

app.put("/api/planificaciones/:id/asignaciones/:assignmentId", requireRole("COORDINADOR"), asyncRoute(async (req, res) => {
  const result = await withTransaction(async (client) => {
    const planId = id(req.params.id, "id_planificacion");
    const assignmentId = id(req.params.assignmentId, "id_asignacion");
    const validated = await validateAssignment(client, req.body, planId, assignmentId);
    const updated = await client.query(`UPDATE asignaciones SET id_periodo = $1, id_curso = $2, id_ciclo = $3, id_catedratico = $4, id_seccion = $5, id_salon = $6
      WHERE id_asignacion = $7 AND id_planificacion = $8 RETURNING id_asignacion`, [validated.periodo, id(req.body.id_curso, "id_curso"), id(req.body.id_ciclo, "id_ciclo"), id(req.body.id_catedratico, "id_catedratico"), id(req.body.id_seccion, "id_seccion"), id(req.body.id_salon, "id_salon"), assignmentId, planId]);
    if (!updated.rowCount) throw httpError(404, "Asignación no encontrada");
    await client.query("DELETE FROM bloques_horarios WHERE id_asignacion = $1", [assignmentId]);
    for (const block of validated.bloques) await client.query("INSERT INTO bloques_horarios (id_asignacion, dia_semana, hora_inicio, hora_fin) VALUES ($1, $2, $3, $4)", [assignmentId, Number(block.dia_semana), block.hora_inicio, block.hora_fin]);
    const teacher = await client.query("SELECT u.id_usuario FROM catedraticos c JOIN usuarios u ON u.id_usuario = c.id_usuario WHERE c.id_catedratico = $1", [id(req.body.id_catedratico, "id_catedratico")]);
    await notifyUser(client, teacher.rows[0]?.id_usuario, "ASIGNACION_DOCENTE", "Asignación docente actualizada", "Se actualizó una asignación de su horario.", planId);
    return client.query("SELECT * FROM v_horarios WHERE id_asignacion = $1 ORDER BY dia_semana, hora_inicio", [assignmentId]);
  });
  res.json({ id_asignacion: result.rows[0]?.id_asignacion, bloques: result.rows });
}));

app.delete("/api/planificaciones/:id/asignaciones/:assignmentId", requireRole("COORDINADOR"), asyncRoute(async (req, res) => {
  await withTransaction(async (client) => {
    const assignmentId = id(req.params.assignmentId, "id_asignacion");
    const planId = id(req.params.id, "id_planificacion");
    const owned = await client.query(`SELECT a.id_asignacion
      FROM asignaciones a JOIN planificaciones p ON p.id_planificacion = a.id_planificacion
      WHERE a.id_asignacion = $1 AND p.id_planificacion = $2
        AND p.id_coordinador = $3 AND p.estado IN ('BORRADOR', 'RECHAZADA')
      FOR UPDATE`, [assignmentId, planId, currentUser(req).id_usuario]);
    if (!owned.rowCount) throw httpError(404, "Asignación no encontrada o no editable");
    await client.query("DELETE FROM bloques_horarios WHERE id_asignacion = $1", [assignmentId]);
    await client.query("DELETE FROM asignaciones WHERE id_asignacion = $1", [assignmentId]);
  });
  res.status(204).end();
}));

app.get("/api/horarios", requireAuth, asyncRoute(async (req, res) => {
  if (currentUser(req).rol === "CATEDRATICO") {
    const result = await query(`SELECT h.* FROM v_horarios h JOIN catedraticos c ON c.id_catedratico = h.id_catedratico
      JOIN planificaciones p USING (id_planificacion) WHERE c.id_usuario = $1 AND p.estado = 'PUBLICADA'
      ORDER BY ciclo_numero, seccion_nombre, dia_semana, hora_inicio`, [currentUser(req).id_usuario]);
    return res.json(result.rows);
  }
  const result = await query(`SELECT * FROM v_horarios WHERE ($1::bigint IS NULL OR id_periodo = $1)
    AND ($2::bigint IS NULL OR id_seccion = $2) AND ($3::bigint IS NULL OR id_catedratico = $3)
    ORDER BY ciclo_numero, seccion_nombre, dia_semana, hora_inicio`, [req.query.id_periodo ? id(req.query.id_periodo, "id_periodo") : null, req.query.id_seccion ? id(req.query.id_seccion, "id_seccion") : null, req.query.id_catedratico ? id(req.query.id_catedratico, "id_catedratico") : null]);
  res.json(result.rows);
}));

app.get("/api/mi-horario", requireRole("CATEDRATICO"), asyncRoute(async (req, res) => {
  const result = await query(`SELECT h.* FROM v_horarios h JOIN catedraticos c ON c.id_catedratico = h.id_catedratico
    WHERE c.id_usuario = $1 AND h.id_planificacion IN (SELECT id_planificacion FROM planificaciones WHERE estado = 'PUBLICADA')
    ORDER BY dia_semana, hora_inicio`, [currentUser(req).id_usuario]);
  res.json(result.rows);
}));
app.get("/api/mis-cursos", requireRole("CATEDRATICO"), asyncRoute(async (req, res) => {
  const result = await query(`SELECT v.* FROM v_cursos_asignados v JOIN catedraticos c ON c.id_catedratico = v.id_catedratico
    JOIN planificaciones p USING (id_planificacion) WHERE c.id_usuario = $1 AND p.estado = 'PUBLICADA'
    ORDER BY anio DESC, semestre DESC, ciclo_numero, seccion_nombre`, [currentUser(req).id_usuario]);
  res.json(result.rows);
}));

app.get("/api/reportes/planificacion", requireRole("DIRECTOR", "COORDINADOR"), asyncRoute(async (req, res) => {
  const result = await query(`SELECT h.*, p.nombre AS planificacion_nombre
    FROM v_horarios h JOIN planificaciones p USING (id_planificacion)
    WHERE ($1::bigint IS NULL OR h.id_periodo = $1)
    AND ($2::integer IS NULL OR h.id_ciclo = $2) AND ($3::text IS NULL OR h.seccion_nombre = $3)
    AND ($4::bigint IS NULL OR h.id_catedratico = $4) AND ($5::bigint IS NULL OR h.id_curso = $5)
    AND ($6::integer IS NULL OR h.anio = $6) AND ($7::integer IS NULL OR h.semestre = $7)
    ORDER BY h.anio DESC, h.semestre DESC, h.ciclo_numero, h.seccion_nombre, h.curso_codigo, h.dia_semana, h.hora_inicio`, [req.query.id_periodo ? id(req.query.id_periodo, "id_periodo") : null, req.query.id_ciclo ? id(req.query.id_ciclo, "id_ciclo") : null, req.query.id_seccion ? sectionName(req.query.id_seccion) : null, req.query.id_catedratico ? id(req.query.id_catedratico, "id_catedratico") : null, req.query.id_curso ? id(req.query.id_curso, "id_curso") : null, req.query.anio ? Number(req.query.anio) : null, req.query.semestre ? Number(req.query.semestre) : null]);
  res.json(result.rows);
}));
app.get("/api/reportes/planificaciones", requireRole("DIRECTOR"), asyncRoute(async (req, res) => {
  const estado = req.query.estado || "PENDIENTE_APROBACION";
  const result = await query("SELECT * FROM v_planificaciones_pendientes WHERE $1 = 'PENDIENTE_APROBACION'", [estado]);
  res.json(result.rows);
}));
app.get("/api/reportes/publicadas", requireRole("DIRECTOR", "COORDINADOR"), asyncRoute(async (_req, res) => res.json((await query("SELECT * FROM v_planificaciones_publicadas ORDER BY anio DESC, semestre DESC")).rows)));

app.use((error, _req, res, _next) => sendError(res, error));

const server = app.listen(port, () => console.log(`API escuchando en http://localhost:${port}`));
provisionTeacherUsers().catch((error) => console.error("No se pudieron provisionar usuarios de catedráticos:", error.message));
const shutdown = async () => { server.close(); await pool.end(); process.exit(0); };
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
