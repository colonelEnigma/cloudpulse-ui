import { getStoredToken } from "@/auth/token";

export const AUTH_EXPIRED_EVENT = "shcp:auth-expired";

export async function httpJson(url, options = {}) {
  const { auth = false, headers = {}, ...rest } = options;
  const token = auth ? getStoredToken() : "";

  const response = await fetch(url, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = body.error || body.message || "Request failed";
    const error = new Error(message);
    error.status = response.status;
    if (auth && (response.status === 401 || response.status === 403)) {
      window.dispatchEvent(
        new CustomEvent(AUTH_EXPIRED_EVENT, {
          detail: {
            status: response.status,
            url,
          },
        }),
      );
    }
    throw error;
  }

  return body;
}
