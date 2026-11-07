import { FormEvent, Fragment, ReactNode, useMemo, useState } from "react";
import umgLogo from "./assets/umg-logo.jpg";

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
  description?: string;
  active: boolean;
};
type Assignment = {
  id: number;
  courseId: number;
  teacherId: number;
  cycle: number;
  section: string;
  room: string;
  day: string;
  start: string;
  end: string;
};
type Plan = {
  id: number;
  year: number;
  semester: string;
  sent: string;
  coordinator: string;
  status: PlanStatus;
  rejection?: string;
  published?: boolean;
  assignments: Assignment[];
};

const teachersSeed: Teacher[] = [
  {
    id: 1,
    code: "CAT-001",
    name: "Ana Lucía Méndez",
    email: "amendez@universidad.edu.gt",
    phone: "5551-1201",
    active: true,
  },
  {
    id: 2,
    code: "CAT-002",
    name: "Carlos Roberto López",
    email: "clopez@universidad.edu.gt",
    phone: "5551-1202",
    active: true,
  },
  {
    id: 3,
    code: "CAT-003",
    name: "María Fernanda Ruiz",
    email: "mruiz@universidad.edu.gt",
    phone: "5551-1203",
    active: true,
  },
  {
    id: 4,
    code: "CAT-004",
    name: "Jorge Estuardo Castillo",
    email: "jcastillo@universidad.edu.gt",
    phone: "5551-1204",
    active: true,
  },
  {
    id: 5,
    code: "CAT-005",
    name: "Sofía Alejandra Morales",
    email: "smorales@universidad.edu.gt",
    phone: "5551-1205",
    active: true,
  },
  {
    id: 6,
    code: "CAT-006",
    name: "Luis Alberto Gómez",
    email: "lgomez@universidad.edu.gt",
    phone: "5551-1206",
    active: true,
  },
  {
    id: 7,
    code: "CAT-007",
    name: "Paola Andrea Herrera",
    email: "pherrera@universidad.edu.gt",
    phone: "5551-1207",
    active: false,
  },
];

const coursesSeed: Course[] = [
  { id: 1, code: "MAT-101", name: "Matemática I", cycle: 1, active: true },
  { id: 2, code: "PRO-101", name: "Introducción a la Programación", cycle: 1, active: true },
  { id: 3, code: "FIS-201", name: "Física I", cycle: 2, active: true },
  { id: 4, code: "PRO-202", name: "Programación II", cycle: 2, active: true },
  { id: 5, code: "BDD-301", name: "Bases de Datos I", cycle: 3, active: true },
  { id: 6, code: "EST-301", name: "Estadística", cycle: 3, active: true },
  { id: 7, code: "RED-401", name: "Redes de Computadoras", cycle: 4, active: true },
  { id: 8, code: "ING-402", name: "Ingeniería de Software", cycle: 4, active: true },
  { id: 9, code: "SO-501", name: "Sistemas Operativos", cycle: 5, active: true },
  { id: 10, code: "IA-701", name: "Inteligencia Artificial", cycle: 7, active: true },
];

const baseAssignments: Assignment[] = [
  {
    id: 1,
    courseId: 1,
    teacherId: 1,
    cycle: 1,
    section: "A",
    room: "A-101",
    day: "Lunes",
    start: "07:00",
    end: "08:30",
  },
  {
    id: 2,
    courseId: 2,
    teacherId: 2,
    cycle: 1,
    section: "A",
    room: "A-102",
    day: "Martes",
    start: "08:30",
    end: "10:00",
  },
  {
    id: 3,
    courseId: 3,
    teacherId: 3,
    cycle: 2,
    section: "A",
    room: "B-201",
    day: "Miércoles",
    start: "10:00",
    end: "11:30",
  },
  {
    id: 4,
    courseId: 4,
    teacherId: 1,
    cycle: 2,
    section: "B",
    room: "B-202",
    day: "Jueves",
    start: "07:00",
    end: "08:30",
  },
  {
    id: 5,
    courseId: 5,
    teacherId: 4,
    cycle: 3,
    section: "A",
    room: "A-101",
    day: "Lunes",
    start: "10:00",
    end: "11:30",
  },
  {
    id: 6,
    courseId: 6,
    teacherId: 1,
    cycle: 3,
    section: "B",
    room: "B-201",
    day: "Viernes",
    start: "08:30",
    end: "10:00",
  },
  {
    id: 7,
    courseId: 7,
    teacherId: 5,
    cycle: 4,
    section: "A",
    room: "A-102",
    day: "Martes",
    start: "10:00",
    end: "11:30",
  },
  {
    id: 8,
    courseId: 8,
    teacherId: 1,
    cycle: 4,
    section: "C",
    room: "B-202",
    day: "Miércoles",
    start: "13:00",
    end: "14:30",
  },
];

const initialPlans: Plan[] = [
  {
    id: 1,
    year: 2027,
    semester: "Primer semestre",
    sent: "—",
    coordinator: "Lic. Elena Ramírez",
    status: "Borrador",
    assignments: baseAssignments,
  },
  {
    id: 2,
    year: 2027,
    semester: "Primer semestre",
    sent: "14 ene 2027",
    coordinator: "Lic. Elena Ramírez",
    status: "Pendiente de aprobación",
    assignments: baseAssignments.slice(0, 7),
  },
  {
    id: 3,
    year: 2026,
    semester: "Segundo semestre",
    sent: "10 nov 2026",
    coordinator: "Lic. Elena Ramírez",
    status: "Rechazada",
    rejection:
      "Revisar el traslape de salón en la sección B y completar la asignación del tercer ciclo.",
    assignments: baseAssignments.slice(0, 5),
  },
  {
    id: 4,
    year: 2026,
    semester: "Primer semestre",
    sent: "18 may 2026",
    coordinator: "Lic. Elena Ramírez",
    status: "Aprobada",
    published: true,
    assignments: baseAssignments.slice(0, 6),
  },
];

const users = {
  director: { email: "director@universidad.edu.gt", name: "Dr. Ricardo Valdés", role: "Director" },
  coordinator: {
    email: "coordinador@universidad.edu.gt",
    name: "Lic. Elena Ramírez",
    role: "Coordinador académico",
  },
  teacher: { email: "docente@universidad.edu.gt", name: "Ana Lucía Méndez", role: "Catedrático" },
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

function Login({ onLogin }: { onLogin: (role: Role) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  function submit(e: FormEvent) {
    e.preventDefault();
    const entry = (Object.entries(users) as [Role, typeof users.director][]).find(
      ([, u]) => u.email === email.trim().toLowerCase(),
    );
    if (!entry || password !== "Demo123")
      return setError("El correo o la contraseña no son correctos. Inténtelo nuevamente.");
    onLogin(entry[0]);
  }
  const choose = (role: Role) => {
    setEmail(users[role].email);
    setPassword("Demo123");
    setError("");
  };
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
            <strong>01 · 2027</strong>
            <p>Primer semestre</p>
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
          <div className="demo-box">
            <span>Acceso de demostración</span>
            <p>Seleccione el perfil que desea explorar:</p>
            <div className="demo-buttons">
              <button onClick={() => choose("director")}>Director</button>
              <button onClick={() => choose("coordinator")}>Coordinador</button>
              <button onClick={() => choose("teacher")}>Catedrático</button>
            </div>
          </div>
          <small className="prototype-note">Entorno de demostración · Sin acceso real</small>
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
  const [page, setPage] = useState<Page>("home");
  const [sidebar, setSidebar] = useState(false);
  const [teachers, setTeachers] = useState(teachersSeed);
  const [courses, setCourses] = useState(coursesSeed);
  const [plans, setPlans] = useState(initialPlans);
  const [toast, setToast] = useState("");

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3000);
  }
  if (!role)
    return (
      <Login
        onLogin={(r) => {
          setRole(r);
          setPage("home");
        }}
      />
    );

  const user = users[role];
  const allowed = navByRole[role].map((n) => n.page);
  const safePage = allowed.includes(page) ? page : "home";
  const title = navByRole[role].find((n) => n.page === safePage)?.label || "Inicio";
  const logout = () => {
    setRole(null);
    setPage("home");
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
            <p>Primer semestre 2027</p>
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
              go={setPage}
            />
          )}
          {safePage === "teachers" && (
            <Teachers teachers={teachers} setTeachers={setTeachers} notify={notify} />
          )}
          {safePage === "courses" && (
            <Courses courses={courses} setCourses={setCourses} notify={notify} />
          )}
          {safePage === "planning" && (
            <Planning
              plans={plans}
              setPlans={setPlans}
              teachers={teachers}
              courses={courses}
              notify={notify}
            />
          )}
          {safePage === "plans" && (
            <PlansReview
              plans={plans}
              setPlans={setPlans}
              teachers={teachers}
              courses={courses}
              notify={notify}
            />
          )}
          {safePage === "my-courses" && (
            <MyCourses assignments={plans[0].assignments} courses={courses} />
          )}
          {safePage === "schedule" && (
            <Schedule
              assignments={plans[0].assignments.filter((a) => a.teacherId === 1)}
              courses={courses}
              compact={false}
            />
          )}
          {safePage === "reports" && (
            <Reports
              role={role}
              plan={plans.find((p) => p.published) || plans[0]}
              courses={courses}
              teachers={teachers}
              notify={notify}
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
  go,
}: {
  role: Role;
  plans: Plan[];
  teachers: Teacher[];
  courses: Course[];
  go: (p: Page) => void;
}) {
  if (role === "director")
    return (
      <div className="page-stack">
        <div className="welcome">
          <div>
            <span className="eyebrow">RESUMEN EJECUTIVO</span>
            <h2>Buenos días, Dr. Valdés</h2>
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
    const mine = plans[0].assignments.filter((a) => a.teacherId === 1);
    return (
      <div className="page-stack">
        <div className="welcome">
          <div>
            <span className="eyebrow">PANEL DOCENTE</span>
            <h2>Buenos días, Ana Lucía</h2>
            <p>Consulte sus cursos y horario para el período actual.</p>
          </div>
          <Badge status="Período activo" />
        </div>
        <div className="stats-grid three">
          <StatCard
            icon="book"
            label="Cursos asignados"
            value={mine.length}
            note="Primer semestre 2027"
          />
          <StatCard
            icon="calendar"
            label="Próximo bloque"
            value="Lun 07:00"
            note="Matemática I · A-101"
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
          <h2>Primer semestre 2027</h2>
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
          note="10 en el pensum"
          tone="green"
        />
        <StatCard
          icon="calendar"
          label="Secciones planificadas"
          value="5"
          note="Ciclos 1 al 4"
          tone="orange"
        />
        <StatCard
          icon="report"
          label="Estado actual"
          value="Borrador"
          note="8 asignaciones"
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
            {baseAssignments.slice(0, 4).map((a) => (
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
}: {
  teachers: Teacher[];
  setTeachers: (v: Teacher[]) => void;
  notify: (s: string) => void;
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
                          setTeachers(
                            teachers.map((x) => (x.id === t.id ? { ...x, active: !x.active } : x)),
                          );
                          notify(t.active ? "Catedrático desactivado" : "Catedrático activado");
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
}: {
  courses: Course[];
  setCourses: (v: Course[]) => void;
  notify: (s: string) => void;
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
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <option key={n} value={n}>
                Ciclo {n}
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
          onClose={() => setEdit(null)}
          onSave={(c) => {
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
}: {
  course?: Course;
  onClose: () => void;
  onSave: (c: Course) => void;
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
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <option key={n} value={n}>
                  {n}° ciclo
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
}: {
  plans: Plan[];
  setPlans: (v: Plan[]) => void;
  teachers: Teacher[];
  courses: Course[];
  notify: (s: string) => void;
}) {
  const [planId, setPlanId] = useState(1);
  const plan = plans.find((p) => p.id === planId) || plans[0];
  const [modal, setModal] = useState<Assignment | "new" | "section" | null>(null);
  const teacherLoads = useMemo(
    () =>
      teachers
        .filter((teacher) => teacher.active)
        .map((teacher) => ({
          teacher,
          courses: plan.assignments.filter((assignment) => assignment.teacherId === teacher.id)
            .length,
        }))
        .sort((a, b) => a.courses - b.courses),
    [teachers, plan.assignments],
  );
  const unassignedTeachers = teacherLoads.filter((item) => item.courses === 0).length;
  const editable = plan.status === "Borrador" || plan.status === "Rechazada";
  const updatePlan = (patch: Partial<Plan>) =>
    setPlans(plans.map((p) => (p.id === plan.id ? { ...p, ...patch } : p)));
  function send() {
    updatePlan({ status: "Pendiente de aprobación", sent: "22 ene 2027", rejection: undefined });
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
        <Field label="Planificación">
          <select value={planId} onChange={(e) => setPlanId(+e.target.value)}>
            {plans
              .filter((p) => p.id <= 3)
              .map((p) => (
                <option value={p.id} key={p.id}>
                  {p.semester} {p.year} · {p.status}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Año">
          <select>
            <option>2027</option>
          </select>
        </Field>
        <Field label="Semestre">
          <select>
            <option>Primero</option>
          </select>
        </Field>
        <Field label="Ciclo">
          <select>
            <option>Todos</option>
            <option>1° ciclo</option>
            <option>2° ciclo</option>
          </select>
        </Field>
        <Field label="Sección">
          <select>
            <option>Todas</option>
            <option>A</option>
            <option>B</option>
            <option>C</option>
          </select>
        </Field>
        <div className="status-field">
          <span>Estado</span>
          <Badge status={plan.status} />
          {plan.published && <Badge status="Publicada" />}
        </div>
      </section>
      <section className="panel teacher-load-panel">
        <div className="panel-head">
          <div>
            <h3>Carga docente del período</h3>
            <p>Distribución de cursos entre los catedráticos activos</p>
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
                <div className="load-dots" aria-label={`${assignedCourses} de 4 cursos asignados`}>
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
            <p>{plan.assignments.length} asignaciones · Primer semestre 2027</p>
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
          assignments={plan.assignments}
          courses={courses}
          teachers={teachers}
          onEdit={editable ? (a) => setModal(a) : undefined}
        />
      </section>
      {modal && modal !== "section" && (
        <AssignmentModal
          assignment={modal === "new" ? undefined : modal}
          assignments={plan.assignments}
          teachers={teachers}
          courses={courses}
          onClose={() => setModal(null)}
          onSave={(a) => {
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
                  updatePlan({ assignments: plan.assignments.filter((a) => a.id !== modal.id) });
                  setModal(null);
                  notify("Asignación eliminada");
                }
          }
        />
      )}
      {modal === "section" && <SectionModal onClose={() => setModal(null)} notify={notify} />}
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
  onClose,
  onSave,
  onRemove,
}: {
  assignment?: Assignment;
  assignments: Assignment[];
  teachers: Teacher[];
  courses: Course[];
  onClose: () => void;
  onSave: (a: Assignment) => void;
  onRemove?: () => void;
}) {
  const [form, setForm] = useState<Assignment>(
    assignment || {
      id: 0,
      courseId: 1,
      teacherId: 1,
      cycle: 1,
      section: "A",
      room: "A-101",
      day: "Lunes",
      start: "07:00",
      end: "08:30",
    },
  );
  const [error, setError] = useState("");
  function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const others = assignments.filter((a) => a.id !== form.id);
    if (others.filter((a) => a.teacherId === form.teacherId).length >= 4)
      return setError("El catedrático ya tiene cuatro cursos asignados en este semestre");
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
    onSave({ ...form, cycle: courses.find((c) => c.id === form.courseId)?.cycle || form.cycle });
  }
  return (
    <Modal
      title={assignment ? "Editar asignación" : "Nueva asignación"}
      subtitle="Primer semestre 2027 · Configure el bloque académico."
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
                <option>Primer semestre 2027</option>
              </select>
            </Field>
            <Field label="Ciclo">
              <select
                value={form.cycle}
                onChange={(e) => setForm({ ...form, cycle: +e.target.value })}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option value={n} key={n}>
                    {n}° ciclo
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Sección">
              <select
                value={form.section}
                onChange={(e) => setForm({ ...form, section: e.target.value })}
              >
                {["A", "B", "C", "D", "E"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
            <Field label="Curso" wide>
              <select
                value={form.courseId}
                onChange={(e) => {
                  const c = courses.find((x) => x.id === +e.target.value);
                  setForm({ ...form, courseId: +e.target.value, cycle: c?.cycle || 1 });
                }}
              >
                {courses
                  .filter((c) => c.active)
                  .map((c) => (
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
                onChange={(e) => setForm({ ...form, room: e.target.value })}
              >
                {["A-101", "A-102", "B-201", "B-202"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
            <Field label="Día">
              <select value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })}>
                {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
            <Field label="Hora de inicio">
              <input
                type="time"
                value={form.start}
                onChange={(e) => setForm({ ...form, start: e.target.value })}
              />
            </Field>
            <Field label="Hora de fin">
              <input
                type="time"
                value={form.end}
                onChange={(e) => setForm({ ...form, end: e.target.value })}
              />
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

function SectionModal({ onClose, notify }: { onClose: () => void; notify: (s: string) => void }) {
  const [section, setSection] = useState("C");
  const [capacity, setCapacity] = useState("35");
  return (
    <Modal
      title="Configurar nueva sección"
      subtitle="Cree secciones según la demanda estimada."
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onClose();
          notify(`Sección ${section} creada con cupo para ${capacity} estudiantes`);
        }}
      >
        <div className="modal-body form-grid">
          <Field label="Ciclo académico">
            <select>
              <option>1° ciclo</option>
              <option>2° ciclo</option>
              <option>3° ciclo</option>
            </select>
          </Field>
          <Field label="Identificador de sección">
            <input
              value={section}
              onChange={(e) => setSection(e.target.value.toUpperCase())}
              maxLength={2}
            />
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
        </div>
        <ModalActions onClose={onClose} submit="Crear sección" />
      </form>
    </Modal>
  );
}

function Schedule({
  assignments,
  courses,
  teachers = teachersSeed,
  compact = false,
  onEdit,
}: {
  assignments: Assignment[];
  courses: Course[];
  teachers?: Teacher[];
  compact?: boolean;
  onEdit?: (a: Assignment) => void;
}) {
  const days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
  const slots = compact
    ? ["07:00", "08:30", "10:00", "13:00"]
    : ["07:00", "08:30", "10:00", "11:30", "13:00", "14:30"];
  return (
    <div className={`schedule-wrap ${compact ? "compact" : ""}`}>
      <div
        className="schedule-grid"
        style={{ gridTemplateColumns: `76px repeat(5, minmax(145px, 1fr))` }}
      >
        <div className="schedule-corner">Hora</div>
        {days.map((d) => (
          <div className="schedule-day" key={d}>
            {d}
          </div>
        ))}
        {slots.map((time) => (
          <Fragment key={time}>
            <div className="time-cell" key={time}>
              {time}
            </div>
            {days.map((day) => {
              const a = assignments.find((x) => x.day === day && x.start === time);
              const c = a && courses.find((x) => x.id === a.courseId);
              return (
                <div className="schedule-cell" key={day + time}>
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
}: {
  plans: Plan[];
  setPlans: (v: Plan[]) => void;
  teachers: Teacher[];
  courses: Course[];
  notify: (s: string) => void;
}) {
  const [filter, setFilter] = useState("");
  const [review, setReview] = useState<Plan | null>(null);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const filtered = plans.filter((p) => !filter || p.status === filter);
  function update(status: PlanStatus, rejection?: string) {
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
            <option>Primer semestre 2027</option>
            <option>Segundo semestre 2026</option>
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

function MyCourses({ assignments, courses }: { assignments: Assignment[]; courses: Course[] }) {
  const mine = assignments.filter((a) => a.teacherId === 1);
  return (
    <div className="page-stack">
      <div className="page-title">
        <div>
          <h2>Mis cursos asignados</h2>
          <p>Primer semestre 2027 · Información de solo lectura.</p>
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
}: {
  role: Role;
  plan: Plan;
  courses: Course[];
  teachers: Teacher[];
  notify: (s: string) => void;
}) {
  const rows =
    role === "teacher" ? plan.assignments.filter((a) => a.teacherId === 1) : plan.assignments;
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
          <select>
            <option>2027</option>
            <option>2026</option>
          </select>
        </Field>
        <Field label="Semestre">
          <select>
            <option>Primero</option>
            <option>Segundo</option>
          </select>
        </Field>
        <Field label="Ciclo">
          <select>
            <option>Todos</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n}>{n}° ciclo</option>
            ))}
          </select>
        </Field>
        <Field label="Sección">
          <select>
            <option>Todas</option>
            <option>A</option>
            <option>B</option>
            <option>C</option>
          </select>
        </Field>
        <Button onClick={() => notify("Reporte actualizado")}>Consultar</Button>
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
            <p>Primer semestre 2027 · Generado para consulta</p>
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
