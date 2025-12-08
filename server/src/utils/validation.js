export class ValidationError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "ValidationError";
    this.status = status;
  }
}

function coerceToString(value) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return value;
}

function ensureString(value, field, { required = true, maxLength = 4000 } = {}) {
  if ((value === undefined || value === null) && !required) {
    return "";
  }
  const coerced = coerceToString(value);
  if (typeof coerced !== "string") {
    throw new ValidationError(`${field} must be a string`);
  }
  const trimmed = coerced.trim();
  if (!trimmed && required) {
    throw new ValidationError(`${field} is required`);
  }
  if (trimmed.length > maxLength) {
    throw new ValidationError(`${field} exceeds ${maxLength} characters`);
  }
  return trimmed;
}

function normalizeOptionalString(value, { maxLength = 1024 } = {}) {
  if (value === undefined || value === null) {
    return null;
  }
  const coerced = coerceToString(value);
  if (typeof coerced !== "string") {
    throw new ValidationError("Optional string fields must be strings");
  }
  const trimmed = coerced.trim();
  if (!trimmed) return null;
  if (trimmed.length > maxLength) {
    throw new ValidationError(`String value exceeds ${maxLength} characters`);
  }
  return trimmed;
}

function normalizeKeywords(input) {
  if (input === undefined) return undefined;
  if (!Array.isArray(input)) {
    throw new ValidationError("keywords must be an array of strings");
  }
  return input
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean)
    .slice(0, 8);
}

function normalizeBoolean(value, field) {
  if (value === undefined) return undefined;
  if (typeof value === "boolean") return value;
  throw new ValidationError(`${field} must be a boolean`);
}

export function validateNormalizeQuotePayload(body = {}) {
  return {
    text: ensureString(body.text, "text"),
    creatorName: normalizeOptionalString(body.creatorName, { maxLength: 200 }),
  };
}

export function validateCitationPayload(body = {}) {
  return {
    hint: ensureString(body.hint, "hint"),
  };
}

export function validateCardPatch(patch = {}) {
  if (typeof patch !== "object" || Array.isArray(patch)) {
    throw new ValidationError("payload must be an object");
  }

  const sanitized = {};
  if ("quote" in patch) sanitized.quote = ensureString(patch.quote ?? "", "quote", { required: false });
  if ("topic" in patch) sanitized.topic = ensureString(patch.topic ?? "", "topic", { required: false, maxLength: 200 });
  if ("note" in patch) sanitized.note = ensureString(patch.note ?? "", "note", { required: false, maxLength: 4000 });
  if ("keywords" in patch) sanitized.keywords = normalizeKeywords(patch.keywords);
  if ("author" in patch) sanitized.author = normalizeOptionalString(patch.author, { maxLength: 200 });
  if ("year" in patch) sanitized.year = normalizeOptionalString(patch.year, { maxLength: 10 });
  if ("sourceTitle" in patch) sanitized.sourceTitle = normalizeOptionalString(patch.sourceTitle, { maxLength: 500 });
  if ("venue" in patch) sanitized.venue = normalizeOptionalString(patch.venue, { maxLength: 500 });
  if ("citationStyle" in patch) sanitized.citationStyle = ensureString(patch.citationStyle ?? "", "citationStyle", { required: false, maxLength: 500 });
  if ("creatorName" in patch) sanitized.creatorName = normalizeOptionalString(patch.creatorName, { maxLength: 200 });
  if ("isBookmarked" in patch) sanitized.isBookmarked = normalizeBoolean(patch.isBookmarked, "isBookmarked");

  if (!Object.keys(sanitized).length) {
    throw new ValidationError("at least one field must be provided");
  }

  return sanitized;
}

export function validateSearchPayload(body = {}) {
  const {
    query = "",
    author = "",
    year = "",
    sort = "recent",
    mode = "text",
    limit = 20,
    minScore = 0.65,
    onlyBookmarked = false,
  } = body;

  const allowedSort = ["recent", "oldest"];
  const allowedMode = ["text", "semantic"];

  return {
    query: ensureString(query, "query", { required: false }),
    author: ensureString(author, "author", { required: false, maxLength: 200 }),
    year: ensureString(year, "year", { required: false, maxLength: 10 }),
    sort: allowedSort.includes(sort) ? sort : "recent",
    mode: allowedMode.includes(mode) ? mode : "text",
    limit: Number.isFinite(Number(limit))
      ? Math.min(Math.max(1, Number(limit)), 100)
      : 20,
    minScore: Number.isFinite(Number(minScore))
      ? Math.min(Math.max(0, Number(minScore)), 1)
      : 0.65,
    onlyBookmarked: Boolean(onlyBookmarked),
  };
}

export function validatePaperCreate(body = {}) {
  return {
    title: ensureString(body.title, "title", { maxLength: 300 }),
    author: ensureString(body.author ?? "", "author", {
      required: false,
      maxLength: 200,
    }),
    uploader: ensureString(body.uploader ?? "", "uploader", {
      required: false,
      maxLength: 200,
    }),
  };
}

export function validatePaperPatch(body = {}) {
  if (typeof body !== "object" || Array.isArray(body)) {
    throw new ValidationError("payload must be an object");
  }
  const patch = {};

  if ("title" in body) {
    patch.title = ensureString(body.title ?? "", "title", {
      required: false,
      maxLength: 300,
    });
  }
  if ("author" in body) {
    patch.author = ensureString(body.author ?? "", "author", {
      required: false,
      maxLength: 200,
    });
  }

  if (!Object.keys(patch).length) {
    throw new ValidationError("at least one field must be provided");
  }

  return patch;
}
