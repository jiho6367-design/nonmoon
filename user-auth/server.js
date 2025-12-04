// server.js
require("dotenv").config({ path: require("path").resolve(__dirname, ".env") });

const express = require("express");
const session = require("express-session");
const FileStore = require("session-file-store")(session);
const cors = require("cors");

const db = require("./lib/db");
const sessionOption = require("./lib/sessionOption");

const app = express();
const PORT = 3001;

// =======================
// 기본 미들웨어 설정
// =======================

// CORS 허용 (React 3000 -> Node 3001)
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

// JSON / 폼 데이터 파싱
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 세션 설정
app.use(session(sessionOption));

// 서버 동작 체크용
app.get("/", (req, res) => {
  res.json({ ok: true, message: "API 서버 동작 중!" });
});

// =================================================
// 회원가입 API
// POST http://localhost:3001/signin
// =================================================
app.post("/signin", async (req, res) => {
  try {
    const { userId, userPassword, userPassword2 } = req.body;

    if (!userId || !userPassword || !userPassword2) {
      return res.status(400).json({
        isSuccess: false,
        message: "모든 입력을 채워 주세요.",
      });
    }

    if (userPassword !== userPassword2) {
      return res.status(400).json({
        isSuccess: false,
        message: "비밀번호가 서로 다릅니다.",
      });
    }

    // 아이디 중복 체크
    const [rows] = await db.query(
      "SELECT * FROM userTable WHERE username = ?",
      [userId]
    );

    if (rows.length > 0) {
      return res.status(409).json({
        isSuccess: false,
        message: "이미 존재하는 아이디입니다.",
      });
    }

    // 회원정보 저장
    await db.query(
      "INSERT INTO userTable (username, password) VALUES (?, ?)",
      [userId, userPassword]
    );

    return res.json({
      isSuccess: true,
      message: "회원가입 성공!",
    });
  } catch (err) {
    console.error("SIGNIN ERROR:", err);
    return res.status(500).json({
      isSuccess: false,
      message: "서버 내부 오류가 발생했습니다.",
    });
  }
});

// =================================================
// POST http://localhost:3001/login
// =================================================
app.post("/login", async (req, res) => {
  try {
    const { userId, userPassword } = req.body;

    if (!userId || !userPassword) {
      return res.status(400).json({
        isLogin: false,
        message: "아이디와 비밀번호를 입력해 주세요.",
      });
    }

    const [rows] = await db.query(
      "SELECT * FROM userTable WHERE username = ?",
      [userId]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        isLogin: false,
        message: "존재하지 않는 아이디입니다.",
      });
    }

    const user = rows[0];

    if (user.password !== userPassword) {
      return res.status(401).json({
        isLogin: false,
        message: "비밀번호가 일치하지 않습니다.",
      });
    }

    // 세션 저장
    req.session.userId = user.id;
    req.session.username = user.username;

    return res.json({
      isLogin: true,
      message: "로그인 성공!",
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({
      isLogin: false,
      message: "서버 내부 오류가 발생했습니다.",
    });
  }
});

// =================================================
// =================================================

//  전체 팀원 목록 조회
app.get("/members", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT m.id, m.name,
              g.id AS groupId,
              g.name AS groupName
       FROM teamMember m
       LEFT JOIN projectGroup g ON m.group_id = g.id
       ORDER BY m.id DESC`
    );

    return res.json(rows);
  } catch (err) {
    console.error("GET /members ERROR:", err);
    return res.status(500).json({ message: "팀원 조회 중 오류가 발생했습니다." });
  }
});

// 팀원 추가
app.post("/members", async (req, res) => {
  try {
    const { name, groupId } = req.body;

    if (!name) {
      return res.status(400).json({ message: "이름은 필수입니다." });
    }

    const [result] = await db.query(
      "INSERT INTO teamMember (name, group_id) VALUES (?, ?)",
      [name, groupId || null]
    );

    return res.json({
      isSuccess: true,
      id: result.insertId,
      message: "팀원이 추가되었습니다.",
    });
  } catch (err) {
    console.error("POST /members ERROR:", err);
    return res.status(500).json({ message: "팀원 추가 중 오류가 발생했습니다." });
  }
});

// 팀원 삭제
app.delete("/members/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await db.query("DELETE FROM teamMember WHERE id = ?", [id]);

    return res.json({
      isSuccess: true,
      message: "팀원이 삭제되었습니다.",
    });
  } catch (err) {
    console.error("DELETE /members/:id ERROR:", err);
    return res.status(500).json({ message: "팀원 삭제 중 오류가 발생했습니다." });
  }
});

// 프로젝트 그룹 목록 조회
app.get("/groups", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, name FROM projectGroup ORDER BY id DESC"
    );

    return res.json(rows);
  } catch (err) {
    console.error("GET /groups ERROR:", err);
    return res.status(500).json({ message: "그룹 조회 중 오류가 발생했습니다." });
  }
});

// 프로젝트 그룹 생성
app.post("/groups", async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "그룹 이름은 필수입니다." });
    }

    const [result] = await db.query(
      "INSERT INTO projectGroup (name) VALUES (?)",
      [name]
    );

    return res.json({
      isSuccess: true,
      id: result.insertId,
      message: "그룹이 생성되었습니다.",
    });
  } catch (err) {
    console.error("POST /groups ERROR:", err);
    return res.status(500).json({ message: "그룹 생성 중 오류가 발생했습니다." });
  }
});

// 특정 팀원의 그룹 변경
app.put("/members/:id/group", async (req, res) => {
  try {
    const { id } = req.params;
    const { groupId } = req.body;

    await db.query(
      "UPDATE teamMember SET group_id = ? WHERE id = ?",
      [groupId || null, id]
    );

    return res.json({
      isSuccess: true,
      message: "그룹이 변경되었습니다.",
    });
  } catch (err) {
    console.error("PUT /members/:id/group ERROR:", err);
    return res.status(500).json({ message: "그룹 변경 중 오류가 발생했습니다." });
  }
});

// =================================================
// 서버 실행
// =================================================
app.listen(PORT, () => {
  console.log(`Example app listening at http://localhost:${PORT}`);
});
