import React, { useEffect, useState, useMemo, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { getProductHistory } from '../services/supabase';
import { Product, PriceHistory } from '../types';

interface ProductDetailProps {
  productId: number;
  onClose: () => void;
  onFavoriteToggle: (id: number) => void;
  isFavorite: boolean;
  products: Product[];
  theme: 'light' | 'dark';
}

const ProductDetail: React.FC<ProductDetailProps> = ({ productId, onClose, onFavoriteToggle, isFavorite, products, theme }) => {
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [days, setDays] = useState(90);
  const [loading, setLoading] = useState(true);
  const modalRef = useRef<HTMLDivElement>(null);

  const product = products.find(p => p.id === productId);

  useEffect(() => {
    if (product) {
      setLoading(true);
      getProductHistory(product.nombre, 365)
        .then(data => setHistory(data || []))
        .catch(() => setHistory([]))
        .finally(() => setLoading(false));
    }
  }, [product]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [onClose]);

  const STORES = [
    { name: "COTO", key: 'p_coto', url: 'url_coto', color: "#f23645" },
    { name: "CARREFOUR", key: 'p_carrefour', url: 'url_carrefour', color: "#2962ff" },
    { name: "DIA", key: 'p_dia', url: 'url_dia', color: "#f23645" },
    { name: "JUMBO", key: 'p_jumbo', url: 'url_jumbo', color: "#00c853" },
    { name: "MAS ONLINE", key: 'p_masonline', url: 'url_masonline', color: "#00c853" }
  ] as const;

  const chartData = useMemo(() => {
    if (!history.length) return [];
    const filtered = history.filter(h => {
        const hDate = new Date(h.fecha);
        const limitDate = new Date();
        limitDate.setDate(limitDate.getDate() - days);
        return hDate >= limitDate;
    });
    return filtered.map(h => ({
      date: new Date(h.fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }),
      price: h.precio_minimo,
    }));
  }, [history, days]);

  const minPrice = useMemo(() => {
    if (!product) return 0;
    const prices = [product.p_coto, product.p_carrefour, product.p_dia, product.p_jumbo, product.p_masonline].filter(p => p > 0);
    return prices.length > 0 ? Math.min(...prices) : 0;
  }, [product]);

  const bestStoreName = useMemo(() => {
    if (!product) return "";
    const storeMap = { p_coto: "COTO", p_carrefour: "CARREFOUR", p_dia: "DIA", p_jumbo: "JUMBO", p_masonline: "MAS ONLINE" };
    for (const [key, name] of Object.entries(storeMap)) {
      if ((product as any)[key] === minPrice) return name;
    }
    return "MERCADO";
  }, [product, minPrice]);

  const avgPrice = useMemo(() => {
    if (!product) return 0;
    const prices = [product.p_coto, product.p_carrefour, product.p_dia, product.p_jumbo, product.p_masonline].filter(p => p > 0);
    return prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
  }, [product]);

  const variation = useMemo(() => {
    if (chartData.length < 2) return null;
    const start = chartData[0].price;
    const end = chartData[chartData.length - 1].price;
    const diff = ((end - start) / start) * 100;
    return diff.toFixed(1);
  }, [chartData]);

  const trendColor = useMemo(() => {
    if (!variation) return "#00c853";
    return parseFloat(variation) > 0 ? "#f23645" : "#00c853";
  }, [variation]);

  if (!product) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="text-white font-mono text-[10px] uppercase tracking-widest animate-pulse">Producto no encontrado</div>
    </div>
  );
  
  const format = (n: number) => new Intl.NumberFormat('es-AR').format(n);

  return (
    <div className="fixed inset-0 z-50 flex flex-col md:items-center md:justify-center bg-black/80 md:backdrop-blur-sm animate-in fade-in duration-300">
      <div 
        ref={modalRef}
        className="w-full md:max-w-xl h-full md:h-auto md:max-h-[96vh] bg-white dark:bg-black md:rounded-[2rem] flex flex-col overflow-hidden shadow-2xl"
      >
        {/* Detail Header */}
        <div className="p-4 flex justify-between items-center border-b border-slate-100 dark:border-[#121212] bg-white dark:bg-black">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="text-black dark:text-white"><i className="fa-solid fa-arrow-left text-xl"></i></button>
            <span className="font-[800] text-base tracking-tight text-black dark:text-white uppercase font-mono">{product.ticker || product.nombre.substring(0,5)}</span>
          </div>
          <div className="flex items-center gap-5">
            <button onClick={() => onFavoriteToggle(product.id)} className={`text-[22px] ${isFavorite ? 'text-amber-500' : 'text-black dark:text-white'}`}><i className="fa-solid fa-cart-shopping"></i></button>
            <button className="text-xl text-black dark:text-white" onClick={() => navigator.share({ title: 'TradingChango', text: `Precio de ${product.nombre}`, url: window.location.href })}><i className="fa-solid fa-arrow-up-from-bracket"></i></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-white dark:bg-black">
          {/* Top Info */}
          <div className="flex gap-5 items-start mb-6">
            <div className="w-28 h-28 bg-white rounded-2xl border border-slate-100 dark:border-[#2a2a2a] flex-shrink-0 flex items-center justify-center p-2 overflow-hidden shadow-sm">
              <img 
                src={product.imagen_url || 'https://via.placeholder.com/200?text=No+Img'} 
                alt={product.nombre} 
                className="w-full h-full object-contain"
                onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/200?text=No+Img')}
              />
            </div>
            <div className="flex-1">
              <h1 className="text-[24px] font-[800] text-black dark:text-white leading-[1.1] tracking-tighter mb-1.5">{product.nombre}</h1>
              <div className="text-[10px] font-[800] text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                MEJOR PRECIO HOY EN {bestStoreName}
              </div>
              <div className="text-[42px] font-mono font-[700] tracking-tighter text-black dark:text-white leading-none">
                $ {format(minPrice)}
              </div>
            </div>
          </div>

          {/* Average Capsule */}
          <div className="mb-8">
            <div className="bg-[#f1f3f6] dark:bg-[#1e222d] border border-slate-100 dark:border-[#2a2e39] rounded-lg px-4 py-2 inline-flex items-center gap-2.5">
              <span className="text-[11px] font-[700] text-slate-500 dark:text-[#b2b5be] uppercase tracking-widest">Precio promedio:</span>
              <span className="font-mono font-[700] text-black dark:text-white text-[14px]">$ {format(avgPrice)}</span>
            </div>
          </div>

          {/* Range Selection */}
          <div className="flex gap-1.5 mb-8 justify-between">
            {[7, 15, 30, 90, 180, 365].map(d => (
              <button 
                key={d} 
                onClick={() => setDays(d)} 
                className={`flex-1 md:flex-none px-2.5 py-2 text-[10px] font-[800] rounded-lg border transition-all ${days === d ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white' : 'bg-white dark:bg-[#1e222d] text-slate-400 dark:text-[#b2b5be] border-slate-200 dark:border-[#363a45]'}`}
              >
                {d === 7 ? '7D' : d === 15 ? '15D' : d === 30 ? '1M' : d === 90 ? '3M' : d === 180 ? '6M' : '1Y'}
              </button>
            ))}
          </div>

          {/* Chart Section */}
          <div className="mb-10">
            <h3 className="text-[11px] font-[800] uppercase tracking-[0.2em] text-black dark:text-white mb-1">GRÁFICO DE TENDENCIAS</h3>
            <div className={`text-[13px] font-[800] mb-5 ${variation && parseFloat(variation) > 0 ? 'text-[#f23645]' : 'text-[#00c853]'}`}>
              {variation ? `${parseFloat(variation) > 0 ? '+' : ''}${variation}% últimos días` : '- 0.0%'}
            </div>
            
            <div className="h-72 w-full">
              {loading ? (
                <div className="h-full flex items-center justify-center font-mono text-[10px] text-slate-400 animate-pulse uppercase tracking-widest">Analizando mercado...</div>
              ) : chartData.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={trendColor} stopOpacity={0.05}/><stop offset="95%" stopColor={trendColor} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? 'transparent' : '#f1f5f9'} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#94a3b8', fontWeight: 'bold'}} minTickGap={40} />
                    <YAxis orientation="right" axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#94a3b8', fontWeight: 'bold'}} tickFormatter={v => `$${format(v)}`} domain={['auto', 'auto']} />
                    <Tooltip 
                      contentStyle={{backgroundColor: theme === 'dark' ? '#000' : '#fff', borderRadius: '8px', border: '1px solid #333', padding: '10px'}}
                      labelStyle={{fontSize: '9px', fontWeight: '800', marginBottom: '4px', textTransform: 'uppercase', color: '#94a3b8'}}
                      itemStyle={{fontSize: '13px', fontWeight: '800', fontFamily: 'Roboto Mono', color: theme === 'dark' ? '#fff' : '#000'}}
                      formatter={v => [`$${format(v as number)}`]}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="price" 
                      stroke={trendColor} 
                      strokeWidth={3} 
                      fillOpacity={1} 
                      fill="url(#colorPrice)" 
                      animationDuration={1000}
                      baseValue="dataMin"
                      connectNulls
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center font-mono text-[10px] text-slate-400 bg-slate-50 dark:bg-[#121212] rounded-xl border border-dashed border-slate-200 dark:border-[#2a2a2a]">SIN DATOS SUFICIENTES</div>
              )}
            </div>
          </div>

          {/* Comparison */}
          <section className="pb-24">
            <h3 className="text-[11px] font-[800] uppercase tracking-[0.2em] text-black dark:text-white mb-6">COMPARACION DE MERCADO</h3>
            <div className="space-y-4">
              {STORES.map((s) => {
                const price = (product as any)[s.key];
                const productUrl = (product as any)[s.url];
                if (!price || price === 0) return null;
                const isBest = price === minPrice;
                const ofRaw = product.oferta_gondola;
                let of = null;
                if (ofRaw) {
                   try {
                     const ofObj = typeof ofRaw === 'string' ? JSON.parse(ofRaw) : ofRaw;
                     of = ofObj[s.name.toLowerCase().replace(' ', '')] || ofObj[s.name.toLowerCase()];
                   } catch(e) { /* ignore */ }
                }

                return (
                  <div key={s.name} className="flex items-center justify-between border-b border-dashed border-slate-100 dark:border-[#2a2a2a] pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: s.color}}></div>
                      <span className="text-sm font-[800] text-black dark:text-white uppercase tracking-tight">{s.name}</span>
                      {of && (
                        <span className="bg-[#00c853] text-white text-[9px] font-[800] px-1.5 py-0.5 rounded-sm uppercase">
                          {of.etiqueta || of}
                        </span>
                      )}
                    </div>
                    {productUrl ? (
                      <a 
                        href={productUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={`font-mono text-[16px] font-[700] hover:underline transition-all ${isBest ? 'text-[#00c853]' : 'text-black dark:text-white'}`}
                      >
                        ${format(price)}
                      </a>
                    ) : (
                      <div className={`font-mono text-[16px] font-[700] ${isBest ? 'text-[#00c853]' : 'text-black dark:text-white'}`}>
                        ${format(price)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;