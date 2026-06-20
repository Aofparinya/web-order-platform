import { cookies } from "next/headers";
import {
  ACCESS_COOKIE,
  clearSessionCookies,
  REFRESH_COOKIE,
  setSessionCookies,
  type TokenPair,
} from "./session";

const gatewayUrl = (
  process.env.GATEWAY_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

export async function gatewayFetch(
  path: string,
  init: RequestInit = {},
  accessToken?: string,
) {
  return fetch(`${gatewayUrl}/api/v1/${path.replace(/^\/+/, "")}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      ...Object.fromEntries(new Headers(init.headers)),
    },
    cache: "no-store",
  });
}

export async function forwardWithSession(
  path: string,
  init: RequestInit = {},
) {
  const cookieStore = await cookies();
  let accessToken = cookieStore.get(ACCESS_COOKIE)?.value;
  let response = await gatewayFetch(path, init, accessToken);
  if (response.status !== 401) return response;

  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    await clearSessionCookies();
    return response;
  }
  const refreshResponse = await gatewayFetch("auth/refresh-token", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
  if (!refreshResponse.ok) {
    await clearSessionCookies();
    return response;
  }
  const tokens = (await refreshResponse.json()) as TokenPair;
  await setSessionCookies(tokens);
  accessToken = tokens.accessToken;
  response = await gatewayFetch(path, init, accessToken);
  return response;
}

export async function jsonResponse(response: Response) {
  const body = await response.text();
  return new Response(body || null, {
    status: response.status,
    headers: {
      "content-type":
        response.headers.get("content-type") ?? "application/json",
    },
  });
}
