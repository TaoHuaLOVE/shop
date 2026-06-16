import { orderStore } from "@/lib/store";
import { pushUpstream } from "@/lib/upstreamApi";
import crypto from "crypto";

const CODEPAY_KEY = process.env.CODEPAY_TOKEN!;

function verifySign(params: Record<string, string>, sign: string): boolean {
  const sortedKeys = Object.keys(params).sort();
  const signStr = sortedKeys.map(k => `${k}=${params[k]}`).join("&") + CODEPAY_KEY;
  const expected = crypto.createHash("md5").update(signStr).digest("hex");
  return expected === sign;
}

export async function POST(request: Request) {
  let rawParams: Record<string, string>;

  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    rawParams = await request.json();
  } else {
    const text = await request.text();
    const sp = new URLSearchParams(text);
    rawParams = {};
    sp.forEach((v, k) => { rawParams[k] = v; });
  }

  const tradeNo = rawParams.out_trade_no || rawParams.pay_id || rawParams.tradeNo || "";
  console.log("[epay callback] out_trade_no:", tradeNo, "status:", rawParams.trade_status);

  if (!tradeNo) return new Response("missing", { status: 400 });

  // 校验签名（排除 sign 和 sign_type）
  const { sign, sign_type, ...checkParams } = rawParams;
  if (!verifySign(checkParams, sign || "")) {
    console.error("[epay callback] sign verification failed");
    return new Response("sign error", { status: 403 });
  }

  // trade_status = TRADE_SUCCESS 表示支付成功
  if (rawParams.trade_status !== "TRADE_SUCCESS") {
    console.log("[epay callback] status not success:", rawParams.trade_status);
    return new Response("ok");
  }

  const order = orderStore.confirm(tradeNo);
  if (!order) return new Response("ok");

  try {
    const result = await pushUpstream(order.platform, order.user, order.pass, order.kcid);
    orderStore.complete(tradeNo, result.rawText);
    console.log("[epay callback] upstream result:", result.success, result.message);
  } catch (e) {
    console.error("[epay callback] pushUpstream error:", e);
  }

  return new Response("success");
}
