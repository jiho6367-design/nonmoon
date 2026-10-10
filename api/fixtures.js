// Original synthetic teaching documents. These are not published research results.
export const demoPapers = [
  {
    title: "함께 읽는 연구: 협업 독서의 설계",
    author: "Nonmoon 예제 연구팀",
    year: "2026",
    tags: ["협업", "연구 방법"],
    abstract:
      "실제 논문이 아닌 기능 체험용 예제입니다. 원문과 메모를 연결해 함께 읽는 과정을 살펴봅니다.",
    lines: [
      "Collaborative Reading: A Demonstration Document",
      "Nonmoon example authors | 2026 | Synthetic teaching material",
      "This is an original demonstration, not a published research paper.",
      "Research question: How can a shared workspace support close reading?",
      "Method: Keep documents, page-linked quotations, and notes together.",
      "Readers should distinguish source quotations from interpretations.",
      "Page references help other readers verify the context of a quotation.",
      "The example includes no participants, experiments, or measured outcomes.",
      "Limitation: This document cannot establish a causal productivity benefit.",
      "Future work: Test the workflow with informed participants and clear metrics.",
    ],
  },
  {
    title: "근거 중심 요약을 위한 읽기 노트",
    author: "Nonmoon 예제 연구팀",
    year: "2025",
    tags: ["요약", "근거 검증"],
    abstract:
      "추출 요약과 생성 요약의 차이를 설명하는 자체 제작 예제 문서입니다.",
    lines: [
      "Evidence First: Notes on Research Summaries",
      "Nonmoon example authors | 2025 | Synthetic teaching material",
      "This document was written for software demonstration purposes.",
      "An extractive summary selects sentences that already exist in the source.",
      "Selection alone does not prove that the selected sentences are representative.",
      "Readers must inspect the surrounding text before reusing any quotation.",
      "Generated summaries can introduce claims that do not appear in a source.",
      "Preserving page numbers makes verification easier for collaborators.",
      "No empirical results or real author affiliations are asserted here.",
      "A practical workflow separates exact quotations, commentary, and questions.",
    ],
  },
];

export function makePdf(lines) {
  const escape = (value) => value.replace(/[\\()]/g, "\\$&");
  const stream = `BT /F1 12 Tf 50 790 Td 18 TL ${lines.map((line, i) => `${i ? "T* " : ""}(${escape(line)}) Tj`).join("\n")} ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}
