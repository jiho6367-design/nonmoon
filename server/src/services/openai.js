// server/src/services/openai.js
import "dotenv/config";
import { logError } from "../utils/logger.js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const OPENAI_EMBEDDING_MODEL =
  process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";

function assertApiKey() {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
}

async function readJsonResponse(res) {
  let payload;
  try {
    payload = await res.json();
  } catch (error) {
    throw new Error("Failed to parse OpenAI response");
  }

  if (!res.ok) {
    const err = new Error(payload?.error?.message || "OpenAI request failed");
    err.status = res.status;
    throw err;
  }

  return payload;
}

// 공통 chat 호출
async function callChat(messages) {
  assertApiKey();
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages,
      temperature: 0.2,
    }),
  });

  const data = await readJsonResponse(res);
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Missing completion content");
  }
  return content;
}

// 2번: 인용 구절 정리
export async function normalizeQuote(text) {
  const content = await callChat([
    {
      role: "system",
      content:
        "너는 논문 인용구를 카드 데이터로 바꿔주는 도우미다. 반드시 JSON만 출력해.",
    },
    {
      role: "user",
      content: `다음 텍스트를 카드로 만들어.
필드는 quote, topic(한국어 한줄), note, keywords(배열 3~5개), author, year, sourceTitle 만 써.
값을 모르면 null로 적어.
텍스트: """${text}"""`,
    },
  ]);

  try {
    return JSON.parse(content);
  } catch (e) {
    return {
      quote: text,
      topic: "제목 없음",
      note: "",
      keywords: [],
      author: null,
      year: null,
      sourceTitle: null,
    };
  }
}

// 3번: 인용구 내보내기 (저자/연도)
export async function formatCitation(hint) {
  const content = await callChat([
    {
      role: "system",
      content:
        "너는 논문/서적 참고문헌을 정리하는 도우미다. 사용자가 대충 쓴 설명을 author, year, title, venue로 추론해서 JSON만 출력해.",
    },
    {
      role: "user",
      content: `아래 내용을 참고문헌 정보로 변환해.
반드시 아래 형식의 JSON만 출력해.
{
  "author": "... 또는 null",
  "year": "... 또는 null",
  "title": "... 또는 null",
  "venue": "... 또는 null",
  "style": "가능하면 APA 비슷한 한 줄, 없으면 빈 문자열"
}
내용: """${hint}"""`,
    },
  ]);

  try {
    return JSON.parse(content);
  } catch (e) {
    return {
      author: null,
      year: null,
      title: null,
      venue: null,
      style: "",
    };
  }
}

// 5번: 임베딩 (나중에 검색에 쓸 수 있음)
export async function embed(text) {
  assertApiKey();
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_EMBEDDING_MODEL,
      input: text,
    }),
  });

  try {
    const data = await readJsonResponse(res);
    return data.data?.[0]?.embedding || [];
  } catch (error) {
    logError("Embedding generation failed", error);
    throw error;
  }
}
