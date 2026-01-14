
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

  const chartData = useMemo(() => {
    if (!history.length) return [];
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - days);
    return history
      .filter(h => new Date(h.fecha) >= limitDate)
      .map(h => ({
        date: new Date(h.fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }),
        fullDate: new Date(h.fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' }),
        price: h.precio_minimo,
        store: h.supermercado
      }));
  }, [history, days]);

  if (!product) return null;
  const format = (n: number) => new Intl.NumberFormat('es-AR').format(n);
  const trendColor = '#00c853';
  const ticker = product.ticker || product.nombre.substring(0, 5).toUpperCase();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div 
        ref={modalRef}
        className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-950 rounded-[2.5rem] overflow-y-auto no-scrollbar shadow-2xl relative border border-slate-200 dark:border-slate-800"
      >
        {/* Botón de Cierre */}
        <button onClick={onClose} className="absolute top-6 right-8 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors z-10">
          <i className="fa-solid fa-times text-xl"></i>
        </button>

        <div className="p-8 md:p-10">
          {/* Layout de "Acción" (Stock Asset Style) */}
          <div className="flex flex-col items-center text-center mb-8">
            {/* Ticker Arriba */}
            <div className="inline-block bg-slate-100 dark:bg-slate-900 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800 mb-4">
              <span className="text-[11px] font-black font-mono text-slate-500 dark:text-slate-400 uppercase tracking-widest">${ticker}</span>
            </div>

            {/* Imagen Centrada */}
            <div className="w-32 h-32 bg-white rounded-3xl p-4 shadow-sm border border-slate-100 flex items-center justify-center mb-6">
              <img src={product.imagen_url || 'https://via.placeholder.com/200?text=No+Img'} alt={product.nombre} className="w-full h-full object-contain" />
            </div>

            {/* Título Centrado */}
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-tight uppercase tracking-tighter max-w-lg mb-6">{product.nombre}</h1>

            {/* Precios Principales */}
            <div className="flex items-end gap-8 mb-4">
              <div className="text-center">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-0.5">Precio Mínimo</span>
                <div className="text-4xl md:text-5xl font-mono font-black text-slate-900 dark:text-white tracking-tighter">${format(minPrice)}</div>
              </div>
              <div className="text-center pb-1">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-0.5">Promedio</span>
                <div className="text-xl md:text-2xl font-mono font-bold text-slate-400 tracking-tighter">${format(Math.round(avgPrice))}</div>
              </div>
            </div>

            {/* Badge de Mejor Precio (Visible en Móvil) */}
            <div className="mt-2 md:hidden">
              <span className="text-[10px] font-black uppercase text-green-500 tracking-[0.1em] bg-green-50 dark:bg-green-950/30 px-4 py-2 rounded-full border border-green-100 dark:border-green-900/50">
                Líder hoy: <b className="uppercase">{minStore}</b>
              </span>
            </div>
            {/* Indicador de Líder en Desktop (más sutil) */}
            <div className="hidden md:block mt-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Activo disponible en <span className="text-green-500">{minStore}</span> al mejor precio
              </p>
            </div>
          </div>

          {/* Gráfico de Evolución */}
          <div className="bg-slate-50 dark:bg-slate-900/30 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 mb-8">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Trading View</h3>
              </div>
              <div className="flex gap-1 bg-white dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                {[30, 90, 365].map(d => (
                  <button key={d} onClick={() => setDays(d)} className={`px-4 py-1.5 text-[9px] font-black rounded-lg transition-all ${days === d ? 'bg-black dark:bg-white text-white dark:text-black' : 'text-slate-400'}`}>
                    {d === 30 ? '1M' : d === 90 ? '3M' : '1Y'}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={trendColor} stopOpacity={0.2}/>
                      <stop offset="95%" stopColor={trendColor} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={theme === 'dark' ? '#1a1a1a' : '#f0f0f0'} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 700, fill: '#888'}} />
                  <YAxis orientation="right" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 700, fill: '#888'}} domain={['auto', 'auto']} />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{data.fullDate}</p>
                            <p className="text-[11px] font-bold text-slate-900 dark:text-white uppercase mb-2">Market: {data.store}</p>
                            <p className="text-xl font-mono font-black text-green-500">${format(data.price)}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area type="monotone" dataKey="price" stroke={trendColor} strokeWidth={4} fillOpacity={1} fill="url(#colorPrice)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Precio por Mercado Desplegable (Estilo Acordeón) */}
          <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden mb-10">
            <button 
              onClick={() => setIsPricesOpen(!isPricesOpen)}
              className="w-full flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
            >
              <div className="flex items-center gap-3">
                <i className="fa-solid fa-layer-group text-slate-400"></i>
                <span className="text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Profundidad de Mercado</span>
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
                        {url && <a href={url} target="_blank" rel="noopener noreferrer" className="text-[9px] font-bold text-blue-500 uppercase tracking-tighter hover:underline">Ir a la web</a>}
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

          {/* Acciones */}
          <div className="flex gap-4">
            <button 
              onClick={() => onFavoriteToggle(product.id)} 
              className={`flex-1 py-5 rounded-2xl font-black uppercase tracking-widest text-[12px] transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 ${isFavorite ? 'bg-star-gold text-white' : 'bg-black dark:bg-white text-white dark:text-black'}`}
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
