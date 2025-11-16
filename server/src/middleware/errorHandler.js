import { logError } from "../utils/logger.js";
import { ValidationError } from "../utils/validation.js";

export function errorHandler(err, req, res, _next) {
  if (err instanceof ValidationError) {
    return res.status(err.status || 400).json({ error: err.message });
  }

  const status = err.status || 500;
  const message = status === 500 ? "Internal server error" : err.message;
  logError(`Request failed ${req.method} ${req.originalUrl}`, err);
  return res.status(status).json({ error: message });
}
