'use client';

import { useState, useEffect, useMemo } from 'react';
import type { ProductsResponse, Product } from '@/lib/types';

const BRANDS = [
  { id: 'cxxt', name: '鐡掑懏妲︾€涳缚绡勯柅?, kw: '鐡掑懏妲︾€涳缚绡勯柅?, icon: '棣冩惛', color: 'from-blue-500 to-blue-600' },
  { id: 'uxy', name: 'u閺嶁€虫疮', kw: ['u閺嶁€虫疮', '-u閺嶁€虫疮AI'], icon: '棣冨浮', color: 'from-emerald-500 to-teal-600' },
  { id: 'uxyai', name: 'u閺嶁€虫疮 AI 閻?, kw: 'u閺嶁€虫疮AI', icon: '棣冨笚', color: 'from-violet-500 to-purple-600' },
  { id: 'mooc', name: '娑擃厼娴楁径褍顒?MOOC', kw: '娑擃厼娴楁径褍顒烳OOC', icon: '棣冨笓', color: 'from-orange-500 to-red-500' },
  { id: 'xuetangx', name: '鐎涳箑鐖為崷銊у殠', kw: '鐎涳箑鐖為崷銊у殠', icon: '棣冨即', color: 'from-cyan-500 to-blue-600' },
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

  const [step, setStep] = useState<'form' | 'confirm' | 'payment' | 'result'>('form');
  const [submitting, setSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<{ success: boolean; message: string; orderId?: string } | null>(null);
  const [tradeNo, setTradeNo] = useState('');
  const [qrcode, setQrcode] = useState('');
  const [orderAmount, setOrderAmount] = useState(0);

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then((d: ProductsResponse) => { if (d.success) setData(d); else setError('閼惧嘲褰囬崯鍡楁惂婢惰精瑙?); })
      .catch(() => setError('缂冩垹绮堕柨娆掝嚖'))
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

  const createOrder = async () => {
    if (!selectedProduct) return;
    const input = buildOrderInput();
    if (!input) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/orders?action=create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cid: selectedProduct.cid, input, amount: selectedProduct.sellingPrice, productName: selectedProduct.name }),
      });
      const result = await res.json();
      if (result.success) {
        setTradeNo(result.tradeNo);
        setQrcode(result.qrcode || '');
        setOrderAmount(selectedProduct.sellingPrice);
        setStep('payment');
      } else {
        setOrderResult({ success: false, message: result.error || '閸掓稑缂撶拋銏犲礋婢惰精瑙? });
        setStep('result');
      }
    } catch {
      setOrderResult({ success: false, message: '缂冩垹绮堕柨娆掝嚖' });
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
      setOrderResult({ success: false, message: '缂冩垹绮堕柨娆掝嚖' });
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
        body: JSON.stringify({ cid: selectedProduct.cid, account: account.trim(), password: password.trim(), school: school.trim() }),
      });
      const result = await res.json();
      if (result.success) {
        setCourseResults(result.courses || []);
      } else {
        setCourseError(result.error || '閺屻儴顕楁径杈Е');
      }
    } catch {
      setCourseError('缂冩垹绮堕柨娆掝嚖');
    } finally {
      setCourseLoading(false);
    }
  };

  const openProduct = (p: Product) => {
    setSelectedProduct(p); setSchool(''); setAccount(''); setPassword(''); setCourse('');
    setShowCourseSearch(false); setCourseResults([]); setCourseError('');
    setStep('form'); setOrderResult(null); setTradeNo(''); setQrcode(''); setOrderAmount(0);
  };

  const currentBrand = BRANDS.find(b => b.id === activeBrand);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">閸旂姾娴囬崯鍡楁惂娑?..</p>
      </div>
    </div>
  );

  if (error && !data) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-red-500 text-sm mb-3">{error}</p>
        <button onClick={() => window.location.reload()} className="px-6 py-2 bg-blue-500 text-white text-sm rounded-xl">闁插秷鐦?/button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-gray-900">棣冨礄 濡楀啳濮虫禒锝呭煕</h1>
            <span className="text-xs text-gray-400">閼奉亜濮稉瀣礋 璺?閼奉亜濮╂径鍕倞</span>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">棣冩敵</span>
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setActiveBrand(null); }}
              placeholder="閹兼粎鍌ㄩ崯鍡楁惂..."
              className="w-full pl-9 pr-4 py-2 bg-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-300 transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">閴?/button>
            )}
          </div>
        </div>
      </header>

      {!search && (
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {BRANDS.map(b => (
              <button
                key={b.id}
                onClick={() => setActiveBrand(activeBrand === b.id ? null : b.id)}
                className={`shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeBrand === b.id
                    ? `bg-gradient-to-r ${b.color} text-white shadow-md`
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="mr-1.5">{b.icon}</span>{b.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 py-2">
        {activeBrand && currentBrand && (
          <div className="mb-3 flex items-center gap-2">
            <span className="text-sm">{currentBrand.icon}</span>
            <span className="text-sm font-medium text-gray-700">{currentBrand.name}</span>
            <span className="text-xs text-gray-400">({displayProducts.length} 娑擃亜鏅㈤崫?</span>
          </div>
        )}
        {displayProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm">閺嗗倹妫ら崯鍡楁惂</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {displayProducts.map(p => (
              <button
                key={p.cid}
                onClick={() => openProduct(p)}
                className="bg-white rounded-xl p-4 text-left border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all active:scale-[0.98]"
              >
                <div className="text-xs text-gray-400 mb-1 truncate">{p.fenleiname}</div>
                <div className="text-sm font-medium text-gray-800 mb-2 line-clamp-2 leading-snug">{p.name}</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-red-500">妤納p.sellingPrice.toFixed(2)}</span>
                  {p.price !== p.sellingPrice && (
                    <span className="text-xs text-gray-400 line-through">妤納p.price.toFixed(2)}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedProduct(null)} />
          <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-2xl">
              <div>
                <h2 className="text-base font-semibold text-gray-900">娑撳宕?/h2>
                <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{selectedProduct.name}</p>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">閴?/button>
            </div>

            <div className="px-5 py-5">
              <div className="flex items-center justify-center gap-2 mb-6">
                {['form', 'confirm', 'payment', 'result'].map((s, i) => {
                  const labels = ['婵夘偄鍟?, '绾喛顓?, '閺€顖欑帛', '鐎瑰本鍨?];
                  const idx = ['form', 'confirm', 'payment', 'result'].indexOf(step);
                  return (
                    <div key={s} className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                        idx === i ? 'bg-blue-500 text-white' : idx > i ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {idx > i ? '閴? : i + 1}
                      </div>
                      <span className={`text-xs ${idx === i ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>{labels[i]}</span>
                      {i < 3 && <div className={`w-4 h-px ${idx > i ? 'bg-green-300' : 'bg-gray-200'}`} />}
                    </div>
                  );
                })}
              </div>

              {step === 'form' && (
                <>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">鐎涳附鐗?/label>
                      <input type="text" value={school} onChange={e => setSchool(e.target.value)}
                        placeholder="闁锝?
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">鐠愶箑褰?<span className="text-red-400">*</span></label>
                      <input type="text" value={account} onChange={e => setAccount(e.target.value)}
                        placeholder="鐠囩柉绶崗銉ㄥ閸?
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">鐎靛棛鐖?<span className="text-red-400">*</span></label>
                      <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                        placeholder="鐠囩柉绶崗銉ョ槕閻?
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">鐠囧墽鈻?/label>
                      <div className="flex gap-2">
                        <input type="text" value={course} onChange={e => setCourse(e.target.value)}
                          placeholder="闁锝為敍灞藉讲閹兼粎鍌ㄧ拠鍓р柤"
                          className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all"
                        />
                        <button
                          onClick={searchCourses}
                          disabled={!account.trim() || !password.trim()}
                          className="shrink-0 px-4 py-2.5 bg-blue-50 text-blue-600 rounded-xl text-sm font-medium hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >棣冩敵 閺屻儴顕?/button>
                      </div>

                      {showCourseSearch && (
                        <div className="mt-2 p-3 bg-white border border-gray-200 rounded-xl shadow-sm">
                          {courseLoading ? (
                            <div className="flex items-center justify-center gap-2 py-4">
                              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                              <span className="text-xs text-gray-500">濮濓絽婀弻銉嚄鐠囧墽鈻奸崚妤勩€?..</span>
                            </div>
                          ) : courseError ? (
                            <div className="text-center py-4">
                              <p className="text-sm text-red-500">{courseError}</p>
                              <button onClick={searchCourses} className="mt-2 text-xs text-blue-500 hover:underline">闁插秷鐦?/button>
                            </div>
                          ) : courseResults.length > 0 ? (
                            <div>
                              <p className="text-xs text-gray-400 mb-2">{courseResults.length} 闂傘劏顕崇粙?/p>
                              <div className="space-y-1 max-h-48 overflow-y-auto">
                                {courseResults.map((item, i) => {
                                  const cname = item.kcname || item.name || '';
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
                              <p className="text-sm text-gray-400">閺堫亝鐓＄拠銏犲煂鐠囧墽鈻?/p>
                              <p className="text-xs text-gray-400 mt-1">鐠囬鈥樼拋銈堝閸欏嘲鐦戦惍浣诡劀绾噯绱濋幋鏍ㄥ閸斻劏绶崗銉嚦缁嬪鎮?/p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <button onClick={() => setStep('confirm')} disabled={!canSubmit}
                    className="mt-5 w-full py-3 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors active:scale-[0.98]">娑撳绔村?/button>
                </>
              )}
              {step === 'confirm' && (
                <>
                  <div className="text-center mb-5">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-50 flex items-center justify-center"><span className="text-blue-500 text-xl">棣冩崁</span></div>
                    <h3 className="text-lg font-semibold text-gray-900">绾喛顓荤拋銏犲礋</h3>
                    <p className="text-sm text-gray-500 mt-1">鐠囬攱鐗崇€甸€涗簰娑撳淇婇幁?/p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3 mb-4">
                    <div className="flex justify-between text-sm"><span className="text-gray-500">閸熷棗鎼?/span><span className="text-gray-800 text-right max-w-[60%] truncate">{selectedProduct.name}</span></div>
                    {school && <div className="flex justify-between text-sm"><span className="text-gray-500">鐎涳附鐗?/span><span className="text-gray-800">{school}</span></div>}
                    <div className="flex justify-between text-sm"><span className="text-gray-500">鐠愶箑褰?/span><span className="text-gray-800">{account}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-500">鐎靛棛鐖?/span><span className="text-gray-800">{'*'.repeat(Math.min(password.length, 12))}</span></div>
                    {course && <div className="flex justify-between text-sm"><span className="text-gray-500">鐠囧墽鈻?/span><span className="text-gray-800 text-right max-w-[60%] truncate">{course}</span></div>}
                    <hr className="border-gray-200" />
                    <div className="flex justify-between items-baseline"><span className="text-sm text-gray-500">鎼存柧绮柌鎴︻杺</span><span className="text-xl font-bold text-red-500">妤納selectedProduct.sellingPrice.toFixed(2)}</span></div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setStep('form')} className="flex-1 py-3 bg-gray-100 text-gray-600 font-medium rounded-xl hover:bg-gray-200 transition-colors text-sm">鏉╂柨娲栨穱顔芥暭</button>
                    <button onClick={createOrder} disabled={submitting}
                      className="flex-[2] py-3 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">
                      {submitting ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />婢跺嫮鎮婃稉?..</span> : <>閸撳秴绶氶弨顖欑帛 璺?妤納selectedProduct.sellingPrice.toFixed(2)}</>}
                    </button>
                  </div>
                </>
              )}
              {step === 'payment' && (
                <>
                  <div className="text-center mb-5">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-50 flex items-center justify-center"><span className="text-green-500 text-xl">棣冩懌</span></div>
                    <h3 className="text-lg font-semibold text-gray-900">閹殿偆鐖滈弨顖欑帛</h3>
                    <p className="text-sm text-gray-500 mt-1">鐠囪渹濞囬悽銊︽暜娴犳ê鐤?瀵邦喕淇婇幍顐ｅ伎娴滃瞼娣惍浣哥暚閹存劒绮▎?/p>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-6 mb-4 flex flex-col items-center">
                    {qrcode ? (
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrcode)}`}
                        alt="閺€顖欑帛娴滃瞼娣惍?
                        className="w-48 h-48 rounded-xl mb-3"
                      />
                    ) : (
                      <div className="w-48 h-48 bg-white border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center mb-3">
                        <div className="text-center">
                          <span className="text-4xl block mb-2">棣冩懌</span>
                          <p className="text-xs text-gray-400">閸旂姾娴囨稉?..</p>
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mb-1">鎼存柧绮柌鎴︻杺</p>
                    <p className="text-2xl font-bold text-red-500">妤納orderAmount.toFixed(2)}</p>
                  </div>

                  <div className="bg-blue-50 rounded-xl p-3 mb-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">鐠併垹宕熼崣?/span>
                      <span className="text-gray-700 font-mono">{tradeNo}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button onClick={confirmOrder} disabled={submitting}
                      className="w-full py-3 bg-green-500 text-white font-medium rounded-xl hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors active:scale-[0.98]">
                      {submitting ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />閹绘劒姘︽稉?..</span> : '閹存垵鍑℃禒妯活儥閿涘本褰佹禍銈堫吂閸?}
                    </button>
                    <button onClick={() => setStep('confirm')} disabled={submitting}
                      className="w-full py-3 bg-gray-100 text-gray-600 font-medium rounded-xl hover:bg-gray-200 transition-colors text-sm disabled:opacity-50">
                      鏉╂柨娲栨稉濠佺濮?                    </button>
                  </div>
                </>
              )}
              {step === 'result' && orderResult && (
                <div className="text-center py-4">
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${orderResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
                    <span className={`text-3xl ${orderResult.success ? 'text-green-500' : 'text-red-500'}`}>{orderResult.success ? '閴? : '閴?}</span>
                  </div>
                  <h3 className={`text-lg font-semibold ${orderResult.success ? 'text-green-600' : 'text-red-500'}`}>{orderResult.success ? '娑撳宕熼幋鎰' : '娑撳宕熸径杈Е'}</h3>
                  <p className="text-sm text-gray-500 mt-1">{orderResult.message}</p>
                  {orderResult.orderId && <p className="text-xs text-gray-400 mt-2">鐠併垹宕熼崣鍑ょ窗{orderResult.orderId}</p>}
                  <div className="mt-6 space-y-2">
                    {orderResult.success && <button onClick={() => setSelectedProduct(null)} className="w-full py-3 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 transition-colors">鐎瑰本鍨?/button>}
                    <button onClick={() => { setStep('form'); setOrderResult(null); }} className="w-full py-3 bg-gray-100 text-gray-600 font-medium rounded-xl hover:bg-gray-200 transition-colors text-sm">閸愬秵娼垫稉鈧崡?/button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <nav className="sticky bottom-0 bg-white/90 backdrop-blur border-t border-gray-100">
        <div className="max-w-lg mx-auto flex">
          <button onClick={() => { setActiveBrand(null); setSearch(''); }} className="flex-1 py-3 text-center text-blue-500 text-sm font-medium">棣冩憹 閸熷棗鎼?/button>
          <button onClick={() => window.open('https://xn--ur0ap3x.help/#/query', '_blank')} className="flex-1 py-3 text-center text-gray-400 text-sm font-medium hover:text-gray-600 transition-colors">棣冩惖 閺屻儱宕?/button>
        </div>
      </nav>
    </div>
  );
}