import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
const folder = mkdtempSync(join(tmpdir(), "qarjy-e2e-"));
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3100",
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      QARJY_DB_PATH: join(folder, "test.sqlite"),
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => {
  rmSync(folder, { recursive: true, force: true });
  process.exit(code ?? 0);
});
