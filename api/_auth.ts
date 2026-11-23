import type { IncomingMessage, ServerResponse } from "node:http";
import { parseCookie, stringifySetCookie } from "cookie";
import jwt from "jsonwebtoken";

const COOKIE_NAME = "kp_session";
const SESSION_MAX_AGE = 7 * 24 * 60 * 60;

export interface SessionPayload {
  id: string;
}

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be configured with at least 32 characters.");
  }
  return secret;
}

export function signToken(payload: SessionPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: SESSION_MAX_AGE });
}

export function verifyToken(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, getSecret());
    if (typeof decoded === "string" || typeof decoded.id !== "string") return null;
    return { id: decoded.id };
  } catch {
    return null;
  }
}

export function getSessionId(req: IncomingMessage): string | null {
  const cookieHeader = req.headers.cookie;
  if (typeof cookieHeader !== "string") return null;
  const token = parseCookie(cookieHeader)[COOKIE_NAME];
  return token ? verifyToken(token)?.id ?? null : null;
}

export function setSessionCookie(res: ServerResponse, token: string): void {
  res.setHeader("Set-Cookie", stringifySetCookie({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  }));
}

export function clearSessionCookie(res: ServerResponse): void {
  res.setHeader("Set-Cookie", stringifySetCookie({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  }));
}
