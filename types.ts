
export interface Product {
  id: number;
  nombre: string;
  categoria: string;
  ticker?: string;
  p_coto: number;
  p_carrefour: number;
  p_dia: number;
  p_jumbo: number;
  p_masonline: number;
  url_coto?: string;
  url_carrefour?: string;
  url_dia?: string;
  url_jumbo?: string;
  url_masonline?: string;
  imagen_url?: string;
  oferta_gondola?: any;
}

export interface PriceHistory {
  id: number;
  fecha: string;
  nombre_producto: string;
  precio_minimo: number;
  supermercado: string;
}

export interface Membership {
  slug: string;
  nombre: string;
  categoria: string;
  logo_url: string;
  opciones: string[];
}

export interface UserMembership {
  slug: string;
  tipo: string;
}

export interface Profile {
  id: string;
  email: string;
  nombre?: string;
  apellido?: string;
  fecha_nacimiento?: string;
  subscription: 'free' | 'pro' | 'premium';
  created_at: string;
  membresias: UserMembership[];
  subscription_end?: string | null;
  last_cart?: any;
}

export interface Benefit {
  id: number;
  dia_semana: number;
  supermercado: string;
  entidad_nombre: string;
  descuento: number;
  link_referido?: string;
}

export type TabType = 'home' | 'carnes' | 'verdu' | 'varios' | 'chango' | 'about' | 'terms' | 'contact';

export interface ProductStats {
  min: number;
  spread: string;
  trendClass: string;
  icon: string;
  isUp: boolean;
  isDown: boolean;
}
