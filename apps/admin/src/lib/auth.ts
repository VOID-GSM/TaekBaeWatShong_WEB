import {
  clearAuthTokens,
  completeOAuthRedirect,
  isAuthTokens,
  saveAuthTokens,
  startOAuthRedirect,
  type AuthTokens,
} from "@repo/api-client";
import { apiClient } from "./api-client";

const googleAuthorizationUrl = "https://accounts.google.com/o/oauth2/v2/auth";
const googleStorageKey = "google_oauth";
const googleIntentKey = "google_oauth_intent";

export type DriverAuthIntent = "login" | "signup";

const authEndpoints: Record<DriverAuthIntent, string> = {
  login: "/auth/google/login",
  signup: "/auth/google/signup",
};

export interface DriverAuthResult extends AuthTokens {
  intent: DriverAuthIntent;
}

const startDriverOAuth = async (intent: DriverAuthIntent): Promise<void> => {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error(
      "Set NEXT_PUBLIC_GOOGLE_CLIENT_ID and NEXT_PUBLIC_GOOGLE_REDIRECT_URI to enable Google OAuth.",
    );
  }

  if (typeof window === "undefined") {
    throw new Error("Google OAuth can only be started in a browser.");
  }

  window.sessionStorage.setItem(googleIntentKey, intent);

  try {
    await startOAuthRedirect({
      authorizationUrl: googleAuthorizationUrl,
      clientId,
      redirectUri,
      storageKey: googleStorageKey,
      scope: "openid email profile",
      parameters: { prompt: "select_account" },
    });
  } catch (error) {
    window.sessionStorage.removeItem(googleIntentKey);
    throw error;
  }
};

export const startDriverLogin = (): Promise<void> => startDriverOAuth("login");

export const startDriverSignup = (): Promise<void> =>
  startDriverOAuth("signup");

export const completeDriverOAuth = async (): Promise<DriverAuthResult> => {
  const { code, redirectUri } = completeOAuthRedirect(googleStorageKey);
  const intent = window.sessionStorage.getItem(googleIntentKey);
  window.sessionStorage.removeItem(googleIntentKey);

  if (intent !== "login" && intent !== "signup") {
    throw new Error(
      "The Google OAuth callback has no valid driver auth intent.",
    );
  }

  const { data } = await apiClient.post<unknown>(authEndpoints[intent], {
    code,
    redirectUri,
  });

  if (!isAuthTokens(data)) {
    throw new Error(
      "The driver auth response did not include valid credentials.",
    );
  }

  saveAuthTokens(data);
  return { ...data, intent };
};

export const logout = (): void => {
  clearAuthTokens();
  window.sessionStorage.removeItem(googleIntentKey);
};
