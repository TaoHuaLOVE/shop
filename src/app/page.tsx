'use client';

import { useState, useEffect, useMemo } from 'react';
import type { ProductsResponse, Product } from '@/lib/types';

const BRANDS = [
  { id: 'cxxt', name: '超星学习通', kw: '超星学习通', icon: '📚', color: 'from-blue-500 to-blue-600' },
  { id: 'uxy', name: 'u校园', kw: ['u校园', '-u校园AI'], icon: '🎓', color: 'from-emerald-500 to-teal-600' },
  { id: 'uxyai', name: 'u校园 AI 版', kw: 'u校园AI', icon: '🤖', color: 'from-violet-500 to-purple-600' },
  { id: 'mooc', name: '中国大学 MOOC', kw: '中国大学MOOC', icon: '🏛', color: 'from-orange-500 to-red-500' },
  { id: 'xuetangx', name: '学堂在线', kw: '学堂在线', icon: '💻', color: 'from-cyan-500 to-blue-600' },
];

// 课程数据类型
interface CourseItem {
  kcid?: string | number;
  kcname?: string;
  name?: string;
  id?: string | number;
  [key: string]: unknown;
}

function matchBrand(name: string, brand: typeof BRANDS[0]): boolean {
  if (Array.isArray(brand.kw)) {
    return brand.kw.every(k => k.startsWith('-') ? !name.toLowerCase().includes(k.slice(1).toLowerCase()) : name.toLowerCase().includes(k.toLowerCase()));
  }
  return name.toLowerCase().includes(brand.kw.toLowerCase());
}

export default function Home() {
  const [data, setData] = useState<ProductsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeBrand, setActiveBrand] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // 表单
  const [school, setSchool] = useState('');
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [course, setCourse] = useState('');
  const [showCourseSearch, setShowCourseSearch] = useState(false);
  const [courseLoading, setCourseLoading] = useState(false);
  const [courseResults, setCourseResults] = useState<CourseItem[]>([]);
  const [courseError, setCourseError] = useState('');

  const [step, setStep] = useState<'form' | 'confirm' | 'result'>('form');
  const [submitting, setSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<{ success: boolean; message: string; orderId?: string } | null>(null);

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then((d: ProductsResponse) => { if (d.success) setData(d); else setError('获取商品失败'); })
      .catch(() => setError('网络错误'))
      .finally(() => setLoading(false));
  }, []);

  const brandProducts = useMemo(() => {
    if (!data) return {};
    const map: Record<string, Product[]> = {};
    BRANDS.forEach(b => { map[b.id] = []; });
    data.products.forEach(p => { BRANDS.forEach(b => { if (matchBrand(p.name, b)) map[b.id].push(p); }); });
    return map;
  }, [data]);

  const displayProducts = useMemo(() => {
    let list = activeBrand ? (brandProducts[activeBrand] || []) : (data?.products || []);
    if (search) list = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [brandProducts, activeBrand, search, data]);

  const buildOrderInput = () => [school.trim(), account.trim(), password.trim(), course.trim()].filter(Boolean).join(' ');
  const canSubmit = account.trim() && password.trim();

  const submitOrder = async () => {
    if (!selectedProduct) return;
    const input = buildOrderInput();
    if (!input) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cid: selectedProduct.cid, input }) });
      setOrderResult(await res.json());
    } catch { setOrderResult({ success: false, message: '网络错误' }); }
    finally { setSubmitting(false); setStep('result'); }
  };

  // 搜索课程
  const searchCourses = async () => {
    if (!selectedProduct || !account.trim() || !password.trim()) return;
    setShowCourseSearch(true);
    setCourseLoading(true);
    setCourseError('');
    setCourseResults([]);
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cid: selectedProduct.cid, account: account.trim(), password: password.trim(), school: school.trim() }),
      });
      const result = await res.json();
      if (result.success) {
        setCourseResults(result.courses || []);
      } else {
        setCourseError(result.error || '查询失败');
      }
    } catch {
      setCourseError('网络错误');
    } finally {
      setCourseLoading(false);
    }
  };

  const openProduct = (p: Product) => {
    setSelectedProduct(p); setSchool(''); setAccount(''); setPassword(''); setCourse('');
    setShowCourseSearch(false); setCourseResults([]); setCourseError('');
    setStep('form'); setOrderResult(null);
  };

  const currentBrand = BRANDS.find(b => b.id === activeBrand);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="flex flex-col items-center gap-3"><div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" /><p className="text-gray-400 text-sm">加载中...</p></div>
    </div>
  );
  if (error) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50"><div className="text-center"><p className="text-red-400 text-lg mb-2">😵</p><p className="text-red-500">{error}</p></div></div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          {activeBrand ? (
            <>
              <button onClick={() => { setActiveBrand(null); setSearch(''); }} className="flex items-center gap-1 text-blue-500 text-sm font-medium">← 返回</button>
              <h1 className="text-base font-semibold text-gray-900">{currentBrand?.icon} {currentBrand?.name}</h1>
              <span className="text-xs text-gray-400">{displayProducts.length} 件</span>
            </>
          ) : (
            <><h1 className="text-lg font-bold text-gray-900">虚拟商品商城</h1>{data && <span className="text-xs text-gray-400">{data.products.length} 件商品</span>}</>
          )}
        </div>
      </header>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-4">
        <div className="relative mb-5">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 text-base">🔍</span>
          <input type="text" placeholder="搜索商品..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent shadow-sm transition-shadow" />
        </div>

        {!activeBrand && (
          <div className="grid grid-cols-2 gap-3">
            {BRANDS.map(brand => (
              <button key={brand.id} onClick={() => { setActiveBrand(brand.id); setSearch(''); }}
                className={`relative overflow-hidden rounded-2xl p-5 text-left bg-gradient-to-br ${brand.color} shadow-md hover:shadow-lg active:scale-[0.97] transition-all duration-200`}>
                <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-bl-full" />
                <span className="text-3xl block mb-3">{brand.icon}</span>
                <h3 className="text-white font-bold text-base leading-tight">{brand.name}</h3>
                <p className="text-white/70 text-xs mt-1">{brandProducts[brand.id]?.length || 0} 个商品</p>
              </button>
            ))}
          </div>
        )}

        {activeBrand && (
          <div className="space-y-2.5">
            {displayProducts.map(product => (
              <div key={product.cid} onClick={() => openProduct(product)}
                className="bg-white rounded-2xl px-4 py-3.5 border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all cursor-pointer active:scale-[0.99]">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm text-gray-800 leading-snug line-clamp-2">{product.name}</h3>
                    <p className="text-xs text-gray-400 mt-1">{product.fenleiname}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-lg font-bold text-red-500">&yen;{product.sellingPrice.toFixed(2)}</p>
                    <span className="inline-block mt-1 px-2.5 py-0.5 bg-blue-500 text-white text-xs font-medium rounded-full">购买</span>
                  </div>
                </div>
              </div>
            ))}
            {displayProducts.length === 0 && <div className="text-center py-16 text-gray-400"><p className="text-4xl mb-3">🔍</p><p>没有找到匹配的商品</p></div>}
          </div>
        )}
      </div>

      {/* 购买弹窗 */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setSelectedProduct(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white z-10 px-6 pt-5 pb-3 border-b border-gray-100">
              <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 transition-colors">✕</button>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">{selectedProduct.fenleiname}</span>
              <h2 className="mt-1.5 text-base font-semibold text-gray-900 leading-relaxed pr-8 line-clamp-2">{selectedProduct.name}</h2>
            </div>
            <div className="px-6 py-4">
              {step === 'form' && (
                <>
                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">学校 <span className="text-gray-400 font-normal">（选填）</span></label>
                      <input type="text" value={school} onChange={e => setSchool(e.target.value)} placeholder="如：北京大学"
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-shadow" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">账号 <span className="text-red-400">*</span></label>
                      <input type="text" value={account} onChange={e => setAccount(e.target.value)} placeholder="请输入账号"
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-shadow" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">密码 <span className="text-red-400">*</span></label>
                      <input type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder="请输入密码"
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-shadow" />
                    </div>

                    {/* 课程搜索 */}
                    <div>
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-600 mb-1">课程名称 <span className="text-gray-400 font-normal">（选填）</span></label>
                          <input type="text" value={course} onChange={e => setCourse(e.target.value)} placeholder="输入或搜索课程"
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-shadow" />
                        </div>
                        <button
                          onClick={searchCourses}
                          disabled={!account.trim() || !password.trim()}
                          className="shrink-0 px-4 py-2.5 bg-blue-50 text-blue-600 rounded-xl text-sm font-medium hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >📋 查课</button>
                      </div>

                      {/* 课程结果面板 */}
                      {showCourseSearch && (
                        <div className="mt-2 p-3 bg-white border border-gray-200 rounded-xl shadow-sm">
                          {courseLoading ? (
                            <div className="flex items-center justify-center gap-2 py-4">
                              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                              <span className="text-xs text-gray-500">正在查询课程列表...</span>
                            </div>
                          ) : courseError ? (
                            <div className="text-center py-4">
                              <p className="text-sm text-red-500">{courseError}</p>
                              <button onClick={searchCourses} className="mt-2 text-xs text-blue-500 hover:underline">重试</button>
                            </div>
                          ) : courseResults.length > 0 ? (
                            <div>
                              <p className="text-xs text-gray-400 mb-2">{courseResults.length} 门课程</p>
                              <div className="space-y-1 max-h-48 overflow-y-auto">
                                {courseResults.map((item, i) => {
                                  const cname = item.kcname || item.name || '';
                                  const cid = item.kcid || item.id || '';
                                  const selected = course === cname;
                                  return (
                                    <button key={i}
                                      onClick={() => { setCourse(cname); setShowCourseSearch(false); }}
                                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selected ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                                    >{cname}</button>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-4">
                              <p className="text-sm text-gray-400">未查询到课程</p>
                              <p className="text-xs text-gray-400 mt-1">请确认账号密码正确，或手动输入课程名</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <button onClick={() => setStep('confirm')} disabled={!canSubmit}
                    className="mt-5 w-full py-3 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors active:scale-[0.98]">下一步</button>
                </>
              )}
              {step === 'confirm' && (
                <>
                  <div className="text-center mb-5">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-50 flex items-center justify-center"><span className="text-blue-500 text-xl">💳</span></div>
                    <h3 className="text-lg font-semibold text-gray-900">确认付款</h3>
                    <p className="text-sm text-gray-500 mt-1">请核对以下信息</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3 mb-4">
                    <div className="flex justify-between text-sm"><span className="text-gray-500">商品</span><span className="text-gray-800 text-right max-w-[60%] truncate">{selectedProduct.name}</span></div>
                    {school && <div className="flex justify-between text-sm"><span className="text-gray-500">学校</span><span className="text-gray-800">{school}</span></div>}
                    <div className="flex justify-between text-sm"><span className="text-gray-500">账号</span><span className="text-gray-800">{account}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-500">密码</span><span className="text-gray-800">{'*'.repeat(Math.min(password.length, 12))}</span></div>
                    {course && <div className="flex justify-between text-sm"><span className="text-gray-500">课程</span><span className="text-gray-800 text-right max-w-[60%] truncate">{course}</span></div>}
                    <hr className="border-gray-200" />
                    <div className="flex justify-between items-baseline"><span className="text-sm text-gray-500">应付金额</span><span className="text-xl font-bold text-red-500">&yen;{selectedProduct.sellingPrice.toFixed(2)}</span></div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setStep('form')} className="flex-1 py-3 bg-gray-100 text-gray-600 font-medium rounded-xl hover:bg-gray-200 transition-colors text-sm">返回修改</button>
                    <button onClick={submitOrder} disabled={submitting}
                      className="flex-[2] py-3 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">
                      {submitting ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />处理中...</span> : <>确认付款 · ¥{selectedProduct.sellingPrice.toFixed(2)}</>}
                    </button>
                  </div>
                </>
              )}
              {step === 'result' && orderResult && (
                <div className="text-center py-4">
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${orderResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
                    <span className={`text-3xl ${orderResult.success ? 'text-green-500' : 'text-red-500'}`}>{orderResult.success ? '✓' : '✗'}</span>
                  </div>
                  <h3 className={`text-lg font-semibold ${orderResult.success ? 'text-green-600' : 'text-red-500'}`}>{orderResult.success ? '下单成功' : '下单失败'}</h3>
                  <p className="text-sm text-gray-500 mt-1">{orderResult.message}</p>
                  {orderResult.orderId && <p className="text-xs text-gray-400 mt-2">订单号：{orderResult.orderId}</p>}
                  <div className="mt-6 space-y-2">
                    {orderResult.success && <button onClick={() => setSelectedProduct(null)} className="w-full py-3 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 transition-colors">完成</button>}
                    <button onClick={() => { setStep('form'); setOrderResult(null); }} className="w-full py-3 bg-gray-100 text-gray-600 font-medium rounded-xl hover:bg-gray-200 transition-colors text-sm">再来一单</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <nav className="sticky bottom-0 bg-white/90 backdrop-blur border-t border-gray-100">
        <div className="max-w-lg mx-auto flex">
          <button onClick={() => { setActiveBrand(null); setSearch(''); }} className="flex-1 py-3 text-center text-blue-500 text-sm font-medium">🛒 商品</button>
          <button onClick={() => window.open('https://xn--ur0ap3x.help/#/query', '_blank')} className="flex-1 py-3 text-center text-gray-400 text-sm font-medium hover:text-gray-600 transition-colors">🔍 查单</button>
        </div>
      </nav>
    </div>
  );
}