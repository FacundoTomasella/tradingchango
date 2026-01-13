import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, getProducts, getPriceHistory, getProfile, getConfig, getBenefits } from './services/supabase';
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
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<TabType>('home');
  const [searchTerm, setSearchTerm] = useState('');
  const [trendFilter, setTrendFilter] = useState<'up' | 'down' | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [favorites, setFavorites] = useState<Record<number, number>>({});
  const [theme, setTheme] = useState<'light' | 'dark'>(
    (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  );

  // --- HASH ROUTING LOGIC ---
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash.startsWith('product/')) {
        const id = parseInt(hash.split('/')[1]);
        if (!isNaN(id)) setSelectedProductId(id);
      } else if (['about', 'terms', 'contact'].includes(hash)) {
        setCurrentTab(hash as TabType);
      } else if (['home', 'carnes', 'verdu', 'varios', 'favs'].includes(hash)) {
        setCurrentTab(hash as TabType);
      } else {
        if (!hash) window.location.hash = 'home';
      }
    };
    window.addEventListener('hashchange', handleHash);
    handleHash();
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const navigateTo = (tab: TabType) => {
    window.location.hash = tab;
  };

  const openProduct = (id: number) => {
    window.location.hash = `product/${id}`;
  };

  const closeProduct = () => {
    const lastTab = ['home', 'carnes', 'verdu', 'varios', 'favs', 'about', 'terms', 'contact'].includes(currentTab) ? currentTab : 'home';
    window.location.hash = lastTab;
    setSelectedProductId(null);
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
        const savedFavs = localStorage.getItem(`favs_${sessionUser.id}`);
        if (savedFavs) setFavorites(JSON.parse(savedFavs));
      }

      const day = new Date().getDay();
      const benefitData = await getBenefits(day);
      setBenefits(benefitData);
      setLoading(false);
    } catch (err: any) {
      console.error("Error loading app data:", err);
      setError("No se pudieron cargar los productos.");
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
      if (_event === 'SIGNED_IN') {
        loadData(sessionUser);
      } else if (_event === 'SIGNED_OUT') {
        setProfile(null);
        setFavorites({});
      }
    });

    return () => subscription.unsubscribe();
  }, [loadData]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(`favs_${user.id}`, JSON.stringify(favorites));
    }
  }, [favorites, user]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

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
    const isFav = !!favorites[id];
    const isPro = profile?.subscription === 'pro' || profile?.subscription === 'premium';
    const favCount = Object.keys(favorites).length;

    if (!isPro && !isFav && favCount >= 5) {
      alert("Límite de 5 favoritos para usuarios FREE. ¡Pasate a PRO para ilimitados!");
      return;
    }

    setFavorites(prev => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = 1;
      return next;
    });
  };

  if (loading && products.length === 0) return <div className="min-h-screen flex items-center justify-center dark:bg-black dark:text-white font-mono text-xs uppercase tracking-widest animate-pulse">Analizando mercado...</div>;

  const isProductTab = ['home', 'carnes', 'verdu', 'varios', 'favs'].includes(currentTab);

  return (
    <div className="max-w-screen-md mx-auto min-h-screen bg-white dark:bg-black shadow-2xl transition-colors">
      <Header 
        searchTerm={searchTerm} setSearchTerm={setSearchTerm} 
        toggleTheme={toggleTheme} theme={theme}
        onUserClick={() => setIsAuthOpen(true)} user={user}
        subscription={profile?.subscription} trendFilter={trendFilter}
        setTrendFilter={setTrendFilter} 
        showHero={currentTab === 'home' && !searchTerm && !trendFilter}
        onNavigate={navigateTo}
        currentTab={currentTab}
      />
      <main className="pb-24">
        {error && <div className="p-4 bg-red-50 text-red-600 text-xs font-bold text-center">{error}</div>}
        {isProductTab ? (
          <>
            {currentTab === 'favs' && filteredProducts.length > 0 && <CartSummary items={filteredProducts} favorites={favorites} benefits={benefits} />}
            <ProductList 
              products={filteredProducts as any} onProductClick={openProduct}
              onFavoriteToggle={toggleFavorite} isFavorite={id => !!favorites[id]}
              isCartView={currentTab === 'favs'} quantities={favorites}
              onUpdateQuantity={(id, d) => setFavorites(p => ({...p, [id]: Math.max(1, (p[id]||1)+d)}))}
            />
            {!loading && filteredProducts.length === 0 && (
              <div className="py-20 text-center flex flex-col items-center gap-4 animate-in fade-in duration-700 px-8">
                {currentTab === 'favs' ? (
                  <>
                    <i className="fa-solid fa-cart-shopping text-6xl text-slate-100 dark:text-slate-900"></i>
                    <div className="text-black dark:text-white text-base font-[800] uppercase tracking-tight">Tu chango está vacío</div>
                    <p className="text-slate-500 text-sm font-medium">Agregá productos para comparar el total en los distintos supermercados.</p>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-magnifying-glass text-6xl text-slate-100 dark:text-slate-900"></i>
                    <div className="text-black dark:text-white text-base font-[800] uppercase tracking-tight">No se encontraron resultados</div>
                    <p className="text-slate-500 text-sm font-medium">Probá buscando con otras palabras o filtros.</p>
                  </>
                )}
              </div>
            )}
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
      {selectedProductId && <ProductDetail productId={selectedProductId} onClose={closeProduct} onFavoriteToggle={toggleFavorite} isFavorite={!!favorites[selectedProductId]} products={products} theme={theme} />}
      {isAuthOpen && <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} user={user} profile={profile} onSignOut={() => setUser(null)} />}
      <Footer />
    </div>
  );
};

export default App;