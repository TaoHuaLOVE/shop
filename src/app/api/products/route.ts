import { NextResponse } from "next/server";
import { upstreamApi } from "@/lib/upstreamApi";
import type { UpstreamGetClassResponse, Product, ProductsResponse } from "@/lib/types";

const PLATFORM_KEYWORDS = ["超星学习通", "u校园", "U校园", "中国大学MOOC", "中国大学慕课", "学堂在线"];

function isTargetPlatform(name: string): boolean {
  return PLATFORM_KEYWORDS.some(kw => name.includes(kw));
}

function getPrice(name: string): number {
  // 超星学习通：6/科，考试类 3/次
  if (name.includes("超星学习通")) {
    return (name.includes("考试") || name.includes("人脸")) ? 3 : 6;
  }
  // u校园 AI 版：3/本，2/单元，5/班测
  if (name.includes("u校园AI") || name.includes("U校园AI")) {
    if (name.includes("班测") || name.includes("班级测试")) return 5;
    return name.includes("单元") ? 2 : 3;
  }
  // u校园：3/本，2/单元，5/班测
  if (name.includes("u校园") || name.includes("U校园")) {
    if (name.includes("班测") || name.includes("班级测试")) return 5;
    return name.includes("单元") ? 2 : 3;
  }
  // 中国大学MOOC：7/科
  if (name.includes("中国大学MOOC") || name.includes("中国大学慕课")) return 7;
  // 学堂在线：7/科
  if (name.includes("学堂在线")) return 7;
  return 8.08;
}

function getDescription(name: string): string {
  if (name.includes("超星学习通"))
    return "不包讨论作业，其他全包。有重要考试提前说明，一天左右一门。";
  if (name.includes("u校园AI") || name.includes("U校园AI"))
    return "默认25小时100分，确保已经激活课程。";
  if (name.includes("u校园") || name.includes("U校园"))
    return "默认100分，25小时左右。";
  if (name.includes("中国大学MOOC") || name.includes("中国大学慕课"))
    return "主观题做不了，时长不包，其他全包。";
  if (name.includes("学堂在线"))
    return "全包。考试主观题做不了，客观题包正确。确保已购买课程。";
  return "";
}

export async function GET() {
  try {
    const upstream = await upstreamApi<UpstreamGetClassResponse>({ act: "getclass" });
    if (upstream.code !== "1") {
      return NextResponse.json({ success: false, error: upstream.msg || "获取商品失败" }, { status: 502 });
    }
    const categories: Record<string, string> = {};
    const products: Product[] = [];
    for (const item of upstream.data) {
      if (!isTargetPlatform(item.name)) continue;
      if (!categories[item.fenlei]) categories[item.fenlei] = item.fenleiname;
      products.push({
        cid: item.cid,
        name: item.name,
        price: item.price,
        sellingPrice: getPrice(item.name),
        fenlei: item.fenlei,
        fenleiname: item.fenleiname,
        content: getDescription(item.name),
        sort: item.sort,
        status: item.status,
      });
    }
    return NextResponse.json({ success: true, categories, products });
  } catch (error) {
    console.error("[/api/products]", error);
    return NextResponse.json({ success: false, error: "获取商品列表失败" }, { status: 500 });
  }
}