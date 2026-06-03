'use client';

import { useState, useEffect, useMemo } from 'react';
import type { ProductsResponse, Product } from '@/lib/types';

const PRIORITY_CATEGORIES = [
  '103','110','98','96','85','80','93','86','72','91','90','105','106',
  '70','94','97','78','100','74','75','84','108','109','83','71','79','81',
];

type Tab = 'shop' | 'query';

export default function Home() {
  const [tab, setTab] = useState<Tab>('shop');

  // ---- 商品页状态 ----
  const [data, setData] = useState<ProductsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [school, setSchool] = useState('');
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [course, setCourse] = useState('');
  const [step, setStep] = useState<'form' | 'confirm' | 'result'>('form');
  const [submitting, setSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<{ success: boolean; message: string; orderId?: string } | null>(null);

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then((d: ProductsResponse) => {
        if (d.success) setData(d);
        else setError('获取商品失败');
      })
      .catch(() => setError('网络错误，请稍后重试'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.products.filter(p => {
      const matchCat = activeCategory === 'all' || p.fenlei === activeCategory;
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [data, activeCategory, search]);

  const categories = useMemo(() => {
    if (!data) return [];
    const catMap = Object.entries(data.categories).map(([id, name]) => ({ id, name }));
    const prioritySet = new Set(PRIORITY_CATEGORIES);
    const priority = catMap.filter(c => prioritySet.has(c.id));
    const rest = catMap.filter(c => !prioritySet.has(c.id));
    priority.sort((a, b) => PRIORITY_CATEGORIES.indexOf(a.id) - PRIORITY_CATEGORIES.indexOf(b.id));
    rest.sort((a, b) => parseInt(a.id) - parseInt(b.id));
    return [...priority, ...rest];
  }, [data]);

  const buildOrderInput = () => {
    const parts = [school.trim(), account.trim(), password.trim(), course.trim()].filter(Boolean);
    return parts.join(' ');
  };

  const canSubmit = account.trim() && password.trim() && course.trim();

  const submitOrder = async () => {
    if (!selectedProduct) return;
    const input = buildOrderInput();
    if (!input) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cid: selectedProduct.cid, input }),
      });
      const result = await res.json();
      setOrderResult(result);
    } catch {
      setOrderResult({ success: false, message: '网络错误，请稍后重试' });
    } finally {
      setSubmitting(false);
      setStep('result');
    }
  };

  const openProduct = (product: Product) => {
    setSelectedProduct(product);
    setSchool('');
    setAccount('');
    setPassword('');
    setCourse('');
    setStep('form');
    setOrderResult(null);
  };

  const closeModal = () => setSelectedProduct(null);

  // ========================
  // 商品列表页
  // ========================
  const ShopView = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 text-sm">加载商品中...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-red-500">{error}</p>
        </div>
      );
    }

    return (
      <>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="relative mb-4">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">&#128269;</span>
            <input type="text" placeholder="搜索商品名称..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow" />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
            <button onClick={() => setActiveCategory('all')}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activeCategory === 'all' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300'}`}>全部</button>
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activeCategory === cat.id ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300'}`}>{cat.name}</button>
            ))}
          </div>

          <p className="text-xs text-gray-400 mb-3">共 {filtered.length} 件商品</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map(product => (
              <div key={product.cid} onClick={() => openProduct(product)}
                className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">{product.fenleiname}</span>
                </div>
                <h3 className="text-sm text-gray-800 leading-relaxed line-clamp-2 mb-3 min-h-[2.5rem]">{product.name}</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-lg font-bold text-red-500">&yen;{product.sellingPrice.toFixed(2)}</span>
                    <span className="ml-1.5 text-xs text-gray-400 line-through">&yen;{product.price.toFixed(2)}</span>
                  </div>
                  <button className="px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600 transition-colors">购买</button>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              <p className="text-lg mb-1">没有找到匹配的商品</p>
              <p className="text-sm">请尝试其他搜索词或分类</p>
            </div>
          )}
        </div>

        {/* Buy Modal */}
        {selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={closeModal}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 bg-white z-10 px-6 pt-5 pb-3 border-b border-gray-100">
                <button onClick={closeModal} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors">&#10005;</button>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">{selectedProduct.fenleiname}</span>
                <h2 className="mt-1.5 text-base font-semibold text-gray-900 leading-relaxed pr-8 line-clamp-2">{selectedProduct.name}</h2>
              </div>
              <div className="px-6 py-4">
                {step === 'form' && (
                  <>
                    {selectedProduct.content && (
                      <div className="mb-5 p-3 bg-amber-50 rounded-xl text-xs text-amber-800 leading-relaxed">
                        <div dangerouslySetInnerHTML={{ __html: selectedProduct.content }} />
                      </div>
                    )}
                    <div className="space-y-3.5">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">学校 <span className="text-gray-400 font-normal">（选填）</span></label>
                        <input type="text" value={school} onChange={e => setSchool(e.target.value)} placeholder="如：北京大学"
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">账号 <span className="text-red-400">*</span></label>
                        <input type="text" value={account} onChange={e => setAccount(e.target.value)} placeholder="请输入账号"
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">密码 <span className="text-red-400">*</span></label>
                        <input type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder="请输入密码"
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">课程名称 <span className="text-red-400">*</span></label>
                        <input type="text" value={course} onChange={e => setCourse(e.target.value)} placeholder="请输入要学习的课程名称"
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow" />
                      </div>
                    </div>
                    <button onClick={() => setStep('confirm')} disabled={!canSubmit}
                      className="mt-5 w-full py-3 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors active:scale-[0.98]">下一步</button>
                  </>
                )}
                {step === 'confirm' && (
                  <>
                    <div className="text-center mb-5">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-50 flex items-center justify-center"><span className="text-blue-500 text-xl">&#128179;</span></div>
                      <h3 className="text-lg font-semibold text-gray-900">确认付款</h3>
                      <p className="text-sm text-gray-500 mt-1">请核对以下信息</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 space-y-3 mb-4">
                      <div className="flex justify-between text-sm"><span className="text-gray-500">商品</span><span className="text-gray-800 text-right max-w-[60%] truncate">{selectedProduct.name}</span></div>
                      {school && <div className="flex justify-between text-sm"><span className="text-gray-500">学校</span><span className="text-gray-800">{school}</span></div>}
                      <div className="flex justify-between text-sm"><span className="text-gray-500">账号</span><span className="text-gray-800">{account}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-gray-500">密码</span><span className="text-gray-800">{'*'.repeat(Math.min(password.length, 12))}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-gray-500">课程</span><span className="text-gray-800 text-right max-w-[60%] truncate">{course}</span></div>
                      <hr className="border-gray-200" />
                      <div className="flex justify-between items-baseline"><span className="text-sm text-gray-500">应付金额</span><span className="text-xl font-bold text-red-500">&yen;{selectedProduct.sellingPrice.toFixed(2)}</span></div>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => setStep('form')} className="flex-1 py-3 bg-gray-100 text-gray-600 font-medium rounded-xl hover:bg-gray-200 transition-colors text-sm">返回修改</button>
                      <button onClick={submitOrder} disabled={submitting}
                        className="flex-[2] py-3 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors active:scale-[0.98]">
                        {submitting ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />处理中...</span> : <>确认付款 &middot; &yen;{selectedProduct.sellingPrice.toFixed(2)}</>}
                      </button>
                    </div>
                  </>
                )}
                {step === 'result' && orderResult && (
                  <div className="text-center py-4">
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${orderResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
                      <span className={`text-3xl ${orderResult.success ? 'text-green-500' : 'text-red-500'}`}>{orderResult.success ? '&#10003;' : '&#10007;'}</span>
                    </div>
                    <h3 className={`text-lg font-semibold ${orderResult.success ? 'text-green-600' : 'text-red-500'}`}>{orderResult.success ? '下单成功' : '下单失败'}</h3>
                    <p className="text-sm text-gray-500 mt-1">{orderResult.message}</p>
                    {orderResult.orderId && <p className="text-xs text-gray-400 mt-2">订单号：{orderResult.orderId}</p>}
                    <div className="mt-6 space-y-2">
                      {orderResult.success && <button onClick={closeModal} className="w-full py-3 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 transition-colors">完成</button>}
                      <button onClick={() => { setStep('form'); setOrderResult(null); }} className="w-full py-3 bg-gray-100 text-gray-600 font-medium rounded-xl hover:bg-gray-200 transition-colors text-sm">再来一单</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  // ========================
  // 主布局
  // ========================
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Nav */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">虚拟商品商城</h1>
          <nav className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setTab('shop')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'shop' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >&#128722; 商品</button>
            <button
              onClick={() => setTab('query')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'query' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >&#128269; 查单</button>
          </nav>
        </div>
      </header>

      {/* Content */}
      {tab === 'shop' ? (
        <ShopView />
      ) : (
        <div className="flex-1 flex flex-col">
          <iframe
            src="https://xn--ur0ap3x.help/#/query"
            className="flex-1 w-full border-0"
            title="订单查询"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      )}
    </div>
  );
}