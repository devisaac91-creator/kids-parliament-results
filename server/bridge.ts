import type { VercelRequest, VercelResponse } from "@vercel/node";
import handler from "./index";

export async function handleApiRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const headers = Object.fromEntries(request.headers.entries());
  let body: unknown;
  if (request.method !== "GET" && request.method !== "HEAD" && request.method !== "OPTIONS") {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      try {
        body = await request.json();
      } catch {
        return Response.json({ code: "VALIDATION", message: "Request body must be valid JSON." }, { status: 400 });
      }
    }
  }

  const req = {
    method: request.method,
    url: `${url.pathname}${url.search}`,
    headers,
    query: Object.fromEntries(url.searchParams.entries()),
    body,
    socket: { remoteAddress: headers["x-forwarded-for"]?.split(",")[0]?.trim() ?? "unknown" },
  } as unknown as VercelRequest;

  const responseHeaders = new Headers();
  let status = 200;
  let responseBody: unknown;
  let hasResponseBody = false;
  const res = {
    setHeader(name: string, value: string | number | readonly string[]) {
      responseHeaders.set(name, Array.isArray(value) ? value.join(", ") : String(value));
      return this;
    },
    status(code: number) {
      status = code;
      return this;
    },
    json(value: unknown) {
      responseBody = value;
      hasResponseBody = true;
      responseHeaders.set("Content-Type", "application/json; charset=utf-8");
      return this;
    },
    end() {
      return this;
    },
  } as unknown as VercelResponse;

  await handler(req, res);
  if (hasResponseBody) return new Response(JSON.stringify(responseBody), { status, headers: responseHeaders });
  return new Response(null, { status: status === 200 ? 204 : status, headers: responseHeaders });
}
