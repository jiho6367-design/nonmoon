import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createApp } from "../api/app.js";

test("stopped-app backup restores accounts, sessions, papers and original PDF bytes together", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "nonmoon-backup-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  let runtime = createApp({ dataDir: path.join(root, "source") });
  async function listen() {
    return new Promise((resolve) => {
      const server = runtime.app.listen(0, "127.0.0.1", () => resolve(server));
    });
  }
  let server = await listen();
  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/api/auth/demo`,
    { method: "POST" },
  );
  assert.equal(response.status, 201);
  const user = (await response.json()).user;
  const cookie = response.headers.get("set-cookie").split(";")[0];
  await new Promise((resolve) => server.close(resolve));
  runtime.close();
  execFileSync(
    process.execPath,
    [fileURLToPath(new URL("../scripts/backup.mjs", import.meta.url))],
    { cwd: root, env: { ...process.env, DATA_DIR: path.join(root, "source") } },
  );
  const [folder] = await readdir(path.join(root, "backups"));
  const backupDir = path.join(root, "backups", folder);
  assert.equal((await readdir(path.join(backupDir, "uploads"))).length, 2);
  runtime = createApp({ dataDir: backupDir });
  server = await listen();
  try {
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const options = { headers: { Cookie: cookie } };
    assert.equal(
      (await (await fetch(`${base}/auth/me`, options)).json()).user.id,
      user.id,
    );
    const [team] = await (await fetch(`${base}/teams`, options)).json();
    const papers = await (
      await fetch(`${base}/teams/${team.id}/papers`, options)
    ).json();
    assert.equal(papers.length, 2);
    const pdf = await fetch(`${base}/papers/${papers[0].id}/file`, options);
    assert.equal(pdf.status, 200);
    assert.equal(
      Buffer.from(await pdf.arrayBuffer())
        .subarray(0, 5)
        .toString(),
      "%PDF-",
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
    runtime.close();
  }
});
