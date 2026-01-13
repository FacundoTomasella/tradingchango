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
  const [days, setDays] = useState(90); // Default 3M
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
    { name: "COTO", key: 'p_coto', url: 'url_coto', color: "#ff3b30" },
    { name: "CARREFOUR", key: 'p_carrefour', url: 'url_carrefour', color: "#2962ff" },
    { name: "DIA", key: 'p_dia', url: 'url_dia', color: "#ff3b30" },
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

  const isUp = variation ? parseFloat(variation) > 0 : false;
  const trendColor = isUp ? "#ff3b30" : "#00c853";

  if (!product) return null;
  const format = (n: number) => new Intl.NumberFormat('es-AR').format(n);

  return (
    <div className="fixed inset-0 z-50 flex flex-col md:items-center md:justify-center bg-black/80 md:backdrop-blur-sm transition-all duration-300">
      <div 
        ref={modalRef}
        className="w-full md:max-w-md h-full md:h-auto md:max-h-[98vh] bg-[#ffffff] dark:bg-[#000000] md:rounded-[1.5rem] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom-5"
      >
        {/* Header */}
        <div className="p-4 flex justify-between items-center bg-[#ffffff] dark:bg-[#000000]">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-[#131722] dark:text-[#ffffff] p-2">
              <i className="fa-solid fa-arrow-left text-lg"></i>
            </button>
            <span className="font-[800] text-[18px] tracking-tight text-[#131722] dark:text-[#ffffff] uppercase font-sans">{product.ticker || product.nombre.substring(0,5)}</span>
          </div>
          <div className="flex items-center gap-5 pr-2">
            <button onClick={() => onFavoriteToggle(product.id)} className={`text-[24px] ${isFavorite ? 'text-[#131722] dark:text-[#ffffff]' : 'text-muted opacity-40'}`}>
              <i className="fa-solid fa-cart-shopping"></i>
            </button>
            <button className="text-[22px] text-[#131722] dark:text-[#ffffff]" onClick={() => navigator.share({ title: 'TradingChango', text: `Precio de ${product.nombre}`, url: window.location.href })}>
              <i className="fa-solid fa-arrow-up-from-bracket"></i>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#ffffff] dark:bg-[#000000]">
          {/* Info Section */}
          <div className="px-5 py-6">
             <div className="flex gap-4 items-center">
                <div className="w-[110px] h-[110px] bg-white rounded-2xl border border-border-light dark:border-border-dark flex-shrink-0 flex items-center justify-center p-3 shadow-sm">
                  <img 
                    src={product.imagen_url || 'https://via.placeholder.com/200?text=No+Img'} 
                    alt={product.nombre} 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex-1 flex flex-col">
                  <h1 className="text-[28px] font-[800] text-[#131722] dark:text-[#ffffff] leading-[1] tracking-tighter mb-1">{product.nombre}</h1>
                  <div className="text-[13px] font-[600] text-muted uppercase tracking-tight mb-2">
                    MEJOR PRECIO HOY EN {bestStoreName}
                  </div>
                  <div className="text-[48px] font-mono font-[700] tracking-tighter text-[#131722] dark:text-[#ffffff] leading-none">
                    $ {format(minPrice)}
                  </div>
                  <div className="mt-4">
                    <div className="bg-[#f1f3f6] dark:bg-[#1e222d] rounded-lg px-4 py-1.5 inline-flex items-center">
                      <span className="text-[13px] font-[500] text-muted">Precio promedio: $ {format(avgPrice)}</span>
                    </div>
                  </div>
                </div>
             </div>
          </div>

          {/* Section Divider */}
          <div className="h-[1px] bg-border-light dark:bg-border-dark mx-4"></div>

          {/* Temporal Selection */}
          <div className="px-5 pt-8 pb-4">
            <div className="flex gap-1 justify-between mb-8">
              {[7, 15, 30, 90, 180, 365].map(d => (
                <button 
                  key={d} 
                  onClick={() => setDays(d)} 
                  className={`flex-1 py-2 text-[11px] font-[800] rounded-md border transition-all ${days === d ? 'bg-[#131722] dark:bg-[#ffffff] text-[#ffffff] dark:text-[#000000] border-[#131722] dark:border-[#ffffff]' : 'bg-[#ffffff] dark:bg-transparent text-muted border-border-light dark:border-border-dark'}`}
                >
                  {d === 7 ? '7D' : d === 15 ? '15D' : d === 30 ? '1M' : d === 90 ? '3M' : d === 180 ? '6M' : '1Y'}
                </button>
              ))}
            </div>

            <h3 className="text-[12px] font-[800] uppercase tracking-wider text-[#131722] dark:text-[#ffffff] mb-1">GRÁFICO DE TENDENCIAS</h3>
            <div className={`text-[12px] font-[700] mb-6 ${isUp ? 'text-chart-red' : 'text-chart-green'}`}>
              {variation ? `${parseFloat(variation) > 0 ? '+' : ''}${variation}% últimos días` : '- 0.0%'}
            </div>
            
            <div className="h-64 w-full relative">
              {!loading && chartData.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={trendColor} stopOpacity={0.05}/><stop offset="95%" stopColor={trendColor} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke={theme === 'dark' ? 'transparent' : '#f1f5f9'} strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 9, fill: '#94a3b8', fontWeight: 'bold'}} 
                      minTickGap={60} 
                    />
                    <YAxis 
                      orientation="right" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 9, fill: '#94a3b8', fontWeight: 'bold'}} 
                      tickFormatter={v => `$${format(v)}`} 
                      domain={['auto', 'auto']} 
                    />
                    <Tooltip 
                      contentStyle={{backgroundColor: theme === 'dark' ? '#000' : '#fff', borderRadius: '8px', border: '1px solid #e0e3eb', padding: '8px', boxShadow: 'none'}}
                      labelStyle={{fontSize: '9px', fontWeight: '800', marginBottom: '2px', color: '#94a3b8'}}
                      itemStyle={{fontSize: '12px', fontWeight: '800', fontFamily: 'Roboto Mono', color: theme === 'dark' ? '#fff' : '#000'}}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="price" 
                      stroke={trendColor} 
                      strokeWidth={3} 
                      fillOpacity={1} 
                      fill="url(#colorPrice)" 
                      animationDuration={1500}
                      connectNulls
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center font-mono text-[9px] text-muted bg-slate-50 dark:bg-[#080808] rounded-xl border border-dashed border-border-light dark:border-border-dark">
                  {loading ? 'ANALIZANDO...' : 'SIN DATOS SUFICIENTES'}
                </div>
              )}
            </div>
          </div>

          {/* Section Divider */}
          <div className="h-[1px] bg-border-light dark:bg-border-dark mx-4"></div>

          {/* Market Comparison */}
          <section className="px-5 py-8 pb-4">
            <h3 className="text-[12px] font-[800] uppercase tracking-wider text-[#131722] dark:text-[#ffffff] mb-8">COMPARACION DE MERCADO</h3>
            <div className="space-y-6">
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
                  <div key={s.name} className="flex items-center justify-between border-b border-dotted border-border-light dark:border-border-dark pb-5 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: s.color}}></div>
                      <span className="text-[15px] font-[400] text-[#131722] dark:text-[#ffffff] uppercase font-sans">{s.name}</span>
                      {of && (
                        <span className="bg-chart-green text-white text-[9px] font-[800] px-2 py-0.5 rounded-sm uppercase ml-1">
                          {of.etiqueta || (typeof of === 'string' ? of : 'OFERTA')}
                        </span>
                      )}
                    </div>
                    {productUrl ? (
                      <a 
                        href={productUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={`font-mono text-[17px] font-[700] transition-opacity hover:opacity-70 ${isBest ? 'text-chart-green' : 'text-[#131722] dark:text-[#ffffff]'}`}
                      >
                        ${format(price)}
                      </a>
                    ) : (
                      <div className={`font-mono text-[17px] font-[700] ${isBest ? 'text-chart-green' : 'text-[#131722] dark:text-[#ffffff]'}`}>
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