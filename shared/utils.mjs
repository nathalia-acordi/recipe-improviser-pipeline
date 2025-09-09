export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

export function json(status, data, extraHeaders = {}) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json", ...CORS, ...extraHeaders },
    body: typeof data === "string" ? data : JSON.stringify(data)
  };
}

export function isOptions(event) {
  const m = event?.requestContext?.http?.method || event?.httpMethod || "";
  return m === "OPTIONS";
}

export function routeOf(event) {
  const method = event?.requestContext?.http?.method || event?.httpMethod || "GET";
  const path   = event?.requestContext?.http?.path   || event?.path || "/";
  return { method, path };
}

export function parseEventBody(event) {
  try {
    if (typeof event?.body === "string") return JSON.parse(event.body);
    return event?.body || {};
  } catch {
    return null;
  }
}

