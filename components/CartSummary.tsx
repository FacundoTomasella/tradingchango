import React, { useMemo, useState } from 'react';
import { CartItem, Benefit, UserMembership } from '../types';
import { calculateStoreTotal } from '../utils/calculateStoreTotal';

interface CartSummaryProps {
  items: CartItem[];
  benefits: Benefit[];
  userMemberships?: UserMembership[];
  onSaveCart?: (name: string) => void;
  canSave: boolean;
  savedCarts: any[];
  onLoadCart: (index: number) => void;
  onDeleteCart: (index: number) => void;
}

const CartSummary: React.FC<CartSummaryProps> = ({ items, benefits, userMemberships = [], onSaveCart, canSave, savedCarts, onLoadCart, onDeleteCart }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newCartName, setNewCartName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const format = (n: number) => new Intl.NumberFormat('es-AR').format(n);

  const STORES = [
    { name: "COTO", key: "coto" },
    { name: "CARREFOUR", key: "carrefour" },
    { name: "DIA", key: "dia" },
    { name: "JUMBO", key: "jumbo" },
    { name: "MASONLINE", key: "masonline" }
  ];

  const results = useMemo(() => {
  const storeResults = STORES.map((store) => {
    // 1. Calculamos el total REAL (considerando promos)
    const total = calculateStoreTotal(items, store.key);
    
    // 2. Calculamos el total REGULAR (sin ninguna promo)
    const regularTotal = items.reduce((sum, item) => {
      const pRegular = item[`pr_${store.key}` as keyof CartItem] as number;
      const pPromo = item[`p_${store.key}` as keyof CartItem] as number;
      // Si no existe pr_, usamos p_ (precio base)
      const priceToUse = pRegular || pPromo || 0;
      return sum + (priceToUse * item.quantity);
    }, 0);

    // 3. Verificamos si la tienda es válida para comparar
    const hasAllItems = items.every(item => {
      const price = item[`p_${store.key}` as keyof CartItem] as number;
      const regularPrice = item[`pr_${store.key}` as keyof CartItem] as number;
      const url = item[`url_${store.key}` as keyof CartItem] as string;
      const stock = item[`stock_${store.key}` as keyof CartItem] as boolean;
      
      // IMPORTANTE: Un item es válido si tiene algún precio (p o pr) 
      // y tiene stock y URL válida.
      return (price > 0 || regularPrice > 0) && url && url.length > 5 && stock !== false;
    });
    
    return { 
      name: store.name,
      total, // Este es el que define quién gana
      regularTotal,
      savings: regularTotal - total,
      storeBenefits: benefits.filter(b => b.supermercado.toUpperCase() === store.name.toUpperCase()),
      hasAllItems
    };
  });

  return storeResults
    .filter(r => r.hasAllItems && items.length > 0)
    .sort((a, b) => a.total - b.total); // El que tenga el total real más bajo, queda primero.
}, [items, benefits]);

  if (items.length === 0) return null;

  if (results.length === 0) {
    return (
      <div className="p-4">
        <div className="bg-white dark:bg-neutral-950 border-2 border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-xl text-center">
          <div className="w-8 h-8 bg-neutral-100 dark:bg-neutral-900 rounded-full flex items-center justify-center mx-auto mb-2 text-neutral-500">
            <i className="fa-solid fa-circle-exclamation text-base"></i>
          </div>
          <h3 className="text-[10px] font-black text-black dark:text-white uppercase tracking-widest mb-1">Lista Incompleta</h3>
          <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium leading-tight">Ningún super tiene stock de todo.</p>
        </div>
      </div>
    );
  }

  const best = results[0];
  const others = results.slice(1);
  const worstOption = results.length > 1 ? results[results.length - 1] : best;
  const potentialSavings = worstOption.total - best.total;

  const paymentAdvice = useMemo(() => {
    if (!best.storeBenefits.length) return null;
    const checkOwned = (entidad: string) => userMemberships.some(um =>
      um.slug.toLowerCase() === entidad.toLowerCase() ||
      um.tipo.toLowerCase() === entidad.toLowerCase() ||
      um.slug.toLowerCase().includes(entidad.toLowerCase())
    );
    const owned = best.storeBenefits.filter(b => checkOwned(b.entidad_nombre)).sort((a,b) => b.descuento - a.descuento)[0];
    const recommend = best.storeBenefits.filter(b => !checkOwned(b.entidad_nombre) && b.link_referido).sort((a,b) => b.descuento - a.descuento)[0];
    return { owned, recommend };
  }, [best, userMemberships]);

  return (
    <div className="p-4 space-y-2 animate-in fade-in duration-700">
      {/* Tarjeta Principal: Mejor Opción */}
      <div className="bg-white dark:bg-primary border-[3px] border-black dark:border-[#e9edef] rounded-2xl p-4 shadow-xl relative">
        <div className="flex flex-col gap-3 relative z-10">
          
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="text-black dark:text-neutral-200 text-sm font-black uppercase tracking-[0.15em]">Tu Mejor opción</span>
            
            <div className="flex items-baseline justify-center gap-6 w-full">
              <h2 className="text-xl font-black text-black dark:text-[#e9edef] uppercase tracking-tighter leading-none flex items-center gap-2">
                <i className="fa-solid fa-trophy text-star-gold text-lg animate-bounce"></i>
                {best.name}
              </h2>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-black uppercase text-green-600 dark:text-green-400">Ahorrás:</span>
                <div className="text-lg font-black text-green-600 dark:text-green-400 tracking-tighter font-mono">${format(Math.round(potentialSavings))}</div>
              </div>
            </div>

            <div className="border-t border-neutral-100 dark:border-[#233138] pt-2 w-full mt-2">
              <span className="text-[10px] font-black uppercase text-neutral-500 dark:text-[#8696a0] tracking-[0.15em] block mb-1">Total Estimado:*</span>
              <div className="text-4xl font-black text-black dark:text-[#e9edef] tracking-tighter font-mono leading-none">
                ${format(Math.round(best.total))}
              </div>
            </div>
          </div>

          {/* Desglose con fondo tipo burbuja de chat */}
          <div className="bg-neutral-50 dark:bg-[#1f2c34] rounded-xl p-3 space-y-1.5 border dark:border-[#233138]">
            <div className="flex justify-between items-center text-[12px] font-bold uppercase tracking-tight">
              <span className="text-black dark:text-[#e9edef]">Subtotal:</span>
              <span className="text-[12px] text-black dark:text-[#e9edef] font-mono">${format(Math.round(best.regularTotal))}</span>
            </div>
            <div className="flex justify-between items-center text-[12px] font-bold uppercase tracking-tight">
              <span className="text-black dark:text-[#e9edef]">Descuentos:</span>
              <span className="text-[12px] text-green-500 font-mono">-$ {format(Math.round(best.savings))}</span>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <div className="flex gap-2">
              {paymentAdvice?.owned && (
                <div className="flex-1 flex items-center gap-2 text-left bg-green-500/5 dark:bg-green-500/10 p-2.5 rounded-lg border border-green-500/10 dark:border-green-500/20">
                  <i className="fa-solid fa-circle-check text-green-500 text-xs"></i>
                  <p className="text-[10px] font-black uppercase text-black dark:text-[#e9edef] leading-tight">
                    Con {paymentAdvice.owned.entidad_nombre} ahorrás hasta <span className="text-green-500">{paymentAdvice.owned.descuento}%</span>*
                  </p>
                </div>
              )}
              
              {paymentAdvice?.recommend && (
                <a 
                  href={paymentAdvice.recommend.link_referido} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex-1 flex items-center gap-3 text-left p-2.5 rounded-lg border-2 border-dashed border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 transition-all group"
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
                    <i className="fa-solid fa-coins text-sm"></i>
                  </div>
                  <div>
                     <p className="text-base font-black uppercase text-indigo-600 dark:text-indigo-400 leading-tight">¡Súper Ahorro!</p>
                     <p className="text-[10px] font-bold text-neutral-600 dark:text-neutral-300 uppercase leading-none">Sacá la {paymentAdvice.recommend.entidad_nombre} y ahorrá {paymentAdvice.recommend.descuento}%*</p>
                  </div>
                </a>
              )}
            </div>
            <p className="text-[9px] text-black dark:text-[#8696a0] text-center pt-2">
              *Valores estimados. La aplicación de beneficios y el precio final en caja dependen exclusivamente de las condiciones vigentes de cada comercio y entidad emisora.
            </p>
          </div>

        </div>
      </div>

      {/* Otros Mercados */}
      {others.length > 0 && (
        <div className="px-1">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between text-xs text-black dark:text-[#e9edef] uppercase tracking-tight py-1.5"
          >
            <span>Otros mercados ({others.length})</span>
            <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'} transition-transform text-xs`}></i>
          </button>
          
          {isExpanded && (
            <div className="mt-1 space-y-1 animate-in slide-in-from-top-1 duration-300">
              {others.map((store) => (
                <div key={store.name} className="flex justify-between items-center py-2 px-4 bg-neutral-50/50 dark:bg-[#1f2c34] rounded-lg border border-neutral-100 dark:border-[#233138]">
                  <span className="text-[10px] font-black text-neutral-600 dark:text-[#8696a0] uppercase">{store.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-red-500 font-mono">+${format(Math.round(store.total - best.total))}</span>
                    <span className="font-mono text-[12px] font-black text-black dark:text-[#e9edef]">${format(Math.round(store.total))}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mis Listas / Guardado */}
      <div className="px-1 mt-4">
        <div className="flex items-center gap-3 mb-3">
          <h4 className="text-xs text-black dark:text-[#e9edef] uppercase tracking-tight font-black">
            Mis Listas
          </h4>
          {canSave && !showSaveInput && (
            <button
              onClick={() => setShowSaveInput(true)}
              className="w-5 h-5 bg-green-600 dark:bg-[#4ade80] text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all"
            >
              <i className="fa-solid fa-plus text-[10px]"></i>
            </button>
          )}
        </div>

        {showSaveInput && onSaveCart && (
          <div className="mt-2 flex flex-col gap-2 animate-in slide-in-from-top-2 duration-300">
            <div className="flex gap-2">
              <input
                type="text"
                autoFocus
                placeholder="NOMBRE DE TU LISTA..."
                value={newCartName}
                onChange={(e) => setNewCartName(e.target.value.toUpperCase())}
                className="flex-1 bg-neutral-50 dark:bg-[#1f2c34] border border-neutral-200 dark:border-[#233138] p-2.5 rounded-lg text-[10px] font-bold outline-none text-black dark:text-[#e9edef] focus:ring-1 ring-green-500"
              />
              <button
                disabled={!newCartName.trim()}
                onClick={() => {
                  onSaveCart(newCartName.trim());
                  setNewCartName('');
                  setShowSaveInput(false);
                }}
                className="px-4 bg-green-600 dark:bg-[#00a884] text-white rounded-lg text-[10px] font-black uppercase disabled:opacity-30 transition-opacity"
              >
                Guardar
              </button>
            </div>
            <button 
              onClick={() => setShowSaveInput(false)}
              className="text-[9px] text-neutral-500 dark:text-[#8696a0] uppercase font-bold text-left pl-1"
            >
              Cancelar
            </button>
          </div>
        )}

        <div className="mt-2 flex flex-wrap gap-2">
          {savedCarts.map((cart, index) => (
            <div 
              key={index} 
              className="flex items-center gap-2 p-1 pl-3 bg-neutral-100 dark:bg-[#1f2c34] border border-neutral-200 dark:border-[#233138] rounded-full"
            >
              <button 
                onClick={() => onLoadCart(index)} 
                className="text-[11px] font-bold text-black dark:text-[#e9edef] uppercase"
              >
                {cart.name}
              </button>
              <button
                onClick={() => onDeleteCart(cart.id || index)}
                className="w-6 h-6 flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
              >
                <i className="fa-solid fa-xmark text-[10px]"></i>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CartSummary;
