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

  useEffect(() => {
    if (user) setView('profile');
    else setView('welcome');
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'register') {
        // Al registrarse, pasamos los datos en user_metadata. 
        // El Trigger de SQL que te pasé arriba leerá estos datos y creará el perfil automáticamente.
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password, 
          options: { 
            data: { 
              nombre, 
              apellido, 
              fecha_nacimiento: fechaNac 
            } 
          } 
        });
        
        if (error) throw error;
        
        // Si no hay sesión inmediata (por confirmación de email), avisamos al usuario.
        if (data.user && !data.session) {
          alert("¡Cuenta creada! Por favor, revisá tu email para confirmar tu cuenta y empezar a operar como PRO.");
        } else {
          alert("¡Registro exitoso! Ya sos parte de la comunidad PRO.");
        }
        setMode('login');
        setView('form');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onClose();
      }
    } catch (err: any) { 
      alert(err.message); 
    }
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
      // Opcionalmente podrías forzar un refresh del perfil aquí o dejar que App.tsx lo maneje
    } catch (err) { alert("Error al actualizar membresías."); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-950 w-full max-w-sm rounded-[2rem] p-8 relative shadow-2xl border border-slate-200 dark:border-slate-800">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 text-xl hover:text-slate-600">&times;</button>

        {view === 'welcome' && (
          <div className="text-center">
            <h2 className="text-2xl font-black mb-2 dark:text-white">TradingChango</h2>
            <p className="text-slate-400 text-xs mb-8 font-bold uppercase tracking-widest">Unite a la comunidad</p>
            <button onClick={() => { setMode('register'); setView('form'); }} className="w-full bg-slate-900 dark:bg-white dark:text-black text-white py-4 rounded-xl font-bold mb-3 active:scale-95 transition-transform">Crear Cuenta PRO</button>
            <button onClick={() => { setMode('login'); setView('form'); }} className="w-full border border-slate-200 dark:border-slate-800 py-4 rounded-xl font-bold dark:text-white active:scale-95 transition-transform">Iniciar Sesión</button>
          </div>
        )}

        {view === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <h2 className="text-xl font-black mb-4 dark:text-white">{mode === 'login' ? 'Bienvenido' : 'Nueva Cuenta PRO'}</h2>
            {mode === 'register' && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" placeholder="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} className="w-full p-3 bg-slate-100 dark:bg-slate-900 rounded-lg dark:text-white border-none outline-none text-sm" required />
                  <input type="text" placeholder="Apellido" value={apellido} onChange={e => setApellido(e.target.value)} className="w-full p-3 bg-slate-100 dark:bg-slate-900 rounded-lg dark:text-white border-none outline-none text-sm" required />
                </div>
                <input type="date" value={fechaNac} onChange={e => setFechaNac(e.target.value)} className="w-full p-3 bg-slate-100 dark:bg-slate-900 rounded-lg dark:text-white text-xs border-none outline-none" required />
              </>
            )}
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 bg-slate-100 dark:bg-slate-900 rounded-lg dark:text-white border-none outline-none text-sm" required />
            <input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 bg-slate-100 dark:bg-slate-900 rounded-lg dark:text-white border-none outline-none text-sm" required />
            <button type="submit" disabled={loading} className="w-full bg-slate-900 dark:bg-white dark:text-black text-white py-4 rounded-xl font-bold active:scale-95 transition-transform disabled:opacity-50">
              {loading ? 'Procesando...' : 'Continuar'}
            </button>
            <button type="button" onClick={() => setView('welcome')} className="w-full text-[10px] text-slate-400 mt-4 uppercase font-black tracking-widest">Volver</button>
          </form>
        )}

        {view === 'profile' && profile && (
          <div className="text-center">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-full mx-auto mb-4 flex items-center justify-center border-2 border-slate-200 dark:border-slate-800">
               <i className="fa-solid fa-user text-2xl text-slate-400"></i>
            </div>
            <h2 className="text-xl font-black mb-1 dark:text-white uppercase tracking-tighter">{profile.nombre} {profile.apellido}</h2>
            <div className="flex items-center justify-center gap-2 mb-6">
              <span className="text-slate-400 text-[10px] font-mono">{user.email}</span>
              <span className="bg-amber-100 text-amber-600 text-[8px] font-black px-1.5 py-0.5 rounded uppercase border border-amber-200">PRO</span>
            </div>
            <div className="text-left mb-6">
              <h3 className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">Mis Membresías</h3>
              <div className="grid grid-cols-2 gap-2">
                {profile.membresias?.map(m => (
                  <div key={m.slug} className="p-2 border border-green-500 rounded-lg text-[10px] font-bold text-green-500 flex justify-between items-center bg-green-50 dark:bg-green-900/10">
                    {m.slug} <button onClick={() => toggleMembership({slug: m.slug} as any)} className="text-red-500 ml-1">&times;</button>
                  </div>
                ))}
                <button onClick={() => setView('membresias')} className="p-2 border border-dashed border-slate-300 rounded-lg text-[10px] text-slate-400 font-bold hover:bg-slate-50">+ Agregar</button>
              </div>
            </div>
            <button onClick={async () => { await supabase.auth.signOut(); onSignOut(); onClose(); }} className="w-full text-red-500 text-xs font-black uppercase tracking-widest py-2">Cerrar Sesión</button>
          </div>
        )}

        {view === 'membresias' && (
          <div className="space-y-2">
            <h2 className="text-lg font-black mb-4 dark:text-white">Beneficios Disponibles</h2>
            <div className="max-h-60 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
              {catalogo.map(m => (
                <div key={m.slug} onClick={() => toggleMembership(m)} className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900">
                  <span className="text-xs font-bold dark:text-white">{m.nombre}</span>
                  <i className={`fa-solid ${profile?.membresias?.some(x => x.slug === m.slug) ? 'fa-check text-green-500' : 'fa-plus text-slate-300'}`}></i>
                </div>
              ))}
            </div>
            <button onClick={() => setView('profile')} className="w-full text-[10px] text-slate-400 mt-6 uppercase font-black tracking-widest">Volver a mi Perfil</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthModal;