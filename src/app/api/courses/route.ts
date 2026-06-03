import { NextResponse } from "next/server";

const UPSTREAM_URL = process.env.UPSTREAM_API_URL!;
const UID = process.env.UPSTREAM_UID!;
const KEY = process.env.UPSTREAM_KEY!;

export async function POST(request: Request) {
  let cid: number;
  let account: string;
  let password: string;
  let school: string;

  try {
    const body = await request.json();
    cid = body.cid;
    account = body.account;
    password = body.password;
    school = body.school || "";
  } catch {
    return NextResponse.json({ success: false, error: "请求格式错误" }, { status: 400 });
  }

  if (!cid || !account || !password) {
    return NextResponse.json({ success: false, error: "请填写账号和密码" }, { status: 400 });
  }

  try {
    const upstreamBody = new URLSearchParams({
      uid: UID,
      key: KEY,
      user: account,
      pass: password,
      platform: String(cid),
      kcid: "0",
    });
    if (school) upstreamBody.set("school", school);

    const res = await fetch(UPSTREAM_URL + "?act=get", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: upstreamBody.toString(),
    });

    const text = await res.text();

    let upstream;
    try { upstream = JSON.parse(text); } catch {
      return NextResponse.json({ success: false, error: "上游服务异常" }, { status: 502 });
    }

    if (upstream.code === "1" || upstream.code === 1) {
      return NextResponse.json({
        success: true,
        courses: upstream.data || [],
        costMs: upstream.cost_ms,
      });
    }

    return NextResponse.json({ success: false, error: upstream.msg || "查询失败" });
  } catch (error) {
    console.error("[/api/courses]", error);
    return NextResponse.json({ success: false, error: "查询失败，请稍后重试" }, { status: 500 });
  }
}