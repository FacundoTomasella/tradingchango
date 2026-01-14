
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
  const [days, setDays] = useState(7);
  const [isPricesOpen, setIsPricesOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const product = products.find(p => p.id === productId);

  useEffect(() => {
    if (product) {
      getProductHistory(product.nombre, 365)
        .then(data => setHistory(data || []))
        .catch(() => setHistory([]));
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
    { name: "COTO", key: 'p_coto', url: 'url_coto' },
    { name: "CARREFOUR", key: 'p_carrefour', url: 'url_carrefour' },
    { name: "DIA", key: 'p_dia', url: 'url_dia' },
    { name: "JUMBO", key: 'p_jumbo', url: 'url_jumbo' },
    { name: "MAS ONLINE", key: 'p_masonline', url: 'url_masonline' }
  ] as const;

  const { minPrice, minStore, avgPrice } = useMemo(() => {
    if (!product) return { minPrice: 0, minStore: '', avgPrice: 0 };
    const prices = STORES.map(s => ({ name: s.name, val: (product as any)[s.key] })).filter(p => p.val > 0);
    if (prices.length === 0) return { minPrice: 0, minStore: '', avgPrice: 0 };
    
    const min = Math.min(...prices.map(p => p.val));
    const winner = prices.find(p => p.val === min)?.name || '';
    const avg = prices.reduce((acc, curr) => acc + curr.val, 0) / prices.length;
    
    return { minPrice: min, minStore: winner, avgPrice: avg };
  }, [product]);

  const { chartData, percentageChange, isTrendUp } = useMemo(() => {
    if (!history.length) return { chartData: [], percentageChange: 0, isTrendUp: false };
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - days);
    
    const filtered = history
      .filter(h => new Date(h.fecha) >= limitDate)
      .map(h => ({
        date: new Date(h.fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }),
        fullDate: new Date(h.fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' }),
        price: h.precio_minimo,
        store: h.supermercado
      }));

    if (filtered.length < 2) return { chartData: filtered, percentageChange: 0, isTrendUp: false };

    const firstPrice = filtered[0].price;
    const lastPrice = filtered[filtered.length - 1].price;
    const change = ((lastPrice - firstPrice) / firstPrice) * 100;

    return { 
      chartData: filtered, 
      percentageChange: change, 
      isTrendUp: change > 0 
    };
  }, [history, days]);

  if (!product) return null;
  const format = (n: number) => new Intl.NumberFormat('es-AR').format(n);
  
  // Lógica de color de Trading: Verde si baja (bueno para el usuario), Rojo si sube (malo)
  const trendColor = isTrendUp ? '#f23645' : '#00c853';
  const ticker = product.ticker || product.nombre.substring(0, 5).toUpperCase();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm md:p-4">
      <div 
        ref={modalRef}
        className="w-full max-w-2xl h-full md:h-auto md:max-h-[90vh] bg-white dark:bg-slate-950 md:rounded-[1rem] overflow-y-auto no-scrollbar shadow-2xl relative"
      >
        {/* Top Navigation Bar */}
        <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-900">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="text-slate-900 dark:text-white">
              <i className="fa-solid fa-arrow-left text-lg"></i>
            </button>
            <span className="text-base font-black tracking-tight text-slate-900 dark:text-white uppercase">{ticker}</span>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => onFavoriteToggle(product.id)} className={`text-xl transition-transform active:scale-90 ${isFavorite ? 'text-star-gold' : 'text-slate-900 dark:text-white'}`}>
              <i className="fa-solid fa-cart-shopping"></i>
            </button>
            <button className="text-slate-900 dark:text-white text-xl">
              <i className="fa-solid fa-arrow-up-from-bracket"></i>
            </button>
          </div>
        </div>

        <div className="p-6 md:p-8">
          {/* Row: Image + Title/Price */}
          <div className="flex gap-5 items-start mb-6">
            <div className="w-24 h-24 md:w-32 md:h-32 bg-white rounded-xl border border-slate-100 shadow-sm flex-shrink-0 flex items-center justify-center p-2">
              <img src={product.imagen_url || 'https://via.placeholder.com/200?text=No+Img'} alt={product.nombre} className="w-full h-full object-contain" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-tight mb-3 tracking-tight">
                {product.nombre}
              </h1>
              
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Mejor precio hoy en {minStore}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">$</span>
                  <span className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter">
                    {format(minPrice)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Average Price Pill */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">Precio promedio:</span>
              <span className="text-[13px] font-black text-slate-900 dark:text-white font-mono">$ {format(Math.round(avgPrice))}</span>
            </div>
          </div>

          <hr className="border-slate-100 dark:border-slate-900 mb-6" />

          {/* Time Filter Controls */}
          <div className="flex justify-start md:justify-end gap-1 mb-8">
            {[7, 15, 30, 90, 180, 365].map((d) => (
              <button 
                key={d} 
                onClick={() => setDays(d)}
                className={`min-w-[42px] py-2 px-1 text-[10px] font-black rounded-lg transition-all ${days === d ? 'bg-[#131722] text-white' : 'bg-slate-50 dark:bg-slate-900 text-slate-400 border border-slate-200 dark:border-slate-800'}`}
              >
                {d < 30 ? `${d}D` : d < 365 ? `${Math.floor(d / 30)}M` : '1Y'}
              </button>
            ))}
          </div>

          {/* Chart Section */}
          <div className="mb-10">
            <div className="mb-6">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Gráfico de tendencias</h3>
              <div className="flex items-center gap-1.5 mt-1">
                 <span className={`text-[12px] font-black ${isTrendUp ? 'text-red-500' : 'text-green-500'}`}>
                   {isTrendUp ? '▲' : '▼'} {Math.abs(percentageChange).toFixed(1)}%
                 </span>
                 <span className="text-[10px] font-bold text-slate-400 uppercase">en los últimos {days} días</span>
              </div>
            </div>
            
            <div className="h-64 w-full relative">
              {chartData.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={trendColor} stopOpacity={0.1}/>
                        <stop offset="95%" stopColor={trendColor} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={theme === 'dark' ? '#1a1a1a' : '#f0f0f0'} />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 9, fontWeight: 700, fill: '#888'}} 
                      minTickGap={40}
                    />
                    <YAxis 
                      orientation="right" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 9, fontWeight: 700, fill: '#888'}} 
                      domain={['auto', 'auto']}
                    />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 animate-in zoom-in duration-200">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{data.fullDate}</p>
                              <p className="text-[11px] font-bold text-slate-900 dark:text-white uppercase mb-1">{data.store}</p>
                              <p className="text-xl font-mono font-black text-slate-900 dark:text-white">${format(data.price)}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="price" 
                      stroke={trendColor} 
                      strokeWidth={3} 
                      fill="url(#colorPrice)"
                      animationDuration={1000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-slate-300 uppercase tracking-[0.2em]">
                  Sin datos suficientes
                </div>
              )}
            </div>
          </div>

          {/* Market Comparison Collapsible */}
          <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden mb-6">
            <button 
              onClick={() => setIsPricesOpen(!isPricesOpen)}
              className="w-full flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-900/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <i className="fa-solid fa-shop text-slate-400"></i>
                <span className="text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Precio por Mercado</span>
              </div>
              <i className={`fa-solid fa-chevron-${isPricesOpen ? 'up' : 'down'} text-slate-400 text-xs transition-transform`}></i>
            </button>
            
            {isPricesOpen && (
              <div className="p-5 space-y-4 bg-white dark:bg-black animate-in slide-in-from-top-2 duration-300">
                {STORES.map((s) => {
                  const price = (product as any)[s.key];
                  const url = (product as any)[s.url];
                  if (!price || price <= 0) return null;
                  return (
                    <div key={s.name} className="flex items-center justify-between pb-4 border-b border-slate-50 dark:border-slate-900 last:border-0 last:pb-0">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-tight">{s.name}</span>
                        {url && <a href={url} target="_blank" rel="noopener noreferrer" className="text-[9px] font-bold text-blue-500 uppercase hover:underline">Ir a la web</a>}
                      </div>
                      <span className={`text-xl font-mono font-black ${price === minPrice ? 'text-green-500' : 'text-slate-900 dark:text-white'}`}>
                        ${format(price)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-8">
            <button 
              onClick={() => onFavoriteToggle(product.id)} 
              className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-[12px] transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 ${isFavorite ? 'bg-star-gold text-white' : 'bg-black dark:bg-white text-white dark:text-black'}`}
            >
              <i className="fa-solid fa-cart-shopping text-lg"></i>
              {isFavorite ? 'En el Chango' : 'Añadir al Chango'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
