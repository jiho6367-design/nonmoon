import { DatabaseSync, backup } from "node:sqlite";
import { mkdir, cp, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

// Stop the app first so PDF files and the database describe the same moment.
const source = path.resolve(process.env.DATA_DIR || ".data");
const destination = path.resolve(
  "backups",
  new Date().toISOString().replace(/[:.]/g, "-"),
);
if (!existsSync(path.join(source, "nonmoon.sqlite"))) {
  console.error("저장된 데이터가 없습니다. 먼저 앱을 실행해 주세요.");
  process.exitCode = 1;
} else {
  await mkdir(destination, { recursive: true });
  const db = new DatabaseSync(path.join(source, "nonmoon.sqlite"), {
    readOnly: true,
  });
  try {
    await backup(db, path.join(destination, "nonmoon.sqlite"));
    await cp(path.join(source, "uploads"), path.join(destination, "uploads"), {
      recursive: true,
    });
    await writeFile(
      path.join(destination, "RESTORE.txt"),
      "앱을 종료한 뒤 이 폴더의 nonmoon.sqlite와 uploads 폴더를 DATA_DIR에 함께 복사하세요. 복원 전에 기존 데이터를 별도 백업하세요.\n백업에는 계정·세션·개인 자료가 포함되므로 공개 저장소에 올리지 마세요.\n",
    );
    console.log(`백업 완료: ${destination}`);
  } finally {
    db.close();
  }
}
