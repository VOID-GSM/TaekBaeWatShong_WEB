import { createApiClient } from "@repo/api-client";

export const apiClient = createApiClient({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080",
});
