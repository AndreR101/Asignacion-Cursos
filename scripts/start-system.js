import { spawn } from "node:child_process";
import net from "node:net";

const frontendUrl = "http://localhost:8443/";
const backendUrl = "http://localhost:3000/";
const healthUrl = `${backendUrl}api/health/db`;

function portIsOpen(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    socket.once("connect", () => { socket.destroy(); resolve(true); });
    socket.once("error", () => { socket.destroy(); resolve(false); });
  });
}

console.log("");
console.log("Sistema de Planificación de Cursos");
console.log(`Frontend: ${frontendUrl}`);
console.log(`Backend:  ${backendUrl}`);
console.log(`Health:   ${healthUrl}`);
console.log("");

const [backendRunning, frontendRunning] = await Promise.all([portIsOpen(3000), portIsOpen(8443)]);
const backend = backendRunning ? null : spawn(process.execPath, ["backend/server.js"], { stdio: "inherit", env: process.env });
const frontend = frontendRunning ? null : spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "0.0.0.0", "--port", "8443"], { stdio: "inherit", env: { ...process.env, FRONTEND_PORT: "8443" } });

if (backendRunning) console.log("Backend ya estaba activo; se reutilizará el proceso existente.");
if (frontendRunning) console.log("Frontend ya estaba activo; se reutilizará el proceso existente.");

let stopping = false;
function stopAll(code = 0) {
  if (stopping) return;
  stopping = true;
  if (backend && !backend.killed) backend.kill();
  if (frontend && !frontend.killed) frontend.kill();
  process.exitCode = code;
}

if (backend) {
  backend.on("error", (error) => {
    console.error("No se pudo iniciar el backend:", error.message);
    stopAll(1);
  });
  backend.on("exit", (code) => { if (!stopping && code !== 0) stopAll(code || 1); });
}
if (frontend) {
  frontend.on("error", (error) => {
    console.error("No se pudo iniciar el frontend:", error.message);
    stopAll(1);
  });
  frontend.on("exit", (code) => { if (!stopping && code !== 0) stopAll(code || 1); });
}

process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));
