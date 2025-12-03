require("dotenv").config();

const express = require("express");
const session = require("express-session");
const FileStore = require("session-file-store")(session);
const cors = require("cors");
const bcrypt = require("bcrypt");

const db = require("./lib/db");
const sessionOption = require("./lib/sessionOption");

const app = express();
const PORT = 3001;

// =======================
// 공통 유틸
// =======================

function sendSuccess(res, message, data = null) {
  const body = { success: true, message };
  if (data !== null && data !== undefined) {
    body.data = data;
  }
  return res.json(body);
}

function sendError(res, statusCode, message, data = null) {
  const body = { success: false, message };
  if (data !== null && data !== undefined) {
    body.data = data;
  }
  return res.status(statusCode).json(body);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateLength(value, min, max) {
  if (typeof value !== "string") return false;
  const len = value.trim().length;
  return len >= min && len <= max;
}

// =======================
// 기본 미들웨어 설정
// =======================

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session(sessionOption));

// 서버 상태 체크
app.get("/", (req, res) => {
  return sendSuccess(res, "user-auth 서버가 동작 중입니다.");
});

// =================================================
// 회원가입 API
// POST /signin
// body: { userId, userPassword, userPassword2 }
// =================================================
app.post("/signin", async (req, res) => {
  const { userId, userPassword, userPassword2 } = req.body || {};

  try {
    // 기본 필수값 검증
    if (!isNonEmptyString(userId) || !isNonEmptyString(userPassword) || !isNonEmptyString(userPassword2)) {
      return sendError(res, 400, "아이디와 비밀번호를 모두 입력해 주세요.");
    }

    if (userPassword !== userPassword2) {
      return sendError(res, 400, "비밀번호가 서로 다릅니다.");
    }

    if (!validateLength(userId, 3, 20)) {
      return sendError(res, 400, "아이디는 3~20자 사이여야 합니다.");
    }

    if (!validateLength(userPassword, 8, 100)) {
      return sendError(res, 400, "비밀번호는 8자 이상이어야 합니다.");
    }

    // 아이디 중복 검사
    const [existing] = await db.query(
      "SELECT 1 FROM userTable WHERE username = ? LIMIT 1",
      [userId.trim()]
    );
    if (existing.length > 0) {
      return sendError(res, 409, "이미 존재하는 아이디입니다.");
    }

    const passwordHash = await bcrypt.hash(userPassword, 12);

    await db.query(
      "INSERT INTO userTable (username, password) VALUES (?, ?)",
      [userId.trim(), passwordHash]
    );

    return sendSuccess(res, "회원가입 성공!");
  } catch (err) {
    console.error("SIGNIN ERROR:", err);
    return sendError(res, 500, "서버 오류");
  }
});

// =================================================
// 로그인 API
// POST /login
// body: { userId, userPassword }
// =================================================
app.post("/login", async (req, res) => {
  const { userId, userPassword } = req.body || {};

  try {
    if (!isNonEmptyString(userId) || !isNonEmptyString(userPassword)) {
      return sendError(res, 400, "아이디와 비밀번호를 모두 입력해 주세요.");
    }

    const [rows] = await db.query(
      "SELECT * FROM userTable WHERE username = ? LIMIT 1",
      [userId.trim()]
    );

    if (rows.length === 0) {
      return sendError(res, 400, "존재하지 않는 아이디입니다.");
    }

    const user = rows[0];

    const passwordMatch = await bcrypt.compare(userPassword, user.password);
    if (!passwordMatch) {
      return sendError(res, 400, "비밀번호가 일치하지 않습니다.");
    }

    // 세션에 저장
    req.session.userId = user.id;
    req.session.username = user.username;

    return sendSuccess(res, "로그인 성공!", {
      userId: user.id,
      username: user.username,
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return sendError(res, 500, "서버 오류");
  }
});

// =================================================
// 로그아웃 API
// =================================================
app.post("/logout", (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.error("LOGOUT ERROR:", err);
        return sendError(res, 500, "서버 오류");
      }
      return sendSuccess(res, "로그아웃 되었습니다.");
    });
  } catch (err) {
    console.error("LOGOUT ERROR:", err);
    return sendError(res, 500, "서버 오류");
  }
});

// =======================
// 프로젝트 그룹 / 팀원 API
// =======================

// 그룹 목록 조회
app.get("/groups", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, name FROM projectGroup ORDER BY id DESC"
    );
    return sendSuccess(res, "그룹 목록을 불러왔습니다.", rows);
  } catch (err) {
    console.error("GET /groups ERROR:", err);
    return sendError(res, 500, "서버 오류");
  }
});

// 그룹 생성
app.post("/groups", async (req, res) => {
  const { name } = req.body || {};

  try {
    if (!isNonEmptyString(name) || !validateLength(name, 1, 100)) {
      return sendError(res, 400, "그룹 이름은 1~100자 사이여야 합니다.");
    }

    const groupName = name.trim();

    // 이름 중복 검사
    const [dup] = await db.query(
      "SELECT 1 FROM projectGroup WHERE name = ? LIMIT 1",
      [groupName]
    );
    if (dup.length > 0) {
      return sendError(res, 409, "이미 존재하는 그룹입니다.");
    }

    const [result] = await db.query(
      "INSERT INTO projectGroup (name) VALUES (?)",
      [groupName]
    );

    return sendSuccess(res, "그룹이 생성되었습니다.", { id: result.insertId, name: groupName });
  } catch (err) {
    console.error("POST /groups ERROR:", err);
    return sendError(res, 500, "서버 오류");
  }
});

// 팀원 목록 조회
app.get("/members", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT m.id, m.name, m.group_id AS groupId, g.name AS groupName
       FROM teamMember m
       LEFT JOIN projectGroup g ON m.group_id = g.id
       ORDER BY m.id DESC`
    );
    return sendSuccess(res, "팀원 목록을 불러왔습니다.", rows);
  } catch (err) {
    console.error("GET /members ERROR:", err);
    return sendError(res, 500, "서버 오류");
  }
});

// 팀원 추가
app.post("/members", async (req, res) => {
  const { name, groupId } = req.body || {};

  try {
    // 이름 검증
    if (!isNonEmptyString(name) || !validateLength(name, 1, 50)) {
      return sendError(res, 400, "팀원 이름은 1~50자 사이여야 합니다.");
    }
    const trimmedName = name.trim();

    // groupId 처리
    let groupIdValue = null;
    if (groupId !== undefined && groupId !== null && groupId !== "") {
      const parsed = Number(groupId);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        return sendError(res, 400, "유효하지 않은 그룹 ID 입니다.");
      }
      groupIdValue = parsed;

      // 그룹 존재 여부 확인
      const [groupRows] = await db.query(
        "SELECT 1 FROM projectGroup WHERE id = ? LIMIT 1",
        [groupIdValue]
      );
      if (groupRows.length === 0) {
        return sendError(res, 400, "존재하지 않는 그룹입니다.");
      }
    }

    // 동일 그룹 내 이름 중복 검사
    const [dup] = await db.query(
      "SELECT 1 FROM teamMember WHERE name = ? AND (group_id <=> ?)",
      [trimmedName, groupIdValue]
    );
    if (dup.length > 0) {
      return sendError(res, 409, "해당 그룹에 이미 같은 이름의 팀원이 있습니다.");
    }

    const [result] = await db.query(
      "INSERT INTO teamMember (name, group_id) VALUES (?, ?)",
      [trimmedName, groupIdValue]
    );

    return sendSuccess(res, "팀원이 추가되었습니다.", { id: result.insertId });
  } catch (err) {
    console.error("POST /members ERROR:", err);
    return sendError(res, 500, "서버 오류");
  }
});

// 팀원 삭제
app.delete("/members/:id", async (req, res) => {
  const { id } = req.params;
  const memberId = Number(id);

  if (!Number.isInteger(memberId) || memberId <= 0) {
    return sendError(res, 400, "유효하지 않은 팀원 ID 입니다.");
  }

  try {
    // 존재 여부 확인
    const [rows] = await db.query(
      "SELECT 1 FROM teamMember WHERE id = ? LIMIT 1",
      [memberId]
    );
    if (rows.length === 0) {
      return sendError(res, 404, "존재하지 않는 팀원입니다.");
    }

    const [result] = await db.query(
      "DELETE FROM teamMember WHERE id = ?",
      [memberId]
    );

    if (result.affectedRows === 0) {
      // 이 경우도 사실상 존재하지 않음과 동일
      return sendError(res, 404, "존재하지 않는 팀원입니다.");
    }

    return sendSuccess(res, "팀원이 삭제되었습니다.");
  } catch (err) {
    console.error("DELETE /members/:id ERROR:", err);

    // FK 제약 오류 메시지 처리 (향후 teamMember를 참조하는 테이블이 생길 경우 대비)
    if (err && typeof err.code === "string" && err.code.startsWith("ER_ROW_IS_REFERENCED")) {
      return sendError(res, 400, "다른 데이터에서 참조 중인 팀원이라 삭제할 수 없습니다.");
    }

    return sendError(res, 500, "서버 오류");
  }
});

// 팀원의 그룹 변경
app.put("/members/:id/group", async (req, res) => {
  const { id } = req.params;
  const { groupId } = req.body || {};

  const memberId = Number(id);
  if (!Number.isInteger(memberId) || memberId <= 0) {
    return sendError(res, 400, "유효하지 않은 팀원 ID 입니다.");
  }

  try {
    // 팀원 존재 여부
    const [memberRows] = await db.query(
      "SELECT 1 FROM teamMember WHERE id = ? LIMIT 1",
      [memberId]
    );
    if (memberRows.length === 0) {
      return sendError(res, 404, "존재하지 않는 팀원입니다.");
    }

    // groupId 처리 (null 허용)
    let groupIdValue = null;
    if (groupId !== undefined && groupId !== null && groupId !== "") {
      const parsed = Number(groupId);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        return sendError(res, 400, "유효하지 않은 그룹 ID 입니다.");
      }
      groupIdValue = parsed;

      // 그룹 존재 여부 확인
      const [groupRows] = await db.query(
        "SELECT 1 FROM projectGroup WHERE id = ? LIMIT 1",
        [groupIdValue]
      );
      if (groupRows.length === 0) {
        return sendError(res, 400, "존재하지 않는 그룹입니다.");
      }
    }

    await db.query(
      "UPDATE teamMember SET group_id = ? WHERE id = ?",
      [groupIdValue, memberId]
    );

    return sendSuccess(res, "그룹이 변경되었습니다.");
  } catch (err) {
    console.error("PUT /members/:id/group ERROR:", err);
    return sendError(res, 500, "서버 오류");
  }
});

// =================================================
// 서버 실행
// =================================================
app.listen(PORT, () => {
  console.log(`user-auth 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});
