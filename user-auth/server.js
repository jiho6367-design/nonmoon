const express = require("express");
const session = require("express-session");
const FileStore = require("session-file-store")(session);
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();
const PORT = 3001;

// DB 연결
const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "1234",
  database: "login",
  port: 3306,
});

// 세션 옵션
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "secret1234",
    resave: false,
    saveUninitialized: false,
    store: new FileStore(),
    cookie: { maxAge: 1000 * 60 * 60 },
  })
);

// 서버 정상 확인
app.get("/", (req, res) => {
  res.json({ ok: true, message: "Auth server is running" });
});

// 회원가입
app.post("/signin", async (req, res) => {
  try {
    const { userId, userPassword, userPassword2 } = req.body;

    if (!userId || !userPassword || !userPassword2) {
      return res.status(400).json({ isSuccess: false, message: "모든 칸을 입력하세요" });
    }

    if (userPassword !== userPassword2) {
      return res.status(400).json({ isSuccess: false, message: "비밀번호가 다릅니다" });
    }

    const [rows] = await db.query("SELECT * FROM userTable WHERE username=?", [userId]);

    if (rows.length > 0) {
      return res.status(409).json({ isSuccess: false, message: "이미 존재하는 아이디입니다" });
    }

    await db.query("INSERT INTO userTable (username,password) VALUES (?,?)", [
      userId,
      userPassword,
    ]);

    res.json({ isSuccess: true, message: "회원가입 성공" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ isSuccess: false, message: "서버 내부 오류" });
  }
});

// 로그인
app.post("/login", async (req, res) => {
  try {
    const { userId, userPassword } = req.body;

    const [rows] = await db.query("SELECT * FROM userTable WHERE username=?", [userId]);

    if (rows.length === 0)
      return res.status(401).json({ isLogin: false, message: "아이디 없음" });

    const user = rows[0];

    if (user.password !== userPassword)
      return res.status(401).json({ isLogin: false, message: "비밀번호 틀림" });

    req.session.userId = user.id;
    req.session.username = user.username;

    res.json({ isLogin: true, message: "로그인 성공" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ isLogin: false, message: "서버 오류" });
  }
});

// ⭐ 서버 실행 ⭐
app.listen(PORT, () => {
  console.log(`Auth server running at http://localhost:${PORT}`);
});
// ================================
// 팀 관리 API
// ================================

// 그룹 목록 조회
app.get("/groups", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM groups ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    console.error("GET /groups ERROR:", err);
    res.status(500).json({ message: "그룹 조회 오류" });
  }
});

// 그룹 생성
app.post("/groups", async (req, res) => {
  const { name } = req.body;

  try {
    await db.query("INSERT INTO groups (name) VALUES (?)", [name]);
    res.json({ isSuccess: true, message: "그룹 생성 성공" });
  } catch (err) {
    console.error("POST /groups ERROR:", err);
    res.status(500).json({ isSuccess: false, message: "그룹 생성 실패" });
  }
});

// 멤버 목록 조회
app.get("/members", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT m.id, m.name, m.groupId, g.name AS groupName 
      FROM members m
      LEFT JOIN groups g ON m.groupId = g.id
      ORDER BY m.id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("GET /members ERROR:", err);
    res.status(500).json({ message: "멤버 조회 오류" });
  }
});

// 멤버 추가
app.post("/members", async (req, res) => {
  const { name, groupId } = req.body;

  try {
    await db.query(
      "INSERT INTO members (name, groupId) VALUES (?, ?)",
      [name, groupId || null]
    );

    res.json({ isSuccess: true, message: "멤버 추가 성공" });
  } catch (err) {
    console.error("POST /members ERROR:", err);
    res.status(500).json({ isSuccess: false, message: "멤버 추가 실패" });
  }
});

// 멤버 삭제
app.delete("/members/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await db.query("DELETE FROM members WHERE id=?", [id]);
    res.json({ isSuccess: true, message: "멤버 삭제 성공" });
  } catch (err) {
    console.error("DELETE /members ERROR:", err);
    res.status(500).json({ isSuccess: false, message: "멤버 삭제 실패" });
  }
});

// 멤버 → 그룹 변경
app.put("/members/:id/group", async (req, res) => {
  const { id } = req.params;
  const { groupId } = req.body;

  try {
    await db.query(
      "UPDATE members SET groupId=? WHERE id=?",
      [groupId || null, id]
    );

    res.json({ isSuccess: true, message: "그룹 변경 성공" });
  } catch (err) {
    console.error("PUT /members/group ERROR:", err);
    res.status(500).json({ isSuccess: false, message: "그룹 변경 실패" });
  }
});
