import { NextResponse } from "next/server";
import { orderStore } from "@/lib/store";
import { pushUpstream } from "@/lib/upstreamApi";
import crypto from "crypto";

const CODEPAY_ID = process.env.CODEPAY_ID!;
const CODEPAY_KEY = process.env.CODEPAY_TOKEN!;
const CODEPAY_API_URL = process.env.CODEPAY_API_URL || "https://www.mazfu.com/xpay/epay/mapi.php";

function epaySign(params: Record<string, string>): string {
  const sortedKeys = Object.keys(params).sort();
  const signStr = sortedKeys.map(k => `${k}=${params[k]}`).join("&") + CODEPAY_KEY;
  return crypto.createHash("md5").update(signStr).digest("hex");
}

export async function POST(request: Request) {
  const action = new URL(request.url).searchParams.get("action") || "create";
  return action === "confirm" ? handleConfirm(request) : handleCreate(request);
}

async function handleCreate(request: Request) {
  try {
    const { cid, input, amount, productName } = await request.json();
    if (!cid || !input || !amount) {
      return NextResponse.json({ success: false, error: "参数缺失" }, { status: 400 });
    }

    const order = orderStore.create(cid, input, amount);

    const proto = request.headers.get("x-forwarded-proto") || "https";
    const host = request.headers.get("host") || "taohua.netlify.app";

    const params: Record<string, string> = {
      pid: CODEPAY_ID,
      type: "alipay",
      out_trade_no: order.tradeNo,
      notify_url: `${proto}://${host}/api/orders/confirm`,
      return_url: `${proto}://${host}`,
      name: productName || "商品下单",
      money: amount.toFixed(2),
    };

    params.sign = epaySign(params);
    params.sign_type = "MD5";

    console.log("[epay] creating payment for", order.tradeNo, "amount", amount);

    const cpRes = await fetch(CODEPAY_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params).toString(),
    });
    const cpText = await cpRes.text();
    console.log("[epay] response:", cpText);

    let cpData: { code?: number; msg?: string; trade_no?: string; qrcode?: string; payurl?: string };
    try {
      cpData = JSON.parse(cpText);
    } catch {
      return NextResponse.json({ success: false, error: "支付渠道异常" }, { status: 502 });
    }

    if (cpData.code !== 1) {
      console.error("[epay] create failed:", cpData.msg || cpText);
      return NextResponse.json({ success: false, error: cpData.msg || "支付渠道创建失败" }, { status: 502 });
    }

    order.codepayUrl = cpData.qrcode || cpData.payurl || "";

    return NextResponse.json({
      success: true,
      tradeNo: order.tradeNo,
      qrcode: cpData.qrcode || cpData.payurl,
    });
  } catch (e) {
    console.error("[orders/create]", e);
    return NextResponse.json({ success: false, error: "创建失败" }, { status: 500 });
  }
}

async function handleConfirm(request: Request) {
  try {
    const { tradeNo } = await request.json();
    const order = orderStore.confirm(tradeNo);
    if (!order) {
      return NextResponse.json({ success: false, error: "订单不存在或已处理" }, { status: 400 });
    }

    const result = await pushUpstream(order.cid, order.input);
    orderStore.complete(tradeNo, result.rawText);

    return NextResponse.json({
      success: result.success,
      message: result.message,
      orderId: result.orderId,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: false, error: "确认失败" }, { status: 500 });
  }
}
