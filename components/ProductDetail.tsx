import React, { useEffect, useState, useMemo, useRef } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid,
  TooltipProps
} from 'recharts';
import { getProductHistory } from '../services/supabase';
import { Product, PriceHistory } from '../types';

// Tipos para el gráfico
interface ChartDataItem {
  date: string;
  fullDate: string;
  price: number;
  store: string;
}

interface ProductDetailProps {
  productId: number;
  onClose: () => void;
  onFavoriteToggle: (id: number) => void;
  isFavorite: boolean;
  products: Product[];
  theme: 'light' | 'dark';
}

// Alias para evitar errores de compilación de Recharts en React 18
const AreaChartComponent = AreaChart as any;
const AreaComponent = Area as any;
const XAxisComponent = XAxis as any;
const YAxisComponent = YAxis as any;
const TooltipComponent = Tooltip as any;
const ResponsiveContainerComponent = ResponsiveContainer as any;
const CartesianGridComponent = CartesianGrid as any;

const formatCurrency = (n: number) => new Intl.NumberFormat('es-AR').format(n);

const STORES = [
  { name: "COTO", key: 'p_coto', url: 'url_coto' },
  { name: "CARREFOUR", key: 'p_carrefour', url: 'url_carrefour' },
  { name: "DIA", key: 'p_dia', url: 'url_dia' },
  { name: "JUMBO", key: 'p_jumbo', url: 'url_jumbo' },
  { name: "MAS ONLINE", key: 'p_masonline', url: 'url_masonline' }
] as const;

const ProductDetail: React.FC<ProductDetailProps> = ({ productId, onClose, onFavoriteToggle, isFavorite, products, theme }) => {
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [days, setDays] = useState(7);
  const modalRef = useRef<HTMLDivElement>(null);

  const product = useMemo(() => products.find(p => p.id === productId), [products, productId]);

  useEffect(() => {
    if (product) {
      getProductHistory(product.nombre, 365)
        .then(data => setHistory(data || []))
        .catch(() => setHistory([]));
    }
  }, [product]);

  useEffect(() => {
    const handleEvents = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof MouseEvent) {
        if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose();
      } else if (e instanceof KeyboardEvent && e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleEvents);
    document.addEventListener('keydown', handleEvents);
    return () => {
      document.removeEventListener('mousedown', handleEvents);
      document.removeEventListener('keydown', handleEvents);
    };
  }, [onClose]);

  const { minPrice, minStore, avgPrice, minStoreUrl } = useMemo(() => {
    if (!product) return { minPrice: 0, minStore: '', avgPrice: 0, minStoreUrl: '#' };
    const prices = STORES
      .map(s => ({ 
        name: s.name, 
        val: (product as any)[s.key] as number,
        url: (product as any)[s.url] as string 
      }))
      .filter(p => p.val > 0);

    if (prices.length === 0) return { minPrice: 0, minStore: '', avgPrice: 0, minStoreUrl: '#' };
    const min = Math.min(...prices.map(p => p.val));
    const winner = prices.find(p => p.val === min);
    return { 
      minPrice: min, 
      minStore: winner?.name || '', 
      avgPrice: prices.reduce((acc, curr) => acc + curr.val, 0) / prices.length,
      minStoreUrl: winner?.url || '#'
    };
  }, [product]);

  const { chartData, percentageChange, isTrendUp } = useMemo(() => {
    if (!history.length) return { chartData: [], percentageChange: 0, isTrendUp: false };
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - days);
    limitDate.setHours(0, 0, 0, 0);

    const filtered: ChartDataItem[] = history
      .filter(h => {
        const [y, m, d] = h.fecha.split('T')[0].split('-').map(Number);
        return new Date(y, m - 1, d) >= limitDate;
      })
      .map(h => {
        const [year, month, day] = h.fecha.split('T')[0].split('-').map(Number);
        const localDate = new Date(year, month - 1, day);
        return {
          date: localDate.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }),
          fullDate: localDate.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' }),
          price: h.precio_minimo,
          store: h.supermercado
        };
      });

    if (filtered.length < 2) return { chartData: filtered, percentageChange: 0, isTrendUp: false };
    const change = ((filtered[filtered.length - 1].price - filtered[0].price) / (filtered[0].price || 1)) * 100;
    return { chartData: filtered, percentageChange: change, isTrendUp: change > 0 };
  }, [history, days]);

  const handleShare = async () => {
    if (!product) return;
    const text = `¡Mira este precio en TradingChango! ${product.nombre} a $${formatCurrency(minPrice)}`;
    try {
      if (navigator.share) await navigator.share({ title: 'TradingChango', text, url: window.location.href });
      else { await navigator.clipboard.writeText(`${text} ${window.location.href}`); alert('Copiado'); }
    } catch (e) {}
  };

  if (!product) return null;
  const trendColor = isTrendUp ? '#f23645' : '#00c853';
  const ticker = product.ticker || product.nombre.substring(0, 5).toUpperCase();

  const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ChartDataItem;
      return (
        <div className="bg-white dark:bg-neutral-900 p-2 rounded-lg shadow-xl border border-neutral-100 dark:border-neutral-800 text-center">
          <p className="text-[9px] font-bold text-neutral-500 dark:text-neutral-400 uppercase">{data.date}</p>
          <div className="flex items-baseline justify-center gap-1.5">
            <span className="text-[9px] font-bold text-black dark:text-white uppercase">{data.store}</span>
            <span className="text-[9px] font-bold text-black dark:text-white">${formatCurrency(data.price)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm md:p-4">
      <div 
      ref={modalRef}
      className="w-full max-w-lg h-auto max-h-full md:max-h-[95vh] bg-white dark:bg-neutral-950 md:rounded-[1.2rem] overflow-y-auto shadow-2xl relative"
         >
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md px-4 py-2 flex items-center justify-between border-b border-neutral-100 dark:border-neutral-900">
          <button onClick={onClose} className="text-black dark:text-white p-2">
            <i className="fa-solid fa-arrow-left text-xl"></i>
          </button>
          <span className="text-xs font-black tracking-widest text-black dark:text-white uppercase">{ticker}</span>
          <div className="flex items-center gap-2">
            <button onClick={handleShare} className="text-black dark:text-white p-2">
              <i className="fa-solid fa-share-nodes text-lg"></i>
            </button>
            <button onClick={() => onFavoriteToggle(product.id)} className={`text-xl ${isFavorite ? 'text-star-gold' : 'text-black dark:text-white'}`}>
              <i className="fa-solid fa-cart-shopping"></i>
            </button>
          </div>
        </div>

        <div className="p-4 pb-0 md:p-5 md:pb-0 flex flex-col">
          {/* Seccion Producto e Info */}
          <div className="flex gap-4 items-start mb-3">
            <div className="w-20 h-20 md:w-28 md:h-28 bg-white rounded-lg border border-neutral-100 shadow-sm flex items-center justify-center p-1.5 shrink-0">
              <img src={product.imagen_url || ''} alt={product.nombre} className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col flex-1">
              <h1 className="text-xl md:text-2xl font-black text-black dark:text-white leading-tight mb-1 tracking-tighter">
                {product.nombre}
              </h1>
              <div className="flex flex-col">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-xs font-black text-black dark:text-white uppercase tracking-widest">
                    Mejor precio hoy en {minStore}
                  </span>
                  <a href={minStoreUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500">
                    <i className="fa-solid fa-arrow-up-right-from-square text-sm"></i>
                  </a>
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-base font-bold text-black dark:text-white">$</span>
                    <span className="text-3xl md:text-5xl font-black text-black dark:text-white tracking-tighter font-mono leading-none">
                      {formatCurrency(minPrice)}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-2 py-1 rounded-md mb-0.5">
                    <span className="text-[9px] font-bold text-neutral-600 dark:text-neutral-300 uppercase">Promedio:</span>
                    <span className="text-[13px] font-black text-black dark:text-white font-mono">$ {formatCurrency(Math.round(avgPrice))}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <hr className="w-full border-neutral-100 dark:border-neutral-900 mb-3" />

          {/* Selectores de dias */}
          <div className="w-full flex justify-center gap-1 mb-3 overflow-x-auto no-scrollbar pb-1">
            {[7, 15, 30, 90, 180, 365].map((d) => (
              <button 
                key={d} 
                onClick={() => setDays(d)}
                className={`min-w-[48px] py-2 px-2 text-[10px] font-black rounded-md transition-all ${
    days === d
      ? 'bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white'
      : 'bg-neutral-50 dark:bg-neutral-900 text-neutral-500 dark:text-white'
}`}
              >
                {d < 30 ? `${d}D` : d < 365 ? `${Math.floor(d / 30)}M` : '1Y'}
              </button>
            ))}
          </div>

          {/* Variación y Gráfico */}
          <div className="mb-3 w-full">
            <div className="flex flex-col items-center text-center mb-2">
              <div className="flex items-center gap-1.5">
                 <span className={`text-xs font-black px-1.5 py-0.5 rounded-md ${isTrendUp ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                   {isTrendUp ? '▲' : '▼'} {Math.abs(percentageChange).toFixed(1)}%
                 </span>
                 <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-widest">
                  Variación en {days} días</span>
              </div>
            </div>
            
            <div className="h-44 md:h-52 w-full relative">
              {chartData.length > 1 ? (
                <ResponsiveContainerComponent width="100%" height="100%">
                  <AreaChartComponent data={chartData} margin={{ top: 5, right: 0, left: 12, bottom: 20 }}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={trendColor} stopOpacity={0.1}/>
                        <stop offset="95%" stopColor={trendColor} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGridComponent vertical={false} strokeDasharray="3 3" stroke={theme === 'dark' ? '#262626' : '#f0f0f0'} />
                    <XAxisComponent dataKey="date" tick={{fontSize: 8, fill: theme === 'dark' ? '#e5e5e5' : '#737373'}} tickLine={false} axisLine={false} />
                    <YAxisComponent orientation="right" width={36} axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: theme === 'dark' ? '#e5e5e5' : '#737373' }} domain={['auto', 'auto']} tickFormatter={(val: number) => `$${formatCurrency(val)}`} />
                    <TooltipComponent content={<CustomTooltip />} />
                    <AreaComponent type="monotone" dataKey="price" stroke={trendColor} strokeWidth={2} fill="url(#colorPrice)" />
                  </AreaChartComponent>
                </ResponsiveContainerComponent>
              ) : (
                <div className="h-full flex items-center justify-center text-[10px] text-neutral-400 font-bold uppercase border border-dashed rounded-xl">Sin datos suficientes</div>
              )}
            </div>
          </div>

          {/* Tabla Comparativa (Misma estructura que tu imagen 1) */}
          <div className="w-full border border-neutral-100 dark:border-neutral-800 rounded-lg overflow-hidden mb-4">
            <div className="w-full flex items-center justify-between p-2.5 bg-neutral-50 dark:bg-neutral-900/50">
              <span className="text-[12px] font-black uppercase tracking-[0.1em] text-black dark:text-white">Comparativa por Mercado</span>
            </div>
            <div className="px-3 py-2 space-y-2 bg-white dark:bg-neutral-950">
              {STORES.map((s) => {
                const price = (product as any)[s.key];
                const url = (product as any)[s.url];
                const storeKey = s.key.substring(2);
                const promo = (product as any).oferta_gondola?.[storeKey]?.etiqueta;
                if (!price || price <= 0) return null;
                
                const storeColors: any = { COTO: 'bg-red-500', CARREFOUR: 'bg-blue-500', DIA: 'bg-red-500', JUMBO: 'bg-green-500', 'MAS ONLINE': 'bg-green-500' };

                return (
                  <div key={s.name} className="flex items-center justify-between py-1.5 border-b border-neutral-50 dark:border-neutral-900 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${storeColors[s.name]}`}></span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[13px] font-black text-black dark:text-white uppercase">{s.name}</span>
                        {promo && <span className="bg-green-600 text-white text-[9px] font-black px-1 py-0.5 rounded-[1px] uppercase leading-none">{promo}</span>}
                      </div>
                    </div>
                      <a 
                      href={url || '#'} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className={`text-base font-mono font-black hover:underline cursor-pointer ${price === minPrice ? 'text-green-500' : 'text-black dark:text-white'}`}
                    >
                      ${formatCurrency(price)}
                    </a>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Boton Fijo */}
            <div className="w-full sticky bottom-0 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md pt-2 pb-6 md:pb-4 px-4">
            <button 
              onClick={() => onFavoriteToggle(product.id)} 
              className={`w-full py-3.5 rounded-lg font-black uppercase tracking-[0.1em] text-xs flex items-center justify-center gap-2 active:scale-95 transition-all ${isFavorite ? 'bg-star-gold text-white' : 'bg-black dark:bg-white text-white dark:text-black'}`}
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