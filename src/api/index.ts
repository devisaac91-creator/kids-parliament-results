// The ONLY place that chooses the implementation. Set VITE_USE_MOCK_API="false" to use the real backend.
import { httpApi } from "./http";
import { mockApi } from "./mock";
import type { Api } from "./types";

const useMock = (import.meta.env['VITE_USE_MOCK_API'] as string | undefined) !== "false";

export const api: Api = useMock ? mockApi : httpApi;
export const isMockApi = useMock;
export type { Api } from "./types";
export { ApiError, errorMessage } from "./errors";
