
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
        price: h.precio_minimo
      }));
  }, [history, days]);

  if (!product) return null;
  const format = (n: number) => new Intl.NumberFormat('es-AR').format(n);
  const trendColor = theme === 'dark' ? '#00c853' : '#00c853';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div 
        ref={modalRef}
        className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-950 rounded-[2.5rem] overflow-y-auto no-scrollbar shadow-2xl relative border border-slate-200 dark:border-slate-800"
      >
        {/* Botón de Cierre */}
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors z-10">
          <i className="fa-solid fa-times text-xl"></i>
        </button>

        <div className="p-8">
          {/* Info Principal */}
          <div className="flex flex-col md:flex-row gap-6 mb-8">
            <div className="w-24 h-24 bg-white rounded-2xl p-3 shadow-sm border border-slate-100 flex-shrink-0">
              <img src={product.imagen_url || 'https://via.placeholder.com/200?text=No+Img'} alt={product.nombre} className="w-full h-full object-contain" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-tight mb-2 uppercase tracking-tighter">{product.nombre}</h1>
              
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">Mínimo Hoy</span>
                  <div className="text-3xl font-mono font-black text-slate-900 dark:text-white">${format(minPrice)}</div>
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">Precio Promedio</span>
                  <div className="text-xl font-mono font-bold text-slate-400">${format(Math.round(avgPrice))}</div>
                </div>
              </div>

              {/* Badge Móvil Requerido */}
              <div className="mt-4 md:hidden">
                <span className="text-[9px] font-black uppercase text-green-500 tracking-[0.15em] bg-green-50 dark:bg-green-950/30 px-3 py-1.5 rounded-full border border-green-100 dark:border-green-900/50">
                  Mejor precio hoy en <b className="uppercase">{minStore}</b>
                </span>
              </div>
            </div>
          </div>

          {/* Gráfico */}
          <div className="bg-slate-50 dark:bg-slate-900/30 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 mb-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Evolución</h3>
              <div className="flex gap-1 bg-white dark:bg-slate-950 p-1 rounded-xl border border-slate-100 dark:border-slate-800">
                {[30, 90, 365].map(d => (
                  <button key={d} onClick={() => setDays(d)} className={`px-3 py-1 text-[8px] font-black rounded-lg transition-all ${days === d ? 'bg-black dark:bg-white text-white dark:text-black' : 'text-slate-400'}`}>
                    {d === 30 ? '1M' : d === 90 ? '3M' : '1Y'}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-56 w-full">
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
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff'}} 
                    labelStyle={{fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', color: '#888'}}
                    itemStyle={{fontSize: '14px', fontWeight: '900', color: theme === 'dark' ? '#ffffff' : '#000000'}}
                  />
                  <Area type="monotone" dataKey="price" stroke={trendColor} strokeWidth={3} fillOpacity={1} fill="url(#colorPrice)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Precios por Mercado - Desplegable */}
          <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden mb-8">
            <button 
              onClick={() => setIsPricesOpen(!isPricesOpen)}
              className="w-full flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
            >
              <div className="flex items-center gap-3">
                <i className="fa-solid fa-shop text-slate-400"></i>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Precio por Mercado</span>
              </div>
              <i className={`fa-solid fa-chevron-${isPricesOpen ? 'up' : 'down'} text-slate-400 transition-transform`}></i>
            </button>
            
            {isPricesOpen && (
              <div className="p-5 space-y-4 bg-white dark:bg-black animate-in slide-in-from-top-2 duration-300">
                {STORES.map((s) => {
                  const price = (product as any)[s.key];
                  const url = (product as any)[s.url];
                  if (!price || price <= 0) return null;
                  return (
                    <div key={s.name} className="flex items-center justify-between pb-3 border-b border-slate-50 dark:border-slate-900 last:border-0 last:pb-0">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase">{s.name}</span>
                        {url && <a href={url} target="_blank" rel="noopener noreferrer" className="text-[8px] font-bold text-blue-500 uppercase">Ir a la tienda</a>}
                      </div>
                      <span className={`text-lg font-mono font-black ${price === minPrice ? 'text-green-500' : 'text-slate-900 dark:text-white'}`}>
                        ${format(price)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={() => onFavoriteToggle(product.id)} className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all flex items-center justify-center gap-2 ${isFavorite ? 'bg-star-gold text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-white'}`}>
              <i className="fa-solid fa-cart-shopping"></i>
              {isFavorite ? 'En el Chango' : 'Agregar al Chango'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
