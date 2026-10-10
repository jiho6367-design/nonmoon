import { createApp } from "./app.js";
const port = Number(process.env.PORT || 4000);
const provider = process.env.SUMMARY_PROVIDER || "extractive";
if (!["extractive", "openai"].includes(provider))
  throw new Error("SUMMARY_PROVIDER must be extractive or openai");
const { app, close } = createApp({
  dataDir: process.env.DATA_DIR,
  summaryProvider: provider,
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_MODEL,
  secureCookies: process.env.SECURE_COOKIES === "true",
});
const server = app.listen(port, process.env.HOST || "127.0.0.1", () =>
  console.log(`Nonmoon: http://localhost:${port} (summary: ${provider})`),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () =>
    server.close(() => {
      close();
      process.exit(0);
    }),
  );
