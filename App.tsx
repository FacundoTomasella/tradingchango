
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, getProducts, getPriceHistory, getProfile, getConfig, getBenefits, getSavedCart, saveCart } from './services/supabase';
import { Product, PriceHistory, Profile, TabType, ProductStats, Benefit } from './types';
import Header from './components/Header';
import ProductList from './components/ProductList';
import BottomNav from './components/BottomNav';
import ProductDetail from './components/ProductDetail';
import AuthModal from './components/AuthModal';
import CartSummary from './components/CartSummary';
import Footer from './components/Footer';
import { AboutView, TermsView, ContactView } from './components/InfoViews';

const App: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<TabType>('home');
  const [searchTerm, setSearchTerm] = useState('');
  const [trendFilter, setTrendFilter] = useState<'up' | 'down' | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [favorites, setFavorites] = useState<Record<number, number>>({});
  const [showPwaPill, setShowPwaPill] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(
    (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  );

  useEffect(() => { // 1. Configuración del Tema al cargar const savedTheme = localStorage.getItem('theme'); const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches; if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) { document.documentElement.classList.add('dark'); } else { document.documentElement.classList.remove('dark'); } // 2. Manejo de Navegación por Hash const handleHash = () => { const hash = window.location.hash.replace('#', ''); if (hash.startsWith('product/')) { const id = parseInt(hash.split('/')[1]); if (!isNaN(id)) setSelectedProductId(id); } else if (['about', 'terms', 'contact', 'home', 'carnes', 'verdu', 'varios', 'favs'].includes(hash)) { setCurrentTab(hash as TabType); setSelectedProductId(null); } else if (!hash) { window.location.hash = 'home'; } }; window.addEventListener('hashchange', handleHash); handleHash(); return () => window.removeEventListener('hashchange', handleHash); }, []); // <--- Revisá que este cierre de paréntesis y llave esté así

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (!isStandalone && isMobile) {
        setTimeout(() => setShowPwaPill(true), 2000);
      }
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('hashchange', handleHash);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowPwaPill(false);
    }
  };

  const navigateTo = (tab: TabType) => {
    window.location.hash = tab;
    setCurrentTab(tab);
  };

  const loadData = useCallback(async (sessionUser: User | null) => {
    try {
      setLoading(true);
      const [prodData, histData, configData] = await Promise.all([
        getProducts(),
        getPriceHistory(7),
        getConfig()
      ]);
      setProducts(prodData || []);
      setHistory(histData || []);
      setConfig(configData || {});

      if (sessionUser) {
        const prof = await getProfile(sessionUser.id);
        setProfile(prof);
        const saved = await getSavedCart(sessionUser.id);
        if (saved) setFavorites(saved);
        else {
          const local = localStorage.getItem(`favs_${sessionUser.id}`);
          if (local) setFavorites(JSON.parse(local));
        }
      }

      const day = new Date().getDay();
      const benefitData = await getBenefits(day);
      setBenefits(benefitData);
      setLoading(false);
    } catch (err: any) {
      console.error("Error loading app data:", err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      loadData(sessionUser);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      if (_event === 'SIGNED_IN') loadData(sessionUser);
      else if (_event === 'SIGNED_OUT') { setProfile(null); setFavorites({}); }
    });
    return () => subscription.unsubscribe();
  }, [loadData]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(`favs_${user.id}`, JSON.stringify(favorites));
      saveCart(user.id, favorites).catch(console.error);
    }
  }, [favorites, user]);

  const toggleTheme = () => { const newTheme = theme === 'light' ? 'dark' : 'light'; // Calculamos el nuevo estado setTheme(newTheme); // Actualizamos React // 1. Guardamos en el navegador para la próxima visita localStorage.setItem('theme', newTheme); // 2. Aplicamos el cambio visual al HTML para que Tailwind/CSS reaccione if (newTheme === 'dark') { document.documentElement.classList.add('dark'); } else { document.documentElement.classList.remove('dark'); } };

  const getStats = (p: number[], h: number): ProductStats => {
    const v = p.filter(x => x > 0);
    if (v.length === 0) return { min: 0, spread: '0.0', trendClass: '', icon: '-', isUp: false, isDown: false };
    const min = Math.min(...v);
    let diff = 0, tc = 'text-slate-500', icon = '-', isUp = false, isDown = false;
    if (h > 0) {
      diff = ((min - h) / h) * 100;
      if (diff > 0.1) { tc = 'text-[#f23645]'; icon = '▲'; isUp = true; }
      else if (diff < -0.1) { tc = 'text-[#00c853]'; icon = '▼'; isDown = true; }
    }
    return { min, spread: Math.abs(diff).toFixed(1), trendClass: tc, icon, isUp, isDown };
  };

  const filteredProducts = useMemo(() => {
    let result = products.map(p => {
      const prices = [p.p_coto, p.p_carrefour, p.p_dia, p.p_jumbo, p.p_masonline];
      const h7 = history.find(h => h.nombre_producto === p.nombre);
      return { ...p, stats: getStats(prices, h7?.precio_minimo || 0), prices };
    });
    if (currentTab === 'carnes') result = result.filter(p => p.categoria?.toLowerCase().includes('carne'));
    else if (currentTab === 'verdu') result = result.filter(p => p.categoria?.toLowerCase().includes('verdu') || p.categoria?.toLowerCase().includes('fruta'));
    else if (currentTab === 'varios') result = result.filter(p => !p.categoria?.toLowerCase().includes('carne') && !p.categoria?.toLowerCase().includes('verdu'));
    else if (currentTab === 'favs') result = result.filter(p => favorites[p.id]);

    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      result = result.filter(p => p.nombre.toLowerCase().includes(t) || (p.ticker && p.ticker.toLowerCase().includes(t)));
    }
    if (trendFilter && currentTab !== 'favs') {
      result = result.filter(p => trendFilter === 'up' ? p.stats.isUp : p.stats.isDown);
    }
    return result;
  }, [products, history, currentTab, searchTerm, trendFilter, favorites]);

  const toggleFavorite = (id: number) => {
    if (!user) { setIsAuthOpen(true); return; }
    setFavorites(prev => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = 1;
      return next;
    });
  };

  if (loading && products.length === 0) return <div className="min-h-screen flex items-center justify-center dark:bg-black dark:text-white font-mono text-[10px] uppercase tracking-[0.2em] animate-pulse">Analizando mercado...</div>;

  return (
    <div className="max-w-screen-md mx-auto min-h-screen bg-white dark:bg-black shadow-2xl transition-colors font-sans selection:bg-green-500 selection:text-white">
      {showPwaPill && (
        <div onClick={handleInstallClick} className="fixed bottom-[85px] left-1/2 -translate-x-1/2 z-[1000] bg-black dark:bg-white text-white dark:text-black px-4 py-2.5 rounded-full flex items-center gap-3 shadow-2xl cursor-pointer">
          <span className="text-[11px] font-[800] uppercase tracking-wider">Instalar App 🛒</span>
        </div>
      )}
      <Header 
        searchTerm={searchTerm} setSearchTerm={setSearchTerm} 
        toggleTheme={toggleTheme} theme={theme}
        onUserClick={() => setIsAuthOpen(true)} user={user}
        trendFilter={trendFilter} setTrendFilter={setTrendFilter} 
        showHero={currentTab === 'home' && !searchTerm && !trendFilter}
        onNavigate={navigateTo} currentTab={currentTab}
      />
      <main className="pb-24">
        {['home', 'carnes', 'verdu', 'varios', 'favs'].includes(currentTab) ? (
          <>
            {currentTab === 'favs' && filteredProducts.length > 0 && <CartSummary items={filteredProducts} favorites={favorites} benefits={benefits} userMemberships={profile?.membresias} />}
            <ProductList 
              products={filteredProducts as any} onProductClick={id => window.location.hash = `product/${id}`}
              onFavoriteToggle={toggleFavorite} isFavorite={id => !!favorites[id]}
              isCartView={currentTab === 'favs'} quantities={favorites}
              onUpdateQuantity={(id, d) => setFavorites(p => ({...p, [id]: Math.max(1, (p[id]||1)+d)}))}
            />
          </>
        ) : (
          <div className="animate-in fade-in duration-500">
            {currentTab === 'about' && <AboutView onClose={() => navigateTo('home')} content={config.acerca_de} />}
            {currentTab === 'terms' && <TermsView onClose={() => navigateTo('home')} content={config.terminos} />}
            {currentTab === 'contact' && <ContactView onClose={() => navigateTo('home')} content={config.contacto} email={profile?.email} />}
          </div>
        )}
      </main>
      <BottomNav currentTab={currentTab} setCurrentTab={navigateTo} cartCount={Object.keys(favorites).length} />
      {selectedProductId && <ProductDetail productId={selectedProductId} onClose={() => navigateTo(currentTab)} onFavoriteToggle={toggleFavorite} isFavorite={!!favorites[selectedProductId]} products={products} theme={theme} />}
      {isAuthOpen && <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} user={user} profile={profile} onSignOut={() => setUser(null)} />}
      <Footer />
    </div>
  );
};

export default App;
