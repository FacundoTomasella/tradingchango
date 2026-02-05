export interface Product {
  id: number;
  nombre: string;
  marca: string;
  categoria: string;
  subcategoria: string;
  subsubcategoria: string;
  fecha_actualizacion: string;
  url_jumbo: string;
  p_jumbo: number;
  pr_jumbo: number;
  stock_jumbo: boolean;
  url_carrefour: string;
  p_carrefour: number;
  pr_carrefour: number;
  stock_carrefour: boolean;
  url_coto: string;
  p_coto: number;
  pr_coto: number;
  stock_coto: boolean;
  url_dia: string;
  p_dia: number;
  pr_dia: number;
  stock_dia: boolean;
  url_disco: string;
  p_disco: number;
  pr_disco: number;
  stock_disco: boolean;
  url_vea: string;
  p_vea: number;
  pr_vea: number;
  stock_vea: boolean;
  url_laanonima: string;
  p_laanonima: number;
  pr_laanonima: number;
  stock_laanonima: boolean;
  oferta_gondola: {
    [key: string]: string;
  };
  ean: string[];
  imagen_url?: string;
  outliers?: string | object;
  ticker?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Benefit {
  id: number;
  nombre: string;
  supermercado: string;
  descripcion: string;
  tipo_descuento: string;
  valor_descuento: number;
  condiciones: string;
  dias_semana: string[];
  url_beneficio: string;
  banco: string;
  tarjeta: string;
  categoria_tarjeta: string;
  tipo_pago: string;
  activo: boolean;
  entidad_nombre: string;
  link_referido?: string;
  descuento: number;
}

export interface UserMembership {
  banco: string;
  tarjeta: string;
  categoria_tarjeta: string;
  slug: string;
  tipo: string;
}

export interface Membership {
  slug: string;
  nombre: string;
  logo_url: string;
  categoria?: string;
  opciones?: string[];
}

export type TabType = 'home' | 'chango' | 'carnes' | 'verdu' | 'varios';

export interface ProductStats {
  min: number;
  spread: string;
  trendClass: string;
  icon: string;
  isUp: boolean;
  isDown: boolean;
  variation: number; // <-- Añadido
}

export interface PriceHistory {
  nombre_producto: string;
  precio_minimo: number;
  fecha: string;
  supermercado: string;
}

export interface Profile {
  id: string;
  subscription: 'free' | 'pro';
  subscription_end: string | null;
  membresias: UserMembership[];
  nombre?: string;
  email?: string;
}