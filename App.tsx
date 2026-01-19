import React, { useState, useEffect, useMemo, useCallback } from 'react';
// Importamos solo lo necesario, si User o Session fallan, usaremos 'any' o los tipos de Supabase
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
  const [user, setUser] = useState<any>(null); // Usamos any para evitar errores de importación de tipos
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

  // 1. CARGAR FAVORITOS LOCALES AL EMPEZAR
  useEffect(() => {
    const savedLocalFavs = localStorage.getItem('local_favorites');
    if (savedLocalFavs) {
      try {
        setFavorites(JSON.parse(savedLocalFavs));
      } catch (e) {
        console.error("Error cargando favoritos locales", e);
      }
    }
  }, []);

  // 2. MANEJO DE SESIÓN Y DATOS (Versión compatible)
  const loadData = useCallback(async (sessionUser: any) => {
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
        let prof = await getProfile(sessionUser.id);
        if (prof && prof.subscription === 'pro' && prof.subscription_end) {
          if (new Date(prof.subscription_end) < new Date()) {
            await supabase.from('perfiles').update({ subscription: 'free' }).eq('id', sessionUser.id);
            prof = { ...prof, subscription: 'free' };
          }
        }
        setProfile(prof);

        const cartData = await getSavedCartData(sessionUser.id);
        if (cartData) {
          // Si el usuario tiene favoritos en la nube, los combinamos con los locales
          // o priorizamos los de la nube
          if (cartData.active && Object.keys(cartData.active).length > 0) {
            setFavorites(cartData.active);
          }
          setSavedCarts(cartData.saved || []);
        }
      }
      
      const benefitData = await getBenefits(new Date().getDay());
      setBenefits(benefitData);
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Usamos (supabase.auth as any) para saltar errores de tipos si la librería está dando problemas
    const auth = supabase.auth as any;

    auth.getSession?.().then(({ data: { session } }: any) => {
      const sUser = session?.user ?? null;
      setUser(sUser);
      loadData(sUser);
    }) || auth.session?.() && loadData(auth.session().user); // Compatibilidad v1/v2

    const { data: authListener } = auth.onAuthStateChange((_event: string, session: any) => {
      const sUser = session?.user ?? null;
      setUser(sUser);
      if (_event === 'SIGNED_IN') loadData(sUser);
      if (_event === 'SIGNED_OUT') {
        setProfile(null);
        setSavedCarts([]);
        setPurchasedItems(new Set());
        // Al salir, mantenemos los favoritos que estaban (ahora son locales)
      }
    });

    return () => {
      if (authListener?.subscription) authListener.subscription.unsubscribe();
      else if (authListener) (authListener as any).unsubscribe();
    };
  }, [loadData]);

  // 3. GUARDADO AUTOMÁTICO (Local y Nube)
  useEffect(() => {
    // Guardar siempre en LocalStorage (para que persista sin cuenta)
    localStorage.setItem('local_favorites', JSON.stringify(favorites));

    // Si hay usuario, sincronizar con la nube
    if (user) {
      const dataToSave = { active: favorites, saved: savedCarts };
      saveCartData(user.id, dataToSave).catch(console.error);
    }
  }, [favorites, savedCarts, user]);

  // 4. LÓGICA DE FAVORITOS (Sin obligación de login para agregar)
  const toggleFavorite = (id: number) => {
    setFavorites(prev => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else {
        // Límite de 5 solo si está logueado y es FREE
        const count = Object.keys(prev).length;
        const isPro = profile?.subscription === 'pro';
        if (user && !isPro && count >= 5) {
          alert('Límite de 5 productos para usuarios Free. ¡Pásate a PRO!');
          return prev;
        }
        next[id] = 1;
      }
      return next;
    });
  };

  // --- El resto de funciones (handleFavoriteChangeInCart, etc.) se mantienen igual ---

  const handleFavoriteChangeInCart = (id: number, delta: number) => {
    setFavorites(prev => {
      const newQty = (prev[id] || 1) + delta;
      if (newQty <= 0) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: newQty };
    });
  };

  const handleSignOut = async () => {
    await (supabase.auth as any).signOut();
    setUser(null);
    setProfile(null);
    setSavedCarts([]);
    setPurchasedItems(new Set());
    setIsAuthOpen(false);
    navigateTo('home');
  };

  const navigateTo = (tab: TabType) => {
    window.location.hash = tab;
    setCurrentTab(tab);
  };

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  // Funciones de renderizado y lógica de productos...
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

  if (loading && products.length === 0) return <div className="min-h-screen flex items-center justify-center dark:bg-primary dark:text-white">Cargando...</div>;

  return (
    <div className="max-w-screen-md mx-auto min-h-screen bg-white dark:bg-primary shadow-2xl transition-colors font-sans pb-24">
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
                onSaveCart={(name) => setSavedCarts([...savedCarts, { name, items: { ...favorites }, date: new Date().toISOString() }])}
                canSave={!!user && savedCarts.length < 2}
                savedCarts={savedCarts}
                onLoadCart={(idx) => setFavorites(savedCarts[idx].items)}
                onDeleteCart={(idx) => setSavedCarts(savedCarts.filter((_, i) => i !== idx))}
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
              onTogglePurchased={(id) => {
                const newP = new Set(purchasedItems);
                if (newP.has(id)) newP.delete(id); else newP.add(id);
                setPurchasedItems(newP);
              }}
            />
          </>
        ) : (
          <div className="animate-in fade-in duration-500">
            {currentTab === 'about' && <AboutView onClose={() => navigateTo('home')} content={config.acerca_de} />}
            {currentTab === 'terms' && <TermsView onClose={() => navigateTo('home')} content={config.terminos} />}
            {currentTab === 'contact' && <ContactView onClose={() => navigateTo('home')} content={config.contacto} email={profile?.email || ''} />}
          </div>
        )}
      </main>
      <BottomNav currentTab={currentTab} setCurrentTab={navigateTo} cartCount={Object.keys(favorites).length} />
      {selectedProductId && <ProductDetail productId={selectedProductId} onClose={() => navigateTo(currentTab)} onFavoriteToggle={toggleFavorite} isFavorite={!!favorites[selectedProductId]} products={products} theme={theme} />}
      {isAuthOpen && <AuthModal 
        isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} user={user} profile={profile} onSignOut={handleSignOut} 
        onProfileUpdate={() => loadData(user)} savedCarts={savedCarts}
        onSaveCart={(name) => setSavedCarts([...savedCarts, { name, items: { ...favorites }, date: new Date().toISOString() }])}
        onDeleteCart={(idx) => setSavedCarts(savedCarts.filter((_, i) => i !== idx))}
        onLoadCart={(idx) => setFavorites(savedCarts[idx].items)}
        currentActiveCartSize={Object.keys(favorites).length}
      />}
      <Footer />
    </div>
  );
};

export default App;