const LEVELS = {
  info: "INFO",
  warn: "WARN",
  error: "ERROR",
};

function timestamp() {
  return new Date().toISOString();
}

function toPrintableMeta(meta) {
  if (!meta) return "";
  try {
    return typeof meta === "string" ? meta : JSON.stringify(meta);
  } catch (_) {
    return "";
  }
}

export function logInfo(message, meta) {
  console.log(`[${timestamp()}] ${LEVELS.info}: ${message} ${toPrintableMeta(meta)}`);
}

export function logWarn(message, meta) {
  console.warn(`[${timestamp()}] ${LEVELS.warn}: ${message} ${toPrintableMeta(meta)}`);
}

export function logError(message, error, meta) {
  const metaText = toPrintableMeta(meta);
  if (error) {
    console.error(`[${timestamp()}] ${LEVELS.error}: ${message} ${metaText}`, error);
  } else {
    console.error(`[${timestamp()}] ${LEVELS.error}: ${message} ${metaText}`);
  }
}
