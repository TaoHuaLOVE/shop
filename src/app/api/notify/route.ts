import { NextResponse } from "next/server";

const SERVERCHAN_KEY = process.env.SERVERCHAN_KEY || "";

export async function POST(request: Request) {
  try {
    const { message } = await request.json();
    const title = "TaoHua- 用户联系";
    const desp = message || "有用户点击了联系管理员";

    const res = await fetch(`https://sctapi.ftqq.com/${SERVERCHAN_KEY}.send`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ title, desp }).toString(),
    });
    const text = await res.text();
    console.log("[notify] KEY exists:", !!SERVERCHAN_KEY, "length:", SERVERCHAN_KEY.length);
    console.log("[notify] Server酱:", text);

    const data = JSON.parse(text);
    return NextResponse.json({ success: data.code === 0, message: data.code === 0 ? "已通知管理员" : "通知失败" });
  } catch (e) {
    console.error("[notify]", e);
    return NextResponse.json({ success: false, message: "通知失败" }, { status: 500 });
  }
}
