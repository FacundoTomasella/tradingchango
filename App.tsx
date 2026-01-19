import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, getProducts, getPriceHistory, getProfile, getConfig, getBenefits, getSavedCartData, saveCartData } from './services/supabase';
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
  const [purchasedItems, setPurchasedItems] = useState<Set<number>>(new Set());
  const [savedCarts, setSavedCarts] = useState<any[]>([]);
  const [showPwaPill, setShowPwaPill] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(
    (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  );

  useEffect(() => {
  const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';

  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
    setTheme('dark');
  } else {
    document.documentElement.classList.remove('dark');
    setTheme('light');
  }

  const handleHash = () => {
    const hash = window.location.hash.replace('#', '');
    if (hash.startsWith('product/')) {
      const id = parseInt(hash.split('/')[1]);
      if (!isNaN(id)) setSelectedProductId(id);
    } else if (['about', 'terms', 'contact', 'home', 'carnes', 'verdu', 'varios', 'favs'].includes(hash)) {
      setCurrentTab(hash as TabType);
      setSelectedProductId(null);
    } else if (!hash) {
      window.location.hash = 'home';
    }
  };

  window.addEventListener('hashchange', handleHash);
  handleHash();
  return () => window.removeEventListener('hashchange', handleHash);
}, []);


  useEffect(() => {
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
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

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
        let prof = await getProfile(sessionUser.id); // Cambié const por let para poder editarlo

        // --- INICIO CAMBIO AQUÍ: VERIFICACIÓN Y ACTUALIZACIÓN FÍSICA ---
        if (prof && prof.subscription === 'pro' && prof.subscription_end) {
          const expiryDate = new Date(prof.subscription_end);
          const today = new Date();

          if (expiryDate < today) {
            // 1. Actualizar físicamente la base de datos
            await supabase
              .from('perfiles')
              .update({ subscription: 'free' })
              .eq('id', sessionUser.id);
            
            // 2. Actualizar el objeto local para que la App ya lo vea como FREE
            prof = { ...prof, subscription: 'free' };
          }
        }
        // --- FIN CAMBIO ---

        setProfile(prof);
        const cartData = await getSavedCartData(sessionUser.id);
        if (cartData) {
          setFavorites(cartData.active || {});
          setSavedCarts(cartData.saved || []);
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
      else if (_event === 'SIGNED_OUT') { 
        setProfile(null); 
        setFavorites({}); 
        setSavedCarts([]);
        setPurchasedItems(new Set());
      }
    });
    return () => subscription.unsubscribe();
  }, [loadData]);

  useEffect(() => {
  // Solo guardamos si hay un usuario logueado 
  // Y si favorites tiene contenido (para evitar borrar la DB al limpiar el estado en el logout)
  if (user && Object.keys(favorites).length > 0) {
    const dataToSave = { active: favorites, saved: savedCarts };
    saveCartData(user.id, dataToSave).catch(console.error);
  }
}, [favorites, savedCarts, user]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const getStats = (p: number[], h: number): ProductStats => {
    const v = p.filter(x => x > 0);
    if (v.length === 0) return { min: 0, spread: '0.0', trendClass: '', icon: '-', isUp: false, isDown: false };
    const min = Math.min(...v);
    let diff = 0, tc = 'text-neutral-500', icon = '-', isUp = false, isDown = false;
    if (h > 0) {
      diff = ((min - h) / h) * 100;
      if (diff > 0.1) { tc = 'text-red-600'; icon = '▲'; isUp = true; }
      else if (diff < -0.1) { tc = 'text-green-600'; icon = '▼'; isDown = true; }
    }
    return { min, spread: Math.abs(diff).toFixed(1), trendClass: tc, icon, isUp, isDown };
  };

  /** LOGICA DE SUSCRIPCION PRO **/
  const isPro = useMemo(() => {
    if (!profile || profile.subscription !== 'pro') return false;
    // Comprueba si la fecha de vencimiento es posterior a hoy
    return profile.subscription_end ? new Date(profile.subscription_end) > new Date() : false;
  }, [profile]);

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
    if (!user) {
      setIsAuthOpen(true);
      return;
    }

    const favoritesCount = Object.keys(favorites).length;

    // APLICA EL LIMITE SI NO ES PRO
    if (!isPro && favoritesCount >= 5 && !favorites[id]) {
      alert('Los usuarios FREE solo pueden tener hasta 5 productos en favoritos.');
      return;
    }

    setFavorites(prev => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
        const newPurchased = new Set(purchasedItems);
        newPurchased.delete(id);
        setPurchasedItems(newPurchased);
      } else {
        next[id] = 1;
      }
      return next;
    });
  };

  const handleFavoriteChangeInCart = (id: number, delta: number) => {
    setFavorites(prev => {
      const newQty = (prev[id] || 1) + delta;
      if (newQty <= 0) {
        const next = { ...prev };
        delete next[id];
        setPurchasedItems(p => {
          const newP = new Set(p);
          newP.delete(id);
          return newP;
        });
        return next;
      }
      return { ...prev, [id]: newQty };
    });
  };

  const togglePurchased = (id: number) => {
    const newPurchased = new Set(purchasedItems);
    if (newPurchased.has(id)) newPurchased.delete(id);
    else newPurchased.add(id);
    setPurchasedItems(newPurchased);
  };

  const handleSaveCurrentCart = (name: string) => {
    if (savedCarts.length >= 2) return;
    setSavedCarts([...savedCarts, { name, items: { ...favorites }, date: new Date().toISOString() }]);
  };

  const handleDeleteSavedCart = (index: number) => {
    const next = [...savedCarts];
    next.splice(index, 1);
    setSavedCarts(next);
  };

  const handleLoadSavedCart = (index: number) => {
    setFavorites(savedCarts[index].items);
    setPurchasedItems(new Set());
    navigateTo('favs');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setFavorites({});
    setSavedCarts([]);
    setPurchasedItems(new Set());
    setIsAuthOpen(false);
    navigateTo('home');
  };

  if (loading && products.length === 0) return <div className="min-h-screen flex items-center justify-center dark:bg-primary dark:text-white font-mono text-[11px] uppercase tracking-[0.2em]">Conectando a Mercado...</div>;

  return (
    <div className="max-w-screen-md mx-auto min-h-screen bg-white dark:bg-primary shadow-2xl transition-colors font-sans pb-24">
      {showPwaPill && (
        <div onClick={handleInstallClick} className="fixed bottom-[80px] left-1/2 -translate-x-1/2 z-[1000] bg-primary dark:bg-white text-white dark:text-black px-4 py-2 rounded-full flex items-center gap-2 shadow-2xl cursor-pointer">
          <span className="text-[10px] font-[800] uppercase tracking-wider">Instalar App 🛒</span>
        </div>
      )}
      <Header 
        searchTerm={searchTerm} setSearchTerm={setSearchTerm} 
        toggleTheme={toggleTheme} theme={theme}
        onUserClick={() => setIsAuthOpen(true)} user={user}
        profile={profile}
        trendFilter={trendFilter} setTrendFilter={setTrendFilter} 
        showHero={currentTab === 'home' && !searchTerm && !trendFilter}
        onNavigate={navigateTo} currentTab={currentTab}
      />
      <main>
        {['home', 'carnes', 'verdu', 'varios', 'favs'].includes(currentTab) ? (
          <>
            {currentTab === 'favs' && filteredProducts.length > 0 && (
              <CartSummary 
                items={filteredProducts} 
                favorites={favorites} 
                benefits={benefits} 
                userMemberships={profile?.membresias} 
                onSaveCart={handleSaveCurrentCart}
                canSave={!!user && savedCarts.length < 2}
                savedCarts={savedCarts}
                onLoadCart={handleLoadSavedCart}
                onDeleteCart={handleDeleteSavedCart}
              />
            )}
            <ProductList 
              products={filteredProducts as any} 
              onProductClick={id => window.location.hash = `product/${id}`}
              onFavoriteToggle={toggleFavorite} 
              isFavorite={id => !!favorites[id]}
              isCartView={currentTab === 'favs'} 
              quantities={favorites}
              onUpdateQuantity={handleFavoriteChangeInCart}
              searchTerm={searchTerm}
              purchasedItems={purchasedItems}
              onTogglePurchased={togglePurchased}
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
      {isAuthOpen && <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
        user={user} 
        profile={profile} 
        onSignOut={handleSignOut} 
        onProfileUpdate={() => loadData(user)}
        savedCarts={savedCarts}
        onSaveCart={handleSaveCurrentCart}
        onDeleteCart={handleDeleteSavedCart}
        onLoadCart={handleLoadSavedCart}
        currentActiveCartSize={Object.keys(favorites).length}
      />}
      <Footer />
    </div>
  );
};

export default App;