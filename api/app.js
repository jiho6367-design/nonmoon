import express from "express";
import multer from "multer";
import { DatabaseSync } from "node:sqlite";
import {
  randomUUID,
  randomBytes,
  scrypt,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";
import { mkdirSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { demoPapers, makePdf } from "./fixtures.js";
import { extractPdf, summarize } from "./summary.js";

const deriveKey = promisify(scrypt);
const now = () => new Date().toISOString();
const digest = (value) => createHash("sha256").update(value).digest("hex");
const fail = (status, code, message) => {
  throw Object.assign(new Error(message), { status, code });
};
const clean = (value, field, max = 300, required = false) => {
  if (value === undefined || value === null) value = "";
  if (
    typeof value !== "string" ||
    value.trim().length > max ||
    (required && !value.trim())
  )
    fail(400, "VALIDATION_ERROR", `${field} 입력을 확인해 주세요.`);
  return value.trim();
};
const boolean = (value) => {
  if (typeof value !== "boolean")
    fail(400, "VALIDATION_ERROR", "참/거짓 값이 필요합니다.");
  return value;
};
const year = (value) => {
  const v = clean(value, "연도", 4);
  if (
    v &&
    (!/^\d{4}$/.test(v) || +v < 1000 || +v > new Date().getFullYear() + 1)
  )
    fail(400, "VALIDATION_ERROR", "올바른 출판 연도를 입력해 주세요.");
  return v;
};
const list = (value) => {
  if (typeof value === "string") value = value.split(",");
  if (!Array.isArray(value) || value.length > 12)
    fail(400, "VALIDATION_ERROR", "태그는 12개까지 입력할 수 있습니다.");
  return [...new Set(value.map((v) => clean(v, "태그", 60)).filter(Boolean))];
};
const filename = (value) => {
  let name = value || "paper.pdf";
  // Multipart legacy header decoding can expose UTF-8 Korean names as Latin-1.
  if (/^[\x00-\xff]*$/.test(name) && /[\x80-\xff]/.test(name)) {
    const decoded = Buffer.from(name, "latin1").toString("utf8");
    if (!decoded.includes("\uFFFD")) name = decoded;
  }
  return (
    path
      .basename(name.replaceAll("\\", "/"))
      .replace(/[\r\n\x00-\x1f]/g, "")
      .slice(0, 200) || "paper.pdf"
  );
};
const json = (value) => JSON.stringify(value);
const parse = (value) => JSON.parse(value);
const safeCsv = (value) => {
  let v = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  return `"${v.replaceAll('"', '""')}"`;
};
const bib = (p) =>
  `@misc{nonmoon_${p.id.replaceAll("-", "")},\n  title = {${p.title.replace(/[{}\\]/g, "")}},\n  author = {${p.author.replace(/[{}\\]/g, "")}},\n  year = {${p.year || "n.d."}}\n}`;

export function createApp({
  dataDir = path.resolve(".data"),
  summaryProvider = "extractive",
  openaiApiKey = "",
  openaiModel = "gpt-4o-mini",
  fetchImpl = fetch,
  secureCookies = false,
} = {}) {
  dataDir = path.resolve(dataDir);
  const uploadDir = path.join(dataDir, "uploads");
  mkdirSync(uploadDir, { recursive: true });
  const db = new DatabaseSync(path.join(dataDir, "nonmoon.sqlite"));
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS teams(id TEXT PRIMARY KEY,name TEXT NOT NULL,description TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS members(team_id TEXT REFERENCES teams(id) ON DELETE CASCADE,user_id TEXT REFERENCES users(id) ON DELETE CASCADE,role TEXT NOT NULL CHECK(role IN ('owner','member')),PRIMARY KEY(team_id,user_id));
    CREATE TABLE IF NOT EXISTS papers(id TEXT PRIMARY KEY,team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,creator_id TEXT NOT NULL REFERENCES users(id),data TEXT NOT NULL,stored_name TEXT NOT NULL,pages TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS cards(id TEXT PRIMARY KEY,paper_id TEXT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,creator_id TEXT NOT NULL REFERENCES users(id),data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS summaries(id TEXT PRIMARY KEY,paper_id TEXT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,creator_id TEXT NOT NULL REFERENCES users(id),data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS bookmarks(user_id TEXT REFERENCES users(id) ON DELETE CASCADE,kind TEXT NOT NULL,resource_id TEXT NOT NULL,PRIMARY KEY(user_id,kind,resource_id));
    CREATE INDEX IF NOT EXISTS papers_team ON papers(team_id); CREATE INDEX IF NOT EXISTS cards_paper ON cards(paper_id); CREATE INDEX IF NOT EXISTS summaries_paper ON summaries(paper_id);
  `);
  const get = (sql, ...params) => db.prepare(sql).get(...params);
  const all = (sql, ...params) => db.prepare(sql).all(...params);
  const run = (sql, ...params) => db.prepare(sql).run(...params);
  const transaction = (fn) => {
    db.exec("BEGIN IMMEDIATE");
    try {
      const result = fn();
      db.exec("COMMIT");
      return result;
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  };
  const userView = (row) => ({ id: row.id, name: row.name, email: row.email });
  const userName = (id) =>
    get("SELECT name FROM users WHERE id=?", id)?.name || "탈퇴한 사용자";
  const cookie = (token) =>
    `nonmoon_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${token ? 604800 : 0}${secureCookies ? "; Secure" : ""}`;
  const startSession = (res, user) => {
    const token = randomBytes(32).toString("hex");
    run("DELETE FROM sessions WHERE expires < ?", Date.now());
    run(
      "INSERT INTO sessions VALUES(?,?,?)",
      digest(token),
      user.id,
      Date.now() + 604800000,
    );
    res.setHeader("Set-Cookie", cookie(token));
    return { user: userView(user) };
  };
  const teamAccess = (req, id, owner = false) => {
    const team = get(
      "SELECT t.*,m.role FROM teams t JOIN members m ON m.team_id=t.id WHERE t.id=? AND m.user_id=?",
      id,
      req.user.id,
    );
    if (!team) fail(404, "NOT_FOUND", "팀을 찾을 수 없습니다.");
    if (owner && team.role !== "owner")
      fail(403, "FORBIDDEN", "팀 관리자만 변경할 수 있습니다.");
    return team;
  };
  const paperAccess = (req, id) => {
    const paper = get("SELECT * FROM papers WHERE id=?", id);
    if (!paper) fail(404, "NOT_FOUND", "논문을 찾을 수 없습니다.");
    teamAccess(req, paper.team_id);
    return paper;
  };
  const itemAccess = (req, table, id) => {
    const item = get(`SELECT * FROM ${table} WHERE id=?`, id);
    if (!item) fail(404, "NOT_FOUND", "항목을 찾을 수 없습니다.");
    paperAccess(req, item.paper_id);
    return item;
  };
  const marked = (req, kind, id) =>
    !!get(
      "SELECT 1 FROM bookmarks WHERE user_id=? AND kind=? AND resource_id=?",
      req.user.id,
      kind,
      id,
    );
  const mark = (req, kind, id, value) => {
    boolean(value);
    if (value)
      run(
        "INSERT OR IGNORE INTO bookmarks VALUES(?,?,?)",
        req.user.id,
        kind,
        id,
      );
    else
      run(
        "DELETE FROM bookmarks WHERE user_id=? AND kind=? AND resource_id=?",
        req.user.id,
        kind,
        id,
      );
  };
  const paperView = (req, row) => ({
    ...parse(row.data),
    id: row.id,
    teamId: row.team_id,
    fileUrl: `/api/papers/${row.id}/file`,
    uploader: userName(row.creator_id),
    cardCount: get("SELECT count(*) n FROM cards WHERE paper_id=?", row.id).n,
    isBookmarked: marked(req, "paper", row.id),
  });
  const cardView = (req, row) => {
    const p = get("SELECT data FROM papers WHERE id=?", row.paper_id);
    const metadata = parse(p.data);
    return {
      ...parse(row.data),
      id: row.id,
      paperId: row.paper_id,
      creatorName: userName(row.creator_id),
      isBookmarked: marked(req, "card", row.id),
      paperTitle: metadata.title,
      paperAuthor: metadata.author,
      paperYear: metadata.year,
    };
  };
  const summaryView = (row) => ({
    ...parse(row.data),
    id: row.id,
    paperId: row.paper_id,
    creatorName: userName(row.creator_id),
  });
  const teamView = (row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    role: row.role,
    memberCount: get("SELECT count(*) n FROM members WHERE team_id=?", row.id)
      .n,
  });
  const filterItems = (items, query, cards = false) => {
    const q = clean(query.q, "검색어", 500).toLocaleLowerCase();
    const author = clean(query.author, "저자", 200).toLocaleLowerCase();
    const yr = clean(query.year, "연도", 4);
    if (
      query.bookmarked !== undefined &&
      !["true", "false"].includes(query.bookmarked)
    )
      fail(400, "VALIDATION_ERROR", "북마크 필터를 확인해 주세요.");
    const sort = query.sort || "recent";
    if (!["recent", "oldest", "title"].includes(sort))
      fail(400, "VALIDATION_ERROR", "정렬 방식을 확인해 주세요.");
    return items
      .filter(
        (p) =>
          (!q ||
            (cards
              ? [p.quote, p.topic, p.note, p.paperTitle, ...p.keywords]
              : [p.title, p.author, p.abstract, ...p.tags]
            )
              .join(" ")
              .toLocaleLowerCase()
              .includes(q)) &&
          (!author ||
            (cards ? p.paperAuthor : p.author)
              .toLocaleLowerCase()
              .includes(author)) &&
          (!yr || (cards ? p.paperYear : p.year) === yr) &&
          (query.bookmarked !== "true" || p.isBookmarked),
      )
      .sort((a, b) =>
        sort === "title"
          ? (a.title || a.paperTitle).localeCompare(
              b.title || b.paperTitle,
              "ko",
            )
          : sort === "oldest"
            ? a.createdAt.localeCompare(b.createdAt)
            : b.createdAt.localeCompare(a.createdAt),
      );
  };
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 20 * 1024 * 1024,
      files: 1,
      fields: 8,
      fieldSize: 20000,
      parts: 10,
    },
  });
  const app = express();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "same-origin");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    if (req.path.startsWith("/api")) res.setHeader("Cache-Control", "no-store");
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      const origin = req.get("origin");
      const host = req.get("host");
      // Vite keeps the browser's original Host through its local proxy.
      if (origin) {
        let originHost;
        try {
          originHost = new URL(origin).host;
        } catch {}
        if (originHost !== host)
          return res.status(403).json({
            error: {
              code: "ORIGIN_REJECTED",
              message: "허용되지 않은 요청 출처입니다.",
            },
          });
      }
      if (req.get("sec-fetch-site") === "cross-site")
        return res.status(403).json({
          error: {
            code: "ORIGIN_REJECTED",
            message: "허용되지 않은 요청 출처입니다.",
          },
        });
    }
    next();
  });
  app.use(express.json({ limit: "128kb", strict: true }));
  app.use((req, res, next) => {
    if (req.body === undefined) req.body = {};
    if (
      req.body === null ||
      Array.isArray(req.body) ||
      typeof req.body !== "object"
    )
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "JSON 객체를 입력해 주세요.",
        },
      });
    next();
  });
  app.use((req, res, next) => {
    const token = /(?:^|;\s*)nonmoon_session=([a-f0-9]{64})(?:;|$)/.exec(
      req.get("cookie") || "",
    )?.[1];
    const session =
      token &&
      get(
        "SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires>?",
        digest(token),
        Date.now(),
      );
    req.user = session || null;
    req.sessionToken = token;
    next();
  });
  app.get("/api/health", (req, res) =>
    res.json({ ok: true, summaryMode: summaryProvider }),
  );
  app.get("/api/auth/me", (req, res) =>
    res.json({ user: req.user ? userView(req.user) : null }),
  );
  const attempts = new Map();
  const authLimit = (req, res, next) => {
    const key = req.ip;
    const time = Date.now();
    if (attempts.size > 10000)
      for (const [k, v] of attempts) if (v.until < time) attempts.delete(k);
    let entry = attempts.get(key);
    if (!entry || entry.until < time) entry = { count: 0, until: time + 60000 };
    entry.count++;
    attempts.set(key, entry);
    if (entry.count > 30)
      return res.status(429).json({
        error: {
          code: "RATE_LIMITED",
          message: "요청이 많습니다. 1분 후 다시 시도해 주세요.",
        },
      });
    next();
  };
  const credentials = (body) => {
    const email = clean(body.email, "이메일", 254, true).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      fail(400, "VALIDATION_ERROR", "올바른 이메일 주소를 입력해 주세요.");
    if (
      typeof body.password !== "string" ||
      body.password.length < 8 ||
      body.password.length > 128
    )
      fail(400, "VALIDATION_ERROR", "비밀번호는 8~128자로 입력해 주세요.");
    return { email, password: body.password };
  };
  app.post("/api/auth/register", authLimit, async (req, res) => {
    const { email, password } = credentials(req.body);
    const name = clean(req.body.name, "이름", 80, true);
    if (get("SELECT id FROM users WHERE email=?", email))
      fail(409, "EMAIL_EXISTS", "이미 등록된 이메일입니다.");
    const salt = randomBytes(16).toString("hex");
    const hash = await deriveKey(password, salt, 64);
    const user = { id: randomUUID(), name, email };
    try {
      run(
        "INSERT INTO users VALUES(?,?,?,?)",
        user.id,
        name,
        email,
        `${salt}:${hash.toString("hex")}`,
      );
    } catch (e) {
      if (e.code?.includes("CONSTRAINT"))
        fail(409, "EMAIL_EXISTS", "이미 등록된 이메일입니다.");
      throw e;
    }
    res.status(201).json(startSession(res, user));
  });
  app.post("/api/auth/login", authLimit, async (req, res) => {
    const { email, password } = credentials(req.body);
    const user = get("SELECT * FROM users WHERE email=?", email);
    const usablePassword = user?.password?.includes(":") ? user.password : null;
    const [salt, expected] = (
      usablePassword || "00000000000000000000000000000000:" + "00".repeat(64)
    ).split(":");
    const actual = await deriveKey(password, salt, 64);
    if (
      !user ||
      !usablePassword ||
      !timingSafeEqual(actual, Buffer.from(expected, "hex"))
    )
      fail(
        401,
        "INVALID_CREDENTIALS",
        "이메일 또는 비밀번호가 올바르지 않습니다.",
      );
    if (req.sessionToken)
      run("DELETE FROM sessions WHERE token=?", digest(req.sessionToken));
    res.json(startSession(res, user));
  });
  app.post("/api/auth/logout", (req, res) => {
    if (req.sessionToken)
      run("DELETE FROM sessions WHERE token=?", digest(req.sessionToken));
    res.setHeader("Set-Cookie", cookie(""));
    res.status(204).end();
  });
  const createTeam = (userId, name, description) => {
    const id = randomUUID();
    run("INSERT INTO teams VALUES(?,?,?,?)", id, name, description, now());
    run("INSERT INTO members VALUES(?,?,?)", id, userId, "owner");
    return id;
  };
  app.post("/api/auth/demo", authLimit, (req, res) => {
    const user = {
      id: randomUUID(),
      name: "체험 연구자",
      email: `demo-${randomUUID()}@example.invalid`,
    };
    const written = [];
    try {
      transaction(() => {
        run(
          "INSERT INTO users VALUES(?,?,?,?)",
          user.id,
          user.name,
          user.email,
          "!demo-no-password",
        );
        const teamId = createTeam(
          user.id,
          "함께 읽는 연구실",
          "실제 연구 결과가 아닌 자체 제작 예제 자료로 기능을 체험합니다.",
        );
        demoPapers.forEach((sample, i) => {
          const id = randomUUID();
          const stored = `${id}.pdf`;
          const buffer = makePdf(sample.lines);
          writeFileSync(path.join(uploadDir, stored), buffer, { flag: "wx" });
          written.push(stored);
          const timestamp = new Date(Date.now() - i * 86400000).toISOString();
          const data = {
            title: sample.title,
            author: sample.author,
            year: sample.year,
            tags: sample.tags,
            abstract: sample.abstract,
            fileName: `nonmoon-example-${i + 1}.pdf`,
            fileSize: buffer.length,
            pageCount: 1,
            createdAt: timestamp,
            updatedAt: timestamp,
          };
          run(
            "INSERT INTO papers VALUES(?,?,?,?,?,?)",
            id,
            teamId,
            user.id,
            json(data),
            stored,
            json([{ page: 1, text: sample.lines.join("\n") }]),
          );
          const cardId = randomUUID();
          run(
            "INSERT INTO cards VALUES(?,?,?,?)",
            cardId,
            id,
            user.id,
            json({
              quote: sample.lines[5],
              note: i
                ? "요약을 인용하기 전에 원문 문맥을 확인하기."
                : "우리 팀의 읽기 규칙으로 검토할 문장.",
              topic: i ? "근거 확인" : "읽기 방법",
              page: 1,
              keywords: sample.tags,
              createdAt: timestamp,
              updatedAt: timestamp,
            }),
          );
          run("INSERT INTO bookmarks VALUES(?,?,?)", user.id, "paper", id);
        });
      });
    } catch (e) {
      for (const f of written)
        try {
          unlinkSync(path.join(uploadDir, f));
        } catch {}
      throw e;
    }
    res.status(201).json(startSession(res, user));
  });
  app.use("/api", (req, res, next) => {
    if (!req.user)
      return res.status(401).json({
        error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." },
      });
    next();
  });
  app.get("/api/teams", (req, res) =>
    res.json(
      all(
        "SELECT t.*,m.role FROM teams t JOIN members m ON m.team_id=t.id WHERE m.user_id=? ORDER BY t.created_at DESC",
        req.user.id,
      ).map(teamView),
    ),
  );
  app.post("/api/teams", (req, res) => {
    const name = clean(req.body.name, "팀 이름", 100, true);
    const description = clean(req.body.description, "팀 설명", 1000);
    const id = transaction(() => createTeam(req.user.id, name, description));
    res.status(201).json(teamView(teamAccess(req, id)));
  });
  app.delete("/api/teams/:id", (req, res) => {
    const team = teamAccess(req, req.params.id, true);
    const papers = all(
      "SELECT id,stored_name FROM papers WHERE team_id=?",
      team.id,
    );
    transaction(() => {
      // Bookmarks are polymorphic; remove them explicitly before FK cascades.
      run(
        `DELETE FROM bookmarks WHERE
        (kind='paper' AND resource_id IN (SELECT id FROM papers WHERE team_id=?)) OR
        (kind='card' AND resource_id IN (SELECT c.id FROM cards c JOIN papers p ON p.id=c.paper_id WHERE p.team_id=?))`,
        team.id,
        team.id,
      );
      run("DELETE FROM teams WHERE id=?", team.id);
    });
    for (const paper of papers) {
      try {
        unlinkSync(path.join(uploadDir, paper.stored_name));
      } catch (error) {
        if (error.code !== "ENOENT")
          console.error("Deferred orphan file cleanup required:", paper.id);
      }
    }
    res.status(204).end();
  });
  app.get("/api/teams/:id/members", (req, res) => {
    teamAccess(req, req.params.id);
    res.json(
      all(
        "SELECT u.id,u.name,u.email,m.role FROM members m JOIN users u ON u.id=m.user_id WHERE m.team_id=? ORDER BY m.role DESC,u.name",
        req.params.id,
      ),
    );
  });
  app.post("/api/teams/:id/members", (req, res) => {
    teamAccess(req, req.params.id, true);
    const email = clean(req.body.email, "이메일", 254, true).toLowerCase();
    const user = get("SELECT * FROM users WHERE email=?", email);
    if (!user)
      fail(
        404,
        "USER_NOT_FOUND",
        "먼저 회원가입한 팀원의 이메일을 입력해 주세요.",
      );
    if (
      get(
        "SELECT 1 FROM members WHERE team_id=? AND user_id=?",
        req.params.id,
        user.id,
      )
    )
      fail(409, "ALREADY_MEMBER", "이미 참여 중인 팀원입니다.");
    run("INSERT INTO members VALUES(?,?,?)", req.params.id, user.id, "member");
    res.status(201).json({ ...userView(user), role: "member" });
  });
  app.delete("/api/teams/:id/members/:userId", (req, res) => {
    teamAccess(req, req.params.id, true);
    const member = get(
      "SELECT role FROM members WHERE team_id=? AND user_id=?",
      req.params.id,
      req.params.userId,
    );
    if (!member) fail(404, "NOT_FOUND", "팀원을 찾을 수 없습니다.");
    if (member.role === "owner")
      fail(409, "OWNER_REQUIRED", "팀 관리자는 제거할 수 없습니다.");
    run(
      "DELETE FROM members WHERE team_id=? AND user_id=?",
      req.params.id,
      req.params.userId,
    );
    res.status(204).end();
  });
  app.get("/api/teams/:teamId/papers", (req, res) => {
    teamAccess(req, req.params.teamId);
    res.json(
      filterItems(
        all("SELECT * FROM papers WHERE team_id=?", req.params.teamId).map(
          (p) => paperView(req, p),
        ),
        req.query,
      ),
    );
  });
  app.post(
    "/api/teams/:teamId/papers",
    (req, res, next) => {
      teamAccess(req, req.params.teamId);
      next();
    },
    upload.single("file"),
    async (req, res) => {
      const title = clean(req.body.title, "제목", 300, true);
      const author = clean(req.body.author, "저자", 200);
      const yr = year(req.body.year);
      const tags = list(req.body.tags || []);
      const abstract = clean(req.body.abstract, "초록", 10000);
      if (!req.file || req.file.buffer.subarray(0, 5).toString() !== "%PDF-")
        fail(400, "INVALID_PDF", "PDF 파일을 선택해 주세요.");
      const extracted = await extractPdf(req.file.buffer);
      teamAccess(req, req.params.teamId);
      const id = randomUUID();
      const stored = `${id}.pdf`;
      const data = {
        title,
        author,
        year: yr,
        tags,
        abstract,
        fileName: filename(req.file.originalname),
        fileSize: req.file.size,
        pageCount: extracted.pageCount,
        createdAt: now(),
        updatedAt: now(),
      };
      writeFileSync(path.join(uploadDir, stored), req.file.buffer, {
        flag: "wx",
      });
      try {
        run(
          "INSERT INTO papers VALUES(?,?,?,?,?,?)",
          id,
          req.params.teamId,
          req.user.id,
          json(data),
          stored,
          json(extracted.pages),
        );
      } catch (e) {
        unlinkSync(path.join(uploadDir, stored));
        throw e;
      }
      res
        .status(201)
        .json(paperView(req, get("SELECT * FROM papers WHERE id=?", id)));
    },
  );
  app.get("/api/papers/:id", (req, res) =>
    res.json(paperView(req, paperAccess(req, req.params.id))),
  );
  app.get("/api/papers/:id/file", (req, res) => {
    const paper = paperAccess(req, req.params.id);
    const full = path.join(uploadDir, paper.stored_name);
    if (!existsSync(full))
      fail(404, "FILE_MISSING", "원본 PDF 파일을 찾을 수 없습니다.");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="paper.pdf"; filename*=UTF-8''${encodeURIComponent(parse(paper.data).fileName)}`,
    );
    res.sendFile(full);
  });
  app.patch("/api/papers/:id", (req, res) => {
    const paper = paperAccess(req, req.params.id);
    const data = parse(paper.data);
    let changed = false;
    for (const key of ["title", "author", "abstract"])
      if (key in req.body) {
        data[key] = clean(
          req.body[key],
          key,
          key === "abstract" ? 10000 : key === "title" ? 300 : 200,
          key === "title",
        );
        changed = true;
      }
    if ("year" in req.body) {
      data.year = year(req.body.year);
      changed = true;
    }
    if ("tags" in req.body) {
      data.tags = list(req.body.tags);
      changed = true;
    }
    if ("isBookmarked" in req.body) {
      mark(req, "paper", paper.id, req.body.isBookmarked);
      changed = true;
    }
    if (!changed) fail(400, "VALIDATION_ERROR", "수정할 필드를 입력해 주세요.");
    data.updatedAt = now();
    run("UPDATE papers SET data=? WHERE id=?", json(data), paper.id);
    res.json(paperView(req, get("SELECT * FROM papers WHERE id=?", paper.id)));
  });
  app.delete("/api/papers/:id", (req, res) => {
    const paper = paperAccess(req, req.params.id);
    transaction(() => {
      run(
        "DELETE FROM bookmarks WHERE (kind='paper' AND resource_id=?) OR (kind='card' AND resource_id IN (SELECT id FROM cards WHERE paper_id=?))",
        paper.id,
        paper.id,
      );
      run("DELETE FROM papers WHERE id=?", paper.id);
    });
    try {
      unlinkSync(path.join(uploadDir, paper.stored_name));
    } catch (error) {
      if (error.code !== "ENOENT")
        console.error("Deferred orphan file cleanup required:", paper.id);
    }
    res.status(204).end();
  });
  app.get("/api/teams/:teamId/cards", (req, res) => {
    teamAccess(req, req.params.teamId);
    res.json(
      filterItems(
        all(
          "SELECT c.* FROM cards c JOIN papers p ON p.id=c.paper_id WHERE p.team_id=?",
          req.params.teamId,
        ).map((c) => cardView(req, c)),
        req.query,
        true,
      ),
    );
  });
  app.get("/api/papers/:id/cards", (req, res) => {
    paperAccess(req, req.params.id);
    res.json(
      all("SELECT * FROM cards WHERE paper_id=?", req.params.id)
        .map((c) => cardView(req, c))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  });
  const cardData = (body, previous, pageCount) => {
    const data = { ...previous };
    let changed = false;
    for (const [key, max] of [
      ["quote", 10000],
      ["note", 10000],
      ["topic", 200],
    ])
      if (key in body) {
        data[key] = clean(body[key], key, max, key === "quote");
        changed = true;
      }
    if ("keywords" in body) {
      data.keywords = list(body.keywords);
      changed = true;
    }
    if ("page" in body) {
      if (
        !Number.isInteger(body.page) ||
        body.page < 1 ||
        body.page > pageCount
      )
        fail(
          400,
          "VALIDATION_ERROR",
          `페이지는 1~${pageCount} 사이의 정수여야 합니다.`,
        );
      data.page = body.page;
      changed = true;
    }
    return { data, changed };
  };
  app.post("/api/papers/:id/cards", (req, res) => {
    const paper = paperAccess(req, req.params.id);
    const { data } = cardData(
      req.body,
      {
        quote: "",
        note: "",
        topic: "",
        page: 1,
        keywords: [],
        createdAt: now(),
        updatedAt: now(),
      },
      parse(paper.data).pageCount,
    );
    if (!data.quote) fail(400, "VALIDATION_ERROR", "인용문을 입력해 주세요.");
    if ("isBookmarked" in req.body) boolean(req.body.isBookmarked);
    const id = randomUUID();
    transaction(() => {
      run(
        "INSERT INTO cards VALUES(?,?,?,?)",
        id,
        paper.id,
        req.user.id,
        json(data),
      );
      if (req.body.isBookmarked) mark(req, "card", id, true);
    });
    res
      .status(201)
      .json(cardView(req, get("SELECT * FROM cards WHERE id=?", id)));
  });
  app.patch("/api/cards/:id", (req, res) => {
    const card = itemAccess(req, "cards", req.params.id);
    const paper = paperAccess(req, card.paper_id);
    const { data, changed } = cardData(
      req.body,
      parse(card.data),
      parse(paper.data).pageCount,
    );
    if (!changed && !("isBookmarked" in req.body))
      fail(400, "VALIDATION_ERROR", "수정할 필드를 입력해 주세요.");
    if ("isBookmarked" in req.body)
      mark(req, "card", card.id, req.body.isBookmarked);
    data.updatedAt = now();
    run("UPDATE cards SET data=? WHERE id=?", json(data), card.id);
    res.json(cardView(req, get("SELECT * FROM cards WHERE id=?", card.id)));
  });
  app.delete("/api/cards/:id", (req, res) => {
    const card = itemAccess(req, "cards", req.params.id);
    transaction(() => {
      run("DELETE FROM bookmarks WHERE kind='card' AND resource_id=?", card.id);
      run("DELETE FROM cards WHERE id=?", card.id);
    });
    res.status(204).end();
  });
  app.get("/api/papers/:id/summaries", (req, res) => {
    paperAccess(req, req.params.id);
    res.json(
      all("SELECT * FROM summaries WHERE paper_id=?", req.params.id)
        .map(summaryView)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  });
  const summaryPending = new Set();
  app.post("/api/papers/:id/summaries", async (req, res) => {
    const paper = paperAccess(req, req.params.id);
    if (summaryPending.has(paper.id))
      fail(409, "SUMMARY_BUSY", "이 논문의 요약을 처리 중입니다.");
    summaryPending.add(paper.id);
    try {
      let result;
      if ("summary" in req.body)
        result = {
          summary: clean(req.body.summary, "요약", 20000, true),
          mode: "manual",
          sourcePages: [],
        };
      else
        result = await summarize(parse(paper.pages), {
          provider: summaryProvider,
          apiKey: openaiApiKey,
          model: openaiModel,
          fetchImpl,
        });
      paperAccess(req, paper.id);
      const id = randomUUID();
      run(
        "INSERT INTO summaries VALUES(?,?,?,?)",
        id,
        paper.id,
        req.user.id,
        json({ ...result, createdAt: now(), updatedAt: now() }),
      );
      res
        .status(201)
        .json(summaryView(get("SELECT * FROM summaries WHERE id=?", id)));
    } finally {
      summaryPending.delete(paper.id);
    }
  });
  app.patch("/api/summaries/:id", (req, res) => {
    const row = itemAccess(req, "summaries", req.params.id);
    const summary = clean(req.body.summary, "요약", 20000, true);
    const data = {
      ...parse(row.data),
      summary,
      mode: "manual",
      updatedAt: now(),
    };
    run("UPDATE summaries SET data=? WHERE id=?", json(data), row.id);
    res.json(summaryView(get("SELECT * FROM summaries WHERE id=?", row.id)));
  });
  app.delete("/api/summaries/:id", (req, res) => {
    itemAccess(req, "summaries", req.params.id);
    run("DELETE FROM summaries WHERE id=?", req.params.id);
    res.status(204).end();
  });
  app.get("/api/teams/:id/export", (req, res) => {
    const team = teamAccess(req, req.params.id);
    const papers = all("SELECT * FROM papers WHERE team_id=?", team.id).map(
      (p) => paperView(req, p),
    );
    const cards = all(
      "SELECT c.* FROM cards c JOIN papers p ON p.id=c.paper_id WHERE p.team_id=?",
      team.id,
    ).map((c) => cardView(req, c));
    const summaries = all(
      "SELECT s.* FROM summaries s JOIN papers p ON p.id=s.paper_id WHERE p.team_id=?",
      team.id,
    ).map(summaryView);
    const format = req.query.format || "json";
    if (!["json", "csv", "bibtex"].includes(format))
      fail(400, "VALIDATION_ERROR", "지원하지 않는 내보내기 형식입니다.");
    res.attachment(`nonmoon-workspace.${format === "bibtex" ? "bib" : format}`);
    if (format === "json")
      return res.json({
        exportedAt: now(),
        team: teamView(team),
        papers,
        cards,
        summaries,
      });
    if (format === "bibtex")
      return res.type("text/plain").send(papers.map(bib).join("\n\n"));
    res
      .type("text/csv; charset=utf-8")
      .send(
        "\uFEFF" +
          [
            [
              "논문",
              "저자",
              "연도",
              "페이지",
              "주제",
              "인용문",
              "메모",
              "작성자",
            ],
            ...cards.map((c) => [
              c.paperTitle,
              c.paperAuthor,
              c.paperYear,
              c.page,
              c.topic,
              c.quote,
              c.note,
              c.creatorName,
            ]),
          ]
            .map((row) => row.map(safeCsv).join(","))
            .join("\r\n"),
      );
  });
  app.get("/api/papers/:id/export", (req, res) => {
    const row = paperAccess(req, req.params.id);
    const p = paperView(req, row);
    const format = req.query.format || "markdown";
    if (!["markdown", "bibtex"].includes(format))
      fail(400, "VALIDATION_ERROR", "지원하지 않는 내보내기 형식입니다.");
    res
      .attachment(`nonmoon-paper.${format === "bibtex" ? "bib" : "md"}`)
      .type("text/plain");
    if (format === "bibtex") return res.send(bib(p));
    const cards = all("SELECT * FROM cards WHERE paper_id=?", p.id).map((c) =>
      cardView(req, c),
    );
    const summaries = all("SELECT * FROM summaries WHERE paper_id=?", p.id).map(
      summaryView,
    );
    res.send(
      `# ${p.title}\n\n${p.author || "저자 미상"} · ${p.year || "연도 미상"}\n\n${p.abstract}\n\n## 인용 카드\n\n${cards.map((c) => `### ${c.topic || "인용"} · p.${c.page}\n\n> ${c.quote.replaceAll("\n", "\n> ")}\n\n${c.note}\n\n작성자: ${c.creatorName}`).join("\n\n")}\n\n## 요약\n\n${summaries.map((s) => `방식: ${s.mode} · 작성자: ${s.creatorName}\n\n${s.summary}`).join("\n\n---\n\n")}`,
    );
  });
  app.use("/api", (req, res) =>
    res.status(404).json({
      error: { code: "NOT_FOUND", message: "API 경로를 찾을 수 없습니다." },
    }),
  );
  const dist = fileURLToPath(new URL("../dist", import.meta.url));
  if (existsSync(path.join(dist, "index.html"))) {
    app.use(express.static(dist));
    app.get("/{*splat}", (req, res) =>
      res.sendFile(path.join(dist, "index.html")),
    );
  }
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status =
      error instanceof multer.MulterError
        ? error.code === "LIMIT_FILE_SIZE"
          ? 413
          : 400
        : error.status || 500;
    const code =
      error instanceof multer.MulterError
        ? error.code
        : error.code || (status === 400 ? "INVALID_JSON" : "INTERNAL_ERROR");
    const message =
      error instanceof multer.MulterError
        ? "파일은 PDF 1개, 최대 20MB까지 업로드할 수 있습니다."
        : status >= 500 && !error.status
          ? "서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
          : error.message;
    if (status >= 500 && !error.status)
      console.error("API error:", error.name, error.code || "unknown");
    res.status(status).json({ error: { code, message } });
  });
  return { app, close: () => db.close() };
}
