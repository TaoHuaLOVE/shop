
// 上游 API 返回的原始商品结构
export interface UpstreamProduct {
  fenlei: string;
  fenleiname: string;
  price: number;
  name: string;
  sort: number;
  config: string | null;
  content: string;
  remarks: string | null;
  cid: number;
  status: number;
}

// 上游 getclass 响应
export interface UpstreamGetClassResponse {
  msg: string;
  code: string;
  data: UpstreamProduct[];
}

// 加价后的商品（展示给前端）
export interface Product {
  cid: number;
  name: string;
  price: number;
  sellingPrice: number;
  fenlei: string;
  fenleiname: string;
  content: string;
  sort: number;
  status: number;
}

// 商品列表 API 响应
export interface ProductsResponse {
  success: boolean;
  categories: Record<string, string>;
  products: Product[];
}

// 下单请求
export interface CreateOrderRequest {
  cid: number;
  input: string;
}

// 上游 add 响应
export interface UpstreamAddResponse {
  msg: string;
  code: string;
  data?: {
    orderid?: string;
    [key: string]: unknown;
  };
}

// 下单 API 响应
export interface CreateOrderResponse {
  success: boolean;
  message: string;
  orderId?: string;
}