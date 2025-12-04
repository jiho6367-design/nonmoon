# React와 Node.js로 구현한 로그인/회원가입 페이지

React, Node.js, MySQL을 이용해서 구현했습니다.

## 사용한 모듈

1. mysql2
2. express
3. express-session
4. express-mysql-session
5. body-parser
6. bcrypt

## 로컬 실행 전 필수 설정
`db.js`와 `sessionOption.js`는 비밀번호가 포함되기 때문에 `.gitignore`로 제외되어 있습니다. 서버가 "Cannot find module './lib/db'" 또는 MySQL 권한 오류를 내면 다음 순서로 준비하세요.

1. `user-auth/lib/db.example.js`를 `db.js`로 복사한 뒤 MySQL 계정 정보를 채워 넣습니다. (예: `DB_USER`, `DB_PASSWORD`, `DB_NAME`).
2. `user-auth/lib/sessionOption.example.js`를 `sessionOption.js`로 복사하고 `SESSION_SECRET`을 알맞게 변경합니다.
3. MySQL에 해당 계정이 실제로 존재하고 비밀번호가 맞는지 확인한 후 `db.sql`을 실행해 `userTable`, `projectGroup`, `teamMember` 테이블을 생성합니다.
4. React 클라이언트는 `localhost:3000`, Node 서버는 `localhost:3001`을 사용하므로 CORS 설정을 맞추고, MySQL은 기본 포트 `3306`을 사용합니다.

> Workbench에서 "Access denied for user 'root'@'localhost'"가 뜰 경우, `root` 비밀번호가 일치하는지 확인하거나 새 사용자(예: `appuser`/`app_pass`)를 만들고 `db.js`의 자격 증명을 그 계정으로 변경하세요.

## 팀원에게 설명하기: 오류 해결 단계 (초보자용)
아래 흐름대로 차근차근 따라 하면 `node server.js` 실행 오류, DB 경고, 로그인/회원가입 실패를 한 번에 잡을 수 있습니다. 각 단계가 왜 필요한지도 같이 설명해 주세요.

1) **환경 파일을 꼭 복사해서 채우기**
   - 이유: `db.js`, `sessionOption.js` 파일이 없으면 Node가 `Cannot find module './lib/db'` 같은 오류를 뱉습니다.
   - 방법: `lib/db.example.js` → `lib/db.js`, `lib/sessionOption.example.js` → `lib/sessionOption.js`로 복사한 뒤, 주석에 있는 대로 MySQL 계정(`DB_USER`, `DB_PASSWORD`, `DB_NAME`)과 세션 비밀키(`SESSION_SECRET`)를 적습니다.

2) **DB 접속이 실제로 되는지 먼저 확인**
   - 이유: 비밀번호를 몰라서 MySQL이 거절하면 Node 서버도 로그인/회원가입 모두 실패합니다.
   - 방법: 터미널에서 `mysql -u <사용자> -p`로 접속을 시도해 보고, 안 되면 새 계정을 만듭니다. 예) `CREATE USER 'appuser'@'localhost' IDENTIFIED BY 'app_pass'; GRANT ALL ON *.* TO 'appuser'@'localhost';` 명령을 실행한 뒤 `db.js`의 사용자/비밀번호를 그 계정으로 맞춥니다.

3) **테이블을 먼저 만들어야 회원가입/로그인 가능**
   - 이유: `userTable`이 없으면 INSERT/SELECT가 모두 실패합니다.
   - 방법: MySQL에 접속한 뒤 `source db.sql;` 또는 Workbench에서 `db.sql` 파일을 실행해서 `userTable`, `projectGroup`, `teamMember` 테이블을 생성합니다.

4) **서버가 정상 기동되는지 간단히 점검**
   - 이유: 포트가 이미 쓰이는 경우 `node server.js`가 바로 꺼질 수 있습니다.
   - 방법: `node server.js`를 실행했을 때 터미널에 `Example app listening at http://localhost:3001`이 뜨는지 확인하고, 다른 프로그램이 3001을 쓰고 있다면 종료 후 다시 실행합니다.

5) **로그인/회원가입이 계속 실패할 때 확인할 것**
   - 입력값 누락: 아이디/비밀번호가 비어 있으면 400 응답을 줍니다.
   - 비밀번호 불일치: 회원가입 시 `userPassword`와 `userPassword2`가 다르면 400 응답입니다.
   - DB 데이터 확인: `SELECT * FROM userTable;`로 실제로 아이디가 저장됐는지 확인하고, 저장된 비밀번호(현재는 평문)와 입력한 비밀번호가 같은지 비교합니다.
   - 프런트-백엔드 주소: React는 `http://localhost:3000`, 서버는 `http://localhost:3001`을 사용하므로 프록시 설정 또는 요청 주소가 올바른지 확인합니다.

이 순서를 따라 하면 "모듈을 못 찾겠다" → "DB 경고" → "로그인/회원가입 안 됨" 문제를 각각 어디서 막히는지 파악하면서 해결할 수 있습니다. 특히 DB 비밀번호와 `db.js` 설정이 서로 일치하는지, `db.sql`로 테이블을 먼저 만들었는지 두 가지만 확실히 체크해도 대부분의 오류가 해결됩니다.
