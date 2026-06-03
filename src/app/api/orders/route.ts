import { NextResponse } from "next/server";

const UPSTREAM_URL = process.env.UPSTREAM_API_URL!;
const UID = process.env.UPSTREAM_UID!;
const KEY = process.env.UPSTREAM_KEY!;

export async function POST(request: Request) {
  let cid: number;
  let input: string;

  try {
    const raw = await request.text();
    const body = JSON.parse(raw);
    cid = body.cid;
    input = body.input;
  } catch (e) {
    console.error("[orders] parse error:", e);
    return NextResponse.json(
      { success: false, message: "请求格式错误" },
      { status: 400 }
    );
  }

  if (!cid || !input?.trim()) {
    return NextResponse.json(
      { success: false, message: "请填写完整的下单信息（商品和下单内容不能为空）" },
      { status: 400 }
    );
  }

  try {
    const upstreamBody = new URLSearchParams({
      uid: UID,
      key: KEY,
      cid: String(cid),
      input: input.trim(),
    });

    const res = await fetch(UPSTREAM_URL + "?act=add", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: upstreamBody.toString(),
    });

    const text = await res.text();
    console.log("[orders] upstream:", text);

    let upstream;
    try {
      upstream = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { success: false, message: "上游服务异常" },
        { status: 502 }
      );
    }

    const success = upstream.code === "1" || upstream.code === 1;

    return NextResponse.json({
      success,
      message: upstream.msg || (success ? "下单成功" : "下单失败"),
      orderId: upstream.data?.orderid,
    });
  } catch (error) {
    console.error("[/api/orders]", error);
    return NextResponse.json(
      { success: false, message: "网络错误" },
      { status: 500 }
    );
  }
}