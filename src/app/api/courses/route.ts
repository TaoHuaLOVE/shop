import { NextResponse } from "next/server";

const UPSTREAM_URL = process.env.UPSTREAM_API_URL!;
const UID = process.env.UPSTREAM_UID!;
const KEY = process.env.UPSTREAM_KEY!;
const DEFAULT_PLATFORM = process.env.UPSTREAM_PLATFORM || "15668";

export async function POST(request: Request) {
  let kcid: number;
  let user: string;
  let pass: string;
  let school: string;
  let platform: string;

  try {
    const body = await request.json();
    kcid = body.kcid || body.cid;
    user = body.user || body.account;
    pass = body.pass || body.password;
    school = body.school || "";
    platform = body.platform || DEFAULT_PLATFORM;
  } catch {
    return NextResponse.json({ success: false, error: "请求格式错误" }, { status: 400 });
  }

  if (!user || !pass) {
    return NextResponse.json({ success: false, error: "请填写账号和密码" }, { status: 400 });
  }

  try {
    const upstreamBody = new URLSearchParams({
      uid: UID,
      key: KEY,
      user: user,
      pass: pass,
      platform: platform,
      kcid: String(kcid || 0),
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

        // 检查 code 是否为 1，且 data 非空
    const isGetOk = (upstream.code === "1" || upstream.code === 1);
    if (isGetOk && upstream.data && upstream.data.length > 0) {
      return NextResponse.json({
        success: true,
        courses: upstream.data || [],
        costMs: upstream.cost_ms,
      });
    }

    const errMsg = (!isGetOk) ? (upstream.msg || "查询失败") : "账号密码错误或该平台暂无可刷课程";
    return NextResponse.json({ success: false, error: errMsg });
  } catch (error) {
    console.error("[/api/courses]", error);
    return NextResponse.json({ success: false, error: "查询失败，请稍后重试" }, { status: 500 });
  }
}
