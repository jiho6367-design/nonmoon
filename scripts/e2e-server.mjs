import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createApp } from "../api/app.js";

const dataDir = await mkdtemp(path.join(tmpdir(), "nonmoon-browser-"));
const { app, close } = createApp({
  dataDir,
  fetchImpl: () => {
    throw new Error("External AI calls are disabled in browser tests");
  },
});
const server = app.listen(4173, "127.0.0.1", () =>
  console.log("E2E server: http://127.0.0.1:4173"),
);
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  server.close(async () => {
    close();
    await rm(dataDir, { recursive: true, force: true });
    process.exit(0);
  });
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
