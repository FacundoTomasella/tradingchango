
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

  const handleShare = async () => {
    if (!product) return;
    const url = window.location.href;
    const text = `¡Mira este precio en TradingChango! ${product.nombre} a $${format(minPrice)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'TradingChango', text, url });
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        alert('Enlace copiado al portapapeles');
      }
    } catch (e) {}
  };

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
  
  const trendColor = isTrendUp ? '#f23645' : '#00c853';
  const ticker = product.ticker || product.nombre.substring(0, 5).toUpperCase();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm md:p-4">
      <div 
        ref={modalRef}
        className="w-full max-w-lg h-full md:h-auto md:max-h-[95vh] bg-white dark:bg-neutral-950 md:rounded-[1.2rem] overflow-y-auto no-scrollbar shadow-2xl relative"
      >
        <div className="sticky top-0 z-20 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md px-4 py-2 flex items-center justify-between border-b border-neutral-100 dark:border-neutral-900">
          <button onClick={onClose} className="text-black dark:text-white p-2">
            <i className="fa-solid fa-arrow-left text-lg"></i>
          </button>
          <span className="text-[10px] font-black tracking-widest text-black dark:text-white uppercase">{ticker}</span>
          <div className="flex items-center gap-2">
            <button onClick={handleShare} className="text-black dark:text-white p-2">
              <i className="fa-solid fa-share-nodes text-base"></i>
            </button>
            <button onClick={() => onFavoriteToggle(product.id)} className={`text-lg transition-transform active:scale-90 ${isFavorite ? 'text-star-gold' : 'text-black dark:text-white'}`}>
              <i className="fa-solid fa-cart-shopping"></i>
            </button>
          </div>
        </div>

        <div className="p-4 md:p-5 flex flex-col">
          <div className="flex gap-4 items-start mb-3">
            <div className="w-20 h-20 md:w-28 md:h-28 bg-white rounded-lg border border-neutral-100 shadow-sm flex items-center justify-center p-1.5 shrink-0">
              <img src={product.imagen_url || 'https://via.placeholder.com/200?text=No+Img'} alt={product.nombre} className="w-full h-full object-contain" />
            </div>
            
            <div className="flex flex-col flex-1">
              <h1 className="text-base md:text-xl font-black text-black dark:text-white leading-tight mb-1 tracking-tighter">
                {product.nombre}
              </h1>
              
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest mb-0.5">
                  Mejor precio hoy en {minStore}
                </span>
                <div className="flex items-end gap-2">
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-sm font-bold text-black dark:text-white">$</span>
                    <span className="text-2xl md:text-4xl font-black text-black dark:text-white tracking-tighter font-mono leading-none">
                      {format(minPrice)}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 px-2 py-1 rounded-md mb-0.5 shadow-sm">
                    <span className="text-[8px] font-bold text-neutral-400 uppercase">Promedio:</span>
                    <span className="text-[11px] font-black text-neutral-600 dark:text-neutral-400 font-mono">$ {format(Math.round(avgPrice))}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <hr className="w-full border-neutral-100 dark:border-neutral-900 mb-3" />

          <div className="w-full flex justify-center gap-1 mb-3 overflow-x-auto no-scrollbar pb-1">
            {[7, 15, 30, 90, 180, 365].map((d) => (
              <button 
                key={d} 
                onClick={() => setDays(d)}
                className={`min-w-[42px] py-1.5 px-1 text-[8px] font-black rounded-md transition-all border ${days === d ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white' : 'bg-neutral-50 dark:bg-neutral-900 text-neutral-500 border-neutral-100 dark:border-neutral-800'}`}
              >
                {d < 30 ? `${d}D` : d < 365 ? `${Math.floor(d / 30)}M` : '1Y'}
              </button>
            ))}
          </div>

          <div className="mb-3 w-full">
            <div className="flex flex-col items-center text-center mb-2">
              <div className="flex items-center gap-1.5">
                 <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${isTrendUp ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                   {isTrendUp ? '▲' : '▼'} {Math.abs(percentageChange).toFixed(1)}%
                 </span>
                 <span className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest">Variación en {days} días</span>
              </div>
            </div>
            
            <div className="h-44 md:h-52 w-full relative">
              {chartData.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -35, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={trendColor} stopOpacity={0.1}/>
                        <stop offset="95%" stopColor={trendColor} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={theme === 'dark' ? '#262626' : '#f0f0f0'} />
                    <XAxis dataKey="date" hide />
                    <YAxis orientation="right" axisLine={false} tickLine={false} tick={{fontSize: 8, fill: '#737373'}} domain={['auto', 'auto']} />
                    <Tooltip content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white dark:bg-neutral-900 p-2 rounded-lg shadow-xl border border-neutral-100 dark:border-neutral-800">
                              <p className="text-[12px] font-mono font-black text-black dark:text-white">${format(data.price)}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area type="monotone" dataKey="price" stroke={trendColor} strokeWidth={2} fill="url(#colorPrice)" animationDuration={1000} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-[8px] font-black text-neutral-400 uppercase tracking-[0.2em] bg-neutral-50 dark:bg-neutral-900/20 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800">
                  Sin datos suficientes
                </div>
              )}
            </div>
          </div>

          <div className="w-full border border-neutral-100 dark:border-neutral-800 rounded-lg overflow-hidden mb-4">
            <button onClick={() => setIsPricesOpen(!isPricesOpen)} className="w-full flex items-center justify-between p-2.5 bg-neutral-50 dark:bg-neutral-900/50">
              <span className="text-[9px] font-black uppercase tracking-[0.1em] text-black dark:text-white">Comparativa por Mercado</span>
              <i className={`fa-solid fa-chevron-${isPricesOpen ? 'up' : 'down'} text-neutral-500 text-[9px]`}></i>
            </button>
            {isPricesOpen && (
              <div className="px-3 py-2 space-y-2 bg-white dark:bg-neutral-950">
                {STORES.map((s) => {
                  const price = (product as any)[s.key];
                  if (!price || price <= 0) return null;
                  return (
                    <div key={s.name} className="flex items-center justify-between py-1.5 border-b border-neutral-50 dark:border-neutral-900 last:border-0">
                      <span className="text-[9px] font-black text-neutral-500 uppercase">{s.name}</span>
                      <span className={`text-sm font-mono font-black ${price === minPrice ? 'text-green-500' : 'text-black dark:text-white'}`}>
                        ${format(price)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="w-full sticky bottom-0 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md pb-2 pt-1">
            <button 
              onClick={() => onFavoriteToggle(product.id)} 
              className={`w-full py-3.5 rounded-lg font-black uppercase tracking-[0.1em] text-[10px] transition-all flex items-center justify-center gap-2 active:scale-95 ${isFavorite ? 'bg-star-gold text-white' : 'bg-black dark:bg-white text-white dark:text-black'}`}
            >
              <i className="fa-solid fa-cart-shopping"></i>
              {isFavorite ? 'En el Chango' : 'Añadir al Chango'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
