import React from 'react';
import { Product } from '../types';
import ProductListItem from './ProductListItem';

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
  onProductClick: (product: Product) => void;
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

  if (products.length === 0 && searchTerm) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
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
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-14 h-14 bg-neutral-100 dark:bg-neutral-900 rounded-2xl flex items-center justify-center text-neutral-500 mb-4 text-2xl">
          <i className="fa-solid fa-cart-shopping"></i>
        </div>
        <h3 className="text-base font-black text-neutral-900 dark:text-neutral-100 uppercase tracking-tighter">Tu chango está vacío</h3>
        <p className="text-[12px] text-neutral-500 dark:text-neutral-500 font-medium max-w-[200px]">Agregá productos para empezar a ahorrar.</p>
      </div>
    );
  }

  return (
    <div className="divide-neutral-100 dark:divide-neutral-900">
      {products.map((p) => (
        <ProductListItem
          key={p.id}
          product={p}
          isFavorite={isFavorite(p.id)}
          isPurchased={purchasedItems?.has(p.id) || false}
          quantity={quantities ? (quantities[p.id] || 1) : 1}
          isCartView={isCartView}
          onProductClick={onProductClick}
          onFavoriteToggle={onFavoriteToggle}
          onTogglePurchased={onTogglePurchased}
          onUpdateQuantity={onUpdateQuantity}
        />
      ))}
    </div>
  );
};

export default React.memo(ProductList);