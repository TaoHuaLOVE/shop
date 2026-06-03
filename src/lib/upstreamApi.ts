/**
 * 上游 API 通用请求封装
 */

const UPSTREAM_URL = process.env.UPSTREAM_API_URL!;
const UID = process.env.UPSTREAM_UID!;
const KEY = process.env.UPSTREAM_KEY!;

export interface UpstreamParams {
  act: "getclass" | "add" | "money";
  [key: string]: string;
}

export async function upstreamApi<T = unknown>(params: UpstreamParams): Promise<T> {
  const { act, ...rest } = params;

  const bodyParams: Record<string, string> = { uid: UID, key: KEY, ...rest };
  const body = new URLSearchParams(bodyParams);

  const url = UPSTREAM_URL + "?act=" + act;
  console.log("[upstreamApi] POST", url, "body keys:", Object.keys(bodyParams));

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const text = await res.text();
  console.log("[upstreamApi] status:", res.status, "body:", text.substring(0, 200));

  if (!res.ok) {
    try {
      const err = JSON.parse(text);
      throw new Error(err.msg || "Upstream HTTP " + res.status);
    } catch (e) {
      if (e instanceof SyntaxError) {
        throw new Error("Upstream HTTP " + res.status + ": " + text.substring(0, 100));
      }
      throw e;
    }
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    console.error("[upstreamApi] JSON parse failed for:", text.substring(0, 200));
    return text as unknown as T;
  }
}