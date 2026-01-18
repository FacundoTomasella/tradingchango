
import React from 'react';
import { Product } from '../types';

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

interface ProductListProps {
  products: ProductWithStats[];
  onProductClick: (id: number) => void;
  onFavoriteToggle: (id: number) => void;
  isFavorite: (id: number) => boolean;
  isCartView?: boolean;
  quantities?: Record<number, number>;
  onUpdateQuantity?: (id: number, delta: number) => void;
  searchTerm?: string;
  purchasedItems?: Set<number>;
  onTogglePurchased?: (id: number) => void;
}

const ProductList: React.FC<ProductListProps> = ({ 
  products, 
  onProductClick, 
  onFavoriteToggle, 
  isFavorite,
  isCartView,
  quantities,
  onUpdateQuantity,
  searchTerm,
  purchasedItems,
  onTogglePurchased
}) => {
  const format = (n: number) => new Intl.NumberFormat('es-AR').format(n);

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

  if (products.length === 0 && searchTerm) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-900 rounded-xl flex items-center justify-center text-neutral-500 mb-4 text-lg">
          <i className="fa-solid fa-magnifying-glass"></i>
        </div>
        <h3 className="text-sm font-black text-neutral-900 dark:text-neutral-100 uppercase tracking-tighter">Sin resultados</h3>
        <p className="text-[12px] text-neutral-500 dark:text-neutral-500 font-medium">Probá con otros términos.</p>
      </div>
    );
  }

  if (products.length === 0 && isCartView) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-in fade-in zoom-in duration-700">
        <div className="w-14 h-14 bg-neutral-100 dark:bg-neutral-900 rounded-2xl flex items-center justify-center text-neutral-500 mb-4 text-2xl">
          <i className="fa-solid fa-cart-shopping"></i>
        </div>
        <h3 className="text-base font-black text-neutral-900 dark:text-neutral-100 uppercase tracking-tighter">Tu chango está vacío</h3>
        <p className="text-[12px] text-neutral-500 dark:text-neutral-500 font-medium max-w-[200px]">Agregá productos para empezar a ahorrar.</p>
      </div>
    );
  }

  return (
    <div className="divide-neutral-100 dark:divide-neutral-900 border-neutral-100 dark:divide-neutral-900">
      {products.map((p) => {
        const fav = isFavorite(p.id);
        const purchased = purchasedItems?.has(p.id);
        const qty = quantities ? (quantities[p.id] || 1) : 1;
        const badges = getPromoBadges(p.oferta_gondola);

        return (
          <div 
            key={p.id} 
            onClick={() => onProductClick(p.id)}
            className={`flex items-center justify-between px-3 py-2 bg-white dark:bg-black hover:bg-neutral-50 dark:hover:bg-neutral-900/30 cursor-pointer transition-all ${purchased ? 'opacity-30 grayscale' : ''}`}
          >
            <div className="flex items-center gap-3 shrink-0">
               {isCartView && (
                 <button 
                  onClick={(e) => { e.stopPropagation(); onTogglePurchased?.(p.id); }}
                  className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${purchased ? 'bg-green-500 border-green-500 text-white' : 'border-neutral-300 dark:border-neutral-700'}`}
                 >
                   {purchased && <i className="fa-solid fa-check text-[10px]"></i>}
                 </button>
               )}
               <div className="w-16 h-16 rounded-lg bg-white border border-neutral-100 flex items-center justify-center overflow-hidden shrink-0">
                  <img src={p.imagen_url || 'https://via.placeholder.com/50?text=N/A'} alt={p.nombre} className="w-full h-full object-contain p-1" />
               </div>
            </div>

            <div className="flex-1 flex items-center justify-between pr-2 min-w-0 ml-3">
              <div className="flex flex-col gap-0 min-w-0">
                <div className="flex items-center flex-wrap gap-1">
                  <span className={`font-[800] text-black dark:text-white text-[14px] tracking-tight uppercase font-mono leading-none ${purchased ? 'line-through' : ''}`}>
                    {p.ticker || p.nombre.substring(0, 5).toUpperCase()}
                  </span>
                  {badges && !purchased && badges.map((b, idx) => (
                    <span key={idx} className="bg-green-600 text-white text-[8px] font-[900] px-1 py-0.5 rounded-[1px] uppercase leading-none font-sans">
                      {b}
                    </span>
                  ))}
                </div>
                <span className={`text-[14px] font-medium text-neutral-700 dark:text-neutral-400 line-clamp-1 font-sans mt-0.5 ${purchased ? 'line-through' : ''}`}>
                  {p.nombre}
                </span>
              </div>

              <div className="text-right flex flex-col items-end min-w-[80px]">
                <span className="font-mono font-[800] text-black dark:text-white text-[15px] leading-none">
                  ${format(p.stats.min)}
                </span>
                <span 
                  className={`font-mono text-[12px] font-bold mt-0.5 ${p.stats.trendClass} leading-none`}
                  style={{ transform: 'scale(1.05)' }}
                >
                  {p.stats.icon} {p.stats.spread}%
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isCartView && onUpdateQuantity && !purchased && (
                <div 
                  className="flex items-center bg-neutral-100 dark:bg-neutral-900 px-1 rounded-md border border-neutral-200 dark:border-neutral-800"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button onClick={() => onUpdateQuantity(p.id, -1)} className="text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white px-1.5 font-black text-[12px]">-</button>
                  <span className="font-mono text-[11px] font-black min-w-[14px] text-center text-black dark:text-white">{qty}</span>
                  <button onClick={() => onUpdateQuantity(p.id, 1)} className="text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white px-1.5 font-black text-[12px]">+</button>
                </div>
              )}
              
              {!isCartView && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onFavoriteToggle(p.id);
                  }}
                  className={`transition-all flex items-center justify-center active:scale-90 p-1.5 ${fav ? 'text-star-gold' : 'text-neutral-300 dark:text-neutral-800'}`}
                  style={{ transform: 'scale(0.95)' }}
                >
                  <i className="fa-solid fa-cart-shopping text-[20px]"></i>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ProductList;
