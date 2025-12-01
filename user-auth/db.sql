CREATE TABLE userTable (
    id INT(12) NOT NULL AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL,
    password VARCHAR(255) NOT NULL,
    PRIMARY KEY (id)
) DEFAULT CHARSET = utf8;
USE world;
SELECT * FROM userTable;

-- 프로젝트 그룹 테이블
CREATE TABLE IF NOT EXISTS projectGroup (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

-- 팀원 테이블
CREATE TABLE IF NOT EXISTS teamMember (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  group_id INT NULL,
  CONSTRAINT fk_team_group
    FOREIGN KEY (group_id) REFERENCES projectGroup(id)
    ON DELETE SET NULL
);