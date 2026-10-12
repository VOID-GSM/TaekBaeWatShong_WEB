export interface OAuthRedirectOptions {
  authorizationUrl: string;
  clientId: string;
  redirectUri: string;
  storageKey: string;
  scope?: string;
  pkce?: boolean;
  parameters?: Record<string, string>;
}

export interface OAuthCallbackResult {
  code: string;
  redirectUri: string;
  codeVerifier?: string;
}

interface PendingOAuthRequest {
  state: string;
  redirectUri: string;
  codeVerifier?: string;
}

const toBase64Url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const createRandomString = (): string =>
  toBase64Url(crypto.getRandomValues(new Uint8Array(32)));

const createCodeChallenge = async (codeVerifier: string): Promise<string> => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(codeVerifier),
  );
  return toBase64Url(new Uint8Array(digest));
};

const isPendingOAuthRequest = (value: unknown): value is PendingOAuthRequest =>
  typeof value === "object" &&
  value !== null &&
  "state" in value &&
  typeof value.state === "string" &&
  "redirectUri" in value &&
  typeof value.redirectUri === "string" &&
  (!("codeVerifier" in value) || typeof value.codeVerifier === "string");

const takePendingOAuthRequest = (
  storageKey: string,
): PendingOAuthRequest | null => {
  const stored = window.sessionStorage.getItem(storageKey);
  window.sessionStorage.removeItem(storageKey);
  if (!stored) return null;

  try {
    const pending: unknown = JSON.parse(stored);
    return isPendingOAuthRequest(pending) ? pending : null;
  } catch {
    return null;
  }
};

export const startOAuthRedirect = async ({
  authorizationUrl,
  clientId,
  redirectUri,
  storageKey,
  scope,
  pkce = false,
  parameters = {},
}: OAuthRedirectOptions): Promise<void> => {
  if (typeof window === "undefined") {
    throw new Error("OAuth can only be started in a browser.");
  }

  if (!authorizationUrl || !clientId || !redirectUri) {
    throw new Error(
      "OAuth authorization URL, client ID, and redirect URI are required.",
    );
  }

  const url = new URL(authorizationUrl);
  const query = url.searchParams;
  const pending: PendingOAuthRequest = {
    state: createRandomString(),
    redirectUri,
  };

  for (const [key, value] of Object.entries(parameters)) {
    query.set(key, value);
  }

  query.set("client_id", clientId);
  query.set("redirect_uri", redirectUri);
  query.set("response_type", "code");
  query.set("state", pending.state);
  if (scope) query.set("scope", scope);

  if (pkce) {
    pending.codeVerifier = createRandomString();
    query.set(
      "code_challenge",
      await createCodeChallenge(pending.codeVerifier),
    );
    query.set("code_challenge_method", "S256");
  }

  window.sessionStorage.setItem(storageKey, JSON.stringify(pending));
  window.location.assign(url.toString());
};

export const completeOAuthRedirect = (
  storageKey: string,
): OAuthCallbackResult => {
  if (typeof window === "undefined") {
    throw new Error("OAuth callbacks can only be completed in a browser.");
  }

  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");
  const pending = takePendingOAuthRequest(storageKey);

  for (const name of ["code", "state", "error", "error_description"]) {
    url.searchParams.delete(name);
  }
  window.history.replaceState(
    null,
    "",
    `${url.pathname}${url.search}${url.hash}`,
  );

  if (!pending || returnedState !== pending.state) {
    throw new Error("OAuth state validation failed.");
  }

  if (error) {
    throw new Error(`OAuth authorization failed: ${errorDescription ?? error}`);
  }

  if (!code) {
    throw new Error(
      "The OAuth callback did not include an authorization code.",
    );
  }

  return {
    code,
    redirectUri: pending.redirectUri,
    ...(pending.codeVerifier ? { codeVerifier: pending.codeVerifier } : {}),
  };
};
