import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
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

const MemoizedHeader = memo(Header); 
const MemoizedBottomNav = memo(BottomNav); 
const MemoizedFooter = memo(Footer);
const MemoizedProductList = memo(ProductList);

const STORES = [
  { name: "COTO", key: 'p_coto', url: 'url_coto' },
  { name: "CARREFOUR", key: 'p_carrefour', url: 'url_carrefour' },
  { name: "DIA", key: 'p_dia', url: 'url_dia' },
  { name: "JUMBO", key: 'p_jumbo', url: 'url_jumbo' },
  { name: "MAS ONLINE", key: 'p_masonline', url: 'url_masonline' }
] as const;

const slugify = (text: string) => {
  const a = 'àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;'
  const b = 'aaaaaaaaaacccddeeeeeeeegghiiiiiilmnnnnoooooooooprrssssssttuuuuuuuuuwxyyzzz------'
  const p = new RegExp(a.split('').join('|'), 'g')

  return text.toString().toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(p, c => b.charAt(a.indexOf(c))) // Replace special characters
    .replace(/&/g, '-and-') // Replace & with 'and'
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, '') // Trim - from end of text
}

const calculateOutliers = (products: Product[]): Product[] => {
  return products.map(product => {
    const p_prices: number[] = [];
    const pr_prices: number[] = [];

    STORES.forEach((store: (typeof STORES)[number]) => {
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

    STORES.forEach((store: (typeof STORES)[number]) => {
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
  const location = useLocation();
  
  // Buscamos el producto por categoría y por el nombre transformado a slug
  const product = products.find((p: any) => 
    slugify(p.categoria || 'general') === category && 
    slugify(p.nombre) === slug
  );

  // Si no hay productos cargados todavía, esperamos
  if (products.length === 0) return null;
  // Si terminó de cargar y no encontró el producto, volvemos al inicio
  if (!product) return <Navigate to="/" replace />;

  const handleClose = () => {
    // Si el usuario puede volver atrás en el historial, lo hacemos.
    // La key 'default' nos dice si es la primera página en el stack.
    if (location.key !== 'default') {
      navigate(-1);
    } else {
      // Si no hay historial (abrió con link directo), lo mandamos al inicio.
      navigate('/', { replace: true });
    }
  };

  return (
    <ProductDetail 
        productId={product.id}
        onClose={handleClose} // Usamos la nueva función
        isFavorite={!!favorites[product.id]}
        onFavoriteToggle={toggleFavorite}
        products={products}
        theme={theme}
        quantities={favorites}
        onUpdateQuantity={onUpdateQuantity}
      />
  );
};

const normalizeText = (text: string) => {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

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
  const [displayLimit, setDisplayLimit] = useState(20);
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
  const lastListPageRef = useRef(location.pathname);


  
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
      const cachedProds = localStorage.getItem('tc_cache_products');
      const cachedConf = localStorage.getItem('tc_cache_config');
      
      if (cachedProds) {
        setProducts(JSON.parse(cachedProds));
        if (cachedConf) setConfig(JSON.parse(cachedConf));
        setLoading(false); // Desactivar loading si hay caché
      } else {
        setLoading(true); // Solo activar loading si NO hay caché
      }

      const [prodData, configData] = await Promise.all([
        getProducts(),
        getConfig()
      ]);

      const productsWithOutliers = calculateOutliers(prodData || []);
      setProducts(productsWithOutliers || []);
      setConfig(configData || {});
      
      localStorage.setItem('tc_cache_products', JSON.stringify(productsWithOutliers));
      localStorage.setItem('tc_cache_config', JSON.stringify(configData || {}));

      getPriceHistory(7).then(hist => {
        setHistory(hist || []);
        localStorage.setItem('tc_cache_history', JSON.stringify(hist || []));
      });
      
      getBenefits(new Date().getDay()).then(setBenefits);

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
    } catch (err: any) {
      console.error("Error loading app data:", err);
    } finally {
      setLoading(false);
      isInitialMount.current = false;
    }
  }, [products.length]);

  useEffect(() => {
    const auth = supabase.auth as any;

    const fetchProfileAndData = async (sessionUser: User | null) => {
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
        }
      } else {
        setProfile(null);
        const savedFavs = localStorage.getItem('tc_favs');
        const savedLists = localStorage.getItem('tc_saved_lists');
        setFavorites(savedFavs ? JSON.parse(savedFavs) : {});
        setSavedCarts(savedLists ? JSON.parse(savedLists) : []);
      }
      loadData(sessionUser);
    };

    const initializeSession = async () => {
      const { data: { session } } = await auth.getSession();
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      fetchProfileAndData(sessionUser);
    };

    initializeSession();

    const { data: { subscription } } = auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);

      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        fetchProfileAndData(sessionUser);
      }
      
      if (event === 'PASSWORD_RECOVERY') {
        setIsAuthOpen(true);
        localStorage.setItem('active_auth_view', 'update_password');
      }

      if (event === 'SIGNED_OUT') {
        setProfile(null);
        setFavorites({});
        setSavedCarts([]);
        setPurchasedItems(new Set());
        localStorage.removeItem('tc_favs');
        localStorage.removeItem('tc_saved_lists');
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [loadData]);

// --- PERSISTENCIA MEJORADA (LOCAL + NUBE + MINIMIZADO) ---
  useEffect(() => {
  // 1. Guardado INSTANTÁNEO en LocalStorage (esto es infalible)
  localStorage.setItem('tc_favs', JSON.stringify(favorites));
  localStorage.setItem('tc_saved_lists', JSON.stringify(savedCarts));

  const sincronizarConNube = async () => {
    // CONDICIÓN: Solo guardar si el perfil está cargado.
    if (user && profile && !loading) {
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
    if (v.length === 0) return { min: 0, spread: '0.0', trendClass: '', icon: '-', isUp: false, isDown: false, variation: 0 };
    
    const min = Math.min(...v);
    let diff = 0, tc = 'text-neutral-500', icon = '-', isUp = false, isDown = false;
    
    if (h > 0) {
      diff = ((min - h) / h) * 100;
      
      if (diff > 0.1) { 
        tc = 'text-red-600'; 
        icon = '▲'; 
        isUp = true; 
      } else if (diff < -0.1) { 
        tc = 'text-green-600'; 
        icon = '▼'; 
        isDown = true; 
      }
    }
    
    return { 
      min, 
      spread: Math.abs(diff).toFixed(1),
      trendClass: tc, 
      icon, 
      isUp, 
      isDown,
      variation: diff // <-- Devolvemos la variación real
    };
  };

  const isPro = useMemo(() => {
    if (!profile || profile.subscription !== 'pro') return false;
    return profile.subscription_end ? new Date(profile.subscription_end) > new Date() : false;
  }, [profile]);

  const baseFilteredProducts = useMemo(() => {
    const currentPath = location.pathname;
    let result = products.map(p => {
      let outlierData: any = {};
      try {
        outlierData = typeof p.outliers === 'string' ? JSON.parse(p.outliers) : (p.outliers || {});
      } catch (e) { outlierData = {}; }

      const prices = STORES.map(s => {
        const storeKey = s.name.toLowerCase().replace(' ', '');
        const price = (p as any)[s.key] || 0;
        const url = (p as any)[s.url];
        const stockKey = `stock_${storeKey}`;
        const hasStock = (p as any)[stockKey] !== false;
        const isOutlier = outlierData[storeKey] === true;
        const hasUrl = url && url !== '#' && url.length > 5;

        if (price > 0 && hasUrl && !isOutlier && hasStock) {
          return price;
        }
        return 0;
      });

      const productHistory = history.filter(h => h.nombre_producto === p.nombre);
      let h7_price = 0;

      // Si hay historial, lo procesamos para determinar la tendencia.
      if (productHistory.length > 0) {
        // Ordenamos por fecha para encontrar el más antiguo y el más reciente.
        productHistory.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
        
        const oldestRecord = productHistory[0];
        const newestRecord = productHistory[productHistory.length - 1];

        // Si solo hay un día de datos, o si el precio más antiguo y el más nuevo son iguales,
        // la variación de tendencia es 0. Para lograrlo, pasamos el precio actual a getStats
        // como precio histórico, forzando una diferencia de 0.
        if (oldestRecord.fecha === newestRecord.fecha || oldestRecord.precio_minimo === newestRecord.precio_minimo) {
          const currentPrices = prices.filter(x => x > 0);
          // Si hay precios actuales, usamos el mínimo. Si no, no hay base para comparar (h7_price=0).
          h7_price = currentPrices.length > 0 ? Math.min(...currentPrices) : 0;
        } else {
          // Si hay una variación real en el historial, usamos el precio más antiguo como base.
          h7_price = oldestRecord.precio_minimo || 0;
        }
      }
      // Si no hay historial (productHistory.length === 0), h7_price se queda en 0,
      // lo que también resulta en una variación de tendencia 0 en getStats.
      
      return { ...p, stats: getStats(prices, h7_price), prices };
    })
    .filter(p => p.prices.filter((price: number) => price > 0).length >= 2);

    if (currentPath === '/carnes') result = result.filter(p => normalizeText(p.categoria || '').includes('carne'));
    else if (currentPath === '/verdu') result = result.filter(p => normalizeText(p.categoria || '').includes('verdu') || normalizeText(p.categoria || '').includes('fruta'));
    else if (currentPath === '/bebidas') result = result.filter(p => normalizeText(p.categoria || '').includes('bebida'));
    else if (currentPath === '/lacteos') result = result.filter(p => normalizeText(p.categoria || '').includes('lacteo'));
    else if (currentPath === '/almacen') result = result.filter(p => normalizeText(p.categoria || '').includes('almacen'));
    else if (currentPath === '/limpieza') result = result.filter(p => normalizeText(p.categoria || '').includes('limpieza'));
    else if (currentPath === '/perfumeria') result = result.filter(p => normalizeText(p.categoria || '').includes('perfumeria'));
    else if (currentPath === '/mascotas') result = result.filter(p => normalizeText(p.categoria || '').includes('mascota'));
    else if (currentPath === '/varios') {
      const excludedCategories = ['carne', 'verdu', 'fruta', 'bebida', 'lacteo', 'almacen', 'limpieza', 'perfumeria', 'mascota'];
      result = result.filter(p => {
        const cat = normalizeText(p.categoria || '');
        return !excludedCategories.some(excluded => cat.includes(excluded));
      });
    }

    // --- FILTRO DE BÚSQUEDA OPTIMIZADO ---
    if (searchTerm) {
      const t = searchTerm.toLowerCase().trim(); // Quitamos espacios locos
      if (t.length > 0) { // Solo filtramos si realmente hay texto
        result = result.filter(p => {
          // Buscamos en nombre y ticker (si existe)
          const nameMatch = p.nombre.toLowerCase().includes(t);
          const tickerMatch = p.ticker && p.ticker.toLowerCase().includes(t);
          return nameMatch || tickerMatch;
        });
      }
    }

    // --- FILTRO DE TENDENCIAS ---
    if (trendFilter && currentPath !== '/chango') {
      result = result.filter(p => trendFilter === 'up' ? p.stats.isUp : p.stats.isDown);
      
      // Ordenamos por la magnitud de la variación.
      result.sort((a, b) => {
        // Para 'down', queremos el más negativo primero (ej: -25% antes que -10%).
        // Para 'up', queremos el más positivo primero (ej: 30% antes que 15%).
        return trendFilter === 'down' 
          ? a.stats.variation - b.stats.variation  // Orden ascendente (más negativo primero)
          : b.stats.variation - a.stats.variation; // Orden descendente (más positivo primero)
      });
    }

    return result;
  }, [products, history, location.pathname, searchTerm, trendFilter]); // useMemo protege el rendimiento

  const filteredProducts = useMemo(() => {
    if (location.pathname !== '/chango') {
      return baseFilteredProducts;
    }
    const cartItems: CartItem[] = baseFilteredProducts
      .filter(p => favorites[p.id])
      .map(p => ({ ...p, quantity: favorites[p.id] || 1 }));
    
    return cartItems;
  }, [baseFilteredProducts, location.pathname, favorites]);

  const visibleProducts = useMemo(() => {
    return filteredProducts.slice(0, displayLimit);
  }, [filteredProducts, displayLimit]);




const toggleFavorite = useCallback((id: number) => {
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
  }, [user, isPro, favorites, purchasedItems]);


  const handleFavoriteChangeInCart = useCallback((id: number, delta: number) => {
    setFavorites(prev => {
      const newQty = (prev[id] || 1) + delta;
      if (newQty <= 0) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: newQty };
    });
  }, []);

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

  const handleProductClick = useCallback((product: Product) => {
    scrollPositionRef.current = window.scrollY;
    const categorySlug = slugify(product.categoria || 'general');
    const productSlug = slugify(product.nombre);
    navigate(`/${categorySlug}/${productSlug}`);
  }, [navigate]);

  useEffect(() => {
    const listPaths = ['/', '/chango', '/carnes', '/verdu', '/varios', '/bebidas', '/almacen'];
    const currentPath = location.pathname;
    const isCurrentPathList = listPaths.includes(currentPath);

    // Si la ruta actual es una página de lista
    if (isCurrentPathList) {
      // Y es diferente a la última página de lista guardada (cambio de categoría)
      if (currentPath !== lastListPageRef.current) {
        window.scrollTo(0, 0);
        setSearchTerm('');
        setTrendFilter(null);
        setDisplayLimit(20);
      }
      // Si es la misma (ej. volviendo de un producto), restauramos el scroll
      else if (scrollPositionRef.current > 0) {
        setTimeout(() => {
          window.scrollTo(0, scrollPositionRef.current);
          scrollPositionRef.current = 0;
        }, 0);
      }
      
      // Actualizamos la última página de lista visitada
      lastListPageRef.current = currentPath;
    }
    // Si no es una página de lista (ej. detalle de producto), no hacemos nada.
    // `lastListPageRef` mantiene su valor, listo para la comparación cuando volvamos.

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

  const isFavorite = useCallback((id: number) => !!favorites[id], [favorites]);

  const listPageElement = (
    <MemoizedProductList
      products={visibleProducts as any}
      onProductClick={handleProductClick}
      onFavoriteToggle={toggleFavorite}
      isFavorite={isFavorite}
      isCartView={false}
      quantities={favorites}
      onUpdateQuantity={handleFavoriteChangeInCart}
      searchTerm={searchTerm}
      purchasedItems={purchasedItems}
      onTogglePurchased={togglePurchased}
    />
  );
 
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
      <MemoizedHeader 
        searchTerm={searchTerm} setSearchTerm={setSearchTerm} 
        toggleTheme={toggleTheme} theme={theme}
        onUserClick={() => setIsAuthOpen(true)} user={user}
        profile={profile}
        trendFilter={trendFilter} setTrendFilter={setTrendFilter}
      />
      <main>
        <Routes>
          <Route path="/" element={listPageElement} />
          <Route path="/carnes" element={listPageElement} />
          <Route path="/verdu" element={listPageElement} />
          <Route path="/bebidas" element={listPageElement} />
          <Route path="/lacteos" element={listPageElement} />
          <Route path="/almacen" element={listPageElement} />
          <Route path="/limpieza" element={listPageElement} />
          <Route path="/perfumeria" element={listPageElement} />
          <Route path="/mascotas" element={listPageElement} />
          <Route path="/varios" element={listPageElement} />
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
      <MemoizedProductList 
        products={filteredProducts as any} 
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
      <MemoizedProductList 
        products={filteredProducts as any} 
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
        {/* --- BOTÓN DE CARGA POR LOTES --- */}
        {/* Solo aparece si NO estamos en el Chango y si hay más productos para mostrar */}
        {['/', '/carnes', '/verdu', '/bebidas', '/varios'].includes(location.pathname) && filteredProducts.length > displayLimit && (
          <div className="flex justify-center py-6">
            <button 
              onClick={() => setDisplayLimit(prev => prev + 20)}
              className="bg-neutral-50 dark:bg-[#1f2c34] text-black dark:text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:scale-105 active:scale-95 transition-all border border-neutral-200 dark:border-[#233138] shadow-md mb-4"
            >
              Cargar más productos ({filteredProducts.length - displayLimit} restantes)
            </button>
          </div>
        )}
      </main>

      <MemoizedBottomNav cartCount={visibleCartCount} />

      {isAuthOpen && (
        <AuthModal 
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
        />
      )}
      
      <MemoizedFooter />
    </div>
  );
};

export default App;