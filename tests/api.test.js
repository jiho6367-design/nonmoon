import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createApp } from "../api/app.js";
import { makePdf } from "../api/fixtures.js";

const password = "Research!2026-safe";

async function harness(t, options = {}) {
  const dataDir = await mkdtemp(path.join(tmpdir(), "nonmoon-test-"));
  let runtime;
  let server;
  let base;
  async function start() {
    runtime = createApp({ dataDir, ...options });
    server = await new Promise((resolve) => {
      const instance = runtime.app.listen(0, "127.0.0.1", () =>
        resolve(instance),
      );
    });
    base = `http://127.0.0.1:${server.address().port}`;
  }
  async function stop() {
    if (!server) return;
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    runtime.close();
    server = null;
  }
  await start();
  t.after(async () => {
    await stop();
    await rm(dataDir, { recursive: true, force: true });
  });
  function client() {
    let cookie = "";
    return {
      getCookie() {
        return cookie;
      },
      async request(
        route,
        { method = "GET", body, headers = {}, rawBody = false } = {},
      ) {
        const outgoing = { ...headers };
        if (cookie) outgoing.Cookie = cookie;
        if (body !== undefined && !(body instanceof FormData) && !rawBody) {
          outgoing["Content-Type"] = "application/json";
          body = JSON.stringify(body);
        }
        const res = await fetch(`${base}/api${route}`, {
          method,
          body,
          headers: outgoing,
        });
        const setCookie = res.headers.getSetCookie();
        if (setCookie.length)
          cookie = setCookie.map((value) => value.split(";")[0]).join("; ");
        const bytes = Buffer.from(await res.arrayBuffer());
        const text = bytes.toString("utf8");
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
        return { status: res.status, headers: res.headers, data, bytes };
      },
      async register(name, email) {
        const response = await this.request("/auth/register", {
          method: "POST",
          body: { name, email, password },
        });
        assert.ok(
          [200, 201].includes(response.status),
          JSON.stringify(response.data),
        );
        const login = await this.request("/auth/login", {
          method: "POST",
          body: { email, password },
        });
        assert.equal(login.status, 200, JSON.stringify(login.data));
        return login.data.user;
      },
    };
  }
  return {
    client,
    async restart() {
      await stop();
      await start();
    },
  };
}

function success(response, status = 200) {
  assert.equal(response.status, status, JSON.stringify(response.data));
  return response.data;
}

function denied(response, expected) {
  assert.equal(response.status, expected, JSON.stringify(response.data));
  assert.equal(typeof response.data.error.code, "string");
  assert.equal(typeof response.data.error.message, "string");
}

async function team(client, name = "Isolated research") {
  return success(
    await client.request("/teams", {
      method: "POST",
      body: { name, description: "Test team" },
    }),
    201,
  );
}

async function paper(client, teamId, overrides = {}) {
  const form = new FormData();
  const fields = {
    title: "Reliable graph research",
    author: "Ada Example",
    year: "2024",
    tags: "graphs,testing",
    abstract: "A synthetic research paper for testing.",
    ...overrides,
  };
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  form.append(
    "file",
    new Blob(
      [
        makePdf([
          "Reliable graph research",
          "This study compares graph retrieval methods on synthetic data.",
          "The experiment measures retrieval precision over three controlled trials.",
          "The results demonstrate a measurable improvement in the benchmark.",
        ]),
      ],
      { type: "application/pdf" },
    ),
    "research.pdf",
  );
  return success(
    await client.request(`/teams/${teamId}/papers`, {
      method: "POST",
      body: form,
    }),
    201,
  );
}

test("health is usable without credentials and protected routes reject anonymous users", async (t) => {
  const h = await harness(t);
  const anonymous = h.client();
  const health = success(await anonymous.request("/health"));
  assert.equal(health.ok, true);
  assert.equal(health.summaryMode, "extractive");
  assert.equal(success(await anonymous.request("/auth/me")).user, null);
  denied(await anonymous.request("/teams"), 401);
  denied(await anonymous.request("/papers/not-owned/file"), 401);
  denied(
    await anonymous.request("/cards/not-owned", { method: "DELETE" }),
    401,
  );
});

test("registration, login, session cookie, restart and logout have real server-side behavior", async (t) => {
  const h = await harness(t);
  const c = h.client();
  const user = await c.register("Account owner", "owner@example.test");
  assert.equal(user.email, "owner@example.test");
  assert.ok(user.id);
  assert.equal("password" in user, false);
  assert.equal("passwordHash" in user, false);
  const login = await c.request("/auth/login", {
    method: "POST",
    body: { email: "owner@example.test", password },
  });
  success(login);
  const cookie = login.headers.get("set-cookie");
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Strict/i);
  assert.equal(success(await c.request("/auth/me")).user.id, user.id);
  await h.restart();
  assert.equal(success(await c.request("/auth/me")).user.id, user.id);
  success(await c.request("/auth/logout", { method: "POST" }), 204);
  assert.equal(success(await c.request("/auth/me")).user, null);
  denied(await c.request("/teams"), 401);
  const outsider = h.client();
  denied(
    await outsider.request("/auth/login", {
      method: "POST",
      body: { email: "owner@example.test", password: "wrong-password" },
    }),
    401,
  );
  denied(
    await outsider.request("/auth/register", {
      method: "POST",
      body: { name: "Duplicate", email: "OWNER@example.test", password },
    }),
    409,
  );
  denied(
    await outsider.request("/auth/register", {
      method: "POST",
      body: { name: "Bad", email: "bad-email", password: "123" },
    }),
    400,
  );
});

test("untrusted cross-origin mutation is rejected without blocking ordinary same-origin clients", async (t) => {
  const h = await harness(t);
  const c = h.client();
  await c.register("Origin owner", "origin@example.test");
  denied(
    await c.request("/teams", {
      method: "POST",
      body: { name: "forged" },
      headers: { Origin: "https://attacker.example" },
    }),
    403,
  );
  assert.equal(success(await c.request("/teams")).length, 0);
  await team(c);
});

test("two accounts cannot enumerate, read or mutate another team data or PDFs", async (t) => {
  const h = await harness(t);
  const alice = h.client();
  const bob = h.client();
  await alice.register("Alice", "alice@example.test");
  await bob.register("Bob", "bob@example.test");
  const aTeam = await team(alice, "Alice private team");
  const p = await paper(alice, aTeam.id);
  const card = success(
    await alice.request(`/papers/${p.id}/cards`, {
      method: "POST",
      body: { quote: "A useful source quotation.", page: 1, topic: "Graphs" },
    }),
    201,
  );
  const summary = success(
    await alice.request(`/papers/${p.id}/summaries`, {
      method: "POST",
      body: { summary: "A verified manual summary." },
    }),
    201,
  );
  assert.equal(success(await bob.request("/teams")).length, 0);
  for (const route of [
    `/teams/${aTeam.id}/papers`,
    `/teams/${aTeam.id}/cards`,
    `/teams/${aTeam.id}/members`,
    `/teams/${aTeam.id}/export?format=json`,
    `/papers/${p.id}`,
    `/papers/${p.id}/file`,
    `/papers/${p.id}/cards`,
    `/papers/${p.id}/summaries`,
    `/papers/${p.id}/export?format=markdown`,
  ]) {
    denied(await bob.request(route), 404);
  }
  for (const [route, method, body] of [
    [`/papers/${p.id}`, "PATCH", { title: "Hijacked" }],
    [`/papers/${p.id}`, "DELETE"],
    [`/cards/${card.id}`, "PATCH", { quote: "Hijacked" }],
    [`/cards/${card.id}`, "DELETE"],
    [`/summaries/${summary.id}`, "PATCH", { summary: "Hijacked" }],
    [`/summaries/${summary.id}`, "DELETE"],
  ])
    denied(await bob.request(route, { method, body }), 404);
  assert.equal(success(await alice.request(`/papers/${p.id}`)).title, p.title);
});

test("owner membership controls allow collaboration and revoke access immediately", async (t) => {
  const h = await harness(t);
  const owner = h.client();
  const member = h.client();
  const ownerUser = await owner.register("Owner", "team-owner@example.test");
  const memberUser = await member.register(
    "Member",
    "team-member@example.test",
  );
  const ownTeam = await team(owner);
  const p = await paper(owner, ownTeam.id);
  const invitation = await owner.request(`/teams/${ownTeam.id}/members`, {
    method: "POST",
    body: { email: memberUser.email },
  });
  assert.ok(
    [200, 201].includes(invitation.status),
    JSON.stringify(invitation.data),
  );
  assert.equal(success(await member.request(`/papers/${p.id}`)).id, p.id);
  success(
    await member.request(`/papers/${p.id}`, {
      method: "PATCH",
      body: { title: "Collaborative edit" },
    }),
  );
  assert.equal(
    success(await owner.request(`/papers/${p.id}`)).title,
    "Collaborative edit",
  );
  denied(
    await member.request(`/teams/${ownTeam.id}/members`, {
      method: "POST",
      body: { email: ownerUser.email },
    }),
    403,
  );
  denied(
    await member.request(`/teams/${ownTeam.id}/members/${ownerUser.id}`, {
      method: "DELETE",
    }),
    403,
  );
  const removal = await owner.request(
    `/teams/${ownTeam.id}/members/${memberUser.id}`,
    { method: "DELETE" },
  );
  assert.ok([200, 204].includes(removal.status), JSON.stringify(removal.data));
  denied(await member.request(`/papers/${p.id}/file`), 404);
});

test("PDF validation rejects disguised text and missing files while serving uploaded bytes privately", async (t) => {
  const h = await harness(t);
  const c = h.client();
  await c.register("Upload owner", "upload@example.test");
  const ownTeam = await team(c);
  for (const [name, type, bytes] of [
    ["disguised.pdf", "application/pdf", "<script>alert(1)</script>"],
    ["invalid.pdf", "application/pdf", "%PDF-1.7\nthis is not a valid PDF"],
    ["script.html", "text/html", "<html>not a paper</html>"],
  ]) {
    const form = new FormData();
    form.append("title", "Bad upload");
    form.append("file", new Blob([bytes], { type }), name);
    const result = await c.request(`/teams/${ownTeam.id}/papers`, {
      method: "POST",
      body: form,
    });
    assert.ok(
      [400, 415, 422].includes(result.status),
      JSON.stringify(result.data),
    );
  }
  const empty = new FormData();
  empty.append("title", "Missing file");
  denied(
    await c.request(`/teams/${ownTeam.id}/papers`, {
      method: "POST",
      body: empty,
    }),
    400,
  );
  const p = await paper(c, ownTeam.id);
  const file = await c.request(`/papers/${p.id}/file`);
  success(file);
  assert.match(file.headers.get("content-type"), /application\/pdf/i);
  assert.equal(file.bytes.subarray(0, 5).toString(), "%PDF-");
  assert.equal(
    success(await c.request(`/teams/${ownTeam.id}/papers`)).length,
    1,
  );
});

test("card CRUD, independent filters and per-user bookmarks remain scoped", async (t) => {
  const h = await harness(t);
  const c = h.client();
  const colleague = h.client();
  await c.register("Card author", "cards@example.test");
  await colleague.register("Colleague", "colleague@example.test");
  const ownTeam = await team(c);
  await c.request(`/teams/${ownTeam.id}/members`, {
    method: "POST",
    body: { email: "colleague@example.test" },
  });
  const firstPaper = await paper(c, ownTeam.id);
  const secondPaper = await paper(c, ownTeam.id, {
    title: "Different paper",
    author: "Grace Sample",
    year: "2023",
  });
  const first = success(
    await c.request(`/papers/${firstPaper.id}/cards`, {
      method: "POST",
      body: {
        quote: "RareGraph finding",
        topic: "Graph result",
        note: "Read again",
        page: 1,
        keywords: ["graph"],
        isBookmarked: true,
      },
    }),
    201,
  );
  const second = success(
    await c.request(`/papers/${secondPaper.id}/cards`, {
      method: "POST",
      body: { quote: "Unrelated neural result", topic: "Neural", page: 1 },
    }),
    201,
  );
  const ids = (response) => success(response).map((item) => item.id);
  assert.deepEqual(
    ids(await c.request(`/teams/${ownTeam.id}/cards?q=RareGraph`)),
    [first.id],
  );
  assert.deepEqual(
    ids(
      await c.request(
        `/teams/${ownTeam.id}/cards?author=Ada&year=2024&bookmarked=true`,
      ),
    ),
    [first.id],
  );
  assert.deepEqual(
    ids(await c.request(`/teams/${ownTeam.id}/cards?author=Grace&year=2023`)),
    [second.id],
  );
  assert.deepEqual(
    ids(await colleague.request(`/teams/${ownTeam.id}/cards?bookmarked=true`)),
    [],
  );
  const edited = success(
    await c.request(`/cards/${first.id}`, {
      method: "PATCH",
      body: {
        quote: "UpdatedGraph finding",
        note: "Checked against PDF",
        isBookmarked: false,
      },
    }),
  );
  assert.equal(edited.quote, "UpdatedGraph finding");
  assert.deepEqual(
    ids(await c.request(`/teams/${ownTeam.id}/cards?q=RareGraph`)),
    [],
  );
  assert.deepEqual(
    ids(await c.request(`/teams/${ownTeam.id}/cards?bookmarked=true`)),
    [],
  );
  success(await c.request(`/cards/${first.id}`, { method: "DELETE" }), 204);
  assert.deepEqual(ids(await c.request(`/papers/${firstPaper.id}/cards`)), []);
});

test("summaries are paper-scoped and honest local generation uses no external service", async (t) => {
  let outboundCalls = 0;
  const h = await harness(t, {
    openaiApiKey: "must-never-be-used",
    fetchImpl() {
      outboundCalls += 1;
      throw new Error("External calls forbidden in this test");
    },
  });
  const c = h.client();
  await c.register("Summary author", "summaries@example.test");
  const ownTeam = await team(c);
  const first = await paper(c, ownTeam.id);
  const second = await paper(c, ownTeam.id, { title: "Other source" });
  const manual = success(
    await c.request(`/papers/${first.id}/summaries`, {
      method: "POST",
      body: { summary: "Manual evidence-backed note." },
    }),
    201,
  );
  const generated = success(
    await c.request(`/papers/${second.id}/summaries`, {
      method: "POST",
      body: {},
    }),
    201,
  );
  assert.equal(outboundCalls, 0);
  assert.equal(typeof generated.summary, "string");
  assert.ok(generated.summary.trim().length > 20);
  const firstItems = success(await c.request(`/papers/${first.id}/summaries`));
  assert.deepEqual(
    firstItems.map((item) => item.id),
    [manual.id],
  );
  assert.equal(firstItems[0].paperId, first.id);
  const edit = success(
    await c.request(`/summaries/${manual.id}`, {
      method: "PATCH",
      body: { summary: "Corrected manual note." },
    }),
  );
  assert.equal(edit.summary, "Corrected manual note.");
  success(
    await c.request(`/summaries/${manual.id}`, { method: "DELETE" }),
    204,
  );
  assert.deepEqual(
    success(await c.request(`/papers/${first.id}/summaries`)),
    [],
  );
});

test("stored papers, cards and summaries survive restart, deletion cascades and exports omit secrets", async (t) => {
  const h = await harness(t);
  const c = h.client();
  await c.register("Durable owner", "durable@example.test");
  const ownTeam = await team(c);
  const p = await paper(c, ownTeam.id, {
    title: '=HYPERLINK("https://attacker.example","click")',
  });
  const card = success(
    await c.request(`/papers/${p.id}/cards`, {
      method: "POST",
      body: { quote: "Persisted quote", page: 1 },
    }),
    201,
  );
  const summary = success(
    await c.request(`/papers/${p.id}/summaries`, {
      method: "POST",
      body: { summary: "Persisted summary" },
    }),
    201,
  );
  await h.restart();
  assert.equal(success(await c.request(`/papers/${p.id}`)).title, p.title);
  assert.equal(
    success(await c.request(`/papers/${p.id}/cards`))[0].id,
    card.id,
  );
  assert.equal(
    success(await c.request(`/papers/${p.id}/summaries`))[0].id,
    summary.id,
  );
  const exported = await c.request(`/teams/${ownTeam.id}/export?format=json`);
  success(exported);
  const serialized = JSON.stringify(exported.data);
  assert.ok(serialized.includes("Persisted quote"));
  assert.ok(!/passwordHash|sessionToken|openaiApiKey/.test(serialized));
  const csv = await c.request(`/teams/${ownTeam.id}/export?format=csv`);
  success(csv);
  assert.ok(
    csv.data.includes("'=HYPERLINK"),
    "Spreadsheet formulas must be neutralized",
  );
  const bib = await c.request(`/papers/${p.id}/export?format=bibtex`);
  success(bib);
  assert.match(bib.data, /@\w+\{/);
  const markdown = await c.request(`/papers/${p.id}/export?format=markdown`);
  success(markdown);
  assert.ok(markdown.data.includes("Persisted quote"));
  success(await c.request(`/papers/${p.id}`, { method: "DELETE" }), 204);
  denied(await c.request(`/papers/${p.id}/file`), 404);
  assert.deepEqual(success(await c.request(`/teams/${ownTeam.id}/cards`)), []);
  denied(
    await c.request(`/summaries/${summary.id}`, {
      method: "PATCH",
      body: { summary: "orphan" },
    }),
    404,
  );
  await h.restart();
  assert.deepEqual(success(await c.request(`/teams/${ownTeam.id}/papers`)), []);
});

test("malformed input returns structured client errors and cannot change the resource identity", async (t) => {
  const h = await harness(t);
  const c = h.client();
  await c.register("Validation owner", "validation@example.test");
  const ownTeam = await team(c);
  const p = await paper(c, ownTeam.id);
  for (const body of [null, [], { title: "" }, { year: "not-a-year" }]) {
    denied(await c.request(`/papers/${p.id}`, { method: "PATCH", body }), 400);
  }
  for (const body of [
    { quote: "" },
    { quote: "invalid page", page: -1 },
    { quote: "too far", page: 9999 },
  ]) {
    denied(
      await c.request(`/papers/${p.id}/cards`, { method: "POST", body }),
      400,
    );
  }
  const before = success(await c.request(`/papers/${p.id}`));
  const spoof = await c.request(`/papers/${p.id}`, {
    method: "PATCH",
    body: {
      title: "Allowed title",
      id: "forged",
      teamId: "forged",
      uploader: "Impersonated",
    },
  });
  assert.ok([200, 400].includes(spoof.status), JSON.stringify(spoof.data));
  const after = success(await c.request(`/papers/${p.id}`));
  assert.equal(after.id, before.id);
  assert.equal(after.teamId, before.teamId);
  if ("uploader" in before) assert.equal(after.uploader, before.uploader);
});

test("login rotates a live session and replaying the previous cookie no longer authenticates", async (t) => {
  const h = await harness(t);
  const c = h.client();
  await c.register("Session owner", "rotation@example.test");
  const oldCookie = c.getCookie();
  success(
    await c.request("/auth/login", {
      method: "POST",
      body: { email: "rotation@example.test", password },
    }),
  );
  assert.notEqual(c.getCookie(), oldCookie);
  const replay = h.client();
  assert.equal(
    success(
      await replay.request("/auth/me", { headers: { Cookie: oldCookie } }),
    ).user,
    null,
  );
  denied(
    await replay.request("/teams", { headers: { Cookie: oldCookie } }),
    401,
  );
});

test("demo sessions have separate workspaces and cannot log in through a fabricated password", async (t) => {
  const h = await harness(t);
  const first = h.client();
  const second = h.client();
  const one = success(
    await first.request("/auth/demo", { method: "POST", body: {} }),
    201,
  ).user;
  const two = success(
    await second.request("/auth/demo", { method: "POST", body: {} }),
    201,
  ).user;
  assert.notEqual(one.id, two.id);
  const firstTeam = success(await first.request("/teams"))[0];
  const secondTeam = success(await second.request("/teams"))[0];
  assert.notEqual(firstTeam.id, secondTeam.id);
  const firstPaper = success(
    await first.request(`/teams/${firstTeam.id}/papers`),
  )[0];
  denied(await second.request(`/papers/${firstPaper.id}/file`), 404);
  denied(
    await second.request(`/teams/${firstTeam.id}/export?format=json`),
    404,
  );
  denied(
    await h.client().request("/auth/login", {
      method: "POST",
      body: { email: one.email, password: "!demo-no-password" },
    }),
    401,
  );
  assert.equal(success(await first.request("/auth/me")).user.id, one.id);
});

test("a PDF with no extractable text gives an explicit error and permits a manual summary", async (t) => {
  const h = await harness(t);
  const c = h.client();
  await c.register("Scanned document owner", "scan@example.test");
  const ownTeam = await team(c);
  const form = new FormData();
  form.append("title", "Blank page represents no text layer");
  form.append(
    "file",
    new Blob([makePdf([])], { type: "application/pdf" }),
    "blank.pdf",
  );
  const p = success(
    await c.request(`/teams/${ownTeam.id}/papers`, {
      method: "POST",
      body: form,
    }),
    201,
  );
  const failed = await c.request(`/papers/${p.id}/summaries`, {
    method: "POST",
    body: {},
  });
  denied(failed, 422);
  assert.equal(failed.data.error.code, "NO_SOURCE_TEXT");
  assert.deepEqual(success(await c.request(`/papers/${p.id}/summaries`)), []);
  const manual = success(
    await c.request(`/papers/${p.id}/summaries`, {
      method: "POST",
      body: { summary: "I checked the source visually." },
    }),
    201,
  );
  assert.equal(manual.mode, "manual");
});

test("oversized multipart files are rejected before records are created", async (t) => {
  const h = await harness(t);
  const c = h.client();
  await c.register("Size limit owner", "size@example.test");
  const ownTeam = await team(c);
  const bytes = Buffer.alloc(20 * 1024 * 1024 + 1, 32);
  bytes.write("%PDF-1.4");
  const form = new FormData();
  form.append("title", "Too large");
  form.append(
    "file",
    new Blob([bytes], { type: "application/pdf" }),
    "large.pdf",
  );
  denied(
    await c.request(`/teams/${ownTeam.id}/papers`, {
      method: "POST",
      body: form,
    }),
    413,
  );
  assert.deepEqual(success(await c.request(`/teams/${ownTeam.id}/papers`)), []);
});

test("validation boundaries are strict and failed edits leave original values intact", async (t) => {
  const h = await harness(t);
  const c = h.client();
  await c.register("Boundary owner", "boundary@example.test");
  const ownTeam = await team(c);
  const p = await paper(c, ownTeam.id);
  for (const patch of [
    { year: "0999" },
    { year: String(new Date().getFullYear() + 2) },
    { tags: ["x".repeat(61)] },
    { tags: Array.from({ length: 13 }, (_, i) => `tag${i}`) },
    { tags: [{}] },
    { isBookmarked: "false" },
  ])
    denied(
      await c.request(`/papers/${p.id}`, { method: "PATCH", body: patch }),
      400,
    );
  const unmodified = success(await c.request(`/papers/${p.id}`));
  assert.equal(unmodified.year, p.year);
  assert.deepEqual(unmodified.tags, p.tags);
  assert.equal(unmodified.isBookmarked, false);
  const tags = Array.from({ length: 12 }, (_, i) => `tag${i}`);
  const changed = success(
    await c.request(`/papers/${p.id}`, {
      method: "PATCH",
      body: { year: "1000", tags },
    }),
  );
  assert.equal(changed.year, "1000");
  assert.deepEqual(changed.tags, tags);
  for (const page of [0, 1.5, "1", 2])
    denied(
      await c.request(`/papers/${p.id}/cards`, {
        method: "POST",
        body: { quote: "Page bounds", page },
      }),
      400,
    );
  const card = success(
    await c.request(`/papers/${p.id}/cards`, {
      method: "POST",
      body: {
        quote: "Exact page boundary",
        page: 1,
        creatorName: "Spoofed",
        createdAt: "1900-01-01",
        paperId: "forged",
      },
    }),
    201,
  );
  assert.equal(card.creatorName, "Boundary owner");
  assert.equal(card.paperId, p.id);
  assert.notEqual(card.createdAt, "1900-01-01");
  const edited = success(
    await c.request(`/cards/${card.id}`, {
      method: "PATCH",
      body: {
        note: "Verified",
        creatorName: "Spoofed",
        createdAt: "1900-01-01",
        paperId: "forged",
        id: "forged",
      },
    }),
  );
  assert.equal(edited.id, card.id);
  assert.equal(edited.createdAt, card.createdAt);
  assert.equal(edited.creatorName, card.creatorName);
  assert.equal(edited.paperId, card.paperId);
  const metadata = success(
    await c.request(`/papers/${p.id}`, {
      method: "PATCH",
      body: {
        title: "Legitimate title",
        createdAt: "1900-01-01",
        fileName: "../nonmoon.sqlite",
        storedFileName: "../nonmoon.sqlite",
        uploader: "Spoofed",
      },
    }),
  );
  assert.equal(metadata.createdAt, p.createdAt);
  assert.equal(metadata.fileName, p.fileName);
  assert.equal(metadata.uploader, p.uploader);
});

test("paper bookmarks belong to the acting user, not the shared paper", async (t) => {
  const h = await harness(t);
  const owner = h.client();
  const member = h.client();
  await owner.register("Bookmark owner", "paper-bookmark@example.test");
  await member.register(
    "Bookmark member",
    "paper-bookmark-member@example.test",
  );
  const ownTeam = await team(owner);
  await owner.request(`/teams/${ownTeam.id}/members`, {
    method: "POST",
    body: { email: "paper-bookmark-member@example.test" },
  });
  const p = await paper(owner, ownTeam.id);
  success(
    await owner.request(`/papers/${p.id}`, {
      method: "PATCH",
      body: { isBookmarked: true },
    }),
  );
  assert.equal(
    success(await member.request(`/papers/${p.id}`)).isBookmarked,
    false,
  );
  assert.equal(
    success(await owner.request(`/teams/${ownTeam.id}/papers?bookmarked=true`))
      .length,
    1,
  );
  assert.equal(
    success(await member.request(`/teams/${ownTeam.id}/papers?bookmarked=true`))
      .length,
    0,
  );
  success(
    await member.request(`/papers/${p.id}`, {
      method: "PATCH",
      body: { isBookmarked: true },
    }),
  );
  success(
    await owner.request(`/papers/${p.id}`, {
      method: "PATCH",
      body: { isBookmarked: false },
    }),
  );
  assert.equal(
    success(await member.request(`/papers/${p.id}`)).isBookmarked,
    true,
  );
});

test("optional provider errors never become saved summaries or expose upstream secrets", async (t) => {
  let calls = 0;
  let scenario = "error";
  const h = await harness(t, {
    summaryProvider: "openai",
    openaiApiKey: "fake-only-for-test",
    fetchImpl: async () => {
      calls += 1;
      if (scenario === "error")
        throw new Error("SECRET-UPSTREAM-DETAIL /private/server/path");
      if (scenario === "http")
        return new Response("SECRET-UPSTREAM-DETAIL", { status: 429 });
      return Response.json({ choices: [{ message: { content: "" } }] });
    },
  });
  const c = h.client();
  await c.register("Provider owner", "provider@example.test");
  const ownTeam = await team(c);
  const p = await paper(c, ownTeam.id);
  for (scenario of ["error", "http", "empty"]) {
    const failed = await c.request(`/papers/${p.id}/summaries`, {
      method: "POST",
      body: {},
    });
    denied(failed, 502);
    assert.equal(failed.data.error.code, "PROVIDER_ERROR");
    assert.ok(!JSON.stringify(failed.data).includes("SECRET-UPSTREAM-DETAIL"));
    assert.deepEqual(success(await c.request(`/papers/${p.id}/summaries`)), []);
  }
  assert.equal(calls, 3);
  const manual = success(
    await c.request(`/papers/${p.id}/summaries`, {
      method: "POST",
      body: { summary: "Fallback entered by the user." },
    }),
    201,
  );
  assert.equal(manual.mode, "manual");
  assert.equal(calls, 3);
});

test("a missing optional API key is a clear unavailable error without outbound requests", async (t) => {
  let calls = 0;
  const h = await harness(t, {
    summaryProvider: "openai",
    fetchImpl: async () => {
      calls++;
      throw new Error("Not allowed");
    },
  });
  const c = h.client();
  await c.register("No-key owner", "no-key@example.test");
  const ownTeam = await team(c);
  const p = await paper(c, ownTeam.id);
  const failed = await c.request(`/papers/${p.id}/summaries`, {
    method: "POST",
    body: {},
  });
  denied(failed, 503);
  assert.equal(failed.data.error.code, "PROVIDER_UNAVAILABLE");
  assert.equal(calls, 0);
  assert.deepEqual(success(await c.request(`/papers/${p.id}/summaries`)), []);
});

test("membership is checked again after a delayed provider response, before any summary is stored", async (t) => {
  let started;
  let finish;
  const began = new Promise((resolve) => {
    started = resolve;
  });
  const pending = new Promise((resolve) => {
    finish = resolve;
  });
  const h = await harness(t, {
    summaryProvider: "openai",
    openaiApiKey: "fake-only-for-test",
    fetchImpl: async () => {
      started();
      await pending;
      return Response.json({
        choices: [
          {
            message: {
              content: "A mocked response grounded in the supplied source.",
            },
          },
        ],
      });
    },
  });
  const owner = h.client();
  const member = h.client();
  await owner.register("Race owner", "race-owner@example.test");
  const user = await member.register("Race member", "race-member@example.test");
  const ownTeam = await team(owner);
  await owner.request(`/teams/${ownTeam.id}/members`, {
    method: "POST",
    body: { email: user.email },
  });
  const p = await paper(owner, ownTeam.id);
  const processing = member.request(`/papers/${p.id}/summaries`, {
    method: "POST",
    body: {},
  });
  await began;
  denied(
    await owner.request(`/papers/${p.id}/summaries`, {
      method: "POST",
      body: {},
    }),
    409,
  );
  success(
    await owner.request(`/teams/${ownTeam.id}/members/${user.id}`, {
      method: "DELETE",
    }),
    204,
  );
  finish();
  denied(await processing, 404);
  assert.deepEqual(
    success(await owner.request(`/papers/${p.id}/summaries`)),
    [],
  );
  success(
    await owner.request(`/papers/${p.id}/summaries`, {
      method: "POST",
      body: { summary: "Owner can still save after the refused request." },
    }),
    201,
  );
});

test("malformed JSON and encoded path probes cannot reveal database or server files", async (t) => {
  const h = await harness(t);
  const c = h.client();
  await c.register("Path owner", "path@example.test");
  for (const body of ["null", "[]", "true", '"text"', '{"name":']) {
    const failed = await c.request("/teams", {
      method: "POST",
      body,
      rawBody: true,
      headers: { "Content-Type": "application/json" },
    });
    denied(failed, 400);
    assert.ok(!JSON.stringify(failed.data).includes("/workspace/"));
    assert.ok(!("stack" in failed.data.error));
  }
  for (const route of [
    "/papers/..%2Fnonmoon.sqlite/file",
    "/papers/%2e%2e%5cnonmoon.sqlite/file",
    "/papers/%00/file",
    "/uploads/nonmoon.sqlite",
    "/.data/nonmoon.sqlite",
    "/papers/does-not-exist/file",
  ]) {
    const result = await c.request(route);
    denied(result, 404);
    assert.ok(!result.bytes.includes(Buffer.from("SQLite format 3")));
    assert.ok(!JSON.stringify(result.data).includes("/workspace/"));
  }
});

test("only the owner can delete a team, cascading its resources while preserving accounts and other teams", async (t) => {
  const h = await harness(t);
  const owner = h.client();
  const member = h.client();
  const outsider = h.client();
  const ownerUser = await owner.register(
    "Delete owner",
    "delete-owner@example.test",
  );
  const memberUser = await member.register(
    "Delete member",
    "delete-member@example.test",
  );
  await outsider.register("Delete outsider", "delete-outsider@example.test");
  const removedTeam = await team(owner, "Team to remove");
  const retainedTeam = await team(owner, "Team to retain");
  success(
    await owner.request(`/teams/${removedTeam.id}/members`, {
      method: "POST",
      body: { email: memberUser.email },
    }),
    201,
  );
  const removedPaper = await paper(owner, removedTeam.id);
  const retainedPaper = await paper(owner, retainedTeam.id, {
    title: "Unaffected paper",
  });
  success(
    await owner.request(`/papers/${removedPaper.id}`, {
      method: "PATCH",
      body: { isBookmarked: true },
    }),
  );
  const card = success(
    await member.request(`/papers/${removedPaper.id}/cards`, {
      method: "POST",
      body: {
        quote: "Removed with its workspace",
        page: 1,
        isBookmarked: true,
      },
    }),
    201,
  );
  const summary = success(
    await member.request(`/papers/${removedPaper.id}/summaries`, {
      method: "POST",
      body: { summary: "A summary to remove with its workspace." },
    }),
    201,
  );
  denied(
    await outsider.request(`/teams/${removedTeam.id}`, { method: "DELETE" }),
    404,
  );
  denied(
    await member.request(`/teams/${removedTeam.id}`, { method: "DELETE" }),
    403,
  );
  assert.equal(
    success(await owner.request(`/papers/${removedPaper.id}`)).id,
    removedPaper.id,
  );
  success(
    await owner.request(`/teams/${removedTeam.id}`, { method: "DELETE" }),
    204,
  );
  const checkDeleted = async () => {
    assert.equal(
      success(await owner.request("/auth/me")).user.id,
      ownerUser.id,
    );
    assert.equal(
      success(await member.request("/auth/me")).user.id,
      memberUser.id,
    );
    assert.deepEqual(
      success(await owner.request("/teams")).map((item) => item.id),
      [retainedTeam.id],
    );
    assert.deepEqual(success(await member.request("/teams")), []);
    assert.equal(
      success(await owner.request(`/papers/${retainedPaper.id}`)).title,
      "Unaffected paper",
    );
    assert.equal(
      success(
        await owner.request(`/teams/${retainedTeam.id}/papers?bookmarked=true`),
      ).length,
      0,
    );
    for (const route of [
      `/teams/${removedTeam.id}/members`,
      `/teams/${removedTeam.id}/papers?bookmarked=true`,
      `/teams/${removedTeam.id}/cards?bookmarked=true`,
      `/teams/${removedTeam.id}/export?format=json`,
      `/papers/${removedPaper.id}`,
      `/papers/${removedPaper.id}/file`,
      `/papers/${removedPaper.id}/cards`,
      `/papers/${removedPaper.id}/summaries`,
    ])
      denied(await owner.request(route), 404);
    denied(await member.request(`/papers/${removedPaper.id}/file`), 404);
    denied(
      await member.request(`/cards/${card.id}`, {
        method: "PATCH",
        body: { isBookmarked: false },
      }),
      404,
    );
    denied(
      await owner.request(`/summaries/${summary.id}`, {
        method: "PATCH",
        body: { summary: "Cannot resurrect deleted summary." },
      }),
      404,
    );
  };
  await checkDeleted();
  await h.restart();
  await checkDeleted();
});
