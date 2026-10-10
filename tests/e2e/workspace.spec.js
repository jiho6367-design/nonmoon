import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { makePdf } from "../../api/fixtures.js";
import { mkdir, readFile } from "node:fs/promises";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});
async function demo(page) {
  await page.getByRole("button", { name: "샘플 연구 공간 둘러보기" }).click();
  await expect(
    page.getByRole("heading", { name: "논문 아카이브." }),
  ).toBeVisible();
  await expect(page.locator(".paper-tile")).toHaveCount(2);
}
async function save(page) {
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "저장하기" })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}
async function noOverflow(page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

test("demo research journey persists cards, edits, summaries, export and server logout", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await mkdir("docs/images", { recursive: true });
  await page.screenshot({ path: "docs/images/login.png", fullPage: true });
  await demo(page);
  await page.screenshot({ path: "docs/images/archive.png", fullPage: true });
  await page
    .getByRole("button", {
      name: "함께 읽는 연구: 협업 독서의 설계",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "함께 읽는 연구: 협업 독서의 설계",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByTestId("pdf-reader").getByRole("img")).toBeVisible();
  await expect(page.locator(".pdf-canvas-host")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await page.getByRole("button", { name: "인용 카드 작성" }).click();
  await page
    .getByLabel("원문 인용문")
    .fill("EvidenceBrowser: page references preserve context.");
  await page.getByLabel("주제", { exact: true }).fill("검증할 근거");
  await page.getByLabel("내 메모").fill("원문 문맥과 대조 완료");
  await page.getByLabel("키워드 (쉼표로 구분)").fill("검증, 근거");
  await save(page);
  const created = page
    .locator(".quote-card")
    .filter({ hasText: "EvidenceBrowser" });
  await expect(created).toHaveCount(1);
  await created
    .getByRole("button", { name: "카드 북마크", exact: true })
    .click();
  await expect(
    created.getByRole("button", { name: "카드 북마크 해제" }),
  ).toBeVisible();
  await created.getByRole("button", { name: "수정", exact: true }).click();
  await page.getByLabel("내 메모").fill("수정한 검증 메모");
  await save(page);
  await expect(created).toContainText("수정한 검증 메모");
  await page.getByRole("tab", { name: /요약/ }).click();
  await page.getByRole("button", { name: "원문 기반 요약 만들기" }).click();
  await expect(page.locator(".summary-card")).toHaveCount(1);
  await expect(page.locator(".summary-card")).toContainText(
    "AI 생성이 아닙니다",
  );
  await page
    .getByRole("button", { name: "직접 요약 작성", exact: true })
    .click();
  await page
    .getByLabel("요약 내용")
    .fill("원문을 직접 읽고 확인한 메모입니다.");
  await save(page);
  await expect(page.locator(".summary-card")).toHaveCount(2);
  await page.screenshot({ path: "docs/images/reading.png", fullPage: true });
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Markdown 내보내기" }).click();
  expect((await download).suggestedFilename()).toBe("nonmoon-paper.md");
  await page.reload();
  await expect(page.locator(".paper-tile")).toHaveCount(2);
  await page
    .getByRole("button", { name: "인용 카드", exact: false })
    .filter({ hasText: "인용 카드" })
    .first()
    .click();
  await page.getByLabel("인용 카드 검색").fill("EvidenceBrowser");
  await expect(page.locator(".quote-card")).toHaveCount(1);
  await expect(page.locator(".quote-card")).toContainText("수정한 검증 메모");
  await page.getByRole("button", { name: "로그아웃", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "연구를 이어가세요" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      async () => (await (await fetch("/api/auth/me")).json()).user,
    ),
  ).toBeNull();
  expect(errors).toEqual([]);
});

test("real account creates a team, uploads PDF, handles bad file, edits and deletes paper", async ({
  page,
}) => {
  await page.getByRole("button", { name: "처음 오셨나요? 회원가입" }).click();
  await page.getByLabel("이름", { exact: true }).fill("브라우저 연구자");
  await page
    .getByLabel("이메일", { exact: true })
    .fill(`browser-${Date.now()}@example.test`);
  await page
    .getByLabel("비밀번호", { exact: true })
    .fill("Research!2026-browser");
  await page.getByRole("button", { name: "회원가입 →", exact: true }).click();
  await page
    .getByRole("button", { name: "연구팀 만들기", exact: true })
    .click();
  await page.getByLabel("연구팀 이름").fill("실제 업로드 검증팀");
  await page
    .getByLabel("소개", { exact: true })
    .fill("브라우저에서 PDF 흐름을 검증합니다.");
  await save(page);
  await page.getByRole("button", { name: "논문 추가" }).click();
  await page.getByLabel("PDF 파일").setInputFiles({
    name: "잘못된파일.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("not PDF"),
  });
  await page.getByLabel("논문 제목").fill("실제 업로드 논문");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "저장하기" })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "PDF",
  );
  await page.getByLabel("PDF 파일").setInputFiles({
    name: "실제논문.pdf",
    mimeType: "application/pdf",
    buffer: makePdf([
      "Browser verified upload",
      "Source text supports reproducible research and page-linked notes.",
    ]),
  });
  await page.getByLabel("저자", { exact: true }).fill("Test Author");
  await page.getByLabel("발행 연도").fill("2026");
  await save(page);
  await expect(page.locator(".paper-tile")).toHaveCount(1);
  await page.getByRole("button", { name: "정보 수정", exact: true }).click();
  await page.getByLabel("논문 제목").fill("수정한 논문 제목");
  await save(page);
  await expect(
    page.getByRole("button", { name: "수정한 논문 제목", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "수정한 논문 제목", exact: true })
    .click();
  await expect(page.locator(".pdf-toolbar")).toContainText("실제논문.pdf");
  await expect(page.getByTestId("pdf-reader").getByRole("img")).toBeVisible();
  const file = await page.request.get(
    await page.getByRole("link", { name: "새 창" }).getAttribute("href"),
  );
  expect(file.status()).toBe(200);
  expect(file.headers()["content-type"]).toContain("application/pdf");
  await page.getByRole("button", { name: "아카이브로" }).click();
  await page.getByRole("button", { name: "삭제", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "삭제하기" })
    .click();
  await expect(page.locator(".paper-tile")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "연구 서가를 채워보세요" }),
  ).toBeVisible();
});

test("filters reset and network failure remains visible instead of becoming an empty result", async ({
  page,
}) => {
  await demo(page);
  await page.getByLabel("연도 필터").fill("2025");
  await expect(page.locator(".paper-tile")).toHaveCount(1);
  await expect(page.locator(".paper-tile")).toContainText("근거 중심");
  await page.getByRole("button", { name: "필터 초기화" }).click();
  await expect(page.locator(".paper-tile")).toHaveCount(2);
  await page.route("**/api/teams/*/papers?**", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          code: "OFFLINE_TEST",
          message: "연결 검증: 잠시 후 다시 시도해 주세요.",
        },
      }),
    }),
  );
  await page.getByLabel("논문 검색").fill("연결오류");
  await expect(page.getByRole("alert")).toContainText("연결 검증");
  await page.unroute("**/api/teams/*/papers?**");
  await page.getByRole("button", { name: "필터 초기화" }).click();
  await expect(page.locator(".paper-tile")).toHaveCount(2);
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("mobile archive/detail/modals fit viewport and keyboard closes dialog", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow(page);
  await demo(page);
  await noOverflow(page);
  await page.screenshot({ path: "docs/images/mobile.png", fullPage: true });
  await page.getByRole("button", { name: "논문 추가" }).click();
  await expect(
    page.getByRole("dialog", { name: "새 논문 추가" }),
  ).toBeVisible();
  await noOverflow(page);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", {
      name: "함께 읽는 연구: 협업 독서의 설계",
      exact: true,
    })
    .click();
  await expect(page.getByTestId("pdf-reader").getByRole("img")).toBeVisible();
  await noOverflow(page);
});

test("bundled PDF reader draws source pages, copies text and follows card page references", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await demo(page);
  await page.getByRole("button", { name: "논문 추가" }).click();
  await page.getByLabel("PDF 파일").setInputFiles({
    name: "two-page.pdf",
    mimeType: "application/pdf",
    buffer: await readFile(new URL("./fixtures/two-page.pdf", import.meta.url)),
  });
  await page.getByLabel("논문 제목").fill("두 페이지 원문 검증");
  await save(page);
  await page
    .getByRole("button", { name: "두 페이지 원문 검증", exact: true })
    .click();
  await expect(page.locator(".pdf-canvas-host")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await page
    .getByText("현재 페이지 텍스트 · 인용문 복사", { exact: true })
    .click();
  await expect(page.locator(".pdf-page-text pre")).toContainText(
    "Page One: Shared Reading",
  );
  await page.getByRole("button", { name: "다음 PDF 페이지" }).click();
  await expect(page.getByLabel("PDF 페이지 번호")).toHaveValue("2");
  await expect(page.locator(".pdf-page-text pre")).toContainText(
    "Page Two: Source Verification",
  );
  await page.getByRole("button", { name: "인용 카드 작성" }).click();
  await page
    .getByLabel("원문 인용문")
    .fill("Verification requires reading the context surrounding a quotation.");
  await expect(page.getByLabel("원문 페이지")).toHaveValue("2");
  await save(page);
  await page.getByRole("button", { name: "이전 PDF 페이지" }).click();
  await expect(page.getByLabel("PDF 페이지 번호")).toHaveValue("1");
  await page
    .locator(".quote-card")
    .getByRole("button", { name: /p\.2/ })
    .click();
  await expect(page.getByLabel("PDF 페이지 번호")).toHaveValue("2");
  await expect(page.locator(".pdf-page-text pre")).toContainText(
    "Page Two: Source Verification",
  );
  expect(errors).toEqual([]);
});

test("team owner manages a registered colleague and deletes team without stale errors", async ({
  page,
  playwright,
}) => {
  await demo(page);
  const email = `colleague-${Date.now()}@example.test`;
  const colleague = await playwright.request.newContext({
    baseURL: "http://127.0.0.1:4173",
  });
  const registration = await colleague.post("/api/auth/register", {
    data: { name: "검증 동료", email, password: "Research!2026-colleague" },
  });
  expect(registration.status()).toBe(201);
  await page.getByRole("button", { name: "팀 관리" }).click();
  await page.getByRole("button", { name: "팀원 추가" }).click();
  await page
    .getByRole("dialog")
    .getByLabel("이메일", { exact: true })
    .fill(email);
  await save(page);
  await expect(
    page.getByRole("cell", { name: "검증 동료", exact: true }),
  ).toBeVisible();
  const teams = await (await colleague.get("/api/teams")).json();
  expect(teams).toHaveLength(1);
  await page
    .getByRole("row")
    .filter({ hasText: email })
    .getByRole("button", { name: "제거" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "삭제하기" })
    .click();
  await expect(
    page.getByRole("cell", { name: "검증 동료", exact: true }),
  ).toHaveCount(0);
  expect(await (await colleague.get("/api/teams")).json()).toEqual([]);
  await colleague.dispose();
  await page.getByRole("button", { name: "연구팀 삭제", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("PDF");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "삭제하기" })
    .click();
  await expect(
    page.getByRole("heading", { name: "첫 연구 공간을 만들어 보세요" }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "첫 연구 공간을 만들어 보세요" }),
  ).toBeVisible();
});

test("login and archive meet automated accessibility checks", async ({
  page,
}) => {
  const login = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    login.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await demo(page);
  const archive = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    archive.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page
    .getByRole("button", {
      name: "함께 읽는 연구: 협업 독서의 설계",
      exact: true,
    })
    .click();
  await expect(page.locator(".pdf-canvas-host")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  const detail = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    detail.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page.getByRole("button", { name: "인용 카드 작성" }).click();
  const dialog = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    dialog.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
});
