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
  
  const trendColor = isTrendUp ? '#f23645' : '#00c853';
  const ticker = product.ticker || product.nombre.substring(0, 5).toUpperCase();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm md:p-4">
      <div 
        ref={modalRef}
        className="w-full max-w-2xl h-full md:h-auto md:max-h-[90vh] bg-white dark:bg-black md:rounded-[2rem] overflow-y-auto no-scrollbar shadow-2xl relative"
      >
        {/* Header Modal */}
        <div className="sticky top-0 z-20 bg-white/95 dark:bg-black/95 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-neutral-100 dark:border-neutral-900">
          <button onClick={onClose} className="text-black dark:text-white p-2 -ml-2">
            <i className="fa-solid fa-arrow-left text-lg"></i>
          </button>
          <span className="text-sm font-black tracking-widest text-black dark:text-white uppercase">{ticker}</span>
          <div className="flex items-center gap-4">
            <button onClick={() => onFavoriteToggle(product.id)} className={`text-xl transition-transform active:scale-90 ${isFavorite ? 'text-star-gold' : 'text-black dark:text-white'}`}>
              <i className="fa-solid fa-cart-shopping"></i>
            </button>
          </div>
        </div>

        <div className="p-6 md:p-10 flex flex-col">
          {/* Top Section: Imagen a la izquierda, Texto a la derecha */}
          <div className="flex gap-6 md:gap-10 items-start mb-10">
            <div className="w-28 h-28 md:w-44 md:h-44 bg-white rounded-3xl border border-neutral-100 shadow-sm flex items-center justify-center p-4 transition-transform hover:scale-105 shrink-0">
              <img src={product.imagen_url || 'https://via.placeholder.com/200?text=No+Img'} alt={product.nombre} className="w-full h-full object-contain" />
            </div>
            
            <div className="flex flex-col flex-1 pt-2">
              <h1 className="text-xl md:text-3xl font-black text-black dark:text-white leading-tight mb-4 tracking-tighter">
                {product.nombre}
              </h1>
              
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">
                  Mejor precio hoy en {minStore}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl md:text-2xl font-bold text-black dark:text-white">$</span>
                  <span className="text-4xl md:text-6xl font-black text-black dark:text-white tracking-tighter font-mono">
                    {format(minPrice)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Fila de Indicadores */}
          <div className="mb-10 w-full flex flex-wrap gap-4 justify-center">
            <div className="inline-flex items-center gap-3 bg-neutral-50 dark:bg-neutral-900/50 px-5 py-3 rounded-2xl border border-neutral-100 dark:border-neutral-800">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-tight">Precio promedio:</span>
              <span className="text-[15px] font-black text-black dark:text-white font-mono">$ {format(Math.round(avgPrice))}</span>
            </div>
            {/* Aquí podrían ir otros indicadores en el futuro */}
          </div>

          <hr className="w-full border-neutral-100 dark:border-neutral-900 mb-10" />

          {/* Selector de Temporalidad - Centrado */}
          <div className="w-full flex justify-center gap-1.5 mb-10 overflow-x-auto no-scrollbar py-1">
            {[7, 15, 30, 90, 180, 365].map((d) => (
              <button 
                key={d} 
                onClick={() => setDays(d)}
                className={`min-w-[50px] py-2.5 px-2 text-[10px] font-black rounded-xl transition-all border ${days === d ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-lg' : 'bg-neutral-50 dark:bg-neutral-900 text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600'}`}
              >
                {d < 30 ? `${d}D` : d < 365 ? `${Math.floor(d / 30)}M` : '1Y'}
              </button>
            ))}
          </div>

          {/* Gráfico - Títulos Centrados */}
          <div className="mb-12 w-full">
            <div className="flex flex-col items-center text-center mb-8">
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-black dark:text-white mb-2">Historial de Tendencia</h3>
              <div className="flex items-center gap-2">
                 <span className={`text-[14px] font-black px-2 py-1 rounded-lg ${isTrendUp ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                   {isTrendUp ? '▲' : '▼'} {Math.abs(percentageChange).toFixed(1)}%
                 </span>
                 <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-tight">Variación en {days} días</span>
              </div>
            </div>
            
            <div className="h-72 w-full relative group">
              {chartData.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={trendColor} stopOpacity={0.15}/>
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
                            <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl shadow-2xl border border-neutral-100 dark:border-neutral-800 animate-in zoom-in duration-200">
                              <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1">{data.fullDate}</p>
                              <p className="text-[11px] font-bold text-black dark:text-white uppercase mb-2">{data.store}</p>
                              <p className="text-2xl font-mono font-black text-black dark:text-white tracking-tighter">${format(data.price)}</p>
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
                      strokeWidth={4} 
                      fill="url(#colorPrice)"
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-[11px] font-black text-neutral-300 uppercase tracking-[0.2em] bg-neutral-50/50 dark:bg-neutral-900/20 rounded-3xl border border-dashed border-neutral-200 dark:border-neutral-800">
                  <i className="fa-solid fa-chart-line text-3xl mb-4 opacity-20"></i>
                  Sin datos suficientes
                </div>
              )}
            </div>
          </div>

          {/* Comparativa por Mercado */}
          <div className="w-full border border-neutral-100 dark:border-neutral-800 rounded-[1.5rem] overflow-hidden mb-8">
            <button 
              onClick={() => setIsPricesOpen(!isPricesOpen)}
              className="w-full flex items-center justify-between p-6 bg-neutral-50 dark:bg-neutral-900/30 hover:bg-neutral-100 dark:hover:bg-neutral-900/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-white dark:bg-neutral-800 flex items-center justify-center shadow-sm">
                  <i className="fa-solid fa-shop text-neutral-400 text-sm"></i>
                </div>
                <span className="text-[11px] font-black uppercase tracking-[0.15em] text-black dark:text-white">Comparativa por Mercado</span>
              </div>
              <i className={`fa-solid fa-chevron-${isPricesOpen ? 'up' : 'down'} text-neutral-400 text-xs transition-transform`}></i>
            </button>
            
            {isPricesOpen && (
              <div className="px-6 py-4 space-y-4 bg-white dark:bg-black animate-in slide-in-from-top-2 duration-300">
                {STORES.map((s) => {
                  const price = (product as any)[s.key];
                  const url = (product as any)[s.url];
                  if (!price || price <= 0) return null;
                  return (
                    <div key={s.name} className="flex items-center justify-between py-4 border-b border-neutral-50 dark:border-neutral-900 last:border-0 last:pb-0">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-neutral-400 uppercase tracking-tight">{s.name}</span>
                        {url && (
                          <a 
                            href={url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-[9px] font-bold text-black dark:text-white uppercase hover:underline flex items-center gap-1.5 mt-1"
                          >
                            Ir a la web <i className="fa-solid fa-arrow-up-right-from-square text-[7px]"></i>
                          </a>
                        )}
                      </div>
                      <span className={`text-2xl font-mono font-black ${price === minPrice ? 'text-green-500' : 'text-black dark:text-white'}`}>
                        ${format(price)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Botón Acción - Sticky al fondo */}
          <div className="w-full mt-4 sticky bottom-0 bg-white/95 dark:bg-black/95 backdrop-blur-md pb-8 pt-4">
            <button 
              onClick={() => onFavoriteToggle(product.id)} 
              className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[12px] transition-all flex items-center justify-center gap-4 shadow-2xl active:scale-95 ${isFavorite ? 'bg-star-gold text-white shadow-star-gold/20' : 'bg-black dark:bg-white text-white dark:text-black shadow-black/20 dark:shadow-white/5'}`}
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