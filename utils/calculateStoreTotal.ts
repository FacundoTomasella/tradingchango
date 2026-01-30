import { CartItem } from '../types';

const getThreshold = (oferta: string): number => {
  if (!oferta) return 1;
  const lowerOferta = oferta.toLowerCase();
  
  // Extraer el primer número de formatos como "2x1", "3x2", "4x3"
  const multiBuyMatch = lowerOferta.match(/^(\d+)x/);
  if (multiBuyMatch) return parseInt(multiBuyMatch[1], 10);

  // Formato "2do al 80%", "2do al 70%", etc.
  if (lowerOferta.includes('2do al')) return 2;
  
  return 1;
};

export const calculateStoreTotal = (cartItems: CartItem[], storeKey: string): number => {
  return cartItems.reduce((total, item) => {
    // p_ es el precio con descuento ya aplicado
    const price = item[`p_${storeKey}` as keyof CartItem] as number;
    // pr_ es el precio regular
    const regularPrice = item[`pr_${storeKey}` as keyof CartItem] as number;
    const oferta = item.oferta_gondola[storeKey as keyof typeof item.oferta_gondola] || "";
    
    if (price === null || price === undefined) return total;

    const threshold = getThreshold(oferta);
    const quantity = item.quantity;

    // Si no alcanza el mínimo para la promo (ej: lleva 1 y la promo es 2x1)
    if (quantity < threshold) {
      return total + (quantity * regularPrice);
    }

    // Si alcanza la promo:
    // 1. Calculamos cuántas unidades entran en grupos de promoción
    const unitsInPromo = Math.floor(quantity / threshold) * threshold;
    // 2. Calculamos el sobrante que se cobra a precio regular (ej: lleva 3 en un 2x1)
    const remainingUnits = quantity % threshold;

    const subtotal = (unitsInPromo * price) + (remainingUnits * regularPrice);
    
    return total + subtotal;
  }, 0);
};
