import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase, getCatalogoMembresias, updateMemberships } from '../services/supabase';
import { Profile, Membership, UserMembership } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  profile: Profile | null;
  onSignOut: () => void;
  onProfileUpdate?: () => void;
  savedCarts?: any[];
  onSaveCart?: (name: string) => void;
  onDeleteCart?: (index: number) => void;
  onLoadCart?: (index: number) => void;
  currentActiveCartSize: number;
}

const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, onClose, user, profile, onSignOut, onProfileUpdate, 
  savedCarts = [], onSaveCart, onDeleteCart, onLoadCart,
  currentActiveCartSize
}) => {
  // --- ESTADOS ---
  const [view, setView] = useState<'main' | 'mis_changos' | 'membresias' | 'profile' | 'welcome' | 'form' | 'forgot_password' | 'update_password'>(() => {
    const savedView = localStorage.getItem('active_auth_view');
    return (savedView as any) || 'main';
  });
  
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  
  const [catalogo, setCatalogo] = useState<Membership[]>([]);
  const modalRef = useRef<HTMLDivElement>(null);

  // --- FUNCIÓN DE CIERRE Y RESET ---
  // Esta función asegura que el modal no se quede "trabado" en una vista vieja al cerrar
  const resetAndClose = () => {
    const defaultView = user ? 'profile' : 'welcome';
    localStorage.removeItem('active_auth_view');
    setView(defaultView);
    setError(null);
    setSuccess(null);
    onClose();
  };

  // --- EFECTOS ---
  // EFECTO UNIFICADO PARA CONTROLAR LA VISTA
  useEffect(() => {
    if (isOpen) {
      const savedView = localStorage.getItem('active_auth_view');

      // PRIORIDAD 1: Si localStorage dice "update_password", esa es la vista.
      if (savedView === 'update_password') {
        setView('update_password');
        return;
      }

      // PRIORIDAD 2: Si no hay usuario, mostramos la bienvenida.
      if (!user) {
        if (view !== 'forgot_password' && view !== 'form') {
          setView('welcome');
        }
      } 
      // PRIORIDAD 3: Si hay usuario, lo llevamos a su perfil.
      else {
        if (['welcome', 'form', 'main'].includes(view)) {
          setView('profile');
        }
      }
    }
  }, [isOpen, user]); // Quitamos 'view' para evitar bucles indeseados.

  useEffect(() => {
    // Guardamos la vista actual en localStorage para mantener el estado.
    if (isOpen) {
      localStorage.setItem('active_auth_view', view);
    }
  }, [view, isOpen]);

  // Detector de click fuera del modal
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        resetAndClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, user]); // Dependencias correctas.


  // --- MANEJADORES ---
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null); setSuccess(null);
    try {
      const auth = supabase.auth as any;
      if (mode === 'register') {
        const { data, error: signUpError } = await auth.signUp({
          email, password, options: { data: { nombre, apellido, fecha_nacimiento: fechaNacimiento } }
        });
        if (signUpError) throw signUpError;
        if (data?.user) {
          await supabase.from('perfiles').upsert({
            id: data.user.id, email, nombre, apellido, fecha_nacimiento: fechaNacimiento,
            subscription: 'pro', subscription_end: '2027-01-01'
          });
        }
        setSuccess(`¡Cuenta creada! Revisa tu email.`);
        setMode('login');
      } else {
        const { error: signInError } = await auth.signInWithPassword({ email, password });
        if (signInError) throw new Error('Credenciales incorrectas.');
        setSuccess(`¡Hola de nuevo!`);
        if (onProfileUpdate) onProfileUpdate();
      }
    } catch (err: any) { setError(err.message); } 
    finally { setLoading(false); }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const { error } = await (supabase.auth as any).resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}`,
      });
      if (error) throw error;
      setSuccess("¡Mail enviado! Revisa tu bandeja de entrada.");
    } catch (err: any) { setError(err.message); } 
    finally { setLoading(false); }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
  e.preventDefault();
  if (newPassword.length < 6) { setError("Mínimo 6 caracteres."); return; }
  
  setLoading(true); setError(null); setSuccess(null);

  try {
    const { error: updateError } = await supabase.auth.updateUser({ 
      password: newPassword 
    });

    if (updateError) throw updateError;

    setSuccess("¡Contraseña actualizada correctamente!");
    
    // LIMPIEZA CRUCIAL:
    localStorage.removeItem('active_auth_view');
    // Esto quita el #access_token de la URL
    window.history.replaceState(null, '', window.location.pathname);

    setTimeout(() => {
      setView('profile');
      // Ya no es necesario llamar a onProfileUpdate() aquí.
      // El listener onAuthStateChange en App.tsx se encargará de recargar los datos.
    }, 2000);

  } catch (err: any) {
    setError(err.message || "Error al actualizar.");
  } finally {
    setLoading(false);
  }
};


  const handleSignOut = async () => {
    await (supabase.auth as any).signOut();
    localStorage.removeItem('active_auth_view');
    onSignOut();
    onClose();
  };

  const toggleMembership = async (slug: string, tipo: string = 'standard') => {
    if (!user || !profile) return;
    const current = profile.membresias || [];
    const isSelected = current.some(m => m.slug === slug && m.tipo === tipo);
    const next = isSelected 
      ? current.filter(m => !(m.slug === slug && m.tipo === tipo))
      : [...current, { slug, tipo }];
    setLoading(true);
    try {
      await updateMemberships(user.id, next);
      if (onProfileUpdate) onProfileUpdate();
    } catch (err: any) { setError(err.message); } 
    finally { setLoading(false); }
  };

  const categorizedMembresias = useMemo(() => {
    const groups: Record<string, Membership[]> = { "Bancos & Wallets": [], "Prepagas & Otros": [], "Programas de Super": [] };
    catalogo.forEach(m => {
      const cat = (m as any).categoria?.toLowerCase() || '';
      if (cat.includes('banco') || cat.includes('wallet')) groups["Bancos & Wallets"].push(m);
      else if (cat.includes('prepag') || cat.includes('obra')) groups["Prepagas & Otros"].push(m);
      else groups["Programas de Super"].push(m);
    });
    return groups;
  }, [catalogo]);

  const isProValid = useMemo(() => {
    if (!profile || profile.subscription !== 'pro') return false;
    return profile.subscription_end ? new Date(profile.subscription_end) > new Date() : false;
  }, [profile]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-primary/80 backdrop-blur-sm animate-in fade-in">
      <div ref={modalRef} className="bg-white dark:bg-primary w-full max-w-sm rounded-[1.5rem] p-6 relative shadow-2xl border border-neutral-200 dark:border-neutral-800 max-h-[85vh] overflow-y-auto no-scrollbar">
        <button onClick={resetAndClose} className="absolute top-5 right-5 text-neutral-400 text-xl">&times;</button>
        
        {success && <div className="mb-4 p-3 bg-green-500/10 text-green-500 text-[11px] font-bold rounded-xl text-center">{success}</div>}
        {error && <div className="mb-4 p-3 bg-red-500/10 text-red-500 text-[11px] font-bold rounded-xl text-center">{error}</div>}

        {view === 'welcome' && (
          <div className="text-center py-4">
            <h2 className="text-2xl font-black mb-1 dark:text-white tracking-tighter">TradingChango</h2>
            <p className="text-neutral-400 text-[10px] font-black uppercase tracking-widest mb-8">Unite al ahorro inteligente</p>
            <button onClick={() => { setMode('register'); setView('form'); }} className="w-full bg-primary dark:bg-white dark:text-black text-white py-3.5 rounded-xl font-bold mb-3 shadow-lg">Crear Cuenta</button>
            <button onClick={() => { setMode('login'); setView('form'); }} className="w-full border border-neutral-200 dark:border-neutral-800 py-3.5 rounded-xl font-bold dark:text-white">Iniciar Sesión</button>
          </div>
        )}

        {view === 'form' && (
          <form onSubmit={handleAuth} className="space-y-4">
            <h3 className="text-xl font-black dark:text-white mb-4 uppercase tracking-tighter">{mode === 'login' ? 'Bienvenido' : 'Nueva Cuenta'}</h3>
            {mode === 'register' && (
              <div className="grid grid-cols-2 gap-2">
                <input type="text" value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="NOMBRE" required className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3 rounded-lg dark:text-white text-[11px] uppercase font-bold" />
                <input type="text" value={apellido} onChange={e=>setApellido(e.target.value)} placeholder="APELLIDO" required className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3 rounded-lg dark:text-white text-[11px] uppercase font-bold" />
              </div>
            )}
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="EMAIL" required className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3 rounded-lg dark:text-white text-[11px] font-bold" />
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="CONTRASEÑA" required className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3 rounded-lg dark:text-white text-[11px] font-bold" />
            <button disabled={loading} className="w-full bg-green-500 text-white py-3.5 rounded-xl font-black uppercase tracking-widest text-[11px] mt-2 shadow-lg">
              {loading ? 'Procesando...' : (mode === 'login' ? 'Entrar' : 'Registrar')}
            </button>
            {mode === 'login' && (
              <button type="button" onClick={() => setView('forgot_password')} className="w-full text-[10px] font-black text-neutral-400 uppercase mt-2">¿Olvidaste tu contraseña?</button>
            )}
            <button type="button" onClick={() => setView('welcome')} className="w-full text-[10px] font-black text-neutral-400 uppercase mt-4">Volver</button>
          </form>
        )}

        {view === 'forgot_password' && (
          <form onSubmit={handleResetPassword} className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <h3 className="text-xl font-black dark:text-white mb-2 uppercase tracking-tighter">Recuperar Acceso</h3>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium leading-relaxed mb-4">Ingresá tu email para recibir el link de recuperación.</p>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="EMAIL" required className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3 rounded-lg dark:text-white text-[11px] font-bold" />
            <button disabled={loading} className="w-full bg-primary dark:bg-white dark:text-black text-white py-3.5 rounded-xl font-black uppercase tracking-widest text-[11px] shadow-lg">{loading ? 'Enviando...' : 'Enviar Link'}</button>
            <button type="button" onClick={() => setView('form')} className="w-full text-[10px] font-black text-neutral-400 uppercase mt-4">Volver al login</button>
          </form>
        )}

        {view === 'update_password' && (
          <form onSubmit={handleUpdatePassword} className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <h3 className="text-xl font-black dark:text-white mb-2 uppercase tracking-tighter">Nueva Contraseña</h3>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium mb-4">Ingresá tu nueva clave de acceso.</p>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="MÍNIMO 6 CARACTERES" required className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3 rounded-lg dark:text-white text-[11px] font-bold" />
            <button disabled={loading} className="w-full bg-green-500 text-white py-3.5 rounded-xl font-black uppercase tracking-widest text-[11px] shadow-lg">
              {loading ? 'Guardando...' : 'Actualizar Contraseña'}
            </button>
          </form>
        )}

        {view === 'profile' && user && (
          <div className="text-center animate-in fade-in duration-300">
            <div className="w-14 h-14 bg-neutral-100 dark:bg-neutral-900 rounded-xl flex items-center justify-center text-xl mx-auto mb-4 text-neutral-500 border border-neutral-200 dark:border-neutral-800">
              <i className="fa-solid fa-user-astronaut"></i>
            </div>
            <h4 className="font-black dark:text-white text-xl mb-1 truncate tracking-tighter uppercase">¡Hola, {profile?.nombre || user.email.split('@')[0]}!</h4>
            <p className={`text-[9px] font-black uppercase tracking-widest mb-6 ${isProValid ? 'text-green-500' : 'text-neutral-400'}`}>Nivel: {isProValid ? 'PRO' : 'FREE'}</p>            
            <div className="space-y-2.5">
              <button onClick={() => setView('mis_changos')} className="w-full bg-neutral-50 dark:bg-neutral-900 p-4 rounded-xl text-left flex items-center justify-between border border-neutral-100 dark:border-neutral-800 hover:border-black dark:hover:border-white transition-all">
                <div className="flex items-center gap-3"><i className="fa-solid fa-cart-flatbed text-neutral-400"></i><span className="text-[11px] font-bold dark:text-white uppercase">Mis Listas de Compra</span></div>
                <span className="text-[10px] font-black text-neutral-400">{savedCarts.length}/2</span>
              </button>
              <button onClick={() => setView('membresias')} className="w-full bg-neutral-50 dark:bg-neutral-900 p-4 rounded-xl text-left flex items-center justify-between border border-neutral-100 dark:border-neutral-800 hover:border-black dark:hover:border-white transition-all hidden">
                <div className="flex items-center gap-3"><i className="fa-solid fa-id-card text-neutral-400"></i><span className="text-[11px] font-bold dark:text-white uppercase">Bancos & Membresías</span></div>
                <i className="fa-solid fa-chevron-right text-neutral-300 text-[10px]"></i>
              </button>
              <button onClick={handleSignOut} className="w-full text-red-500 text-[9px] font-black uppercase tracking-widest py-3 mt-4">Cerrar Sesión</button>
            </div>
          </div>
        )}

        {view === 'mis_changos' && (
          <div className="animate-in slide-in-from-right-4 duration-300">
            <h3 className="text-lg font-black dark:text-white mb-4 uppercase tracking-tighter">Mis Listas</h3>
            <div className="space-y-3 mb-6">
              {savedCarts.length === 0 ? (
                <div className="text-center py-6 bg-neutral-50 dark:bg-neutral-900/50 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800">
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">No tenés listas guardadas</p>
                </div>
              ) : (
                savedCarts.map((cart, idx) => (
                  <div key={idx} className="bg-neutral-50 dark:bg-neutral-900/80 p-3.5 rounded-xl border border-neutral-100 dark:border-neutral-800 flex items-center justify-between group">
                    <div>
                      <h5 className="text-[11px] font-black dark:text-white uppercase tracking-tight">{cart.name}</h5>
                      <p className="text-[9px] text-neutral-400 font-bold uppercase">{Object.keys(cart.items).length} productos</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { onLoadCart?.(idx); onClose(); }} className="w-8 h-8 rounded-lg bg-primary dark:bg-white text-white dark:text-black flex items-center justify-center text-[11px] hover:scale-110 transition-transform"><i className="fa-solid fa-upload"></i></button>
                      <button onClick={() => onDeleteCart?.(idx)} className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center text-[11px] hover:scale-110 transition-transform"><i className="fa-solid fa-trash-can"></i></button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button onClick={() => setView('profile')} className="w-full text-[10px] font-black text-neutral-400 uppercase tracking-widest">Volver</button>
          </div>
        )}

        {view === 'membresias' && (
          <div className="animate-in slide-in-from-right-4 duration-300">
            <h3 className="text-lg font-black dark:text-white mb-4 uppercase tracking-tighter">Mis Beneficios</h3>
            <div className="space-y-6">
              {Object.entries(categorizedMembresias).map(([catName, items]) => items.length > 0 && (
                <div key={catName}>
                  <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-3 border-b border-neutral-100 dark:border-neutral-900 pb-1">{catName}</h4>
                  <div className="space-y-4">
                    {items.map(m => (
                      <div key={m.slug} className="group">
                        <div className="flex items-center gap-2.5 mb-2.5">
                          <div className="w-8 h-8 rounded-lg bg-white border border-neutral-100 p-1 flex items-center justify-center shrink-0 shadow-sm">
                            <img src={m.logo_url} alt={m.nombre} className="w-full h-full object-contain" />
                          </div>
                          <span className="text-[11px] font-bold dark:text-white uppercase tracking-tight">{m.nombre}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 ml-10">
                          {m.opciones && m.opciones.length > 0 ? m.opciones.map(opt => {
                            const active = profile?.membresias?.some(um => um.slug === m.slug && um.tipo === opt);
                            return (
                              <button key={opt} onClick={() => toggleMembership(m.slug, opt)} className={`text-[9px] font-black px-3 py-1.5 rounded-lg border transition-all ${active ? 'bg-green-500 text-white border-green-500 shadow-md' : 'bg-neutral-50 dark:bg-neutral-900 text-neutral-400 border-neutral-100 dark:border-neutral-800'}`}>{opt}</button>
                            );
                          }) : (
                            <button onClick={() => toggleMembership(m.slug)} className={`text-[9px] font-black px-4 py-1.5 rounded-lg border transition-all ${profile?.membresias?.some(um => um.slug === m.slug) ? 'bg-green-500 text-white border-green-500 shadow-md' : 'bg-neutral-50 dark:bg-neutral-900 text-neutral-400 border-neutral-100 dark:border-neutral-800'}`}>Activar {m.nombre}</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setView('profile')} className="w-full bg-primary dark:bg-white dark:text-black text-white py-3.5 rounded-xl font-black mt-6 uppercase text-[10px] tracking-widest shadow-xl">Guardar Selección</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthModal;