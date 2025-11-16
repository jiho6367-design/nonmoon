// server/src/index.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import aiRouter from "./routes/ai.js";
import searchRouter from "./routes/search.js";
import cardsRouter from "./routes/cards.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use("/api/ai", aiRouter);
app.use("/api", searchRouter);
app.use("/api", cardsRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`API server running on ${PORT}`);
});
