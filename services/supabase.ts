
import { createClient } from '@supabase/supabase-js';
import { Product, PriceHistory, Profile, Benefit, UserMembership } from '../types';

const getEnvVar = (name: string): string => {
  try {
    // @ts-ignore
    return import.meta.env[name] || '';
  } catch (e) {
    return '';
  }
};

const SUPABASE_URL = getEnvVar('VITE_SUPABASE_URL');
const SUPABASE_KEY = getEnvVar('VITE_SUPABASE_ANON_KEY');

const isValidUrl = (url: string) => {
  try {
    return url && (url.startsWith('http://') || url.startsWith('https://'));
  } catch {
    return false;
  }
};

export const supabase = createClient(
  isValidUrl(SUPABASE_URL) ? SUPABASE_URL : 'https://placeholder.supabase.co',
  SUPABASE_KEY || 'placeholder-key'
);

export const getProducts = async (): Promise<Product[]> => {
  const { data, error } = await supabase.from('productos').select('*');
  if (error) throw error;
  return data || [];
};

export const getPriceHistory = async (days: number = 7): Promise<PriceHistory[]> => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const { data, error } = await supabase
    .from('historial_precios')
    .select('*')
    .gte('fecha', date.toISOString().split('T')[0]);
  if (error) throw error;
  return data || [];
};

export const getProductHistory = async (productName: string, days: number = 30): Promise<PriceHistory[]> => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const { data, error } = await supabase
    .from('historial_precios')
    .select('*')
    .eq('nombre_producto', productName)
    .gte('fecha', date.toISOString().split('T')[0])
    .order('fecha', { ascending: true });
  if (error) throw error;
  return data || [];
};

export const getBenefits = async (dayOfWeek: number): Promise<Benefit[]> => {
  const { data, error } = await supabase
    .from('beneficios_super')
    .select('*')
    .eq('dia_semana', dayOfWeek);
  if (error) throw error;
  return data || [];
};

export const getProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data;
};

export const updateMemberships = async (userId: string, memberships: UserMembership[]) => {
  const { error } = await supabase
    .from('perfiles')
    .update({ membresias: memberships })
    .eq('id', userId);
  if (error) throw error;
};

// Guardamos un objeto que contiene el carrito activo y los changos guardados (máximo 2)
export const saveCartData = async (userId: string, data: { active: any, saved: any }) => {
  const { error } = await supabase
    .from('carritos_guardados')
    .upsert({ 
      user_id: userId, 
      items: data, // Aquí guardamos el objeto completo { active, saved } en la columna 'items'
      updated_at: new Date().toISOString() 
    }, { onConflict: 'user_id' });

  if (error) throw error;
};

export const getSavedCartData = async (userId: string): Promise<{ active: Record<number, number>, saved: any[] } | null> => {
  const { data, error } = await supabase
    .from('carritos_guardados')
    .select('items')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return null;
  
  // Si los datos no tienen la estructura nueva, los convertimos
  const items = data?.items;
  if (items && !items.active && !items.saved) {
    return { active: items, saved: [] };
  }
  
  return items || { active: {}, saved: [] };
};

// Guarda un carrito individual
export const saveCart = async (userId: string, name: string, items: Record<number, number>) => {
  const { data, error } = await supabase
    .from('carritos_guardados')
    .insert({ 
      user_id: userId, 
      name,
      items, 
    })
    .select()
    .single();
  if (error) throw error;
  return data;
};

// Obtiene todos los carritos guardados de un usuario
export const getSavedCarts = async (userId: string) => {
  const { data, error } = await supabase
    .from('carritos_guardados')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

// Obtiene un carrito compartido por su ID
export const getSharedCart = async (cartId: string) => {
  const { data, error } = await supabase
    .from('carritos_guardados')
    .select('items, name')
    .eq('id', cartId)
    .eq('is_public', true)
    .single();
  if (error) throw error;
  return data;
};

// Actualiza un carrito (para compartir, etc.)
export const updateCart = async (cartId: string, updates: Record<string, any>) => {
  const { data, error } = await supabase
    .from('carritos_guardados')
    .update(updates)
    .eq('id', cartId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// Elimina un carrito por su ID
export const deleteCart = async (cartId: string) => {
  const { error } = await supabase
    .from('carritos_guardados')
    .delete()
    .eq('id', cartId);
  if (error) throw error;
};


export const getCatalogoMembresias = async () => {
  const { data, error } = await supabase.from('catalogo_membresias').select('*');
  if (error) throw error;
  return data || [];
};

export const getConfig = async () => {
  const { data, error } = await supabase.from('configuracion').select('*');
  if (error) throw error;
  const config: Record<string, string> = {};
    data?.forEach((row: any) => { config[row.clave as keyof typeof config] = row.valor; });
  return config;
};