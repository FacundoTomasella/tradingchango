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

// 1. DEFINICIÓN DEL TIPO QUE FALTABA
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

// 2. ALIAS PARA EVITAR ERRORES DE RECHARTS (JSX PROPS)
const AreaChartComponent = AreaChart as any;
const AreaComponent = Area as any;
const XAxisComponent = XAxis as any;
const YAxisComponent = YAxis as any;
const TooltipComponent = Tooltip as any;
const ResponsiveContainerComponent = ResponsiveContainer as any;
const CartesianGridComponent = CartesianGrid as any;

const formatCurrency = (n: number) => 
  new Intl.NumberFormat('es-AR').format(n);

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
    const handleOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
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

  // 3. LÓGICA DE CHART CON CORRECCIÓN DE FECHA
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
        const localDate = new Date(year, month - 1, day); // Fuerza fecha local, evita desfase UTC

        return {
          date: localDate.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }),
          fullDate: localDate.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' }),
          price: h.precio_minimo,
          store: h.supermercado
        };
      });

    if (filtered.length < 2) return { chartData: filtered, percentageChange: 0, isTrendUp: false };
    const change = ((filtered[filtered.length - 1].price - filtered[0].price) / filtered[0].price) * 100;
    return { chartData: filtered, percentageChange: change, isTrendUp: change > 0 };
  }, [history, days]);

  if (!product) return null;
  const trendColor = isTrendUp ? '#f23645' : '#00c853';

  // Tooltip personalizado tipado
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
      <div ref={modalRef} className="w-full max-w-lg h-full md:h-auto md:max-h-[95vh] bg-white dark:bg-neutral-950 md:rounded-[1.2rem] overflow-y-auto no-scrollbar shadow-2xl relative">
        <div className="sticky top-0 z-20 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md px-4 py-2 flex items-center justify-between border-b dark:border-neutral-900">
          <button onClick={onClose} className="p-2 dark:text-white"><i className="fa-solid fa-arrow-left"></i></button>
          <span className="text-xs font-black dark:text-white uppercase">{product.nombre.substring(0, 15)}</span>
          <button onClick={() => onFavoriteToggle(product.id)} className={`text-xl ${isFavorite ? 'text-yellow-500' : 'dark:text-white'}`}><i className="fa-solid fa-cart-shopping"></i></button>
        </div>

        <div className="p-4 md:p-5">
          <div className="h-44 md:h-52 w-full mt-4">
            {chartData.length > 1 ? (
              <ResponsiveContainerComponent width="100%" height="100%">
                <AreaChartComponent data={chartData}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={trendColor} stopOpacity={0.1}/>
                      <stop offset="95%" stopColor={trendColor} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGridComponent vertical={false} strokeDasharray="3 3" stroke={theme === 'dark' ? '#262626' : '#f0f0f0'} />
                  <XAxisComponent dataKey="date" tick={{fontSize: 8, fill: '#737373'}} tickLine={false} axisLine={false} />
                  <YAxisComponent 
                    orientation="right" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 8, fill: '#737373'}} 
                    domain={['auto', 'auto']}
                    tickFormatter={(val: number) => `$${formatCurrency(val)}`}
                  />
                  <TooltipComponent content={<CustomTooltip />} />
                  <AreaComponent type="monotone" dataKey="price" stroke={trendColor} strokeWidth={2} fill="url(#colorPrice)" />
                </AreaChartComponent>
              </ResponsiveContainerComponent>
            ) : (
              <div className="h-full flex items-center justify-center text-[10px] text-neutral-400 font-bold uppercase border border-dashed rounded-xl">Sin datos suficientes</div>
            )}
          </div>
          
          <div className="mt-6 border dark:border-neutral-800 rounded-lg overflow-hidden">
             {STORES.map((s) => {
                const price = (product as any)[s.key];
                if (!price || price <= 0) return null;
                return (
                  <div key={s.name} className="flex justify-between p-3 border-b dark:border-neutral-900 last:border-0">
                    <span className="text-sm font-bold dark:text-white">{s.name}</span>
                    <span className={`font-mono font-black ${price === minPrice ? 'text-green-500' : 'dark:text-white'}`}>
                      ${formatCurrency(price)}
                    </span>
                  </div>
                );
             })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;