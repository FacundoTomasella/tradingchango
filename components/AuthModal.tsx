import React, { useState, useEffect } from 'react';
import { supabase, getCatalogoMembresias, updateMemberships } from '../services/supabase';
import { Profile, Membership, UserMembership } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  profile: Profile | null;
  onSignOut: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, user, profile, onSignOut }) => {
  const [view, setView] = useState<'welcome' | 'form' | 'profile' | 'membresias'>(user ? 'profile' : 'welcome');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [catalogo, setCatalogo] = useState<Membership[]>([]);

  // Campos de formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [fechaNac, setFechaNac] = useState('');

  useEffect(() => {
    if (view === 'membresias') getCatalogoMembresias().then(setCatalogo);
  }, [view]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({ 
          email, password, 
          options: { data: { nombre, apellido, fecha_nacimiento: fechaNac } } 
        });
        if (error) throw error;
        if (data.user) {
          await supabase.from('perfiles').insert([{ 
            id: data.user.id, nombre, apellido, fecha_nacimiento: fechaNac, 
            subscription: 'free', membresias: [] 
          }]);
        }
        alert("¡Cuenta creada! Iniciando sesión...");
        setMode('login');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.reload();
      }
    } catch (err: any) { alert(err.message); }
    setLoading(false);
  };

  const toggleMembership = async (m: Membership) => {
    if (!profile || !user) return;
    const exists = profile.membresias?.some(x => x.slug === m.slug);
    const updated = exists 
      ? profile.membresias.filter(x => x.slug !== m.slug)
      : [...(profile.membresias || []), { slug: m.slug, tipo: m.opciones[0] }];
    
    try {
      await updateMemberships(user.id, updated);
      window.location.reload();
    } catch (err) { alert("Error al actualizar membresías."); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-950 w-full max-w-sm rounded-[2rem] p-8 relative shadow-2xl border border-slate-200 dark:border-slate-800">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 text-xl">&times;</button>

        {view === 'welcome' && (
          <div className="text-center">
            <h2 className="text-2xl font-black mb-6 dark:text-white">Bienvenido Trader</h2>
            <button onClick={() => { setMode('register'); setView('form'); }} className="w-full bg-slate-900 dark:bg-white dark:text-black text-white py-4 rounded-xl font-bold mb-3">Crear Cuenta</button>
            <button onClick={() => { setMode('login'); setView('form'); }} className="w-full border border-slate-200 dark:border-slate-800 py-4 rounded-xl font-bold dark:text-white">Ya tengo cuenta</button>
          </div>
        )}

        {view === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <h2 className="text-xl font-black mb-4 dark:text-white">{mode === 'login' ? 'Ingreso' : 'Registro'}</h2>
            {mode === 'register' && (
              <>
                <input type="text" placeholder="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} className="w-full p-3 bg-slate-100 dark:bg-slate-900 rounded-lg dark:text-white" required />
                <input type="text" placeholder="Apellido" value={apellido} onChange={e => setApellido(e.target.value)} className="w-full p-3 bg-slate-100 dark:bg-slate-900 rounded-lg dark:text-white" required />
                <input type="date" value={fechaNac} onChange={e => setFechaNac(e.target.value)} className="w-full p-3 bg-slate-100 dark:bg-slate-900 rounded-lg dark:text-white text-xs" required />
              </>
            )}
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 bg-slate-100 dark:bg-slate-900 rounded-lg dark:text-white" required />
            <input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 bg-slate-100 dark:bg-slate-900 rounded-lg dark:text-white" required />
            <button type="submit" disabled={loading} className="w-full bg-slate-900 dark:bg-white dark:text-black text-white py-4 rounded-xl font-bold">
              {loading ? 'Cargando...' : 'Continuar'}
            </button>
            <button type="button" onClick={() => setView('welcome')} className="w-full text-xs text-slate-400 mt-4">Volver</button>
          </form>
        )}

        {view === 'profile' && profile && (
          <div className="text-center">
            <h2 className="text-xl font-black mb-1 dark:text-white uppercase tracking-tighter">{profile.nombre} {profile.apellido}</h2>
            <p className="text-slate-400 text-[10px] mb-6 font-mono">{user.email}</p>
            <div className="text-left mb-6">
              <h3 className="text-[10px] font-black uppercase text-slate-400 mb-3">Membresías Activas</h3>
              <div className="grid grid-cols-2 gap-2">
                {profile.membresias?.map(m => (
                  <div key={m.slug} className="p-2 border border-green-500 rounded-lg text-[10px] font-bold text-green-500 flex justify-between items-center">
                    {m.slug} <button onClick={() => toggleMembership({slug: m.slug} as any)} className="text-red-500 ml-1">&times;</button>
                  </div>
                ))}
                <button onClick={() => setView('membresias')} className="p-2 border border-dashed border-slate-300 rounded-lg text-[10px] text-slate-400 font-bold">+ Agregar</button>
              </div>
            </div>
            <button onClick={async () => { await supabase.auth.signOut(); onSignOut(); }} className="w-full text-red-500 font-bold py-2">Cerrar Sesión</button>
          </div>
        )}

        {view === 'membresias' && (
          <div className="space-y-2">
            <h2 className="text-lg font-black mb-4 dark:text-white">Catálogo</h2>
            <div className="max-h-60 overflow-y-auto pr-2 space-y-2">
              {catalogo.map(m => (
                <div key={m.slug} onClick={() => toggleMembership(m)} className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900">
                  <span className="text-xs font-bold dark:text-white">{m.nombre}</span>
                  <i className={`fa-solid ${profile?.membresias?.some(x => x.slug === m.slug) ? 'fa-check text-green-500' : 'fa-plus text-slate-300'}`}></i>
                </div>
              ))}
            </div>
            <button onClick={() => setView('profile')} className="w-full text-xs text-slate-400 mt-6">Volver</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthModal;