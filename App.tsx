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
  const [welcomeMsg, setWelcomeMsg] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(
    (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  );

  // Initialize data
  useEffect(() => {
    const initApp = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        const [prodData, histData, configData] = await Promise.all([
          getProducts(),
          getPriceHistory(7),
          getConfig()
        ]);

        console.log(`Loaded ${prodData?.length || 0} products`);
        setProducts(prodData || []);
        setHistory(histData || []);
        setConfig(configData || {});
        setUser(session?.user || null);

        if (session?.user) {
          const prof = await getProfile(session.user.id);
          setProfile(prof);
          
          if (prof?.nombre) {
            setWelcomeMsg(`¡Bienvenido, ${prof.nombre}!`);
            setTimeout(() => setWelcomeMsg(null), 4000);
          }

          const savedFavs = localStorage.getItem('fav_tickers');
          if (savedFavs) {
            setFavorites(JSON.parse(savedFavs));
          }
        }

        const day = new Date().getDay();
        const benefitData = await getBenefits(day);
        setBenefits(benefitData);

        setLoading(false);
      } catch (err: any) {
        console.error("Failed to initialize app", err);
        setError(err.message || "Error de conexión con la base de datos.");
        setLoading(false);
      }
    };

    initApp();
  }, []);

  // Theme effect - More robust application
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark', 'bg-black', 'text-slate-100');
      document.body.classList.remove('bg-white', 'text-slate-900');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark', 'bg-black', 'text-slate-100');
      document.body.classList.add('bg-white', 'text-slate-900');
    }
  }, [theme]);

  // Sync favorites with localStorage
  useEffect(() => {
    localStorage.setItem('fav_tickers', JSON.stringify(favorites));
  }, [favorites]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const getStats = (p: number[], h: number): ProductStats => {
    const v = p.filter(x => x > 0);
    if (v.length === 0) return { min: 0, spread: '0.0', trendClass: 'neutral', icon: '-', isUp: false, isDown: false };
    const min = Math.min(...v);
    let diff = 0, tc = 'text-slate-500', icon = '-', isUp = false, isDown = false;
    if (h > 0) {
      diff = ((min - h) / h) * 100;
      if (diff > 0.1) {
        tc = 'text-red-500 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded';
        icon = '▲';
        isUp = true;
      } else if (diff < -0.1) {
        tc = 'text-green-500 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded';
        icon = '▼';
        isDown = true;
      }
    }
    return { min, spread: Math.abs(diff).toFixed(1), trendClass: tc, icon, isUp, isDown };
  };

  const processedProducts = useMemo(() => {
    return products.map(p => {
      const prices = [p.p_coto, p.p_carrefour, p.p_dia, p.p_jumbo, p.p_masonline];
      const h7 = history.filter(h => h.nombre_producto === p.nombre).sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
      const h7d = h7.length > 0 ? h7[0].precio_minimo : 0;
      return {
        ...p,
        stats: getStats(prices, h7d),
        prices
      };
    });
  }, [products, history]);

  const filteredProducts = useMemo(() => {
    let result = processedProducts;
    
    // Improved Category Filtering - Case insensitive and more flexible
    if (currentTab === 'carnes') {
      result = result.filter(p => p.categoria?.toLowerCase().includes('carne'));
    } else if (currentTab === 'verdu') {
      result = result.filter(p => p.categoria?.toLowerCase().includes('verdu') || p.categoria?.toLowerCase().includes('fruta'));
    } else if (currentTab === 'varios') {
      // Varios acts as a catch-all for everything else or explicitly 'varios'
      result = result.filter(p => 
        !p.categoria?.toLowerCase().includes('carne') && 
        !p.categoria?.toLowerCase().includes('verdu') &&
        !p.categoria?.toLowerCase().includes('fruta')
      );
    } else if (currentTab === 'favs') {
      result = result.filter(p => favorites[p.id]);
    }

    // Search Filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.nombre.toLowerCase().includes(term) || 
        (p.ticker && p.ticker.toLowerCase().includes(term))
      );
    }

    // Trend Filter
    if (trendFilter) {
      result = result.filter(p => trendFilter === 'up' ? p.stats.isUp : p.stats.isDown);
    }
    
    return result;
  }, [processedProducts, currentTab, searchTerm, trendFilter, favorites]);

  const toggleFavorite = useCallback((id: number) => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }
    const isFav = !!favorites[id];
    const favCount = Object.keys(favorites).length;
    const isPro = profile?.subscription === 'pro' || profile?.subscription === 'premium';
    
    // Limit for free users
    if (!isPro && !isFav && favCount >= 5) {
      alert("Límite de 5 productos para usuarios Free. ¡Pasate a Pro!");
      setIsAuthOpen(true);
      return;
    }

    setFavorites(prev => {
      const newFavs = { ...prev };
      if (newFavs[id]) delete newFavs[id];
      else newFavs[id] = 1;
      return newFavs;
    });
  }, [user, favorites, profile]);

  const updateQuantity = useCallback((id: number, delta: number) => {
    setFavorites(prev => {
      const newFavs = { ...prev };
      if (newFavs[id]) {
        newFavs[id] = Math.max(1, newFavs[id] + delta);
      }
      return newFavs;
    });
  }, []);

  const handleNavigate = (tab: TabType) => {
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setTrendFilter(null);
    if (currentTab === 'favs') setCurrentTab('home');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-black">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-green-500 rounded-full animate-spin"></div>
        <p className="mt-4 font-mono text-xs uppercase tracking-widest text-slate-500">Conectando a Mercado...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-black p-8 text-center">
        <i className="fa-solid fa-triangle-exclamation text-red-500 text-5xl mb-6"></i>
        <h2 className="text-2xl font-black mb-4">Error de Configuración</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mb-8">
          {error}
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-slate-900 dark:bg-white text-white dark:text-black px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const renderContent = () => {
    if (currentTab === 'about') return <AboutView onClose={() => setCurrentTab('home')} content={config.about_content} />;
    if (currentTab === 'terms') return <TermsView onClose={() => setCurrentTab('home')} content={config.terms_content} />;
    if (currentTab === 'contact') return <ContactView onClose={() => setCurrentTab('home')} content={config.contact_content} email={config.contact_email} />;

    return (
      <>
        {currentTab === 'favs' && filteredProducts.length > 0 && (
          <CartSummary 
            items={filteredProducts} 
            favorites={favorites} 
            benefits={benefits}
          />
        )}
        
        <ProductList 
          products={filteredProducts} 
          onProductClick={(id) => setSelectedProductId(id)}
          onFavoriteToggle={toggleFavorite}
          isFavorite={(id) => !!favorites[id]}
          isCartView={currentTab === 'favs'}
          quantities={favorites}
          onUpdateQuantity={updateQuantity}
        />
        
        {filteredProducts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-10 text-center text-slate-400">
             <i className={`fa-solid ${currentTab === 'favs' ? 'fa-cart-shopping' : 'fa-magnifying-glass'} text-6xl mb-6 opacity-20`}></i>
             <p className="text-sm font-bold uppercase tracking-wider mb-2">
               {currentTab === 'favs' ? 'Tu chango está vacío' : 'No encontramos resultados'}
             </p>
             <p className="text-xs mb-8 max-w-[200px] leading-relaxed">
               {currentTab === 'favs' 
                 ? 'Agregá productos desde el inicio para empezar a comparar.' 
                 : 'Probá ajustando la búsqueda o limpiando los filtros de tendencia.'}
             </p>
             {(searchTerm || trendFilter || currentTab === 'favs') && (
               <button 
                onClick={clearFilters}
                className="bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-transform active:scale-95"
               >
                 {currentTab === 'favs' ? 'Ver todos los productos' : 'Limpiar Filtros'}
               </button>
             )}
          </div>
        )}
        <Footer />
      </>
    );
  };

  const isInfoPage = ['about', 'terms', 'contact'].includes(currentTab);

  return (
    <div className="max-w-screen-md mx-auto min-h-screen relative flex flex-col bg-white dark:bg-black shadow-2xl transition-colors duration-500">
      {welcomeMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 dark:bg-white text-white dark:text-black px-6 py-3 rounded-2xl font-bold text-sm shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
          <i className="fa-solid fa-circle-check text-green-500"></i>
          {welcomeMsg}
        </div>
      )}

      <Header 
        searchTerm={searchTerm} 
        setSearchTerm={setSearchTerm} 
        toggleTheme={toggleTheme} 
        theme={theme}
        onUserClick={() => setIsAuthOpen(true)}
        user={user}
        subscription={profile?.subscription || 'free'}
        trendFilter={trendFilter}
        setTrendFilter={setTrendFilter}
        showHero={currentTab === 'home' && !searchTerm && !trendFilter}
        onNavigate={handleNavigate}
      />

      <main className={`flex-1 ${!isInfoPage ? 'pb-24' : ''}`}>
        {renderContent()}
      </main>

      {!isInfoPage && (
        <BottomNav 
          currentTab={currentTab} 
          setCurrentTab={setCurrentTab} 
          cartCount={Object.keys(favorites).length}
        />
      )}

      {selectedProductId && (
        <ProductDetail 
          productId={selectedProductId} 
          onClose={() => setSelectedProductId(null)}
          onFavoriteToggle={toggleFavorite}
          isFavorite={!!favorites[selectedProductId]}
          products={products}
        />
      )}

      {isAuthOpen && (
        <AuthModal 
          isOpen={isAuthOpen} 
          onClose={() => setIsAuthOpen(false)} 
          user={user}
          profile={profile}
          onNavigate={handleNavigate}
          onSignOut={() => {
            setUser(null);
            setProfile(null);
            setFavorites({});
          }}
        />
      )}
    </div>
  );
};

export default App;