import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase, getProducts, getPriceHistory, getProfile, getConfig, getBenefits, getSavedCartData, saveCartData } from './services/supabase';
import { Product, PriceHistory, Profile, TabType, ProductStats, Benefit, CartItem } from './types';
import { calculateStoreTotal } from './utils/calculateStoreTotal';
import Header from './components/Header';
import ProductList from './components/ProductList';
import BottomNav from './components/BottomNav';
import ProductDetail from './components/ProductDetail';
import AuthModal from './components/AuthModal';
import CartSummary from './components/CartSummary';
import Footer from './components/Footer';
import { AboutView, TermsView, ContactView } from './components/InfoViews';
import { Routes, Route, useNavigate, useLocation, useParams, Navigate } from 'react-router-dom';


const slugify = (text: string) => {
  return text.toString().toLowerCase()
    .trim()
    .replace(/\s+/g, '-')     // Espacios por guiones
    .replace(/[^\w-]+/g, '')  // Quitar caracteres raros
    .replace(/--+/g, '-');    // Quitar guiones dobles
};

const calculateOutliers = (products: Product[]): Product[] => {
  return products.map(product => {
    const p_prices: number[] = [];
    const pr_prices: number[] = [];

    STORES.forEach(store => {
      const p_key = store.key as keyof Product;
      const pr_key = `pr_${store.key.split('_')[1]}` as keyof Product;

      const p_price = product[p_key] as number;
      if (p_price > 0) {
        p_prices.push(p_price);
      }

      const pr_price = product[pr_key] as number;
      if (pr_price > 0) {
        pr_prices.push(pr_price);
      }
    });

    const calculateMedian = (prices: number[]): number => {
      if (prices.length === 0) return 0;
      const sorted = [...prices].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      if (sorted.length % 2 === 0) {
        return (sorted[mid - 1] + sorted[mid]) / 2;
      }
      return sorted[mid];
    };

    const p_median = calculateMedian(p_prices);
    const pr_median = calculateMedian(pr_prices);

    const outliers: { [key: string]: boolean } = {};

    STORES.forEach(store => {
      const storeKey = store.name.toLowerCase().replace(' ', '');
      const p_key = store.key as keyof Product;
      const pr_key = `pr_${store.key.split('_')[1]}` as keyof Product;

      const p_price = product[p_key] as number;
      if (p_median > 0 && p_price > 0) {
        const p_deviation = Math.abs((p_price - p_median) / p_median);
        if (p_deviation > 0.5) {
          outliers[storeKey] = true;
        }
      }

      const pr_price = product[pr_key] as number;
      if (pr_median > 0 && pr_price > 0) {
        const pr_deviation = Math.abs((pr_price - pr_median) / pr_median);
        if (pr_deviation > 0.5) {
          outliers[storeKey] = true;
        }
      }
    });

    return {
      ...product,
      outliers: JSON.stringify(outliers),
    };
  });
};

const ProductDetailWrapper = ({ products, favorites, toggleFavorite, theme, onUpdateQuantity }: any) => {
  const { category, slug } = useParams(); 
  const navigate = useNavigate();
  
  // Buscamos el producto por categoría y por el nombre transformado a slug
  const product = products.find((p: any) => 
    slugify(p.categoria || 'general') === category && 
    slugify(p.nombre) === slug
  );

  // Si no hay productos cargados todavía, esperamos
  if (products.length === 0) return null;
  // Si terminó de cargar y no encontró el producto, volvemos al inicio
  if (!product) return <Navigate to="/" replace />;

  return (
    <ProductDetail 
        productId={product.id} // Antes decía selectedProduct (error)
        onClose={() => navigate(-1)} // Antes decía closeModal (error)
        isFavorite={!!favorites[product.id]}
        onFavoriteToggle={toggleFavorite}
        products={products}
        theme={theme}
        quantities={favorites} // Usamos el objeto de favoritos
        onUpdateQuantity={onUpdateQuantity} // Pasamos la función de actualización
      />
  );
};

const STORES = [
  { name: "COTO", key: 'p_coto', url: 'url_coto' },
  { name: "CARREFOUR", key: 'p_carrefour', url: 'url_carrefour' },
  { name: "DIA", key: 'p_dia', url: 'url_dia' },
  { name: "JUMBO", key: 'p_jumbo', url: 'url_jumbo' },
  { name: "MAS ONLINE", key: 'p_masonline', url: 'url_masonline' }
] as const;

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
  
  // MODIFICACIÓN: Carga inicial desde LocalStorage para evitar pérdida al minimizar/recargar
  const [favorites, setFavorites] = useState<Record<number, number>>(() => {
    const saved = localStorage.getItem('tc_favs');
    return saved ? JSON.parse(saved) : {};
  });

  const [savedCarts, setSavedCarts] = useState<any[]>((() => {
    const saved = localStorage.getItem('tc_saved_lists');
    return saved ? JSON.parse(saved) : [];
  }));

  const [purchasedItems, setPurchasedItems] = useState<Set<number>>(new Set());
  const [showPwaPill, setShowPwaPill] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(
    (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  );

  const isInitialMount = useRef(true);
  const navigate = useNavigate();
  const location = useLocation();

  // --- EFECTO DE RECUPERACIÓN DE CONTRASEÑA ---
  useEffect(() => {
    // Si la URL contiene el hash de recuperación, preparamos el modal.
    if (location.hash.includes('type=recovery')) {
      // Guardamos en localStorage para que el modal sepa qué vista mostrar.
      localStorage.setItem('active_auth_view', 'update_password');
      setIsAuthOpen(true);
    }
  }, [location.hash]);


  useEffect(() => {
    // Solo borramos si NO estamos en la misma página (evita bucles)
    setSearchTerm('');
    setTrendFilter(null);
  }, [location.pathname]);
  
  const navigateTo = (path: string) => navigate(path === 'home' ? '/' : '/' + path.replace('/', ''));

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
      setTheme('dark');
    } else {
      document.documentElement.classList.remove('dark');
      setTheme('light');
    }
  }, []);

  useEffect(() => {
  const handleBeforeInstallPrompt = (e: any) => {
    console.log("Evento de instalación capturado");
    // 1. Prevenimos el cartel por defecto de Chrome
    e.preventDefault();
    // 2. Guardamos el evento para usarlo luego
    setDeferredPrompt(e);
    
    // 3. Verificamos si ya está instalada
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
                         || (navigator as any).standalone === true;

    if (!isStandalone) {
      // Forzamos la aparición del botón después de 1 segundo
      setTimeout(() => {
        setShowPwaPill(true);
      }, 1000);
    }
  };

  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

  return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
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

    const loadData = useCallback(async (sessionUser: User | null) => {
  try {
    // 1. CARGA INICIAL DESDE CACHÉ (Evita que la pantalla se trabe si la DB está ocupada)
    if (products.length === 0) {
      const cachedProds = localStorage.getItem('tc_cache_products');
      const cachedHist = localStorage.getItem('tc_cache_history');
      const cachedConf = localStorage.getItem('tc_cache_config');

      if (cachedProds && cachedHist && cachedConf) {
        // Si hay caché, la mostramos de una y quitamos el loading
        setProducts(JSON.parse(cachedProds));
        setHistory(JSON.parse(cachedHist));
        setConfig(JSON.parse(cachedConf));
        setLoading(false); 
      } else {
        // Si no hay nada en caché y no hay productos, activamos el loading normal
        setLoading(true);
      }
    }

    // 2. PETICIÓN A SUPABASE (Se ejecuta en paralelo)
    const [prodData, histData, configData] = await Promise.all([
      getProducts(),
      getPriceHistory(7),
      getConfig()
    ]);

    // Procesamos la información recibida
    const productsWithOutliers = calculateOutliers(prodData || []);
    
    // Actualizamos estados con datos frescos
    setProducts(productsWithOutliers || []);
    setHistory(histData || []);
    setConfig(configData || {});

    // 3. ACTUALIZAMOS EL CACHÉ (Para la próxima vez que la DB esté lenta)
    if (prodData && prodData.length > 0) {
      localStorage.setItem('tc_cache_products', JSON.stringify(productsWithOutliers));
      localStorage.setItem('tc_cache_history', JSON.stringify(histData || []));
      localStorage.setItem('tc_cache_config', JSON.stringify(configData || {}));
    }

    // --- LÓGICA DE USUARIO Y PERFIL (Mantenida intacta) ---
    if (sessionUser) {
      let prof = await getProfile(sessionUser.id);
      if (prof && prof.subscription === 'pro' && prof.subscription_end) {
        const expiryDate = new Date(prof.subscription_end);
        if (expiryDate < new Date()) {
          await supabase.from('perfiles').update({ subscription: 'free' }).eq('id', sessionUser.id);
          prof = { ...prof, subscription: 'free' };
        }
      }
      setProfile(prof);
      
      const cartData = await getSavedCartData(sessionUser.id);
      if (cartData) {
        setFavorites(cartData.active || {});
        setSavedCarts(cartData.saved || []);
        localStorage.setItem('tc_favs', JSON.stringify(cartData.active || {}));
        localStorage.setItem('tc_saved_lists', JSON.stringify(cartData.saved || []));
      }
    }
    
    const day = new Date().getDay();
    const benefitData = await getBenefits(day);
    setBenefits(benefitData);

  } catch (err: any) {
    console.error("Error loading app data (La DB podría estar ocupada):", err);
    // Si hay un error (por el bot), el usuario no se entera porque ya está viendo la caché.
  } finally {
    setLoading(false);
    isInitialMount.current = false;
  }
}, [products.length, calculateOutliers]); // Asegúrate de que calculateOutliers esté en las dependencias si es necesario

  // --- 2. SESIÓN INICIAL Y ESCUCHA DE AUTH (Limpio y Cerrado) ---
  // --- 2. SESIÓN INICIAL Y ESCUCHA DE AUTH ---
useEffect(() => {
  const auth = supabase.auth as any;

  loadData(null);

  auth.getSession().then(({ data: { session } }: any) => {
    const sessionUser = session?.user ?? null;
    setUser(sessionUser);
    if (sessionUser) loadData(sessionUser);
  });

  const { data: { subscription } } = auth.onAuthStateChange((event: any, session: any) => {
    const sessionUser = session?.user ?? null;
    setUser(sessionUser);
    
    if (event === 'PASSWORD_RECOVERY') {
      setIsAuthOpen(true);
      localStorage.setItem('active_auth_view', 'update_password');
    }

    // Si el usuario inicia sesión O sus datos se actualizan (como al cambiar contraseña),
    // recargamos sus datos.
    if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
      loadData(sessionUser);
    }
    
    if (event === 'SIGNED_OUT') { 
      setProfile(null); 
      setFavorites({}); 
      setSavedCarts([]); 
      setPurchasedItems(new Set());
    }
  });

  return () => {
    if (subscription) subscription.unsubscribe();
  };
}, [loadData]);

// --- PERSISTENCIA MEJORADA (LOCAL + NUBE + MINIMIZADO) ---
  useEffect(() => {
  // 1. Guardado INSTANTÁNEO en LocalStorage (esto es infalible)
  localStorage.setItem('tc_favs', JSON.stringify(favorites));
  localStorage.setItem('tc_saved_lists', JSON.stringify(savedCarts));

   const sincronizarConNube = async () => {
    if (user && !loading) {
      try {
        const dataToSave = { active: favorites, saved: savedCarts };
        await saveCartData(user.id, dataToSave);
      } catch (e) {
        console.error("Error sincronizando:", e);
      }
    }
  };

  // 2. Detectar cuando el usuario minimiza o cambia de pestaña
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      sincronizarConNube(); // Guarda inmediatamente sin esperar al timer
    }
  };

  // 3. Timer para uso normal (bajado a 800ms para más rapidez)
  const timer = setTimeout(sincronizarConNube, 800);

  document.addEventListener("visibilitychange", handleVisibilityChange);
  
  return () => {
    clearTimeout(timer);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}, [favorites, savedCarts, user, loading]);

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

  const isPro = useMemo(() => {
    if (!profile || profile.subscription !== 'pro') return false;
    return profile.subscription_end ? new Date(profile.subscription_end) > new Date() : false;
  }, [profile]);

  const filteredProducts = useMemo(() => {
    const currentPath = location.pathname;
    let result = products.map(p => {
      // 1. Parsear el JSON de outliers
      let outlierData: any = {};
      try {
        outlierData = typeof p.outliers === 'string' ? JSON.parse(p.outliers) : (p.outliers || {});
      } catch (e) { outlierData = {}; }

      // 2. Construir el array de precios FILTRADO
      const prices = STORES.map(s => {
        const storeKey = s.name.toLowerCase().replace(' ', ''); // coto, carrefour, etc.
        const price = (p as any)[s.key] || 0;
        const url = (p as any)[s.url];
        const stockKey = `stock_${storeKey}`;
        const hasStock = (p as any)[stockKey] !== false;

        // VALIDACIÓN: ¿Es outlier? ¿Tiene URL válida?
        const isOutlier = outlierData[storeKey] === true;
        const hasUrl = url && url !== '#' && url.length > 5;

        if (price > 0 && hasUrl && !isOutlier && hasStock) {
          return price;
        }
        return 0; // Se ignora
      });

      const h7 = history.find(h => h.nombre_producto === p.nombre);
      return { ...p, stats: getStats(prices, h7?.precio_minimo || 0), prices };
    })
     
    .filter(p => {
      const proveedoresConPrecio = p.prices.filter(price => price > 0).length;
      return proveedoresConPrecio >= 2;
    });

    if (currentPath === '/carnes') result = result.filter(p => p.categoria?.toLowerCase().includes('carne'));
    else if (currentPath === '/verdu') result = result.filter(p => p.categoria?.toLowerCase().includes('verdu') || p.categoria?.toLowerCase().includes('fruta'));
    else if (currentPath === '/bebidas') result = result.filter(p => p.categoria?.toLowerCase().includes('bebida'));
    else if (currentPath === '/varios') {
      const excludedCategories = ['carne', 'verdu', 'fruta', 'bebida'];
      result = result.filter(p => {
        const cat = p.categoria?.toLowerCase() || '';
        return !excludedCategories.some(excluded => cat.includes(excluded));
      });
    }
    if (currentPath === '/chango') {
      const cartItems: CartItem[] = result
        .filter(p => favorites[p.id])
        .map(p => ({ ...p, quantity: favorites[p.id] || 1 }));
      
      const storeTotals = STORES.map(store => {
        const storeKey = store.name.toLowerCase().replace(' ', '');
        return {
          name: store.name,
          total: calculateStoreTotal(cartItems, storeKey)
        };
      });

      result = result.filter(p => favorites[p.id]);
    }

    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      result = result.filter(p => p.nombre.toLowerCase().includes(t) || (p.ticker && p.ticker.toLowerCase().includes(t)));
    }
    if (trendFilter && currentPath !== '/chango') {
      result = result.filter(p => trendFilter === 'up' ? p.stats.isUp : p.stats.isDown);
    }
    return result;
  }, [products, history, location.pathname, searchTerm, trendFilter, favorites]);

  const toggleFavorite = (id: number) => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }
    const favoritesCount = Object.keys(favorites).length;
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
    const limit = isPro ? 10 : 2;
    if (savedCarts.length >= limit) {
      alert(`Límite de listas alcanzado (${limit}).`);
      return;
    }
    setSavedCarts(prev => [...prev, { name, items: { ...favorites }, date: new Date().toISOString() }]);
  };

  const handleDeleteSavedCart = (index: number) => {
    setSavedCarts(prev => {
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
  };

  const handleLoadSavedCart = (index: number) => {
    setFavorites(savedCarts[index].items);
    setPurchasedItems(new Set());
    navigate('/chango');
  };

  const scrollPositionRef = useRef(0);

  const handleProductClick = (product: Product) => {
    scrollPositionRef.current = window.scrollY;
    const categorySlug = slugify(product.categoria || 'general');
    const productSlug = slugify(product.nombre);
    navigate(`/${categorySlug}/${productSlug}`);
  };

  useEffect(() => {
    const listPaths = ['/', '/chango', '/carnes', '/verdu', '/varios'];
    if (listPaths.includes(location.pathname)) {
      window.scrollTo(0, scrollPositionRef.current);
    }
  }, [location.pathname]);

  const handleSignOut = async () => {
  setLoading(true);
  
  // 1. Forzar borrado local INMEDIATO de tokens de Supabase
  // Esto evita que el F5 encuentre la sesión vieja
  const keysToRemove = Object.keys(localStorage).filter(key => key.startsWith('sb-'));
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  localStorage.removeItem('tc_favs');
  localStorage.removeItem('tc_saved_lists');

  // 2. Ejecutar el cierre de sesión en el servidor
  await supabase.auth.signOut();
  // 3. Limpiar estado de la App
  setUser(null);
  setProfile(null);
  setFavorites({});
  setSavedCarts([]);
  setPurchasedItems(new Set());
  setIsAuthOpen(false);
  setLoading(false);
  
  navigate('/', { replace: true });
};
  // Calculamos la cantidad de productos en el carrito que realmente son visibles
  const visibleCartCount = useMemo(() => {
    return products.filter(p => favorites[p.id] && (p as any).visible_web !== false).length;
  }, [favorites, products]);

  if (loading && products.length === 0) return <div className="min-h-screen flex items-center justify-center dark:bg-primary dark:text-white font-mono text-[11px] uppercase tracking-[0.2em]">Conectando a Mercado...</div>;
 
  return (
  <div className="max-w-screen-md mx-auto min-h-screen bg-white dark:bg-primary shadow-2xl transition-colors font-sans pb-16">
    
    {showPwaPill && (
  /* El md:hidden asegura que en PC/Escritorio no se vea */
  <div className="fixed bottom-[75px] left-1/2 -translate-x-1/2 z-[9999] w-[85%] max-w-[320px] md:hidden animate-in slide-in-from-bottom-5 duration-500">
    <div className="bg-neutral-900 dark:bg-white text-white dark:text-black p-3.5 rounded-2xl shadow-[0_15px_45px_rgba(0,0,0,0.4)] flex items-center justify-between relative border border-neutral-800 dark:border-neutral-100">
      
      {/* BOTÓN X - Más pequeño */}
      <button 
        onClick={(e) => {
          e.stopPropagation();
          setShowPwaPill(false);
        }}
        className="absolute -top-1.5 -right-1.5 bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-neutral-900 active:scale-90 transition-transform"
      >
        <i className="fa-solid fa-xmark text-[10px]"></i>
      </button>

      <div className="flex items-center gap-3">
        {/* Icono reducido */}
        <div className="w-9 h-9 bg-green-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-green-500/30">
          <i className="fa-solid fa-cart-arrow-down text-base"></i>
        </div>
        
        <div className="flex flex-col">
          <span className="text-[11px] font-black uppercase tracking-tight leading-none mb-0.5">
            TradingChango
          </span>
          <span className="text-[8px] font-bold opacity-70 uppercase tracking-widest leading-none">
            Compará antes de comprar
          </span>
        </div>
      </div>

      {/* Botón Instalar reducido */}
      <button 
        onClick={handleInstallClick}
        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-green-500/20"
      >
        Instalar
      </button>

    </div>
  </div>
)}
      <Header 
        searchTerm={searchTerm} setSearchTerm={setSearchTerm} 
        toggleTheme={toggleTheme} theme={theme}
        onUserClick={() => setIsAuthOpen(true)} user={user}
        profile={profile}
        trendFilter={trendFilter} setTrendFilter={setTrendFilter}
      />
      <main>
        <Routes>
  <Route path="/" element={
    <ProductList 
      products={filteredProducts} 
      onProductClick={handleProductClick}
      onFavoriteToggle={toggleFavorite} 
      isFavorite={id => !!favorites[id]}
      isCartView={false} 
      quantities={favorites}
      onUpdateQuantity={handleFavoriteChangeInCart}
      searchTerm={searchTerm}
      purchasedItems={purchasedItems}
      onTogglePurchased={togglePurchased}
    />
  } />
  <Route path="/carnes" element={
    <ProductList 
      products={filteredProducts} 
      onProductClick={handleProductClick}
      onFavoriteToggle={toggleFavorite} 
      isFavorite={id => !!favorites[id]}
      isCartView={false} 
      quantities={favorites}
      onUpdateQuantity={handleFavoriteChangeInCart}
      searchTerm={searchTerm}
      purchasedItems={purchasedItems}
      onTogglePurchased={togglePurchased}
    />
  } />
  <Route path="/verdu" element={
    <ProductList 
      products={filteredProducts} 
      onProductClick={handleProductClick}
      onFavoriteToggle={toggleFavorite} 
      isFavorite={id => !!favorites[id]}
      isCartView={false} 
      quantities={favorites}
      onUpdateQuantity={handleFavoriteChangeInCart}
      searchTerm={searchTerm}
      purchasedItems={purchasedItems}
      onTogglePurchased={togglePurchased}
    />
  } />
  <Route path="/varios" element={
    <ProductList 
      products={filteredProducts} 
      onProductClick={handleProductClick}
      onFavoriteToggle={toggleFavorite} 
      isFavorite={id => !!favorites[id]}
      isCartView={false} 
      quantities={favorites}
      onUpdateQuantity={handleFavoriteChangeInCart}
      searchTerm={searchTerm}
      purchasedItems={purchasedItems}
      onTogglePurchased={togglePurchased}
    />
  } />
  <Route path="/chango" element={
    <>
      {filteredProducts.length > 0 && (
        <CartSummary 
          items={filteredProducts.map(p => ({ ...p, quantity: favorites[p.id] || 1 }))}
          benefits={benefits} 
          userMemberships={profile?.membresias} 
          onSaveCart={handleSaveCurrentCart}
          canSave={!!user}
          savedCarts={savedCarts}
          onLoadCart={handleLoadSavedCart}
          onDeleteCart={handleDeleteSavedCart}
        />
      )}
      <ProductList 
        products={filteredProducts} 
        onProductClick={handleProductClick}                
        onFavoriteToggle={toggleFavorite} 
        isFavorite={id => !!favorites[id]}
        isCartView={true} 
        quantities={favorites}
        onUpdateQuantity={handleFavoriteChangeInCart}
        searchTerm={searchTerm}
        purchasedItems={purchasedItems}
        onTogglePurchased={togglePurchased}
      />
    </>
  } />

<Route path="/:category/:slug" element={
  <ProductDetailWrapper 
    products={products} 
    favorites={favorites} 
    toggleFavorite={toggleFavorite} 
    theme={theme} 
    onUpdateQuantity={handleFavoriteChangeInCart} 
  />
} />
  <Route path="/acerca-de" element={<AboutView onClose={() => navigate('/')} content={config.acerca_de} />} />
  <Route path="/terminos" element={<TermsView onClose={() => navigate('/')} content={config.terminos} />} />
  <Route path="/contacto" element={<ContactView onClose={() => navigate('/')} content={config.contacto} email={profile?.email} />} />
  <Route path="/update-password" element={
      <ProductList 
        products={filteredProducts} 
        onProductClick={handleProductClick}
        onFavoriteToggle={toggleFavorite} 
        isFavorite={id => !!favorites[id]}
        isCartView={false} 
        quantities={favorites}
        onUpdateQuantity={handleFavoriteChangeInCart}
        searchTerm={searchTerm}
        purchasedItems={purchasedItems}
        onTogglePurchased={togglePurchased}
      />
    } />

</Routes>
      </main>
      <BottomNav cartCount={visibleCartCount} />
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
        currentActiveCartSize={visibleCartCount}
      />}
      <Footer />
    </div>
  );
};

export default App;
