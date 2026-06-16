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

/**
 * 推送到上游下单
 * 调用上游 ?act=add，参数: platform, user, pass, kcid
 * 成功码: code === "0"
 */
export async function pushUpstream(platform: string, user: string, pass: string, kcid: number): Promise<{
  success: boolean;
  message: string;
  orderId?: string;
  rawText: string;
}> {
  try {
    const body = new URLSearchParams({
      uid: UID,
      key: KEY,
      platform: platform,
      user: user,
      pass: pass,
      kcid: String(kcid),
    });
    const res = await fetch(UPSTREAM_URL + "?act=add", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const text = await res.text();
    console.log("[upstream add]", text);

    let upstream: { msg: string; code: string | number; data?: { orderid?: string } };
    try {
      upstream = JSON.parse(text);
    } catch {
      upstream = { msg: "上游异常", code: -1 };
    }

    // code === "0" 或 0 表示成功
    const ok = upstream.code === "0" || upstream.code === 0;
    return {
      success: ok,
      message: upstream.msg || (ok ? "下单成功" : "下单失败"),
      orderId: upstream.data?.orderid,
      rawText: text,
    };
  } catch (e) {
    console.error("[pushUpstream] error:", e);
    return { success: false, message: "上游请求失败", rawText: "" };
  }
}
