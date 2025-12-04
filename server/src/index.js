// server/src/index.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import aiRouter from "./routes/ai.js";
import searchRouter from "./routes/search.js";
import cardsRouter from "./routes/cards.js";
import papersRouter from "./routes/papers.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();
const PORT = process.env.PORT || 4000;
const UPLOAD_ROOT = process.env.UPLOAD_ROOT
  ? path.resolve(process.cwd(), process.env.UPLOAD_ROOT)
  : path.resolve(process.cwd(), "uploads");

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(UPLOAD_ROOT));

app.use("/api/ai", aiRouter);
app.use("/api", searchRouter);
app.use("/api", cardsRouter);
app.use("/api", papersRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`API server running on ${PORT}`);
});
