export interface PendingOrder {
  tradeNo: string;
  platform: string;
  user: string;
  pass: string;
  kcid: number;
  amount: number;
  status: "pending" | "paid" | "completed";
  createdAt: number;
  upstreamResult?: string;
  codepayUrl?: string;
}

class OrderStore {
  private orders = new Map<string, PendingOrder>();

  create(platform: string, user: string, pass: string, kcid: number, amount: number, codepayUrl?: string): PendingOrder {
    const tradeNo = "SHOP" + Date.now() + Math.random().toString(36).slice(2, 8).toUpperCase();
    const o: PendingOrder = { tradeNo, platform, user, pass, kcid, amount, status: "pending", createdAt: Date.now(), codepayUrl };
    this.orders.set(tradeNo, o);
    setTimeout(() => {
      if (this.orders.get(tradeNo)?.status === "pending") this.orders.delete(tradeNo);
    }, 300000);
    return o;
  }

  confirm(tradeNo: string): PendingOrder | null {
    const o = this.orders.get(tradeNo);
    if (!o || o.status !== "pending") return null;
    o.status = "paid";
    return o;
  }

  complete(tradeNo: string, result: string) {
    const o = this.orders.get(tradeNo);
    if (o) { o.status = "completed"; o.upstreamResult = result; }
  }

  get(tradeNo: string) { return this.orders.get(tradeNo) ?? null; }
}

export const orderStore = new OrderStore();
