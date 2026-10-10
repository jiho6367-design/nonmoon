export async function api(path, options = {}) {
  const { body, ...rest } = options;
  const response = await fetch(`/api${path}`, {
    credentials: "same-origin",
    ...rest,
    ...(body !== undefined
      ? {
          body: body instanceof FormData ? body : JSON.stringify(body),
          headers:
            body instanceof FormData
              ? undefined
              : { "Content-Type": "application/json" },
        }
      : {}),
  });
  if (response.status === 204) return null;
  const result = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      result?.error?.message ||
        `요청을 처리하지 못했습니다 (${response.status}).`,
    );
  return result;
}
