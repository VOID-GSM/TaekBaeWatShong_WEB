import { setCookieValue } from "./cookie";

const accessTokenKey = "access_token";
const refreshTokenKey = "refresh_token";

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

export const isAuthTokens = (value: unknown): value is AuthTokens =>
  typeof value === "object" &&
  value !== null &&
  "accessToken" in value &&
  typeof value.accessToken === "string" &&
  value.accessToken.length > 0 &&
  (!("refreshToken" in value) || typeof value.refreshToken === "string") &&
  (!("expiresIn" in value) || typeof value.expiresIn === "number");

export const saveAuthTokens = ({
  accessToken,
  refreshToken,
  expiresIn,
}: AuthTokens): void => {
  setCookieValue(accessTokenKey, accessToken, {
    path: "/",
    sameSite: "Lax",
    ...(expiresIn === undefined ? {} : { maxAge: expiresIn }),
  });

  if (refreshToken) {
    setCookieValue(refreshTokenKey, refreshToken, {
      path: "/",
      sameSite: "Lax",
    });
  }
};

export const clearAuthTokens = (): void => {
  for (const key of [accessTokenKey, refreshTokenKey]) {
    setCookieValue(key, "", { path: "/", maxAge: 0, sameSite: "Lax" });
  }
};
