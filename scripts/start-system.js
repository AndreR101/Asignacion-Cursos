import { spawn } from "node:child_process";

const frontendUrl = "http://localhost:8443/";
const backendUrl = "http://localhost:3000/";
const healthUrl = `${backendUrl}api/health`;

console.log("");
console.log("Sistema de Planificación de Cursos");
console.log(`Frontend: ${frontendUrl}`);
console.log(`Backend:  ${backendUrl}`);
console.log(`Health:   ${healthUrl}`);
console.log("");

const backend = spawn(process.execPath, ["backend/server.js"], {
  stdio: "inherit",
  env: process.env,
});

const frontend = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "0.0.0.0", "--port", "8443"], {
  stdio: "inherit",
  env: { ...process.env, FRONTEND_PORT: "8443" },
});

let stopping = false;
function stopAll(code = 0) {
  if (stopping) return;
  stopping = true;
  if (!backend.killed) backend.kill();
  if (!frontend.killed) frontend.kill();
  process.exitCode = code;
}

backend.on("error", (error) => {
  console.error("No se pudo iniciar el backend:", error.message);
  stopAll(1);
});
frontend.on("error", (error) => {
  console.error("No se pudo iniciar el frontend:", error.message);
  stopAll(1);
});
backend.on("exit", (code) => { if (!stopping && code !== 0) stopAll(code || 1); });
frontend.on("exit", (code) => { if (!stopping && code !== 0) stopAll(code || 1); });

process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));
