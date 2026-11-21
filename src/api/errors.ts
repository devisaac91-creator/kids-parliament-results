export type ApiErrorCode = "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION" | "CONFLICT" | "LOCKED" | "RATE_LIMITED" | "PENDING_APPROVAL" | "SERVER";

export class ApiError extends Error {
  constructor(public code: ApiErrorCode, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");
