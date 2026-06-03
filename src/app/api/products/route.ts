import { NextResponse } from "next/server";
import { upstreamApi } from "@/lib/upstreamApi";
import type { UpstreamGetClassResponse, Product, ProductsResponse } from "@/lib/types";

const FIXED_PRICE = 8.08;

// 上架平台白名单
const PLATFORM_KEYWORDS = [
  "超星学习通",
  "u校园",
  "U校园",
  "中国大学MOOC",
  "中国大学慕课",
  "学堂在线",
];

function isTargetPlatform(name: string): boolean {
  return PLATFORM_KEYWORDS.some(kw => name.includes(kw));
}

export async function GET() {
  try {
    const upstream = await upstreamApi<UpstreamGetClassResponse>({ act: "getclass" });

    if (upstream.code !== "1") {
      return NextResponse.json(
        { success: false, error: upstream.msg || "上游获取商品失败" } satisfies { success: false; error: string },
        { status: 502 }
      );
    }

    // 筛选目标平台 + 构建分类
    const categories: Record<string, string> = {};
    const allProducts: Product[] = [];

    for (const item of upstream.data) {
      if (!isTargetPlatform(item.name)) continue;

      if (!categories[item.fenlei]) {
        categories[item.fenlei] = item.fenleiname;
      }

      allProducts.push({
        cid: item.cid,
        name: item.name,
        price: item.price,
        sellingPrice: FIXED_PRICE,
        fenlei: item.fenlei,
        fenleiname: item.fenleiname,
        content: item.content,
        sort: item.sort,
        status: item.status,
      });
    }

    const response: ProductsResponse = {
      success: true,
      categories,
      products: allProducts,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[/api/products] 上游请求失败:", error);
    return NextResponse.json(
      { success: false, error: "获取商品列表失败，请稍后重试" } satisfies { success: false; error: string },
      { status: 500 }
    );
  }
}