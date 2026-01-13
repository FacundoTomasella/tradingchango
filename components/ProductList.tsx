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
}

const ProductList: React.FC<ProductListProps> = ({ 
  products, 
  onProductClick, 
  onFavoriteToggle, 
  isFavorite,
  isCartView,
  quantities,
  onUpdateQuantity
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

  return (
    <div className="divide-y divide-border-light dark:divide-border-dark">
      {products.map((p) => {
        const fav = isFavorite(p.id);
        const qty = quantities ? (quantities[p.id] || 1) : 1;
        const badges = getPromoBadges(p.oferta_gondola);

        return (
          <div 
            key={p.id} 
            onClick={() => onProductClick(p.id)}
            className="flex items-center justify-between px-[20px] py-[16px] bg-[#ffffff] dark:bg-[#000000] hover:bg-bg-card-light dark:hover:bg-bg-card-dark cursor-pointer transition-colors"
          >
            <div className="flex-1 flex items-center justify-between pr-4">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center flex-wrap gap-1.5">
                  <span className="font-[700] text-primary dark:text-[#ffffff] text-[16px] tracking-tight uppercase font-mono">
                    {p.ticker || p.nombre.substring(0, 5).toUpperCase()}
                  </span>
                  {badges && badges.map((b, idx) => (
                    <span key={idx} className="bg-chart-green text-white text-[9px] font-[800] px-1.5 py-0.5 rounded-sm uppercase leading-none font-sans">
                      {b}
                    </span>
                  ))}
                </div>
                <span className="text-[13px] font-medium text-muted dark:text-muted-dark line-clamp-1 font-sans">
                  {p.nombre}
                </span>
              </div>

              <div className="text-right flex flex-col items-end min-w-[100px]">
                <span className="font-mono font-[700] text-primary dark:text-[#ffffff] text-[16px]">
                  ${format(p.stats.min)}
                </span>
                <span className={`font-mono text-[11px] font-[700] mt-0.5 ${p.stats.trendClass}`}>
                  {p.stats.icon} {p.stats.spread}%
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {isCartView && onUpdateQuantity && (
                <div 
                  className="flex items-center gap-3 bg-bg-card-light dark:bg-bg-card-dark px-2 py-1 rounded-lg border border-border-light dark:border-border-dark"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button onClick={() => onUpdateQuantity(p.id, -1)} className="text-muted dark:text-muted-dark hover:text-primary dark:hover:text-white px-1 font-bold">-</button>
                  <span className="font-mono text-sm font-bold min-w-[15px] text-center text-primary dark:text-[#ffffff]">{qty}</span>
                  <button onClick={() => onUpdateQuantity(p.id, 1)} className="text-muted dark:text-muted-dark hover:text-primary dark:hover:text-white px-1 font-bold">+</button>
                </div>
              )}
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onFavoriteToggle(p.id);
                }}
                className={`text-[22px] transition-transform active:scale-90 ${fav ? 'text-star-gold' : 'text-primary dark:text-[#ffffff]'}`}
              >
                <i className="fa-solid fa-cart-shopping"></i>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ProductList;