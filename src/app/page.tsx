'use client';

import { useState, useEffect, useMemo } from 'react';
import type { ProductsResponse, Product } from '@/lib/types';

const BRANDS = [
  { id: 'cxxt', name: '超星学习通', kw: '超星学习通', icon: '📚', color: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50', text: 'text-blue-600' },
  { id: 'uxy', name: 'u校园', kw: ['u校园', '-u校园AI'], icon: '🏫', color: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50', text: 'text-emerald-600' },
  { id: 'uxyai', name: 'u校园 AI', kw: 'u校园AI', icon: '🤖', color: 'from-violet-500 to-purple-600', bg: 'bg-violet-50', text: 'text-violet-600' },
  { id: 'mooc', name: '中国大学 MOOC', kw: '中国大学MOOC', icon: '🎓', color: 'from-orange-500 to-red-500', bg: 'bg-orange-50', text: 'text-orange-600' },
  { id: 'xuetangx', name: '学堂在线', kw: '学堂在线', icon: '💻', color: 'from-cyan-500 to-sky-600', bg: 'bg-cyan-50', text: 'text-cyan-600' },
];

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

  const [school, setSchool] = useState('');
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [course, setCourse] = useState('');
  const [showCourseSearch, setShowCourseSearch] = useState(false);
  const [courseLoading, setCourseLoading] = useState(false);
  const [courseResults, setCourseResults] = useState<CourseItem[]>([]);
  const [courseError, setCourseError] = useState('');

  const [step, setStep] = useState<'form' | 'verify' | 'confirm' | 'payment' | 'result'>('form');
  const [submitting, setSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<{ success: boolean; message: string; orderId?: string } | null>(null);
  const [tradeNo, setTradeNo] = useState('');
  const [qrcode, setQrcode] = useState('');
  const [orderAmount, setOrderAmount] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showTip, setShowTip] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  const [contactSending, setContactSending] = useState(false);
  const [verified, setVerified] = useState(false);

      // 首页2秒自动弹窗提示（等加载完成后再弹出）
  useEffect(() => { if (!loading) { setShowTip(true); setTimeout(() => setShowTip(false), 2000); } }, [loading]);

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

  const groupedDisplay = useMemo(() => {
    const searchFilter = (p: Product) => !search || p.name.toLowerCase().includes(search.toLowerCase());
    if (search) {
      const filtered = (data?.products || []).filter(searchFilter);
      return [{ brand: null, name: "搜索结果", products: filtered }];
    }
    if (activeBrand) {
      let list = (brandProducts[activeBrand] || []).filter(searchFilter);
      if (selectedCategory) list = list.filter(p => p.fenleiname === selectedCategory);
      const b = BRANDS.find(x => x.id === activeBrand)!;
      return [{ brand: b, name: b.name, products: list }];
    }
    return BRANDS.map(b => ({
      brand: b, name: b.name,
      products: (brandProducts[b.id] || []).filter(searchFilter),
    })).filter(g => g.products.length > 0);
  }, [brandProducts, activeBrand, search, data, selectedCategory]);

  const buildOrderInput = () => [school.trim(), account.trim(), password.trim(), course.trim()].filter(Boolean).join(' ');
  const canSubmit = account.trim() && password.trim();

  const createOrder = async () => {
    if (!selectedProduct) return;
    if (!account.trim() || !password.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/orders?action=create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kcid: selectedProduct.cid, user: account.trim(), pass: password.trim(), amount: selectedProduct.sellingPrice, productName: selectedProduct.name }),
      });
      const result = await res.json();
      if (result.success) {
        setTradeNo(result.tradeNo);
        setQrcode(result.qrcode || '');
        setOrderAmount(selectedProduct.sellingPrice);
        setStep('payment');
      } else {
        setOrderResult({ success: false, message: result.error || '创建订单失败' });
        setStep('result');
      }
    } catch {
      setOrderResult({ success: false, message: '网络错误' });
      setStep('result');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmOrder = async () => {
    if (!tradeNo) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/orders?action=confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tradeNo }),
      });
      setOrderResult(await res.json());
    } catch {
      setOrderResult({ success: false, message: '网络错误' });
    } finally {
      setSubmitting(false);
      setStep('result');
    }
  };

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
        body: JSON.stringify({ kcid: selectedProduct.cid, user: account.trim(), pass: password.trim(), school: school.trim() }),
      });
      const result = await res.json();
      if (result.success) { setCourseResults(result.courses || []); setVerified(true); setStep('verify'); }
      else { setCourseError(result.error || '查询失败'); setVerified(false); }
    } catch { setCourseError('网络错误'); }
    finally { setCourseLoading(false); }
  };

  const openProduct = (p: Product) => {
    setSelectedProduct(p); setSchool(''); setAccount(''); setPassword(''); setCourse('');
    setShowCourseSearch(false); setCourseResults([]); setCourseError('');
    setStep('form'); setOrderResult(null); setTradeNo(''); setQrcode(''); setOrderAmount(0); setVerified(false);
  };

  const stepLabels = ['填写信息', '验证账号', '确认订单', '扫码支付', '完成'];

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-rose-50 to-white">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center"><span className="text-4xl animate-bounce">🍑</span></div>
        <p className="text-gray-400 text-sm">加载中...</p>
      </div>
    </div>
  );

  if (error && !data) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-rose-50 to-white">
      <div className="text-center">
        <span className="text-4xl block mb-4">😵</span>
        <p className="text-gray-500 text-sm mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="px-8 py-2.5 bg-gradient-to-r from-rose-400 to-pink-500 text-white text-sm font-medium rounded-full shadow-lg hover:-translate-y-0.5 transition-all">重新加载</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/50 via-white to-white pb-20">
      {/* Header */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-400 via-pink-500 to-orange-400 opacity-90" />
        <div className="relative max-w-lg mx-auto px-5 pt-12 pb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-xl shadow-inner">🍑</div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">TaoHua-</h1>
              <p className="text-white/70 text-xs">自助下单 · 秒速处理</p>
            </div>
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 text-sm">🔍</span>
            <input
              type="text" value={search}
              onChange={e => { setSearch(e.target.value); setActiveBrand(null); }}
              placeholder="搜索你需要的课程服务..."
              className="w-full pl-10 pr-10 py-3 bg-white/20 backdrop-blur border border-white/30 rounded-2xl text-sm text-white placeholder-white/50 outline-none focus:bg-white/30 focus:border-white/50 transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/30 flex items-center justify-center text-white/80 text-xs hover:bg-white/50 transition-colors">✕</button>
            )}
          </div>
        </div>
      </header>


      {/* 品牌入口 */}
      {!activeBrand && !search && (
        <div className="max-w-lg mx-auto px-4 pt-6">
          <p className="text-xs text-gray-400 font-medium mb-3 px-1">选择学习平台</p>
          <div className="grid grid-cols-2 gap-3">
            {BRANDS.map(b => (
              <button key={b.id} onClick={() => { setActiveBrand(b.id); setSelectedCategory(''); }}
                className="rounded-2xl p-5 text-left transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] bg-white border border-gray-100 hover:border-transparent">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${b.color} flex items-center justify-center text-xl mb-3 shadow-sm`}>{b.icon}</div>
                <p className="text-sm font-bold text-gray-800">{b.name}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 选中品牌后 */}
      {activeBrand && !search && (
        <div className="max-w-lg mx-auto px-4 pt-4">
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setActiveBrand(null)}
              className="shrink-0 px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">返回首页</button>
            {BRANDS.map(b => (
              <button key={b.id} onClick={() => setActiveBrand(b.id)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${activeBrand === b.id ? `bg-gradient-to-r ${b.color} text-white shadow-md` : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}>{b.icon} {b.name}</button>
            ))}
          </div>
        </div>
      )}

      {/* 搜索标签 */}
      {search && (
        <div className="max-w-lg mx-auto px-4 pt-4">
          <button onClick={() => setSearch('')}
            className="px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">清除搜索</button>
        </div>
      )}

      {/* 提示弹窗 */}
      {showTip && (
        <div className="fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 animate-in slide-in-from-bottom duration-300">
          <div className="max-w-sm w-full bg-white rounded-2xl shadow-2xl border border-gray-100 p-5">
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0">💡</span>
              <div className="flex-1">
                <p className="text-sm text-gray-700 leading-relaxed">如有<strong className="text-rose-500">学习强国</strong>、<strong className="text-rose-500">校园跑</strong>、<strong className="text-rose-500">论文服务</strong>等需求，可以点击下方「联系管理员」</p>
              </div>
              <button onClick={() => setShowTip(false)} className="shrink-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs hover:bg-gray-200 transition-colors">✕</button>
            </div>

          </div>
        </div>
      )}


      {/* 分类层级筛选 */}
      {activeBrand && !search && (() => {
        const cats = [...new Set((brandProducts[activeBrand] || []).map(p => p.fenleiname))].filter(Boolean);
        return cats.length > 1 ? (
          <div className="max-w-lg mx-auto px-4 pt-3">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <button onClick={() => setSelectedCategory('')}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  !selectedCategory ? 'bg-rose-100 text-rose-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}>全部</button>
              {cats.map(cat => (
                <button key={cat} onClick={() => setSelectedCategory(cat)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                    selectedCategory === cat ? 'bg-rose-100 text-rose-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}>{cat}</button>
              ))}
            </div>
          </div>
        ) : null;
      })()}

      {/* 商品列表 */}
      {(activeBrand || search) && (
        <div className="max-w-lg mx-auto px-4 pt-4">
          {groupedDisplay.length === 0 ? (
            <div className="text-center py-20">
              <span className="text-5xl block mb-4">NoData</span>
              <p className="text-gray-400 text-sm">没有找到相关服务</p>
            </div>
          ) : (
            groupedDisplay.map((group, gi) => (
              <div key={gi} className="mb-5">
                <div className="flex items-center gap-2 mb-3 px-1">
                  {group.brand && (
                    <div className={`w-7 h-7 rounded-lg ${group.brand.bg} flex items-center justify-center text-sm`}>{group.brand.icon}</div>
                  )}
                  <h2 className={`text-sm font-bold ${group.brand ? "text-gray-800" : "text-gray-500"}`}>{group.name}</h2>
                  <span className="text-xs text-gray-400">{group.products.length} 个</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {group.products.map(p => (
                    <button key={p.cid} onClick={() => openProduct(p)}
                      className="group bg-white rounded-2xl p-4 text-left border border-gray-100 hover:border-rose-200 hover:shadow-lg hover:shadow-gray-200/50 hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.98]">
                      <p className="text-[13px] font-semibold text-gray-800 mb-3 line-clamp-2 leading-snug group-hover:text-rose-600 transition-colors">{p.name}</p>
                      <span className="text-lg font-bold text-rose-500">¥{p.sellingPrice.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
      {/* Purchase Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedProduct(null)} />
          <div className="relative bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-50 px-6 py-4 flex items-center justify-between rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white text-lg">🍑</div>
                <div><h2 className="text-base font-bold text-gray-900">创建订单</h2><p className="text-xs text-gray-400 truncate max-w-[180px]">{selectedProduct.name}</p></div>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors">✕</button>
            </div>

            <div className="px-6 py-6">
              {/* Step Indicator */}
              <div className="flex items-center mb-8">
                {stepLabels.map((label, i) => {
                  const idx = ['form', 'confirm', 'payment', 'result'].indexOf(step);
                  const isActive = idx === i;
                  const isDone = idx > i;
                  return (
                    <div key={i} className="flex-1 flex items-center">
                      <div className="flex flex-col items-center flex-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${isActive ? 'bg-gradient-to-br from-rose-400 to-pink-500 text-white shadow-lg shadow-rose-200 scale-110' : isDone ? 'bg-green-100 text-green-500' : 'bg-gray-100 text-gray-400'}`}>{isDone ? '✓' : i + 1}</div>
                        <span className={`text-[10px] mt-1.5 font-medium ${isActive ? 'text-rose-500' : isDone ? 'text-green-500' : 'text-gray-400'}`}>{label}</span>
                      </div>
                      {i < 3 && <div className={`h-0.5 flex-1 -mt-4 mx-1 rounded-full transition-all duration-500 ${isDone ? 'bg-green-300' : 'bg-gray-200'}`} />}
                    </div>
                  );
                })}
              </div>

              {/* Step: Form */}
              {step === 'form' && (
                <>
                  <div className="space-y-4">
                    <div>
                      <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">🏫 学校 <span className="text-xs text-gray-400 font-normal">选填</span></label>
                      <input type="text" value={school} onChange={e => setSchool(e.target.value)} placeholder="例如：北京大学" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-rose-300 focus:ring-4 focus:ring-rose-50 transition-all" />
                    </div>
                    <div>
                      <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">👤 账号 <span className="text-rose-400 text-xs">*必填</span></label>
                      <input type="text" value={account} onChange={e => setAccount(e.target.value)} placeholder="输入你的学习平台账号" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-rose-300 focus:ring-4 focus:ring-rose-50 transition-all" />
                    </div>
                    <div>
                      <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">🔒 密码 <span className="text-rose-400 text-xs">*必填</span></label>
                      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="输入你的学习平台密码" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-rose-300 focus:ring-4 focus:ring-rose-50 transition-all" />
                    </div>
                    <div>
                      <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">📖 课程 <span className="text-xs text-gray-400 font-normal">选填</span></label>
                      <div className="flex gap-2">
                        <input type="text" value={course} onChange={e => setCourse(e.target.value)} placeholder="手动输入或点击查课" className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-rose-300 focus:ring-4 focus:ring-rose-50 transition-all" />
                        <button onClick={searchCourses} disabled={!account.trim() || !password.trim()} className="shrink-0 px-5 py-3 bg-gradient-to-r from-rose-400 to-pink-500 text-white rounded-xl text-sm font-medium hover:from-rose-500 hover:to-pink-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-rose-200 active:scale-95">🔍 查课</button>
                      </div>
                      {showCourseSearch && (
                        <div className="mt-3 p-4 bg-white border border-gray-100 rounded-2xl shadow-lg">
                          {courseLoading ? (
                            <div className="flex items-center justify-center gap-2 py-6"><div className="w-5 h-5 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" /><span className="text-sm text-gray-400">查询中...</span></div>
                          ) : courseError ? (
                            <div className="text-center py-4"><p className="text-sm text-red-400 mb-2">{courseError}</p><button onClick={searchCourses} className="text-xs text-rose-500 hover:underline font-medium">重新查询</button></div>
                          ) : courseResults.length > 0 ? (
                            <div><p className="text-xs text-gray-400 mb-2 font-medium">找到 {courseResults.length} 门课程</p>
                              <div className="space-y-1 max-h-44 overflow-y-auto">
                                {courseResults.map((item, i) => {
                                  const cname = item.kcname || item.name || '';
                                  return (
                                    <button key={i} onClick={() => { setCourse(cname); setShowCourseSearch(false); }}
                                      className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all ${course === cname ? 'bg-rose-50 text-rose-600 font-semibold border border-rose-200' : 'text-gray-600 hover:bg-gray-50 border border-transparent'}`}>{cname}</button>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-4"><span className="text-3xl block mb-2">📭</span><p className="text-sm text-gray-400">未找到课程</p><p className="text-xs text-gray-300 mt-1">请检查账号密码后重试</p></div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <button onClick={searchCourses} disabled={!canSubmit || courseLoading} className="mt-6 w-full py-3.5 bg-gradient-to-r from-rose-400 to-pink-500 text-white font-semibold rounded-2xl hover:from-rose-500 hover:to-pink-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-rose-200 active:scale-[0.98] text-base tracking-wide">{courseLoading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />验证中...</span> : "🔍 验证账号并查课"}</button>
                </>
              )}

              
              {/* Step: Verify */}
              {step === 'verify' && (
                <>
                  {(() => {
                    const isFail = !!courseError || courseResults.length === 0;
                    return (
                      <div className="text-center mb-5">
                        <div className={`w-14 h-14 mx-auto mb-3 rounded-2xl flex items-center justify-center ${isFail ? 'bg-gradient-to-br from-red-100 to-rose-100' : 'bg-gradient-to-br from-green-100 to-emerald-100'}`}>
                          <span className="text-2xl">{isFail ? '❌' : '✅'}</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">{isFail ? '验证失败' : '账号验证通过'}</h3>
                        <p className="text-sm text-gray-400 mt-1">
                          {courseError ? '请检查账号密码后重试' : courseResults.length > 0 ? `找到 ${courseResults.length} 门课程，请选择` : '账号密码可能有误，或该平台暂无可用课程'}
                        </p>
                      </div>
                    );
                  })()}
                  {courseError ? (
                    <div className="bg-red-50 rounded-2xl p-4 mb-5 border border-red-100">
                      <p className="text-sm text-red-500 text-center">{courseError}</p>
                    </div>
                  ) : courseResults.length > 0 ? (
                    <div className="space-y-1 max-h-52 overflow-y-auto mb-5 bg-gray-50 rounded-2xl p-1">
                      {courseResults.map((item, i) => {
                        const cname = item.kcname || item.name || '';
                        return (
                          <button key={i} onClick={() => { setCourse(cname); }}
                            className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all ${course === cname ? 'bg-rose-50 text-rose-600 font-semibold border border-rose-200 shadow-sm' : 'text-gray-600 hover:bg-white border border-transparent'}`}>{cname}</button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-6 mb-5 bg-red-50 rounded-2xl border border-red-100">
                      <span className="text-4xl block mb-3">📭</span>
                      <p className="text-sm text-red-500 font-medium">未找到任何课程</p>
                      <p className="text-xs text-gray-500 mt-1">账号或密码错误，或者该平台暂无可刷课程</p>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button onClick={() => { setStep('form'); setVerified(false); setCourseError(''); }} className="flex-1 py-3.5 bg-gray-100 text-gray-600 font-medium rounded-2xl hover:bg-gray-200 transition-colors text-sm">返回修改</button>
                    <button onClick={() => setStep('confirm')} disabled={!!courseError || courseResults.length === 0}
                      className="flex-[2] py-3.5 bg-gradient-to-r from-rose-400 to-pink-500 text-white font-semibold rounded-2xl hover:from-rose-500 hover:to-pink-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-rose-200 active:scale-[0.98] text-sm">
                      确认下单 · ¥{selectedProduct?.sellingPrice?.toFixed(2) || '--'}
                    </button>
                  </div>
                </>
              )}

              {/* Step: Confirm */}
              {step === 'confirm' && (
                <>
                  <div className="text-center mb-6">
                    <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center"><span className="text-2xl">📋</span></div>
                    <h3 className="text-lg font-bold text-gray-900">确认订单信息</h3>
                    <p className="text-sm text-gray-400 mt-1">请仔细核对以下内容</p>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-5 space-y-3.5 mb-5">
                    <div className="flex justify-between items-center text-sm"><span className="text-gray-400">服务项目</span><span className="text-gray-800 font-medium text-right max-w-[55%] truncate">{selectedProduct.name}</span></div>
                    {school && <div className="flex justify-between items-center text-sm"><span className="text-gray-400">学校</span><span className="text-gray-700">{school}</span></div>}
                    <div className="flex justify-between items-center text-sm"><span className="text-gray-400">账号</span><span className="text-gray-700 font-medium">{account}</span></div>
                    <div className="flex justify-between items-center text-sm"><span className="text-gray-400">密码</span><span className="text-gray-700">{'*'.repeat(Math.min(password.length, 12))}</span></div>
                    {course && <div className="flex justify-between items-center text-sm"><span className="text-gray-400">课程</span><span className="text-gray-700 text-right max-w-[55%] truncate">{course}</span></div>}
                    <div className="border-t border-gray-200 pt-3.5 flex justify-between items-center"><span className="text-sm text-gray-500">合计应付</span><span className="text-2xl font-bold text-rose-500">¥{selectedProduct.sellingPrice.toFixed(2)}</span></div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setStep('form')} className="flex-1 py-3.5 bg-gray-100 text-gray-600 font-medium rounded-2xl hover:bg-gray-200 transition-colors text-sm">返回修改</button>
                    <button onClick={createOrder} disabled={submitting} className="flex-[2] py-3.5 bg-gradient-to-r from-rose-400 to-pink-500 text-white font-semibold rounded-2xl hover:from-rose-500 hover:to-pink-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-rose-200 active:scale-[0.98]">
                      {submitting ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />创建中...</span> : <span>前往支付 · ¥{selectedProduct.sellingPrice.toFixed(2)}</span>}
                    </button>
                  </div>
                </>
              )}

              {/* Step: Payment */}
              {step === 'payment' && (
                <>
                  <div className="text-center mb-6">
                    <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center"><span className="text-2xl">📱</span></div>
                    <h3 className="text-lg font-bold text-gray-900">支付宝扫码支付</h3>
                    <p className="text-sm text-gray-400 mt-1">扫码完成付款后点击下方按钮</p>
                  </div>
                  <div className="bg-gradient-to-b from-gray-50 to-white rounded-2xl p-6 mb-4 flex flex-col items-center border border-gray-100">
                    {qrcode ? (
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-rose-400/10 to-pink-400/10 rounded-2xl blur-xl" />
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrcode)}&margin=10`} alt="支付二维码" className="relative w-52 h-52 rounded-2xl shadow-lg mb-4 bg-white p-2" />
                      </div>
                    ) : (
                      <div className="w-52 h-52 bg-white border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center mb-4"><div className="text-center"><div className="w-10 h-10 border-2 border-rose-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" /><p className="text-xs text-gray-400">正在生成...</p></div></div>
                    )}
                    <div className="text-center"><p className="text-xs text-gray-400 mb-0.5">应付金额</p><p className="text-3xl font-bold text-rose-500">¥{orderAmount.toFixed(2)}</p></div>
                  </div>
                  <div className="bg-rose-50 rounded-2xl p-4 mb-5 border border-rose-100">
                    <div className="flex items-center justify-between text-sm"><span className="text-gray-500">订单编号</span><span className="text-gray-700 font-mono text-xs">{tradeNo}</span></div>
                    <div className="flex items-center justify-between text-sm mt-1.5"><span className="text-gray-500">支付方式</span><span className="text-blue-500 font-medium">支付宝</span></div>
                  </div>
                  <div className="space-y-3">
                    <button onClick={confirmOrder} disabled={submitting} className="w-full py-3.5 bg-gradient-to-r from-green-400 to-emerald-500 text-white font-semibold rounded-2xl hover:from-green-500 hover:to-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-green-200 active:scale-[0.98]">
                      {submitting ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />提交中...</span> : '✅ 我已付款，提交订单'}
                    </button>
                    <button onClick={() => setStep('confirm')} disabled={submitting} className="w-full py-3.5 bg-gray-100 text-gray-500 font-medium rounded-2xl hover:bg-gray-200 transition-colors text-sm disabled:opacity-50">返回上一步</button>
                  </div>
                </>
              )}

              {/* Step: Result */}
              {step === 'result' && orderResult && (
                <div className="text-center py-6">
                  <div className="relative mx-auto w-20 h-20 mb-5">
                    <div className={`absolute inset-0 rounded-full blur-xl ${orderResult.success ? 'bg-green-200' : 'bg-red-200'}`} />
                    <div className={`relative w-20 h-20 rounded-full flex items-center justify-center ${orderResult.success ? 'bg-gradient-to-br from-green-400 to-emerald-500' : 'bg-gradient-to-br from-red-400 to-rose-500'}`}>
                      <span className="text-white text-3xl">{orderResult.success ? '✓' : '✗'}</span>
                    </div>
                  </div>
                  <h3 className={`text-xl font-bold mb-1 ${orderResult.success ? 'text-green-600' : 'text-red-500'}`}>{orderResult.success ? '下单成功！' : '下单失败'}</h3>
                  <p className="text-sm text-gray-500">{orderResult.message}</p>
                  {orderResult.orderId && <div className="mt-3 inline-block bg-gray-50 rounded-xl px-4 py-2"><p className="text-xs text-gray-400">上游订单号</p><p className="text-sm font-mono text-gray-600">{orderResult.orderId}</p></div>}
                  <div className="mt-8 space-y-2.5">
                    {orderResult.success && <button onClick={() => setSelectedProduct(null)} className="w-full py-3.5 bg-gradient-to-r from-rose-400 to-pink-500 text-white font-semibold rounded-2xl hover:from-rose-500 hover:to-pink-600 transition-all shadow-lg shadow-rose-200 active:scale-[0.98]">完成</button>}
                    <button onClick={() => { setStep('form'); setOrderResult(null); }} className="w-full py-3.5 bg-gray-100 text-gray-600 font-medium rounded-2xl hover:bg-gray-200 transition-colors text-sm">🔄 再来一单</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* 联系管理员表单弹窗 */}
      {showContactForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowContactForm(false)} />
          <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="text-center mb-5">
              <span className="text-3xl block mb-2">💬</span>
              <h3 className="text-lg font-bold text-gray-900">联系管理员</h3>
              <p className="text-xs text-gray-400 mt-1">留下你的联系方式和需求，我们会尽快联系你</p>
            </div>
            <textarea
              value={contactMessage}
              onChange={e => setContactMessage(e.target.value)}
              placeholder="请输入你的联系方式（QQ/微信/手机号）和具体需求..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-rose-300 focus:ring-4 focus:ring-rose-50 transition-all resize-none h-32"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setShowContactForm(false); setContactMessage(''); }}
                className="flex-1 py-3 bg-gray-100 text-gray-500 font-medium rounded-xl hover:bg-gray-200 transition-colors text-sm">取消</button>
              <button onClick={async () => {
                if (!contactMessage.trim()) return;
                setContactSending(true);
                try {
                  await fetch('/api/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: contactMessage }) });
                } catch {}
                setContactSending(false);
                setShowContactForm(false);
                setContactMessage('');
                alert('已通知管理员，我们会尽快联系你！');
              }} disabled={!contactMessage.trim() || contactSending}
                className="flex-[2] py-3 bg-gradient-to-r from-rose-400 to-pink-500 text-white font-semibold rounded-xl hover:from-rose-500 hover:to-pink-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-rose-200 active:scale-[0.98] text-sm">
                {contactSending ? '发送中...' : '发送'}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Bottom Nav */}
      <nav className="fixed bottom-0 inset-x-0 z-40">
        <div className="max-w-lg mx-auto bg-white/80 backdrop-blur-xl border-t border-gray-100 shadow-lg shadow-gray-200/20">
          <div className="flex">
            <button onClick={() => { setActiveBrand(null); setSearch(''); }} className="flex-1 py-3.5 flex items-center justify-center gap-1.5 text-rose-500 text-sm font-semibold"><span className="text-lg">🏠</span> 首页</button>
            <button onClick={() => window.open('https://xn--ur0ap3x.help/#/query', '_blank')} className="flex-1 py-3.5 flex items-center justify-center gap-1.5 text-gray-400 text-sm font-medium hover:text-gray-600 transition-colors"><span className="text-lg">📋</span> 查单</button>
          
            <button onClick={() => setShowContactForm(true)} className="flex-1 py-3.5 flex items-center justify-center gap-1.5 text-rose-400 text-sm font-medium hover:text-rose-500 transition-colors"><span className="text-lg">💬</span> 联系</button></div>
        </div>
      </nav>
    </div>
  );
}
