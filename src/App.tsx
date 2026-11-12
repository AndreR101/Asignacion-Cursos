import { FormEvent, Fragment, ReactNode, useEffect, useMemo, useState } from "react";
import umgLogo from "./assets/umg-logo.jpg";
import { api, apiJson } from "./api";

type Role = "director" | "coordinator" | "teacher";
type Page =
  | "home"
  | "teachers"
  | "courses"
  | "planning"
  | "plans"
  | "my-courses"
  | "schedule"
  | "reports"
  | "profile";
type PlanStatus = "Borrador" | "Pendiente de aprobación" | "Aprobada" | "Rechazada";

type Teacher = {
  id: number;
  userId?: number;
  code: string;
  name: string;
  email: string;
  phone: string;
  active: boolean;
};
type Course = {
  id: number;
  code: string;
  name: string;
  cycle: number;
  cycleIds?: number[];
  cycleNumbers?: number[];
  description?: string;
  active: boolean;
};
type Cycle = { id_ciclo: number; numero: number; nombre: string; activo: boolean };
type Period = { id_periodo: number; anio: number; semestre: number; fecha_inicio: string; fecha_fin: string; estado: string };
type Section = { id_seccion: number; id_periodo: number; id_ciclo: number; nombre: string; cupo_estimado: number; estado: string; ciclo_numero?: number };
type Room = { id_salon: number; codigo: string; descripcion?: string; capacidad: number; estado: string };
const CLASS_BLOCKS = [
  ["07:00", "09:00"],
  ["09:00", "11:00"],
  ["11:00", "13:00"],
  ["14:00", "16:00"],
  ["16:00", "18:00"],
] as const;
type Assignment = {
  id: number;
  courseId: number;
  teacherId: number;
  sectionId?: number;
  roomId?: number;
  periodId?: number;
  cycleId?: number;
  cycle: number;
  section: string;
  room: string;
  day: string;
  start: string;
  end: string;
};
type Plan = {
  id: number;
  periodId?: number;
  year: number;
  semester: string;
  sent: string;
  coordinator: string;
  status: PlanStatus;
  rejection?: string;
  published?: boolean;
  assignments: Assignment[];
};

const navByRole: Record<Role, { page?: Page; label: string; icon: string; logout?: boolean }[]> = {
  director: [
    { page: "home", label: "Inicio", icon: "home" },
    { page: "plans", label: "Planificaciones", icon: "calendar" },
    { page: "reports", label: "Reportes", icon: "report" },
    { page: "profile", label: "Mi Perfil", icon: "user" },
    { label: "Cerrar sesión", icon: "logout", logout: true },
  ],
  coordinator: [
    { page: "home", label: "Inicio", icon: "home" },
    { page: "teachers", label: "Catedráticos", icon: "users" },
    { page: "courses", label: "Cursos", icon: "book" },
    { page: "planning", label: "Planificación de Horarios", icon: "calendar" },
    { page: "reports", label: "Reportes", icon: "report" },
    { page: "profile", label: "Mi Perfil", icon: "user" },
    { label: "Cerrar sesión", icon: "logout", logout: true },
  ],
  teacher: [
    { page: "home", label: "Inicio", icon: "home" },
    { page: "my-courses", label: "Mis Cursos", icon: "book" },
    { page: "schedule", label: "Mi Horario", icon: "calendar" },
    { page: "profile", label: "Mi Perfil", icon: "user" },
    { label: "Cerrar sesión", icon: "logout", logout: true },
  ],
};

function Icon({ name, size = 19 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    home: (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h14V10M9 20v-6h6v6" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M19 8v6M22 11h-6" />
      </>
    ),
    book: (
      <>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z" />
        <path d="M4 5.5v14M8 7h8" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    report: (
      <>
        <path d="M4 19V5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
        <path d="M14 3v6h6M8 13h8M8 17h6" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    logout: (
      <>
        <path d="M10 17l5-5-5-5M15 12H3" />
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    edit: (
      <>
        <path d="m4 16-1 5 5-1L19 9l-4-4Z" />
        <path d="m13 7 4 4" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    x: <path d="M18 6 6 18M6 6l12 12" />,
    alert: (
      <>
        <path d="M10.3 3.7 2.5 17.2A2 2 0 0 0 4.2 20h15.6a2 2 0 0 0 1.7-2.8L13.7 3.7a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4M12 17h.01" />
      </>
    ),
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    printer: (
      <>
        <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <path d="M6 14h12v7H6z" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12M7 10l5 5 5-5" />
        <path d="M5 21h14" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

function Badge({ status }: { status: string }) {
  const cls =
    status === "Aprobada" || status === "Activo" || status === "Publicada"
      ? "success"
      : status === "Rechazada" || status === "Inactivo"
        ? "danger"
        : status === "Pendiente de aprobación"
          ? "warning"
          : "neutral";
  return (
    <span className={`badge ${cls}`}>
      <i />
      {status}
    </span>
  );
}

function Button({
  children,
  variant = "primary",
  icon,
  onClick,
  type = "button",
  disabled = false,
}: {
  children: ReactNode;
  variant?: string;
  icon?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button type={type} className={`btn ${variant}`} onClick={onClick} disabled={disabled}>
      {icon && <Icon name={icon} size={17} />}
      {children}
    </button>
  );
}

function Modal({
  title,
  subtitle,
  children,
  onClose,
  width = "normal",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  width?: string;
}) {
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${width}`}>
        <div className="modal-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-btn" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

type ApiUser = { id_usuario: number; nombre_completo: string; correo: string; rol: string };

function Login({ onLogin }: { onLogin: (user: ApiUser) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [currentPeriod, setCurrentPeriod] = useState("2do ciclo 2026");
  useEffect(() => {
    api<{ anio: number; semestre: number }>("/periodo-actual")
      .then((period) => setCurrentPeriod(`${period.semestre === 2 ? "2do" : "1er"} ciclo ${period.anio}`))
      .catch(() => undefined);
  }, []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      const result = await api<{ user: ApiUser }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ correo: email.trim(), password }),
      });
      onLogin(result.user);
    } catch (error) {
      setError(error instanceof Error ? error.message : "No se pudo iniciar sesión");
    }
  }
  return (
    <div className="login-page">
      <div className="login-shell">
        <section className="login-visual">
          <div className="login-brand">
            <img
              className="university-logo large"
              src={umgLogo}
              alt="Escudo de la Universidad Mariano Gálvez de Guatemala"
            />
            <div>
              <strong>Universidad Mariano Gálvez</strong>
              <small>de Guatemala</small>
            </div>
          </div>
          <div className="login-message">
            <span className="eyebrow">ESPACIO ACADÉMICO</span>
            <h2>Planificar el semestre con claridad.</h2>
            <p>Un espacio compartido para organizar cursos, horarios y decisiones académicas.</p>
          </div>
          <div className="login-period" aria-hidden="true">
            <span>PERÍODO ACADÉMICO</span>
            <strong>{currentPeriod}</strong>
            <p>Consulte los períodos disponibles al iniciar sesión</p>
          </div>
          <small className="visual-foot">Planificación académica · UMG</small>
        </section>
        <main className="login-card">
          <div className="login-card-head">
            <img
              className="login-seal"
              src={umgLogo}
              alt="Universidad Mariano Gálvez de Guatemala"
            />
            <div>
              <span>Bienvenido</span>
              <h1>Planificación de Cursos</h1>
              <p className="login-intro">Ingrese con su cuenta institucional para continuar.</p>
            </div>
          </div>
          <form onSubmit={submit}>
            <label>Correo institucional</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@universidad.edu.gt"
            />
            <label>Contraseña</label>
            <div className="password">
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingrese su contraseña"
              />
              <button type="button" onClick={() => setShow(!show)}>
                <Icon name="eye" />
              </button>
            </div>
            {error && (
              <div className="form-error">
                <Icon name="alert" size={18} />
                {error}
              </div>
            )}
            <Button type="submit">Iniciar sesión</Button>
          </form>
        </main>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  note,
  tone = "blue",
  icon,
}: {
  label: string;
  value: string | number;
  note?: string;
  tone?: string;
  icon: string;
}) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}>
        <Icon name={icon} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {note && <small>{note}</small>}
      </div>
    </div>
  );
}

function App() {
  const [role, setRole] = useState<Role | null>(null);
  const [apiUser, setApiUser] = useState<ApiUser | null>(null);
  const [page, setPage] = useState<Page>("home");
  const [sidebar, setSidebar] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);

  const toRole = (value: string): Role =>
    value === "DIRECTOR" ? "director" : value === "CATEDRATICO" ? "teacher" : "coordinator";
  const mapTeacher = (item: any): Teacher => ({
    id: Number(item.id_catedratico), userId: item.id_usuario ? Number(item.id_usuario) : undefined, code: item.codigo, name: item.nombre_completo,
    email: item.correo || "", phone: item.telefono || "", active: item.activo,
  });
  const mapCourse = (item: any): Course => ({
    id: Number(item.id_curso), code: item.codigo || item.curso_codigo,
    name: item.nombre || item.curso_nombre, cycle: Number(item.ciclos?.[0]?.numero || item.ciclo_numero || 1),
    cycleIds: item.ciclos?.map((cycle: any) => Number(cycle.id_ciclo)).filter(Boolean),
    cycleNumbers: item.ciclos?.map((cycle: any) => Number(cycle.numero)).filter(Boolean),
    description: item.descripcion, active: item.activo ?? true,
  });
  const mapPlan = (item: any): Plan => {
    const statusMap: Record<string, PlanStatus> = {
      BORRADOR: "Borrador", PENDIENTE_APROBACION: "Pendiente de aprobación", APROBADA: "Aprobada", RECHAZADA: "Rechazada", PUBLICADA: "Aprobada",
    };
    const days = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
    const assignments = (item.asignaciones || []).reduce((all: Assignment[], row: any) => {
      if (!all.some((a) => a.id === Number(row.id_asignacion))) all.push({
        id: Number(row.id_asignacion), courseId: Number(row.id_curso), teacherId: Number(row.id_catedratico),
        cycle: Number(row.ciclo_numero), cycleId: Number(row.id_ciclo), sectionId: Number(row.id_seccion), roomId: Number(row.id_salon), periodId: Number(row.id_periodo), section: row.seccion_nombre, room: row.salon_codigo,
        day: days[Number(row.dia_semana)], start: String(row.hora_inicio).slice(0, 5), end: String(row.hora_fin).slice(0, 5),
      });
      return all;
    }, []);
    return {
      id: Number(item.id_planificacion), periodId: Number(item.id_periodo), year: Number(item.anio),
      semester: Number(item.semestre) === 1 ? "Primer semestre" : "Segundo semestre",
      sent: item.fecha_envio ? new Date(item.fecha_envio).toLocaleDateString("es-GT") : "Pendiente",
      coordinator: item.coordinador_nombre || "", status: statusMap[item.estado] || "Borrador",
      published: item.estado === "PUBLICADA", rejection: item.motivo_rechazo, assignments,
    };
  };

  useEffect(() => {
    api<{ user: ApiUser }>("/auth/me")
      .then(({ user }) => { setApiUser(user); setRole(toRole(user.rol)); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!role) return;
    setLoading(true);
    Promise.all([api<any[]>("/catedraticos"), api<any[]>("/cursos"), api<any[]>(role === "teacher" ? "/mi-horario" : "/planificaciones"), api<Period[]>("/periodos"), api<Cycle[]>("/ciclos"), api<Section[]>("/secciones"), api<Room[]>("/salones")])
      .then(async ([teacherRows, courseRows, initialPlanRows, periodRows, cycleRows, sectionRows, roomRows]) => {
        setTeachers(teacherRows.map(mapTeacher));
        setCourses(courseRows.map(mapCourse));
        setPeriods(periodRows);
        setCycles(cycleRows);
        setSections(sectionRows);
        setRooms(roomRows);
        if (role === "teacher") {
          const rows = initialPlanRows;
          const first = rows[0];
          const teacherPlan: Plan = {
            id: -1,
            periodId: first ? Number(first.id_periodo) : undefined,
            year: first ? Number(first.anio) : new Date().getFullYear(),
            semester: first && Number(first.semestre) === 1 ? "Primer semestre" : "Segundo semestre",
            sent: "",
            coordinator: "",
            status: "Aprobada",
            published: true,
            assignments: rows.map((row) => ({
              id: Number(row.id_asignacion) * 10 + Number(row.dia_semana),
              courseId: Number(row.id_curso),
              teacherId: Number(row.id_catedratico),
              cycle: Number(row.ciclo_numero),
              cycleId: Number(row.id_ciclo),
              sectionId: Number(row.id_seccion),
              roomId: Number(row.id_salon),
              periodId: Number(row.id_periodo),
              section: row.seccion_nombre,
              room: row.salon_codigo,
              day: ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"][Number(row.dia_semana)],
              start: String(row.hora_inicio).slice(0, 5),
              end: String(row.hora_fin).slice(0, 5),
            })),
          };
          setPlans(rows.length ? [teacherPlan] : []);
          return;
        }
        let planRows = initialPlanRows;
        if (role === "coordinator" && planRows.length === 0 && periodRows.length > 0) {
          await apiJson("/planificaciones", { id_periodo: periodRows[0].id_periodo });
          planRows = await api<any[]>("/planificaciones");
        }
        const details = await Promise.all(planRows.map((plan) => api<any>(`/planificaciones/${plan.id_planificacion}`)));
        setPlans(details.map(mapPlan));
      })
      .catch((error) => notify(error instanceof Error ? error.message : "No se pudieron cargar los datos"))
      .finally(() => setLoading(false));
  }, [role]);

  const persistTeacher = async (teacher: Teacher) => {
    const payload = { codigo: teacher.code, nombre_completo: teacher.name, correo: teacher.email, telefono: teacher.phone };
    const saved = await apiJson<any>(teacher.id ? `/catedraticos/${teacher.id}` : "/catedraticos", payload, teacher.id ? "PUT" : "POST");
    return mapTeacher(saved);
  };
  const toggleTeacher = async (teacher: Teacher) => mapTeacher(await apiJson<any>(`/catedraticos/${teacher.id}/estado`, { activo: !teacher.active }, "PATCH"));
  const persistCourse = async (course: Course) => {
    const payload = { codigo: course.code, nombre: course.name, descripcion: course.description, id_ciclo: course.cycle };
    const saved = await apiJson<any>(course.id ? `/cursos/${course.id}` : "/cursos", payload, course.id ? "PUT" : "POST");
    return mapCourse(saved);
  };
  const sendPlan = async (plan: Plan) => { await apiJson(`/planificaciones/${plan.id}/enviar`, {}); };
  const publishPlan = async (plan: Plan) => { await apiJson(`/planificaciones/${plan.id}/publicar`, {}); };
  const createPlan = async () => {
    const availablePeriod = periods.find((period) => !plans.some((plan) => Number(plan.periodId) === Number(period.id_periodo)));
    if (!availablePeriod) {
      const rejectedPlan = plans.find((plan) => plan.status === "Rechazada");
      if (rejectedPlan) return rejectedPlan;
      throw new Error("No hay períodos disponibles sin planificación");
    }
    const created = await apiJson<any>("/planificaciones", { id_periodo: availablePeriod.id_periodo });
    const detail = await api<any>(`/planificaciones/${created.id_planificacion}`);
    return mapPlan(detail);
  };
  const decidePlan = async (plan: Plan, decision: "approve" | "reject", reason?: string) => {
    await apiJson(`/planificaciones/${plan.id}/${decision === "approve" ? "aprobar" : "rechazar"}`, decision === "approve" ? {} : { motivo_rechazo: reason });
  };
  const persistAssignment = async (plan: Plan, assignment: Assignment) => {
    const [sections, rooms, cycles] = await Promise.all([
      api<any[]>(`/secciones?id_periodo=${plan.periodId}`),
      api<any[]>("/salones"),
      api<any[]>("/ciclos"),
    ]);
    const section = sections.find((item) => Number(item.id_seccion) === assignment.sectionId || (item.nombre === assignment.section && Number(item.id_ciclo) === (assignment.cycleId || assignment.cycle)));
    const room = rooms.find((item) => Number(item.id_salon) === assignment.roomId || item.codigo === assignment.room);
    const cycle = cycles.find((item) => Number(item.id_ciclo) === assignment.cycleId || Number(item.numero) === assignment.cycle);
    if (!section || !room || !cycle || !plan.periodId) throw new Error("No se encontró el período, sección, ciclo o salón seleccionado");
    const payload = {
      id_periodo: plan.periodId, id_curso: assignment.courseId, id_ciclo: cycle.id_ciclo,
      id_catedratico: assignment.teacherId, id_seccion: section.id_seccion, id_salon: room.id_salon,
      bloques: [{ dia_semana: 6, hora_inicio: assignment.start, hora_fin: assignment.end }],
    };
    const result = await apiJson<any>(assignment.id ? `/planificaciones/${plan.id}/asignaciones/${assignment.id}` : `/planificaciones/${plan.id}/asignaciones`, payload, assignment.id ? "PUT" : "POST");
    return { ...assignment, id: Number(result.id_asignacion || assignment.id || Date.now()), sectionId: Number(section.id_seccion), roomId: Number(room.id_salon), periodId: Number(plan.periodId), cycleId: Number(cycle.id_ciclo) };
  };
  const removeAssignment = async (plan: Plan, assignment: Assignment) => {
    await api(`/planificaciones/${plan.id}/asignaciones/${assignment.id}`, { method: "DELETE" });
  };
  const queryReport = async (filters: { periodId?: string; cycleId?: string; sectionId?: string }) => {
    const query = new URLSearchParams();
    if (filters.periodId) query.set("id_periodo", filters.periodId);
    if (filters.cycleId) query.set("id_ciclo", filters.cycleId);
    if (filters.sectionId) query.set("id_seccion", filters.sectionId);
    const rows = await api<any[]>(role === "teacher" ? "/mi-horario" : `/reportes/planificacion?${query.toString()}`);
    const days = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
    return rows.map((row) => ({
      id: Number(row.id_asignacion), courseId: Number(row.id_curso), teacherId: Number(row.id_catedratico),
      cycle: Number(row.ciclo_numero), cycleId: Number(row.id_ciclo), section: row.seccion_nombre, sectionId: Number(row.id_seccion),
      room: row.salon_codigo, roomId: Number(row.id_salon), periodId: Number(row.id_periodo), day: days[Number(row.dia_semana)],
      start: String(row.hora_inicio).slice(0, 5), end: String(row.hora_fin).slice(0, 5),
    }));
  };
  const createSection = async (plan: Plan, name: string, capacity: number, cycleId: number) => {
    const section = await apiJson<Section>("/secciones", { id_periodo: plan.periodId, id_ciclo: cycleId, nombre: name, cupo_estimado: capacity });
    setSections((current) => [...current, section]);
  };

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3000);
  }
  if (loading && !role) return <div className="login-page"><div className="login-card"><p>Cargando sesión…</p></div></div>;
  if (!role)
    return (
      <Login
        onLogin={(user) => {
          setApiUser(user);
          setRole(toRole(user.rol));
          setPage("home");
        }}
      />
    );
  if (loading) return <div className="login-page"><div className="login-card"><p>Cargando información académica…</p></div></div>;

  const user = { email: apiUser?.correo || "", name: apiUser?.nombre_completo || "", role: apiUser?.rol || role };
  const emptyPlan: Plan = { id: 0, year: new Date().getFullYear(), semester: "Primer semestre", sent: "", coordinator: "", status: "Borrador", assignments: [] };
  const activePlan = plans[0] || emptyPlan;
  const currentTeacherId = teachers.find((teacher) => teacher.userId === apiUser?.id_usuario)?.id;
  const currentPeriod = periods.find((period) => period.id_periodo === activePlan.periodId) || periods[0];
  const periodLabel = currentPeriod ? `${currentPeriod.semestre === 1 ? "Primer" : "Segundo"} semestre ${currentPeriod.anio}` : "Sin período seleccionado";
  const allowed = navByRole[role].map((n) => n.page);
  const safePage = allowed.includes(page) ? page : "home";
  const title = navByRole[role].find((n) => n.page === safePage)?.label || "Inicio";
  const logout = () => {
    void api("/auth/logout", { method: "POST" }).finally(() => {
      setApiUser(null);
      setRole(null);
      setPage("home");
    });
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebar ? "open" : ""}`}>
        <div className="side-brand">
          <img
            className="university-logo"
            src={umgLogo}
            alt="Escudo de la Universidad Mariano Gálvez de Guatemala"
          />
          <div>
            <strong>Planifica</strong>
            <small>Universidad Mariano Gálvez</small>
          </div>
        </div>
        <nav>
          {navByRole[role].map((item, i) =>
            item.logout ? (
              <button key={i} className="nav-item logout" onClick={logout}>
                <Icon name={item.icon} />
                {item.label}
              </button>
            ) : (
              <button
                key={i}
                className={`nav-item ${safePage === item.page ? "active" : ""}`}
                onClick={() => {
                  setPage(item.page!);
                  setSidebar(false);
                }}
              >
                <Icon name={item.icon} />
                {item.label}
              </button>
            ),
          )}
        </nav>
        <div className="side-user">
          <div className="avatar">
            {user.name
              .split(" ")
              .map((x) => x[0])
              .slice(0, 2)
              .join("")}
          </div>
          <div>
            <strong>{user.name}</strong>
            <small>{user.role}</small>
          </div>
        </div>
      </aside>
      <div className="app-main">
        <header>
          <button className="mobile-menu" onClick={() => setSidebar(!sidebar)}>
            <Icon name="menu" />
          </button>
          <div>
            <h1>{title}</h1>
            <p>{periodLabel}</p>
          </div>
          <div className="header-user">
            <span className="online" />
            <div>
              <strong>{user.name}</strong>
              <small>{user.role}</small>
            </div>
            <div className="avatar">
              {user.name
                .split(" ")
                .map((x) => x[0])
                .slice(0, 2)
                .join("")}
            </div>
          </div>
        </header>
        <main className="content">
          {safePage === "home" && (
            <Dashboard
              role={role}
              plans={plans}
              teachers={teachers}
              courses={courses}
              teacherId={currentTeacherId}
              userName={user.name}
              periodLabel={periodLabel}
              go={setPage}
            />
          )}
          {safePage === "teachers" && (
            <Teachers teachers={teachers} setTeachers={setTeachers} notify={notify} onPersist={persistTeacher} onToggle={toggleTeacher} />
          )}
          {safePage === "courses" && (
            <Courses courses={courses} setCourses={setCourses} notify={notify} onPersist={persistCourse} cycles={cycles} />
          )}
          {safePage === "planning" && (
            <Planning
              plans={plans}
              setPlans={setPlans}
              teachers={teachers}
              courses={courses}
              notify={notify}
              onSend={sendPlan}
              onPublish={publishPlan}
              onAssignmentSave={persistAssignment}
              onAssignmentRemove={removeAssignment}
              onCreatePlan={role === "coordinator" ? createPlan : undefined}
              cycles={cycles}
              periods={periods}
              sections={sections}
              rooms={rooms}
              onSectionCreate={createSection}
            />
          )}
          {safePage === "plans" && (
            <PlansReview
              plans={plans}
              setPlans={setPlans}
              teachers={teachers}
              courses={courses}
              notify={notify}
              onDecision={decidePlan}
              periods={periods}
            />
          )}
          {safePage === "my-courses" && (
            <MyCourses assignments={activePlan.assignments} courses={courses} teacherId={currentTeacherId} periodLabel={periodLabel} />
          )}
          {safePage === "schedule" && (
            <Schedule
              assignments={activePlan.assignments.filter((a) => !currentTeacherId || a.teacherId === currentTeacherId)}
              courses={courses}
              sectionCatalog={sections.filter((section) => Number(section.id_periodo) === Number(activePlan.periodId))}
              compact={false}
            />
          )}
          {safePage === "reports" && (
            <Reports
              role={role}
              plan={plans.find((p) => p.published) || activePlan}
              courses={courses}
              teachers={teachers}
              notify={notify}
              teacherId={currentTeacherId}
              cycles={cycles}
              periods={periods}
              sections={sections}
              onQuery={queryReport}
            />
          )}
          {safePage === "profile" && <Profile user={user} />}
        </main>
      </div>
      {sidebar && <div className="sidebar-shade" onClick={() => setSidebar(false)} />}
      {toast && (
        <div className="toast">
          <span>
            <Icon name="check" />
          </span>
          {toast}
        </div>
      )}
    </div>
  );
}

function Dashboard({
  role,
  plans,
  teachers,
  courses,
  teacherId,
  userName,
  periodLabel,
  go,
}: {
  role: Role;
  plans: Plan[];
  teachers: Teacher[];
  courses: Course[];
  teacherId?: number;
  userName: string;
  periodLabel: string;
  go: (p: Page) => void;
}) {
  const recentAssignments = plans.flatMap((plan) => plan.assignments).slice(0, 4);
  const plannedSections = new Set(plans.flatMap((plan) => plan.assignments.map((assignment) => assignment.sectionId || assignment.section))).size;
  if (role === "director")
    return (
      <div className="page-stack">
        <div className="welcome">
          <div>
            <span className="eyebrow">RESUMEN EJECUTIVO</span>
            <h2>Buenos días, {userName}</h2>
            <p>Estas son las propuestas que requieren su atención.</p>
          </div>
          <Button icon="calendar" onClick={() => go("plans")}>
            Ver planificaciones
          </Button>
        </div>
        <div className="stats-grid three">
          <StatCard
            icon="calendar"
            label="Pendientes de revisión"
            value={plans.filter((p) => p.status === "Pendiente de aprobación").length}
            note="Requiere su atención"
            tone="orange"
          />
          <StatCard
            icon="check"
            label="Aprobadas"
            value={plans.filter((p) => p.status === "Aprobada").length}
            note="En los últimos períodos"
            tone="green"
          />
          <StatCard
            icon="x"
            label="Rechazadas"
            value={plans.filter((p) => p.status === "Rechazada").length}
            note="Con observaciones"
            tone="red"
          />
        </div>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Propuestas recientes</h3>
              <p>Planificaciones enviadas por coordinación académica</p>
            </div>
            <button className="text-link" onClick={() => go("plans")}>
              Ver todas →
            </button>
          </div>
          <PlansTable plans={plans.slice(0, 3)} action={() => go("plans")} />
        </section>
      </div>
    );
  if (role === "teacher") {
    const mine = (plans[0]?.assignments || []).filter((a) => !teacherId || a.teacherId === teacherId);
    return (
      <div className="page-stack">
        <div className="welcome">
          <div>
            <span className="eyebrow">PANEL DOCENTE</span>
            <h2>Buenos días, {userName}</h2>
            <p>Consulte sus cursos y horario para el período actual.</p>
          </div>
          <Badge status="Período activo" />
        </div>
        <div className="stats-grid three">
          <StatCard
            icon="book"
            label="Cursos asignados"
            value={mine.length}
            note={periodLabel}
          />
          <StatCard
            icon="calendar"
            label="Próximo bloque"
            value="Lun 07:00"
            note={mine[0] ? `${courses.find((course) => course.id === mine[0].courseId)?.name || "Curso"} · ${mine[0].room}` : "Sin bloques asignados"}
            tone="orange"
          />
          <StatCard
            icon="users"
            label="Secciones"
            value={new Set(mine.map((a) => a.section)).size}
            note="A su cargo"
            tone="green"
          />
        </div>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Mi semana</h3>
              <p>Vista resumida de sus bloques asignados</p>
            </div>
            <button className="text-link" onClick={() => go("schedule")}>
              Ver horario completo →
            </button>
          </div>
          <Schedule assignments={mine} courses={courses} compact />
        </section>
      </div>
    );
  }
  return (
    <div className="page-stack">
      <div className="welcome">
        <div>
          <span className="eyebrow">PERÍODO ACADÉMICO ACTUAL</span>
          <h2>{periodLabel}</h2>
          <p>La planificación se encuentra en etapa de preparación.</p>
        </div>
        <Button icon="calendar" onClick={() => go("planning")}>
          Continuar planificación
        </Button>
      </div>
      <div className="stats-grid four">
        <StatCard
          icon="users"
          label="Catedráticos activos"
          value={teachers.filter((t) => t.active).length}
          note="1 inactivo"
        />
        <StatCard
          icon="book"
          label="Cursos"
          value={courses.filter((c) => c.active).length}
          note={`${courses.length} registrados`}
          tone="green"
        />
        <StatCard
          icon="calendar"
          label="Secciones planificadas"
          value={plannedSections}
          note="Desde la planificación actual"
          tone="orange"
        />
        <StatCard
          icon="report"
          label="Estado actual"
          value={plans[0]?.status || "Sin planificación"}
          note={`${plans[0]?.assignments.length || 0} asignaciones`}
          tone="gray"
        />
      </div>
      <div className="split-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Últimas asignaciones</h3>
              <p>Cambios recientes en la planificación</p>
            </div>
          </div>
          <div className="activity-list">
            {recentAssignments.map((a) => (
              <div className="activity" key={a.id}>
                <div className="activity-icon">
                  <Icon name="book" />
                </div>
                <div>
                  <strong>{courses.find((c) => c.id === a.courseId)?.name}</strong>
                  <span>
                    {teachers.find((t) => t.id === a.teacherId)?.name} · Sección {a.section}
                  </span>
                </div>
                <small>
                  {a.day}
                  <br />
                  {a.start}
                </small>
              </div>
            ))}
          </div>
        </section>
        <section className="panel action-panel">
          <div className="action-hero">
            <Icon name="calendar" size={28} />
          </div>
          <h3>Planificación de horarios</h3>
          <p>Asigne cursos, catedráticos, salones y horarios en la matriz semanal.</p>
          <Badge status="Borrador" />
          <Button onClick={() => go("planning")}>Abrir planificación</Button>
        </section>
      </div>
    </div>
  );
}

function Teachers({
  teachers,
  setTeachers,
  notify,
  onPersist,
  onToggle,
}: {
  teachers: Teacher[];
  setTeachers: (v: Teacher[]) => void;
  notify: (s: string) => void;
  onPersist?: (teacher: Teacher) => Promise<Teacher>;
  onToggle?: (teacher: Teacher) => Promise<Teacher>;
}) {
  const [query, setQuery] = useState("");
  const [edit, setEdit] = useState<Teacher | "new" | null>(null);
  const filtered = teachers.filter((t) =>
    `${t.name} ${t.code}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="page-stack">
      <div className="page-title">
        <div>
          <h2>Gestión de catedráticos</h2>
          <p>Administre la información del personal docente.</p>
        </div>
        <Button icon="plus" onClick={() => setEdit("new")}>
          Nuevo catedrático
        </Button>
      </div>
      <section className="panel">
        <div className="toolbar">
          <div className="search">
            <Icon name="search" />
            <input
              placeholder="Buscar por nombre o código..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <span className="record-count">{filtered.length} registros</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre completo</th>
                <th>Correo institucional</th>
                <th>Teléfono</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td>
                    <b>{t.code}</b>
                  </td>
                  <td>{t.name}</td>
                  <td className="muted">{t.email}</td>
                  <td>{t.phone}</td>
                  <td>
                    <Badge status={t.active ? "Activo" : "Inactivo"} />
                  </td>
                  <td>
                    <div className="row-actions">
                      <button onClick={() => setEdit(t)} title="Editar">
                        <Icon name="edit" />
                      </button>
                      <button
                        onClick={() => {
                          if (onToggle) void onToggle(t).then((updated) => {
                            setTeachers(teachers.map((x) => (x.id === updated.id ? updated : x)));
                            notify(updated.active ? "Catedrático activado" : "Catedrático desactivado");
                          }).catch((error) => notify(error.message));
                          else {
                            setTeachers(teachers.map((x) => (x.id === t.id ? { ...x, active: !x.active } : x)));
                            notify(t.active ? "Catedrático desactivado" : "Catedrático activado");
                          }
                        }}
                        title="Cambiar estado"
                      >
                        <Icon name={t.active ? "x" : "check"} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {edit && (
        <TeacherModal
          teacher={edit === "new" ? undefined : edit}
          onClose={() => setEdit(null)}
          onSave={(t) => {
            if (onPersist) {
              void onPersist(t).then((saved) => {
                setTeachers(edit === "new" ? [...teachers, saved] : teachers.map((x) => (x.id === saved.id ? saved : x)));
                setEdit(null);
                notify(edit === "new" ? "Catedrático registrado correctamente" : "Información actualizada correctamente");
              }).catch((error) => notify(error.message));
              return;
            }
            setTeachers(
              edit === "new"
                ? [...teachers, { ...t, id: Date.now() }]
                : teachers.map((x) => (x.id === t.id ? t : x)),
            );
            setEdit(null);
            notify(
              edit === "new"
                ? "Catedrático registrado correctamente"
                : "Información actualizada correctamente",
            );
          }}
        />
      )}
    </div>
  );
}

function TeacherModal({
  teacher,
  onClose,
  onSave,
}: {
  teacher?: Teacher;
  onClose: () => void;
  onSave: (t: Teacher) => void;
}) {
  const parts = teacher?.name.split(" ") || [];
  const [form, setForm] = useState({
    code: teacher?.code || "",
    names: parts.slice(0, 2).join(" "),
    surnames: parts.slice(2).join(" "),
    email: teacher?.email || "",
    phone: teacher?.phone || "",
    active: teacher?.active ?? true,
  });
  return (
    <Modal
      title={teacher ? "Editar catedrático" : "Nuevo catedrático"}
      subtitle="Complete la información institucional."
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave({
            id: teacher?.id || 0,
            code: form.code,
            name: `${form.names} ${form.surnames}`.trim(),
            email: form.email,
            phone: form.phone,
            active: form.active,
          });
        }}
      >
        <div className="modal-body form-grid">
          <Field label="Código">
            <input
              required
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="CAT-008"
            />
          </Field>
          <Field label="Estado">
            <select
              value={String(form.active)}
              onChange={(e) => setForm({ ...form, active: e.target.value === "true" })}
            >
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </select>
          </Field>
          <Field label="Nombres">
            <input
              required
              value={form.names}
              onChange={(e) => setForm({ ...form, names: e.target.value })}
            />
          </Field>
          <Field label="Apellidos">
            <input
              required
              value={form.surnames}
              onChange={(e) => setForm({ ...form, surnames: e.target.value })}
            />
          </Field>
          <Field label="Correo institucional" wide>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Teléfono" wide>
            <input
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
        </div>
        <ModalActions
          onClose={onClose}
          submit={teacher ? "Guardar cambios" : "Registrar catedrático"}
        />
      </form>
    </Modal>
  );
}

function Courses({
  courses,
  setCourses,
  notify,
  onPersist,
  cycles,
}: {
  courses: Course[];
  setCourses: (v: Course[]) => void;
  notify: (s: string) => void;
  onPersist?: (course: Course) => Promise<Course>;
  cycles: Cycle[];
}) {
  const [query, setQuery] = useState("");
  const [cycle, setCycle] = useState("");
  const [edit, setEdit] = useState<Course | "new" | null>(null);
  const filtered = courses.filter(
    (c) =>
      `${c.name} ${c.code}`.toLowerCase().includes(query.toLowerCase()) &&
      (!cycle || c.cycle === +cycle),
  );
  return (
    <div className="page-stack">
      <div className="page-title">
        <div>
          <h2>Gestión de cursos</h2>
          <p>Catálogo de cursos del pensum académico.</p>
        </div>
        <Button icon="plus" onClick={() => setEdit("new")}>
          Nuevo curso
        </Button>
      </div>
      <section className="panel">
        <div className="toolbar">
          <div className="search">
            <Icon name="search" />
            <input
              placeholder="Buscar curso..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select value={cycle} onChange={(e) => setCycle(e.target.value)}>
            <option value="">Todos los ciclos</option>
            {cycles.filter((cycle) => cycle.activo).map((cycle) => (
              <option key={cycle.id_ciclo} value={cycle.numero}>
                {cycle.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre del curso</th>
                <th>Ciclo</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>
                    <b>{c.code}</b>
                  </td>
                  <td>{c.name}</td>
                  <td>{c.cycle}° ciclo</td>
                  <td>
                    <Badge status={c.active ? "Activo" : "Inactivo"} />
                  </td>
                  <td>
                    <div className="row-actions">
                      <button onClick={() => setEdit(c)}>
                        <Icon name="edit" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {edit && (
        <CourseModal
          course={edit === "new" ? undefined : edit}
          cycles={cycles}
          onClose={() => setEdit(null)}
          onSave={(c) => {
            if (onPersist) {
              void onPersist(c).then((saved) => {
                setCourses(edit === "new" ? [...courses, saved] : courses.map((x) => (x.id === saved.id ? saved : x)));
                setEdit(null);
                notify("Curso guardado correctamente");
              }).catch((error) => notify(error.message));
              return;
            }
            setCourses(
              edit === "new"
                ? [...courses, { ...c, id: Date.now() }]
                : courses.map((x) => (x.id === c.id ? c : x)),
            );
            setEdit(null);
            notify("Curso guardado correctamente");
          }}
        />
      )}
    </div>
  );
}

function CourseModal({
  course,
  onClose,
  onSave,
  cycles,
}: {
  course?: Course;
  onClose: () => void;
  onSave: (c: Course) => void;
  cycles: Cycle[];
}) {
  const [form, setForm] = useState({
    code: course?.code || "",
    name: course?.name || "",
    cycle: course?.cycle || 1,
    description: course?.description || "",
    active: course?.active ?? true,
  });
  return (
    <Modal
      title={course ? "Editar curso" : "Nuevo curso"}
      subtitle="Información académica del curso."
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ ...form, id: course?.id || 0 });
        }}
      >
        <div className="modal-body form-grid">
          <Field label="Código del curso">
            <input
              required
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
          </Field>
          <Field label="Ciclo académico">
            <select
              value={form.cycle}
              onChange={(e) => setForm({ ...form, cycle: +e.target.value })}
            >
              {cycles.filter((cycle) => cycle.activo).map((cycle) => (
                <option key={cycle.id_ciclo} value={cycle.numero}>
                  {cycle.nombre}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nombre del curso" wide>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Descripción (opcional)" wide>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <Field label="Estado">
            <select
              value={String(form.active)}
              onChange={(e) => setForm({ ...form, active: e.target.value === "true" })}
            >
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </select>
          </Field>
        </div>
        <ModalActions onClose={onClose} submit="Guardar curso" />
      </form>
    </Modal>
  );
}

function Planning({
  plans,
  setPlans,
  teachers,
  courses,
  notify,
  onSend,
  onPublish,
  onAssignmentSave,
  onAssignmentRemove,
  onCreatePlan,
  cycles,
  periods,
  sections,
  rooms,
  onSectionCreate,
}: {
  plans: Plan[];
  setPlans: (v: Plan[]) => void;
  teachers: Teacher[];
  courses: Course[];
  notify: (s: string) => void;
  onSend?: (plan: Plan) => Promise<void>;
  onPublish?: (plan: Plan) => Promise<void>;
  onAssignmentSave?: (plan: Plan, assignment: Assignment) => Promise<Assignment>;
  onAssignmentRemove?: (plan: Plan, assignment: Assignment) => Promise<void>;
  onCreatePlan?: () => Promise<Plan>;
  cycles: Cycle[];
  periods: Period[];
  sections: Section[];
  rooms: Room[];
  onSectionCreate?: (plan: Plan, name: string, capacity: number, cycleId: number) => Promise<void>;
}) {
  const [planId, setPlanId] = useState(plans[0]?.id || 0);
  const [statusFilter, setStatusFilter] = useState("");
  const [cycleFilter, setCycleFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const plan = plans.find((p) => p.id === planId) || plans[0];
  const [modal, setModal] = useState<Assignment | "new" | "section" | null>(null);
  const teacherLoads = useMemo(
    () =>
      teachers
        .filter((teacher) => teacher.active)
        .map((teacher) => ({
          teacher,
          courses: Math.max(0, ...["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map((day) => new Set(plan.assignments.filter((assignment) => assignment.teacherId === teacher.id && assignment.day === day).map((assignment) => assignment.courseId)).size)),
        }))
        .sort((a, b) => a.courses - b.courses),
    [teachers, plan.assignments],
  );
  const unassignedTeachers = teacherLoads.filter((item) => item.courses === 0).length;
  const editable = plan.status === "Borrador" || plan.status === "Rechazada";
  const planSections = sections.filter((section) => Number(section.id_periodo) === Number(plan.periodId));
  const filteredSections = planSections.filter((section) => !cycleFilter || Number(section.id_ciclo) === Number(cycleFilter));
  const sectionNames = [...new Set(filteredSections.filter((section) => section.estado === "ACTIVA").map((section) => section.nombre))].sort();
  const planningYears = [...new Set(plans.map((item) => item.year))].sort((a, b) => b - a);
  const planningSemesters = [...new Set(plans.map((item) => item.semester))];
  const planningStatuses = [...new Set(plans.map((item) => item.status))];
  const visibleAssignments = plan.assignments.filter((assignment) =>
    (!cycleFilter || assignment.cycleId === Number(cycleFilter) || assignment.cycle === Number(cycleFilter)) &&
    (!sectionFilter || assignment.sectionId === Number(sectionFilter) || assignment.section === sectionFilter),
  );
  const updatePlan = (patch: Partial<Plan>) =>
    setPlans(plans.map((p) => (p.id === plan.id ? { ...p, ...patch } : p)));
  function send() {
    if (onSend) {
      void onSend(plan).then(() => {
        updatePlan({ status: "Pendiente de aprobación", sent: new Date().toLocaleDateString("es-GT"), rejection: undefined });
        notify("Planificación enviada al Director");
      }).catch((error) => notify(error.message));
      return;
    }
    updatePlan({ status: "Pendiente de aprobación", sent: new Date().toLocaleDateString("es-GT"), rejection: undefined });
    notify(
      plan.status === "Rechazada"
        ? "Planificación reenviada para aprobación"
        : "Planificación enviada al Director",
    );
  }
  return (
    <div className="page-stack">
      <div className="page-title planning-title">
        <div>
          <h2>Planificación de horarios</h2>
          <p>Organice la oferta académica por ciclo, sección y bloque semanal.</p>
        </div>
        <div className="page-actions">
          {onCreatePlan && (
            <Button variant="secondary" icon="plus" onClick={() => {
              void onCreatePlan().then((newPlan) => {
                setPlans([...plans, newPlan]);
                setPlanId(newPlan.id);
                setStatusFilter(newPlan.status);
                setCycleFilter("");
                setSectionFilter("");
                notify(newPlan.status === "Rechazada" ? "Planificación rechazada abierta para corrección" : "Nueva planificación creada como borrador");
              }).catch((error) => notify(error.message));
            }}>
              Nueva planificación
            </Button>
          )}
          {editable && (
            <>
              <Button variant="secondary" onClick={() => notify("Borrador guardado correctamente")}>
                Guardar borrador
              </Button>
              <Button onClick={send}>
                {plan.status === "Rechazada"
                  ? "Reenviar para aprobación"
                  : "Enviar para aprobación"}
              </Button>
            </>
          )}
        </div>
      </div>
      <section className="panel filter-bar">
        <Field label="Estado">
          <select value={statusFilter || plan.status} onChange={(e) => {
            setStatusFilter(e.target.value);
            const nextPlan = plans.find((item) => item.status === e.target.value);
            if (nextPlan) setPlanId(nextPlan.id);
          }}>
            {planningStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </Field>
        <Field label="Año">
          <select value={plan.year || ""} onChange={(e) => {
            const nextPlan = plans.find((item) => item.year === Number(e.target.value));
            if (nextPlan) { setPlanId(nextPlan.id); setStatusFilter(nextPlan.status); }
          }}>
            {planningYears.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </Field>
        <Field label="Semestre">
          <select value={plan.semester} onChange={(e) => {
            const nextPlan = plans.find((item) => item.year === plan.year && item.semester === e.target.value);
            if (nextPlan) { setPlanId(nextPlan.id); setStatusFilter(nextPlan.status); }
          }}>
            {planningSemesters.map((semester) => <option key={semester} value={semester}>{semester === "Primer semestre" ? "Primero" : "Segundo"}</option>)}
          </select>
        </Field>
        <Field label="Ciclo">
          <select value={cycleFilter} onChange={(e) => { setCycleFilter(e.target.value); setSectionFilter(""); }}>
            <option>Todos</option>
            {cycles.filter((cycle) => cycle.activo).map((cycle) => <option value={cycle.id_ciclo} key={cycle.id_ciclo}>{cycle.numero}° ciclo</option>)}
          </select>
        </Field>
        <Field label="Sección">
          <select value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)}>
            <option value="">Todas</option>
            {sectionNames.map((name) => <option value={name} key={name}>{name}</option>)}
          </select>
        </Field>
        <Button variant="secondary" onClick={() => {
          setStatusFilter("");
          setCycleFilter("");
          setSectionFilter("");
          if (plans[0]) setPlanId(plans[0].id);
        }}>Limpiar filtros</Button>
        <div className="status-field">
          <span>Estado</span>
          <Badge status={plan.status} />
          {plan.published && <Badge status="Publicada" />}
        </div>
      </section>
      <section className="panel teacher-load-panel">
        <div className="panel-head">
          <div>
            <h3>Carga docente diaria</h3>
            <p>Máximo de cursos distintos en un mismo día</p>
          </div>
          <div className={`unassigned-count ${unassignedTeachers === 0 ? "complete" : ""}`}>
            <span>{unassignedTeachers}</span>
            <div>
              <strong>Sin asignación</strong>
                    <small>de {teacherLoads.length} catedráticos activos</small>
            </div>
          </div>
        </div>
        <div className="teacher-load-grid">
          {teacherLoads.map(({ teacher, courses: assignedCourses }) => (
            <div className="teacher-load-item" key={teacher.id}>
              <div className="teacher-load-avatar">
                {teacher.name
                  .split(" ")
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join("")}
              </div>
              <div className="teacher-load-info">
                <div>
                  <strong>{teacher.name}</strong>
                  <span>
                    {assignedCourses === 0
                      ? "Sin cursos asignados"
                      : `${assignedCourses} ${assignedCourses === 1 ? "curso asignado" : "cursos asignados"}`}
                  </span>
                </div>
                <div className="load-dots" aria-label={`${assignedCourses} de 4 cursos asignados en un día`}>
                  {[1, 2, 3, 4].map((slot) => (
                    <i key={slot} className={slot <= assignedCourses ? "filled" : ""} />
                  ))}
                </div>
              </div>
              <b className={assignedCourses === 0 ? "empty" : ""}>{assignedCourses}/4</b>
            </div>
          ))}
        </div>
      </section>
      {plan.rejection && (
        <div className="rejection-banner">
          <div>
            <Icon name="alert" />
          </div>
          <p>
            <strong>Esta planificación requiere correcciones</strong>
            <span>Motivo del Director: {plan.rejection}</span>
          </p>
        </div>
      )}
      {plan.status === "Aprobada" && !plan.published && (
        <div className="approved-banner">
          <div>
            <Icon name="check" />
          </div>
          <p>
            <strong>Planificación aprobada</strong>
            <span>Ya puede publicarla para ponerla a disposición de la comunidad académica.</span>
          </p>
          <Button
            onClick={() => {
              if (onPublish) {
                void onPublish(plan).then(() => {
                  updatePlan({ published: true });
                  notify("Planificación publicada correctamente");
                }).catch((error) => notify(error.message));
                return;
              }
              updatePlan({ published: true });
              notify("Planificación publicada correctamente");
            }}
          >
            Publicar planificación
          </Button>
        </div>
      )}
      <section className="panel schedule-panel">
        <div className="panel-head">
          <div>
            <h3>Matriz semanal</h3>
            <p>{plan.assignments.length} asignaciones · {plan.semester} {plan.year}</p>
          </div>
          {editable && (
            <div className="page-actions">
              <Button variant="secondary" icon="plus" onClick={() => setModal("section")}>
                Nueva sección
              </Button>
              <Button icon="plus" onClick={() => setModal("new")}>
                Nueva asignación
              </Button>
            </div>
          )}
        </div>
        <Schedule
          assignments={visibleAssignments}
          courses={courses}
          teachers={teachers}
          sectionCatalog={planSections}
          onEdit={editable ? (a) => setModal(a) : undefined}
        />
      </section>
      {modal && modal !== "section" && (
        <AssignmentModal
          assignment={modal === "new" ? undefined : modal}
          assignments={plan.assignments}
          teachers={teachers}
          courses={courses}
          cycles={cycles}
          sections={planSections}
          rooms={rooms}
          onClose={() => setModal(null)}
          onSave={(a) => {
            if (onAssignmentSave) {
              void onAssignmentSave(plan, a).then((saved) => {
                updatePlan({ assignments: modal === "new" ? [...plan.assignments, saved] : plan.assignments.map((x) => (x.id === saved.id ? saved : x)) });
                setModal(null);
                notify("Asignación guardada correctamente");
              }).catch((error) => notify(error.message));
              return;
            }
            updatePlan({
              assignments:
                modal === "new"
                  ? [...plan.assignments, { ...a, id: Date.now() }]
                  : plan.assignments.map((x) => (x.id === a.id ? a : x)),
            });
            setModal(null);
            notify("Asignación guardada correctamente");
          }}
          onRemove={
            modal === "new"
              ? undefined
              : () => {
                  if (onAssignmentRemove) {
                    void onAssignmentRemove(plan, modal).then(() => {
                      updatePlan({ assignments: plan.assignments.filter((a) => a.id !== modal.id) });
                      setModal(null);
                      notify("Asignación eliminada");
                    }).catch((error) => notify(error.message));
                    return;
                  }
                  updatePlan({ assignments: plan.assignments.filter((a) => a.id !== modal.id) });
                  setModal(null);
                  notify("Asignación eliminada");
                }
          }
        />
      )}
      {modal === "section" && <SectionModal onClose={() => setModal(null)} notify={notify} cycles={cycles} onCreate={onSectionCreate ? (name, capacity, cycleId) => onSectionCreate(plan, name, capacity, cycleId) : undefined} />}
    </div>
  );
}

function overlaps(a: string, b: string, c: string, d: string) {
  return a < d && c < b;
}

function AssignmentModal({
  assignment,
  assignments,
  teachers,
  courses,
  cycles,
  sections,
  rooms,
  onClose,
  onSave,
  onRemove,
}: {
  assignment?: Assignment;
  assignments: Assignment[];
  teachers: Teacher[];
  courses: Course[];
  cycles: Cycle[];
  sections: Section[];
  rooms: Room[];
  onClose: () => void;
  onSave: (a: Assignment) => void;
  onRemove?: () => void;
}) {
  const [form, setForm] = useState<Assignment>(
    assignment || {
      id: 0,
      courseId: courses[0]?.id || 0,
      teacherId: teachers[0]?.id || 0,
      cycle: cycles[0]?.numero || 0,
      cycleId: cycles[0]?.id_ciclo,
      section: sections[0]?.nombre || "",
      sectionId: sections[0]?.id_seccion,
      room: rooms[0]?.codigo || "",
      roomId: rooms[0]?.id_salon,
      day: "Sábado",
      start: "07:00",
      end: "09:00",
    },
  );
  const [error, setError] = useState("");
  const selectedCycleId = form.cycleId || cycles.find((cycle) => cycle.numero === form.cycle)?.id_ciclo;
  const coursesForCycle = courses.filter((course) => course.active && (
    course.cycleIds?.includes(Number(selectedCycleId)) || course.cycleNumbers?.includes(Number(form.cycle)) || course.cycle === form.cycle
  ));
  const sectionsForCycle = sections.filter((section) => Number(section.id_ciclo) === Number(selectedCycleId) && section.estado === "ACTIVA");
  function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const others = assignments.filter((a) => a.id !== form.id);
    const coursesOnDay = new Set(others.filter((a) => a.teacherId === form.teacherId && a.day === form.day).map((a) => a.courseId));
    if (coursesOnDay.size >= 4 && !coursesOnDay.has(form.courseId))
      return setError("El catedrático ya tiene cuatro cursos distintos asignados ese día");
    if (
      others.some(
        (a) =>
          a.teacherId === form.teacherId &&
          a.day === form.day &&
          overlaps(a.start, a.end, form.start, form.end),
      )
    )
      return setError(
        "Conflicto de horario: el catedrático ya tiene un curso asignado en este horario",
      );
    if (
      others.some(
        (a) =>
          a.teacherId === form.teacherId && a.cycle === form.cycle && a.section === form.section,
      )
    )
      return setError(
        "Restricción académica: el catedrático ya tiene un curso asignado en esta sección",
      );
    if (
      others.some(
        (a) =>
          a.room === form.room &&
          a.day === form.day &&
          overlaps(a.start, a.end, form.start, form.end),
      )
    )
      return setError(
        "Conflicto de salón: este salón ya está ocupado durante el horario seleccionado",
      );
    if (form.start >= form.end)
      return setError("La hora de fin debe ser posterior a la hora de inicio");
    onSave({ ...form, day: "Sábado", cycle: courses.find((c) => c.id === form.courseId)?.cycle || form.cycle });
  }
  return (
    <Modal
      title={assignment ? "Editar asignación" : "Nueva asignación"}
      subtitle="Configure el bloque académico del período seleccionado."
      onClose={onClose}
      width="wide"
    >
      <form onSubmit={submit}>
        <div className="modal-body">
          {error && (
            <div className="form-error">
              <Icon name="alert" size={18} />
              {error}
            </div>
          )}
          <div className="form-grid three-col">
            <Field label="Período">
              <select>
                <option>Período de la planificación seleccionada</option>
              </select>
            </Field>
            <Field label="Ciclo">
              <select
                value={form.cycle}
                onChange={(e) => {
                  const cycleNumber = +e.target.value;
                  const cycle = cycles.find((item) => item.numero === cycleNumber);
                  const firstCourse = courses.find((course) => course.active && (
                    course.cycleIds?.includes(Number(cycle?.id_ciclo)) || course.cycleNumbers?.includes(cycleNumber) || course.cycle === cycleNumber
                  ));
                  const firstSection = sections.find((section) => Number(section.id_ciclo) === Number(cycle?.id_ciclo) && section.estado === "ACTIVA");
                  setForm({ ...form, cycle: cycleNumber, cycleId: cycle?.id_ciclo, courseId: firstCourse?.id || 0, section: firstSection?.nombre || "", sectionId: firstSection?.id_seccion });
                }}
              >
                {cycles.filter((cycle) => cycle.activo).map((cycle) => (
                  <option value={cycle.numero} key={cycle.id_ciclo}>
                    {cycle.numero}° ciclo
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Sección">
              <select
                value={form.section}
                onChange={(e) => {
                  const selected = sections.find((section) => section.nombre === e.target.value && Number(section.id_ciclo) === (form.cycleId || form.cycle));
                  setForm({ ...form, section: e.target.value, sectionId: selected?.id_seccion });
                }}
              >
                {sectionsForCycle.map((section) => (
                  <option value={section.nombre} key={section.id_seccion}>{section.nombre}</option>
                ))}
              </select>
            </Field>
            <Field label="Curso" wide>
              <select
                value={form.courseId}
                onChange={(e) => {
                  const courseId = +e.target.value;
                  const selectedCourse = coursesForCycle.find((course) => course.id === courseId);
                  const selectedCycle = cycles.find((cycle) => Number(cycle.id_ciclo) === Number(selectedCycleId));
                  setForm({ ...form, courseId, cycle: selectedCycle?.numero || selectedCourse?.cycle || 0, cycleId: selectedCycle?.id_ciclo || selectedCycleId });
                }}
              >
                {coursesForCycle.map((c) => (
                    <option value={c.id} key={c.id}>
                      {c.code} · {c.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Catedrático" wide>
              <select
                value={form.teacherId}
                onChange={(e) => setForm({ ...form, teacherId: +e.target.value })}
              >
                {teachers
                  .filter((t) => t.active)
                  .map((t) => (
                    <option value={t.id} key={t.id}>
                      {t.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Salón">
              <select
                value={form.room}
                onChange={(e) => {
                  const selected = rooms.find((room) => room.codigo === e.target.value);
                  setForm({ ...form, room: e.target.value, roomId: selected?.id_salon });
                }}
              >
                {rooms.filter((room) => room.estado === "DISPONIBLE").map((room) => (
                  <option value={room.codigo} key={room.id_salon}>{room.codigo}</option>
                ))}
              </select>
            </Field>
            <Field label="Día">
              <select value="Sábado" disabled>
                <option>Sábado</option>
              </select>
            </Field>
            <Field label="Hora de inicio">
              <select
                value={`${form.start}-${form.end}`}
                onChange={(e) => {
                  const [start, end] = e.target.value.split("-");
                  setForm({ ...form, start, end });
                }}
              >
                {CLASS_BLOCKS.map(([start, end]) => <option key={`${start}-${end}`} value={`${start}-${end}`}>{start} a {end}</option>)}
              </select>
            </Field>
          </div>
        </div>
        <div className="modal-actions">
          {onRemove && (
            <Button variant="danger-ghost" onClick={onRemove}>
              Quitar asignación
            </Button>
          )}
          <span />
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Guardar asignación</Button>
        </div>
      </form>
    </Modal>
  );
}

function SectionModal({ onClose, notify, cycles, onCreate }: { onClose: () => void; notify: (s: string) => void; cycles: Cycle[]; onCreate?: (name: string, capacity: number, cycleId: number) => Promise<void> }) {
  const [section, setSection] = useState("A");
  const [capacity, setCapacity] = useState("35");
  const [cycleId, setCycleId] = useState(cycles[0]?.id_ciclo || 0);
  const [error, setError] = useState("");
  return (
    <Modal
      title="Configurar nueva sección"
      subtitle="Cree secciones según la demanda estimada."
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (onCreate) {
            void onCreate(section, Number(capacity), cycleId).then(() => {
              onClose();
              notify(`Sección ${section} creada con cupo para ${capacity} estudiantes`);
            }).catch((reason) => setError(reason.message));
            return;
          }
          onClose();
          notify(`Sección ${section} creada con cupo para ${capacity} estudiantes`);
        }}
      >
        <div className="modal-body form-grid">
          <Field label="Ciclo académico">
            <select value={cycleId} onChange={(e) => setCycleId(Number(e.target.value))}>
              {cycles.filter((cycle) => cycle.activo).map((cycle) => <option key={cycle.id_ciclo} value={cycle.id_ciclo}>{cycle.numero}° ciclo</option>)}
            </select>
          </Field>
          <Field label="Identificador de sección">
            <select
              value={section}
              onChange={(e) => setSection(e.target.value.toUpperCase())}
            >
              {["A", "B", "C", "D", "E", "F", "G"].map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </Field>
          <Field label="Cupo estimado" wide>
            <input
              type="number"
              min="1"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </Field>
          <div className="info-note">
            <Icon name="alert" />
            <span>
              El cupo es una referencia de planificación y puede ajustarse posteriormente.
            </span>
          </div>
          {error && <div className="form-error"><Icon name="alert" size={18} />{error}</div>}
        </div>
        <ModalActions onClose={onClose} submit="Crear sección" />
      </form>
    </Modal>
  );
}

function Schedule({
  assignments,
  courses,
  teachers = [],
  sectionCatalog = [],
  compact = false,
  onEdit,
}: {
  assignments: Assignment[];
  courses: Course[];
  teachers?: Teacher[];
  sectionCatalog?: Section[];
  compact?: boolean;
  onEdit?: (a: Assignment) => void;
}) {
  const slots = ["07:00", "09:00", "11:00", "14:00", "16:00"];
  const sectionKeys = [...new Set(assignments.map((assignment) => `${assignment.cycleId || assignment.cycle}|${assignment.sectionId || assignment.section}`))].slice(0, 4);
  const columns = sectionKeys.map((key) => {
    const assignment = assignments.find((item) => `${item.cycleId || item.cycle}|${item.sectionId || item.section}` === key)!;
    const section = sectionCatalog.find((item) => Number(item.id_seccion) === Number(assignment.sectionId));
    return { key, label: `Ciclo ${assignment.cycle} · Sección ${assignment.section}`, capacity: section?.cupo_estimado };
  });
  return (
    <div className={`schedule-wrap ${compact ? "compact" : ""}`}>
      <div
        className="schedule-grid"
        style={{ gridTemplateColumns: `76px repeat(${Math.max(columns.length, 1)}, minmax(220px, 1fr))` }}
      >
        <div className="schedule-corner">Hora</div>
        {columns.map((column) => (
          <div className="schedule-day" key={column.key}>
            <strong>{column.label}</strong>
            {column.capacity ? <small>Cupo: {column.capacity}</small> : null}
          </div>
        ))}
        {slots.map((time) => (
          <Fragment key={time}>
            <div className="time-cell" key={time}>
              {time}
            </div>
            {columns.map((column) => {
              const a = assignments.find((x) => `${x.cycleId || x.cycle}|${x.sectionId || x.section}` === column.key && x.start === time);
              const c = a && courses.find((x) => x.id === a.courseId);
              return (
                <div className="schedule-cell" key={column.key + time}>
                  {a && (
                    <button className={`class-block c${a.cycle % 4}`} onClick={() => onEdit?.(a)}>
                      <strong>{c?.code}</strong>
                      <span>{c?.name}</span>
                      <small>
                        Sec. {a.section} · {a.room}
                      </small>
                      {!compact && (
                        <small>{teachers.find((t) => t.id === a.teacherId)?.name}</small>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function PlansReview({
  plans,
  setPlans,
  teachers,
  courses,
  notify,
  onDecision,
  periods,
}: {
  plans: Plan[];
  setPlans: (v: Plan[]) => void;
  teachers: Teacher[];
  courses: Course[];
  notify: (s: string) => void;
  onDecision?: (plan: Plan, decision: "approve" | "reject", reason?: string) => Promise<void>;
  periods: Period[];
}) {
  const [filter, setFilter] = useState("");
  const [review, setReview] = useState<Plan | null>(null);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const filtered = plans.filter((p) => !filter || p.status === filter);
  function update(status: PlanStatus, rejection?: string) {
    if (!review) return;
    if (onDecision) {
      const decision = status === "Aprobada" ? "approve" : "reject";
      void onDecision(review, decision, rejection).then(() => applyUpdate(status, rejection)).catch((error) => setError(error.message));
      return;
    }
    applyUpdate(status, rejection);
  }
  function applyUpdate(status: PlanStatus, rejection?: string) {
    if (!review) return;
    const changed = { ...review, status, rejection };
    setPlans(plans.map((p) => (p.id === review.id ? changed : p)));
    setReview(changed);
    setAction(null);
    notify(
      status === "Aprobada"
        ? "Planificación aprobada correctamente"
        : "Planificación rechazada y enviada al Coordinador",
    );
  }
  return (
    <div className="page-stack">
      <div className="page-title">
        <div>
          <h2>Planificaciones semestrales</h2>
          <p>Revise las propuestas enviadas por Coordinación Académica.</p>
        </div>
      </div>
      <section className="panel">
        <div className="toolbar">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">Todos los estados</option>
            <option>Pendiente de aprobación</option>
            <option>Aprobada</option>
            <option>Rechazada</option>
            <option>Borrador</option>
          </select>
          <select>
            <option>Todos los períodos</option>
            {periods.map((period) => <option key={period.id_periodo}>{period.semestre === 1 ? "Primer" : "Segundo"} semestre {period.anio}</option>)}
          </select>
          <span className="record-count">{filtered.length} planificaciones</span>
        </div>
        <PlansTable plans={filtered} action={(p) => setReview(p)} />
      </section>
      {review && (
        <Modal
          title={`Planificación · ${review.semester} ${review.year}`}
          subtitle={`Enviada por ${review.coordinator} · ${review.sent}`}
          onClose={() => setReview(null)}
          width="xwide"
        >
          <div className="modal-body review-body">
            <div className="review-summary">
              <Badge status={review.status} />
              <span>{review.assignments.length} asignaciones</span>
              <span>{new Set(review.assignments.map((a) => a.section)).size} secciones</span>
            </div>
            {review.rejection && (
              <div className="rejection-banner small">
                <div>
                  <Icon name="alert" />
                </div>
                <p>
                  <strong>Motivo del rechazo</strong>
                  <span>{review.rejection}</span>
                </p>
              </div>
            )}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Ciclo / Sección</th>
                    <th>Curso</th>
                    <th>Catedrático</th>
                    <th>Salón</th>
                    <th>Día</th>
                    <th>Horario</th>
                  </tr>
                </thead>
                <tbody>
                  {review.assignments.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <b>
                          {a.cycle}° · {a.section}
                        </b>
                      </td>
                      <td>{courses.find((c) => c.id === a.courseId)?.name}</td>
                      <td>{teachers.find((t) => t.id === a.teacherId)?.name}</td>
                      <td>{a.room}</td>
                      <td>{a.day}</td>
                      <td>
                        {a.start} – {a.end}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="modal-actions">
            <span />
            {review.status === "Pendiente de aprobación" && (
              <>
                <Button
                  variant="danger-outline"
                  onClick={() => {
                    setReason("");
                    setError("");
                    setAction("reject");
                  }}
                >
                  Rechazar planificación
                </Button>
                <Button icon="check" onClick={() => setAction("approve")}>
                  Aprobar planificación
                </Button>
              </>
            )}
            <Button variant="secondary" onClick={() => setReview(null)}>
              Cerrar
            </Button>
          </div>
        </Modal>
      )}
      {action === "approve" && (
        <Modal
          title="Aprobar planificación"
          subtitle="Confirme la decisión para este período."
          onClose={() => setAction(null)}
        >
          <div className="modal-body confirm-content">
            <div className="confirm-icon">
              <Icon name="check" size={28} />
            </div>
            <h3>¿Aprobar esta planificación?</h3>
            <p>
              La propuesta quedará disponible para que el Coordinador la publique. Esta acción
              actualizará su estado inmediatamente.
            </p>
          </div>
          <ModalActions
            onClose={() => setAction(null)}
            submit="Confirmar aprobación"
            onSubmit={() => update("Aprobada")}
          />
        </Modal>
      )}
      {action === "reject" && review && (
        <Modal
          title="Rechazar planificación"
          subtitle="La planificación volverá al Coordinador para correcciones."
          onClose={() => setAction(null)}
        >
          <div className="modal-body">
            <div className="decision-meta">
              <div>
                <span>Período</span>
                <b>
                  {review.semester} {review.year}
                </b>
              </div>
              <div>
                <span>Coordinador</span>
                <b>{review.coordinator}</b>
              </div>
              <div>
                <span>Fecha de envío</span>
                <b>{review.sent}</b>
              </div>
            </div>
            <Field label="Motivo del rechazo">
              <textarea
                className="reason"
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setError("");
                }}
                placeholder="Describa los motivos por los cuales la planificación requiere correcciones..."
              />
            </Field>
            {error && (
              <p className="field-error">Debe escribir un motivo antes de confirmar el rechazo.</p>
            )}
          </div>
          <ModalActions
            onClose={() => setAction(null)}
            submit="Confirmar rechazo"
            danger
            onSubmit={() =>
              reason.trim() ? update("Rechazada", reason.trim()) : setError("required")
            }
          />
        </Modal>
      )}
    </div>
  );
}

function PlansTable({ plans, action }: { plans: Plan[]; action: (p: Plan) => void }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Período</th>
            <th>Fecha de envío</th>
            <th>Coordinador responsable</th>
            <th>Estado</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          {plans.map((p) => (
            <tr key={p.id}>
              <td>
                <b>
                  {p.semester} {p.year}
                </b>
                {p.published && <small className="published">Publicada</small>}
              </td>
              <td>{p.sent}</td>
              <td>{p.coordinator}</td>
              <td>
                <Badge status={p.status} />
              </td>
              <td>
                <Button variant="table" icon="eye" onClick={() => action(p)}>
                  Revisar
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MyCourses({ assignments, courses, teacherId, periodLabel }: { assignments: Assignment[]; courses: Course[]; teacherId?: number; periodLabel: string }) {
  const mine = assignments.filter((a) => !teacherId || a.teacherId === teacherId);
  return (
    <div className="page-stack">
      <div className="page-title">
        <div>
          <h2>Mis cursos asignados</h2>
          <p>{periodLabel} · Información de solo lectura.</p>
        </div>
        <Badge status="Período activo" />
      </div>
      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Curso</th>
                <th>Ciclo</th>
                <th>Sección</th>
                <th>Salón</th>
                <th>Día</th>
                <th>Horario</th>
              </tr>
            </thead>
            <tbody>
              {mine.map((a) => {
                const c = courses.find((x) => x.id === a.courseId);
                return (
                  <tr key={a.id}>
                    <td>
                      <b>{c?.code}</b>
                    </td>
                    <td>{c?.name}</td>
                    <td>{a.cycle}° ciclo</td>
                    <td>
                      <span className="section-pill">{a.section}</span>
                    </td>
                    <td>{a.room}</td>
                    <td>{a.day}</td>
                    <td>
                      {a.start} – {a.end}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Reports({
  role,
  plan,
  courses,
  teachers,
  notify,
  teacherId,
  cycles,
  periods,
  sections,
  onQuery,
}: {
  role: Role;
  plan: Plan;
  courses: Course[];
  teachers: Teacher[];
  notify: (s: string) => void;
  teacherId?: number;
  cycles: Cycle[];
  periods: Period[];
  sections: Section[];
  onQuery: (filters: { periodId?: string; cycleId?: string; sectionId?: string }) => Promise<Assignment[]>;
}) {
  const [periodId, setPeriodId] = useState(String(plan.periodId || ""));
  const [cycleId, setCycleId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [reportAssignments, setReportAssignments] = useState<Assignment[]>(plan.assignments);
  const selectedPeriod = periods.find((period) => Number(period.id_periodo) === Number(periodId));
  const rows = reportAssignments.filter((assignment) =>
    (role !== "teacher" || !teacherId || assignment.teacherId === teacherId) &&
    (!cycleId || assignment.cycleId === Number(cycleId) || assignment.cycle === Number(cycleId)) &&
    (!sectionId || assignment.sectionId === Number(sectionId) || assignment.section === sectionId),
  );
  const reportSections = sections.filter((section) => !periodId || Number(section.id_periodo) === Number(periodId));
  const reportSectionNames = [...new Set(reportSections.map((section) => section.nombre))].sort();
  const reportYears = [...new Set(periods.map((period) => period.anio))].sort((a, b) => b - a);
  const reportSemesters = [...new Set(periods.map((period) => period.semestre))].sort();
  return (
    <div className="page-stack">
      <div className="page-title">
        <div>
          <h2>{role === "teacher" ? "Mi horario personal" : "Reporte general de planificación"}</h2>
          <p>Consulta académica del período seleccionado.</p>
        </div>
        <div className="page-actions">
          <Button variant="secondary" icon="printer" onClick={() => window.print()}>
            Imprimir
          </Button>
          {role !== "teacher" && (
            <Button
              icon="download"
              onClick={() => notify("El reporte PDF se generó correctamente (simulación)")}
            >
              Exportar PDF
            </Button>
          )}
        </div>
      </div>
      <section className="panel report-filters">
        <Field label="Año">
          <select value={selectedPeriod?.anio || ""} onChange={(e) => {
            const next = periods.filter((period) => Number(period.anio) === Number(e.target.value)).sort((a, b) => b.semestre - a.semestre)[0];
            if (next) setPeriodId(String(next.id_periodo));
          }}>
            {reportYears.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </Field>
        <Field label="Semestre">
          <select value={selectedPeriod?.semestre || ""} onChange={(e) => {
            const next = periods.find((period) => Number(period.anio) === Number(selectedPeriod?.anio) && Number(period.semestre) === Number(e.target.value));
            if (next) setPeriodId(String(next.id_periodo));
          }}>
            {reportSemesters.map((semester) => <option key={semester} value={semester}>{semester === 1 ? "Primero" : "Segundo"}</option>)}
          </select>
        </Field>
        <Field label="Ciclo">
          <select value={cycleId} onChange={(e) => { setCycleId(e.target.value); setSectionId(""); }}>
            <option>Todos</option>
            {cycles.filter((cycle) => cycle.activo).map((cycle) => <option key={cycle.id_ciclo} value={cycle.id_ciclo}>{cycle.numero}° ciclo</option>)}
          </select>
        </Field>
        <Field label="Sección">
          <select value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
            <option value="">Todas</option>
            {reportSectionNames.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </Field>
        <Button onClick={() => void onQuery({ periodId, cycleId, sectionId }).then((result) => {
          setReportAssignments(result);
          notify("Reporte actualizado");
        }).catch((error) => notify(error.message))}>Consultar</Button>
      </section>
      <section className="panel printable">
        <div className="report-heading">
          <img
            className="university-logo report-logo"
            src={umgLogo}
            alt="Escudo de la Universidad Mariano Gálvez de Guatemala"
          />
          <div>
            <span>UNIVERSIDAD MARIANO GÁLVEZ DE GUATEMALA</span>
            <h2>Planificación académica</h2>
            <p>{selectedPeriod ? `${selectedPeriod.semestre === 1 ? "Primer" : "Segundo"} semestre ${selectedPeriod.anio}` : "Período no seleccionado"} · Generado para consulta</p>
          </div>
          <Badge status={plan.published ? "Publicada" : plan.status} />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ciclo</th>
                <th>Sección</th>
                <th>Código</th>
                <th>Curso</th>
                <th>Catedrático</th>
                <th>Día</th>
                <th>Inicio</th>
                <th>Fin</th>
                <th>Salón</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => {
                const c = courses.find((x) => x.id === a.courseId);
                return (
                  <tr key={a.id}>
                    <td>{a.cycle}°</td>
                    <td>
                      <b>{a.section}</b>
                    </td>
                    <td>{c?.code}</td>
                    <td>{c?.name}</td>
                    <td>{teachers.find((t) => t.id === a.teacherId)?.name}</td>
                    <td>{a.day}</td>
                    <td>{a.start}</td>
                    <td>{a.end}</td>
                    <td>{a.room}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="report-footer">
          <span>{rows.length} asignaciones</span>
          <span>Documento de consulta académica</span>
        </div>
      </section>
    </div>
  );
}

function Profile({ user }: { user: { email: string; name: string; role: string } }) {
  return (
    <div className="profile-layout">
      <section className="panel profile-card">
        <div className="profile-avatar">
          {user.name
            .split(" ")
            .map((x) => x[0])
            .slice(0, 2)
            .join("")}
        </div>
        <h2>{user.name}</h2>
        <Badge status={user.role} />
        <p>Información de su cuenta institucional</p>
      </section>
      <section className="panel profile-info">
        <div className="panel-head">
          <div>
            <h3>Información personal</h3>
            <p>Datos asociados a su acceso</p>
          </div>
        </div>
        <div className="info-rows">
          <div>
            <span>Nombre completo</span>
            <strong>{user.name}</strong>
          </div>
          <div>
            <span>Correo institucional</span>
            <strong>{user.email}</strong>
          </div>
          <div>
            <span>Rol en el sistema</span>
            <strong>{user.role}</strong>
          </div>
          <div>
            <span>Estado de la cuenta</span>
            <Badge status="Activo" />
          </div>
        </div>
        <div className="info-note">
          <Icon name="alert" />
          <span>Para actualizar sus datos personales, comuníquese con Coordinación Académica.</span>
        </div>
      </section>
    </div>
  );
}

function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`field ${wide ? "wide" : ""}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}
function ModalActions({
  onClose,
  submit,
  onSubmit,
  danger,
}: {
  onClose: () => void;
  submit: string;
  onSubmit?: () => void;
  danger?: boolean;
}) {
  return (
    <div className="modal-actions">
      <span />
      <Button variant="secondary" onClick={onClose}>
        Cancelar
      </Button>
      <Button
        type={onSubmit ? "button" : "submit"}
        variant={danger ? "danger" : "primary"}
        onClick={onSubmit}
      >
        {submit}
      </Button>
    </div>
  );
}

export default App;
