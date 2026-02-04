import React, { memo } from 'react';
import { Product } from '../types';

// Copiamos las interfaces y constantes necesarias desde ProductList
interface ProductWithStats extends Product {
  stats: {
    min: number;
    spread: string;
    trendClass: string;
    icon: string;
    isUp: boolean;
    isDown: boolean;
  };
}

const STORES = [
  { name: "COTO", key: 'p_coto' },
  { name: "CARREFOUR", key: 'p_carrefour' },
  { name: "DIA", key: 'p_dia' },
  { name: "JUMBO", key: 'p_jumbo' },
  { name: "MAS ONLINE", key: 'p_masonline' }
] as const;

interface ProductListItemProps {
  product: ProductWithStats;
  isFavorite: boolean;
  isPurchased: boolean;
  quantity: number;
  isCartView?: boolean;
  onProductClick: (product: Product) => void;
  onFavoriteToggle: (id: number) => void;
  onTogglePurchased?: (id: number) => void;
  onUpdateQuantity?: (id: number, delta: number) => void;
}

const getPromoBadges = (oferta: any) => {
  if (!oferta) return null;
  let ofertas: string[] = [];
  try {
    const obj = typeof oferta === 'string' ? JSON.parse(oferta) : oferta;
    Object.values(obj).forEach((v: any) => {
      const label = v.etiqueta || (typeof v === 'string' ? v : null);
      if (label && !ofertas.includes(label)) ofertas.push(label);
    });
  } catch (e) {
    if (typeof oferta === 'string') ofertas = [oferta];
  }
  return ofertas.length > 0 ? ofertas : null;
};

const format = (n: number) => new Intl.NumberFormat('es-AR').format(n);

const ProductListItem: React.FC<ProductListItemProps> = ({
  product: p,
  isFavorite,
  isPurchased,
  quantity,
  isCartView,
  onProductClick,
  onFavoriteToggle,
  onTogglePurchased,
  onUpdateQuantity,
}) => {

  // La lógica de cálculo de displayMinPrice y badges se mueve aquí
  const { displayMinPrice, badges } = (() => {
    try {
      const outlierData = typeof p.outliers === 'string' 
        ? JSON.parse(p.outliers) 
        : (p.outliers || {});

      const validPrices = STORES.map(s => {
        const storeKey = s.name.toLowerCase().replace(' ', '');
        const isOutlier = outlierData[storeKey] === true;
        const price = (p as any)[s.key];
        const hasStock = (p as any)[`stock_${storeKey}`] !== false;
        return { price, isOutlier, hasStock, storeKey };
      }).filter(item => item.price > 0 && item.hasStock && !item.isOutlier);

      const minPrice = validPrices.length > 0 
        ? Math.min(...validPrices.map(v => v.price)) 
        : p.stats.min;

      const ofertaGondola = typeof p.oferta_gondola === 'string'
        ? JSON.parse(p.oferta_gondola)
        : p.oferta_gondola;

      const filteredOferta = ofertaGondola ? Object.entries(ofertaGondola).reduce((acc, [storeKey, value]) => {
        if (!outlierData[storeKey]) {
          acc[storeKey] = value;
        }
        return acc;
      }, {} as any) : null;

      return {
        displayMinPrice: minPrice,
        badges: getPromoBadges(filteredOferta)
      };
    } catch (e) {
      return {
        displayMinPrice: p.stats.min,
        badges: getPromoBadges(p.oferta_gondola)
      };
    }
  })();

  return (
    <div 
      onClick={() => onProductClick(p)}
      className={`flex items-center justify-between px-3 py-2 bg-white dark:bg-primary hover:bg-neutral-50 dark:hover:bg-neutral-900/30 cursor-pointer transition-all ${isPurchased ? 'opacity-30 grayscale' : ''}`}
    >
      <div className="flex items-center gap-3 shrink-0">
         {isCartView && (
           <button 
            onClick={(e) => { e.stopPropagation(); onTogglePurchased?.(p.id); }}
            className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isPurchased ? 'bg-green-500 border-green-500 text-white' : 'border-neutral-300 dark:border-neutral-700'}`}
           >
             {isPurchased && <i className="fa-solid fa-check text-[10px]"></i>}
           </button>
         )}
         <div className="w-16 h-16 rounded-lg bg-white border border-neutral-100 flex items-center justify-center overflow-hidden shrink-0">
            <img 
              src={p.imagen_url || 'https://via.placeholder.com/50?text=N/A'} 
              alt={p.nombre} 
              className="w-full h-full object-contain p-1"
              width="64"
              height="64"
              loading="lazy"
              decoding="async"
              fetchPriority="low"
            />
         </div>
      </div>

      <div className="flex-1 flex items-center justify-between pr-2 min-w-0 ml-3">
        <div className="flex flex-col gap-0 min-w-0">
          <div className="flex items-center flex-wrap gap-1">
            <span className={`font-[800] text-black dark:text-white text-[14px] tracking-tight uppercase font-mono leading-none ${isPurchased ? 'line-through' : ''}`}>
              {p.ticker || p.nombre.substring(0, 5).toUpperCase()}
            </span>
            {badges && !isPurchased && badges.map((b, idx) => (
              <span key={idx} className="bg-green-600 text-white text-[8px] font-[900] px-1 py-0.5 rounded-[1px] uppercase leading-none font-sans">
                {b}
              </span>
            ))}
          </div>
          <span className={`text-[14px] font-medium text-neutral-700 dark:text-neutral-400 line-clamp-1 font-sans mt-0.5 ${isPurchased ? 'line-through' : ''}`}>
            {p.nombre}
          </span>
        </div>

        <div className="text-right flex flex-col items-end min-w-[80px]">
          <span className="font-mono font-[800] text-black dark:text-white text-[15px] leading-none">
            ${format(displayMinPrice)}
          </span>
          <span className={`font-mono text-[12px] font-bold mt-0.5 ${p.stats.trendClass} leading-none`}>
            {p.stats.icon} {p.stats.spread}%
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isCartView && onUpdateQuantity && !isPurchased && (
          <div 
            className="flex items-center bg-neutral-100 dark:bg-neutral-900 px-1 rounded-md border border-neutral-200 dark:border-neutral-800"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => onUpdateQuantity(p.id, -1)} className="px-1.5 font-black text-[12px]">-</button>
            <span className="font-mono text-[11px] font-black min-w-[14px] text-center">{quantity}</span>
            <button onClick={() => onUpdateQuantity(p.id, 1)} className="px-1.5 font-black text-[12px]">+</button>
          </div>
        )}
        
        {!isCartView && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onFavoriteToggle(p.id);
            }}
            className={`transition-all p-1.5 active:scale-90 ${isFavorite ? 'text-star-gold' : 'text-neutral-300 dark:text-neutral-800'}`}
          >
            <i className="fa-solid fa-cart-shopping text-[20px]"></i>
          </button>
        )}
      </div>
    </div>
  );
};

export default memo(ProductListItem);