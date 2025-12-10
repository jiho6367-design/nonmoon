// server/src/services/openai.js
import "dotenv/config";

const OPENAI_API_KEY =
  process.env.OPENAI_API_KEY ||
  process.env.OPENAI_KEY ||
  process.env.OPENAI_TOKEN ||
  "";
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

async function callChat(messages, { model = OPENAI_MODEL, temperature = 0.3, maxTokens = 600 } = {}) {
  if (!OPENAI_API_KEY) return null;

  try {
    const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      throw new Error(errorText || `OpenAI request failed with ${res.status}`);
    }

    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    return typeof content === "string" ? content.trim() : null;
  } catch (err) {
    console.error("[openai] chat error", err);
    return null;
  }
}

export async function normalizeQuote(text) {
  const prompt = [
    { role: "system", content: "Extract quote text and metadata. If metadata is missing, leave it null." },
    { role: "user", content: text },
  ];
  const content = await callChat(prompt, { maxTokens: 300 });

  if (!content) {
    return {
      quote: text,
      topic: "인용문",
      note: "",
      keywords: ["논문", "인용문"],
      author: null,
      year: null,
      sourceTitle: null,
    };
  }

  return {
    quote: text,
    topic: content.slice(0, 80),
    note: "",
    keywords: [],
    author: null,
    year: null,
    sourceTitle: null,
  };
}

export async function formatCitation(hint) {
  const prompt = [
    { role: "system", content: "Return a short citation style string for the provided hint." },
    { role: "user", content: hint || "논문 제목 없음" },
  ];
  const content = await callChat(prompt, { maxTokens: 150 });

  return {
    author: null,
    year: null,
    title: hint || "제목 없음",
    venue: null,
    style: content || "",
  };
}

export async function embed(_text) {
  // Embedding is stubbed; replace with a real vector call if needed.
  return new Array(1536).fill(0.1);
}

export async function generateSummaryText({
  title,
  author,
  year,
  pdfName,
  extraContext = "",
  pdfText = "",
} = {}) {
  const cleanSummary = (text = "") =>
    text
      .split("\n")
      .map((line) =>
        line
          // Remove leading bullets / dashes / asterisks
          .replace(/^\s*([*•●‣▪▫◦−–—-]\s*)+/, "")
          // Trim leftover whitespace
          .trim()
      )
      .join("\n")
      // Collapse multiple blank lines
      .replace(/\n{3,}/g, "\n\n")
      .trim();

  const summaryPrompt = [
    {
      role: "system",
      content:
        "You summarize research papers concisely in Korean. Focus on 문제-방법-결과-의의, keep it under 6 bullet points.",
    },
    {
      role: "user",
      content: [
        `제목: ${title || "제목 없음"}`,
        `저자: ${author || "미기재"}`,
        `연도: ${year || "미기재"}`,
        pdfName ? `파일명: ${pdfName}` : "",
        extraContext || "",
        pdfText ? `본문 일부:\n${pdfText}` : "PDF 본문이 없거나 추출되지 않았습니다.",
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ];

  const content = await callChat(summaryPrompt, { maxTokens: 350 });
  if (!content) {
    return cleanSummary([
      `${title || "제목 없는 논문"}의 주요 내용을 간략히 정리했습니다.`,
      "PDF 본문이 없어 메타데이터 기반으로 핵심 의도와 기대 효과를 요약했습니다.",
      "실제 내용을 반영하려면 PDF 전문을 처리하는 요약 모듈이 필요합니다.",
    ].join("\n"));
  }
  return cleanSummary(content);
}
