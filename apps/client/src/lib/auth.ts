import {
  clearAuthTokens,
  completeOAuthRedirect,
  isAuthTokens,
  saveAuthTokens,
  startOAuthRedirect,
  type AuthTokens,
} from "@repo/api-client";
import { apiClient } from "./api-client";

const dataGsmAuthorizationUrl =
  "https://oauth.authorization.datagsm.kr/v1/oauth/authorize";
const dataGsmStorageKey = "datagsm_oauth";

const loginEndpoint = "/auth/login";

export type ClientRole = "STUDENT" | "TEACHER";

export interface DataGsmLoginResult extends AuthTokens {
  role: ClientRole;
}

const isDataGsmLoginResult = (value: unknown): value is DataGsmLoginResult =>
  isAuthTokens(value) &&
  "role" in value &&
  (value.role === "STUDENT" || value.role === "TEACHER");

export const startDataGsmLogin = async (): Promise<void> => {
  const clientId = process.env.NEXT_PUBLIC_DATAGSM_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_DATAGSM_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error(
      "Set NEXT_PUBLIC_DATAGSM_CLIENT_ID and NEXT_PUBLIC_DATAGSM_REDIRECT_URI to enable DataGSM login.",
    );
  }

  await startOAuthRedirect({
    authorizationUrl: dataGsmAuthorizationUrl,
    clientId,
    redirectUri,
    storageKey: dataGsmStorageKey,
    pkce: true,
  });
};

export const completeDataGsmLogin = async (): Promise<DataGsmLoginResult> => {
  const { code, codeVerifier, redirectUri } =
    completeOAuthRedirect(dataGsmStorageKey);

  const { data } = await apiClient.post<unknown>(loginEndpoint, {
    code,
    codeVerifier,
    redirectUri,
  });

  if (!isDataGsmLoginResult(data)) {
    throw new Error("The login response did not include valid credentials.");
  }

  saveAuthTokens(data);
  return data;
};

export const logout = (): void => {
  clearAuthTokens();
};
