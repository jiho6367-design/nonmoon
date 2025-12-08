// server/src/services/openai.js
// AI 없이 작동

import "dotenv/config";


export async function normalizeQuote(text) {

  return {
    quote: text,
    topic: "인용구",
    note: "",
    keywords: ["논문", "인용구"],
    author: null,
    year: null,
    sourceTitle: null,
  };
}


export async function formatCitation(hint) {
  
  return {
    author: null,
    year: null,
    title: hint || "제목 없음",
    venue: null,
    style: "",
  };
}


export async function embed(text) {
 
  return new Array(1536).fill(0.1);
}