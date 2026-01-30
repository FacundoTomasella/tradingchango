import { CartItem } from '../types';

const getThreshold = (oferta: string): number => {
  if (!oferta) return 1;
  const lowerOferta = oferta.toLowerCase();
  
  // Extrae el número de "3x2", "4x3", "2x1", etc.
  const multiBuyMatch = lowerOferta.match(/^(\d+)x/);
  if (multiBuyMatch) return parseInt(multiBuyMatch[1], 10);

  // Para "2do al 80%", el threshold es 2
  if (lowerOferta.includes('2do al')) return 2;
  
  return 1;
};

export const calculateStoreTotal = (cartItems: CartItem[], storeKey: string): number => {
  return cartItems.reduce((total, item) => {
    const price = item[`p_${storeKey}` as keyof CartItem] as number; // Precio promo unitario
    const regularPrice = item[`pr_${storeKey}` as keyof CartItem] as number; // Precio regular
    const oferta = item.oferta_gondola[storeKey as keyof typeof item.oferta_gondola] || "";
    
    if (price === null || price === undefined) return total;

    const threshold = getThreshold(oferta);
    const quantity = item.quantity;

    // Si hay promo (threshold > 1) y el usuario lleva suficientes para activarla
    if (threshold > 1 && quantity >= threshold) {
      // Calculamos cuántas unidades completan "combos" de la promo
      const unitsInPromo = Math.floor(quantity / threshold) * threshold;
      // Las unidades que sobran y no llegan a completar otro combo
      const remainingUnits = quantity % threshold;

      // Unidades en promo van a p_ (precio ya descontado)
      // Unidades sueltas van a pr_ (precio regular)
      const subtotal = (unitsInPromo * price) + (remainingUnits * regularPrice);
      return total + subtotal;
    } else {
      // Si no llega al mínimo (ej: lleva 1 y la promo es 2x1) 
      // o no hay promo, todo se cobra al precio regular.
      return total + (quantity * regularPrice);
    }
  }, 0);
};
