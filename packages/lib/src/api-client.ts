import axios from "axios";
import { getCookieValue } from "./cookie";

interface CreateApiClientOptions {
  baseURL: string;
  tokenCookieKey?: string;
}

export const createApiClient = ({
  baseURL,
  tokenCookieKey = "access_token",
}: CreateApiClientOptions) => {
  const apiClient = axios.create({
    baseURL,
    timeout: 10000,
    headers: { "Content-Type": "application/json" },
    withCredentials: true,
  });

  apiClient.interceptors.request.use((config) => {
    const token = getCookieValue(tokenCookieKey);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  apiClient.interceptors.response.use(
    (res) => res,
    (error) => Promise.reject(error),
  );

  return apiClient;
};
