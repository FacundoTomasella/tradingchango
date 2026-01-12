import { createClient } from '@supabase/supabase-js';
import { Product, PriceHistory, Profile, Benefit, UserMembership } from '../types';

// Safely access environment variables
const getEnvVar = (name: string): string => {
  try {
    // @ts-ignore - Vite specific
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
  isValidUrl(SUPABASE_URL) ? SUPABASE_URL : 'https://placeholder-must-set-env-vars.supabase.co',
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

export const updateProfile = async (userId: string, updates: Partial<Profile>) => {
  const { error } = await supabase
    .from('perfiles')
    .update(updates)
    .eq('id', userId);
  if (error) throw error;
};

export const updateMemberships = async (userId: string, memberships: UserMembership[]) => {
  const { error } = await supabase
    .from('perfiles')
    .update({ membresias: memberships })
    .eq('id', userId);
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
  data?.forEach(row => config[row.clave] = row.valor);
  return config;
};