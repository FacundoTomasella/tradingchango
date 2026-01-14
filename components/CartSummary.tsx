
import React, { useMemo, useState } from 'react';
import { Product, Benefit, UserMembership } from '../types';

interface CartSummaryProps {
  items: any[];
  favorites: Record<number, number>;
  benefits: Benefit[];
  userMemberships?: UserMembership[];
}

const CartSummary: React.FC<CartSummaryProps> = ({ items, favorites, benefits, userMemberships = [] }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const format = (n: number) => new Intl.NumberFormat('es-AR').format(n);

  const STORES = [
    { name: "COTO", index: 0 },
    { name: "CARREFOUR", index: 1 },
    { name: "DIA", index: 2 },
    { name: "JUMBO", index: 3 },
    { name: "MASONLINE", index: 4 }
  ];

  const results = useMemo(() => {
    return STORES.map((store) => {
      let subtotal = 0;
      let totalGondolaDiscount = 0;
      let hasAllItems = true;

      items.forEach(item => {
        const price = item.prices[store.index];
        const qty = favorites[item.id] || 1;
        
        if (price <= 0) {
          hasAllItems = false;
          return;
        }

        const itemSubtotal = price * qty;
        subtotal += itemSubtotal;

        const ofRaw = item.oferta_gondola;
        if (ofRaw) {
          try {
            const ofObj = typeof ofRaw === 'string' ? JSON.parse(ofRaw) : ofRaw;
            const storeKey = store.name.toLowerCase().replace(' ', '');
            const promo = ofObj[storeKey] || ofObj[store.name.toLowerCase()];
            
            if (promo && promo.etiqueta) {
              const label = promo.etiqueta.toUpperCase();
              if (label.includes('2X1')) {
                totalGondolaDiscount += Math.floor(qty / 2) * price;
              } else if (label.includes('70%') && label.includes('2DA')) {
                totalGondolaDiscount += Math.floor(qty / 2) * (price * 0.7);
              } else if (label.includes('80%') && label.includes('2DA')) {
                totalGondolaDiscount += Math.floor(qty / 2) * (price * 0.8);
              } else if (label.includes('50%') && label.includes('2DA')) {
                totalGondolaDiscount += Math.floor(qty / 2) * (price * 0.5);
              }
            }
          } catch (e) {}
        }
      });

      const storeBenefits = benefits.filter(b => b.supermercado.toUpperCase() === store.name.toUpperCase());
      return { 
        name: store.name, 
        subtotal, 
        gondolaDiscount: totalGondolaDiscount,
        totalChango: subtotal - totalGondolaDiscount,
        storeBenefits,
        hasAllItems
      };
    })
    .filter(r => r.hasAllItems && items.length > 0)
    .sort((a, b) => a.totalChango - b.totalChango);
  }, [items, favorites, benefits]);

  if (items.length === 0) return null;

  if (results.length === 0) {
    return (
      <div className="p-4 animate-in fade-in duration-700">
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-xl text-center">
          <div className="w-12 h-12 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
            <i className="fa-solid fa-circle-exclamation text-xl"></i>
          </div>
          <h3 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1">Chango Incompleto</h3>
          <p className="text-[10px] text-slate-400 font-medium">Ningún supermercado tiene stock de todos los productos de tu lista.</p>
        </div>
      </div>
    );
  }

  const best = results[0];
  const others = results.slice(1);
  
  const worstOption = results.length > 1 ? results[results.length - 1] : best;
  const potentialSavings = worstOption.totalChango - best.totalChango;

  const paymentAdvice = useMemo(() => {
    if (!best.storeBenefits.length) return null;
    
    const checkOwned = (entidad: string) => userMemberships.some(um => 
      um.slug.toLowerCase() === entidad.toLowerCase() || 
      um.tipo.toLowerCase() === entidad.toLowerCase() ||
      um.slug.toLowerCase().includes(entidad.toLowerCase())
    );

    const owned = best.storeBenefits
      .filter(b => checkOwned(b.entidad_nombre))
      .sort((a,b) => b.descuento - a.descuento)[0];

    const recommend = best.storeBenefits
      .filter(b => !checkOwned(b.entidad_nombre) && b.link_referido)
      .sort((a,b) => b.descuento - a.descuento)[0];

    return { owned, recommend };
  }, [best, userMemberships]);

  return (
    <div className="p-4 space-y-3 animate-in fade-in duration-700">
      <div className="bg-white dark:bg-slate-950 border border-green-500/30 rounded-[1.5rem] p-6 shadow-lg shadow-green-500/5 relative overflow-hidden">
        <div className="absolute -top-4 -right-4 text-green-500/10 text-6xl rotate-12 pointer-events-none">
          <i className="fa-solid fa-trophy"></i>
        </div>

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <i className="fa-solid fa-trophy text-green-500 text-[10px]"></i>
                <span className="text-[10px] font-black uppercase text-green-500 tracking-[0.2em]">Mejor Opción</span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">{best.name}</h2>
            </div>
            
            <div className="text-right">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.1em] block mb-1">Pagas en total*</span>
              <div className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter font-mono">${format(Math.round(best.totalChango))}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="bg-green-500/10 dark:bg-green-500/20 px-3 py-1.5 rounded-full border border-green-500/20 flex items-center gap-2">
              <span className="text-[9px] font-black uppercase text-green-600 dark:text-green-400">Ahorrás</span>
              <span className="text-sm font-black text-green-600 dark:text-green-400 font-mono">${format(Math.round(potentialSavings))}</span>
            </div>
            
            <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-tight ml-auto">
              <div>Subtotal: <span className="font-mono text-slate-600 dark:text-slate-300 font-bold">${format(Math.round(best.subtotal))}</span></div>
              <div>Descuentos: <span className="font-mono text-green-500 font-bold">-${format(Math.round(best.gondolaDiscount))}</span></div>
            </div>
          </div>

          {(paymentAdvice?.owned || paymentAdvice?.recommend) && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-4 border-t border-slate-100 dark:border-slate-800">
              {paymentAdvice.owned && (
                <div className="flex-shrink-0 flex items-center gap-2 bg-slate-900 dark:bg-white px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800">
                  <i className="fa-solid fa-id-card text-[10px] text-white dark:text-black"></i>
                  <span className="text-[9px] font-bold text-white dark:text-black uppercase tracking-tight">Pagá con {paymentAdvice.owned.entidad_nombre}</span>
                </div>
              )}
              {paymentAdvice.recommend && (
                <a href={paymentAdvice.recommend.link_referido} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-full border border-slate-900 dark:border-white">
                  <i className="fa-solid fa-link text-[10px] text-slate-900 dark:text-white"></i>
                  <span className="text-[9px] font-bold text-slate-900 dark:text-white uppercase tracking-tight">Vincular {paymentAdvice.recommend.entidad_nombre}</span>
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {others.length > 0 && (
        <div className="px-2">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] py-3 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <span>Ver otros mercados ({others.length})</span>
            <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'} transition-transform text-[8px]`}></i>
          </button>
          
          {isExpanded && (
            <div className="mt-2 space-y-1 animate-in slide-in-from-top-2 duration-300">
              {others.map((store) => (
                <div key={store.name} className="flex justify-between items-center py-3 px-5 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-tight">{store.name}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-bold text-red-500 font-mono">+${format(Math.round(store.totalChango - best.totalChango))}</span>
                    <span className="font-mono text-[13px] font-black text-slate-900 dark:text-white">${format(Math.round(store.totalChango))}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="text-[9px] text-center text-slate-400 font-bold tracking-tight py-2 px-4 leading-relaxed uppercase">
        *Es un valor informativo. El ahorro real depende de los T&C de cada entidad, la disponibilidad en góndola y la forma de pago elegida al finalizar la compra.
      </p>
    </div>
  );
};

export default CartSummary;
