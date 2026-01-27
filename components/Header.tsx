import React, { useState, useRef, useEffect } from 'react';
import { TabType, Profile } from '../types';
import { Link, useNavigate, useLocation } from 'react-router-dom';

interface HeaderProps {
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  toggleTheme: () => void;
  theme: 'light' | 'dark';
  onUserClick: () => void;
  user: any;
  profile: Profile | null;
  trendFilter: 'up' | 'down' | null;
  setTrendFilter: (val: 'up' | 'down' | null) => void;
}

const Header: React.FC<HeaderProps> = ({ 
  searchTerm, 
  setSearchTerm, 
  toggleTheme, 
  theme, 
  onUserClick, 
  user,
  profile,
  trendFilter,
  setTrendFilter,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const showHero = location.pathname === '/' && !searchTerm && !trendFilter;
  const hideSearch = ['/acerca-de', '/terminos', '/contacto'].includes(location.pathname);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isPro = profile?.subscription === 'pro' && profile.subscription_end && new Date(profile.subscription_end) > new Date();

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-primary p-4 border-b border-neutral-100 dark:border-[#233138]">
      <div className="flex justify-between items-center mb-4">
        <Link to="/" className="logo-link cursor-pointer">
          <div className="logo">
            <div className="logo-icon-wrapper">
               <i className="fa-solid fa-cart-shopping" style={{ fontSize: '18px' }}></i>
               <i className="fa-solid fa-arrow-trend-up trend-icon-overlay"></i>
            </div>
            TradingChango
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-4 mr-2">
            <Link to="/acerca-de" className="text-[11px] font-bold uppercase tracking-widest text-black dark:text-[#e9edef] hover:opacity-70 transition-colors">Acerca de</Link>
            <Link to="/terminos" className="text-[11px] font-bold uppercase tracking-widest text-black dark:text-[#e9edef] hover:opacity-70 transition-colors">Términos</Link>
            <Link to="/contacto" className="text-[11px] font-bold uppercase tracking-widest text-black dark:text-[#e9edef] hover:opacity-70 transition-colors">Contacto</Link>
          </div>

          <div className="relative md:hidden" ref={menuRef}>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="w-8 h-8 flex items-center justify-center text-black dark:text-[#e9edef]">
              <i className="fa-solid fa-circle-info text-xl"></i>
            </button>
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-[#1f2c34] border border-neutral-200 dark:border-[#233138] rounded-xl shadow-xl p-1 z-50 animate-in fade-in zoom-in duration-200">
                <Link to="/acerca-de" onClick={() => setIsMenuOpen(false)} className="block w-full text-left px-4 py-3 text-[11px] font-bold uppercase dark:text-[#e9edef] hover:bg-neutral-50 dark:hover:bg-[#233138] rounded-lg">Acerca de</Link>
                <Link to="/terminos" onClick={() => setIsMenuOpen(false)} className="block w-full text-left px-4 py-3 text-[11px] font-bold uppercase dark:text-[#e9edef] hover:bg-neutral-50 dark:hover:bg-[#233138] rounded-lg">Términos</Link>
                <Link to="/contacto" onClick={() => setIsMenuOpen(false)} className="block w-full text-left px-4 py-3 text-[11px] font-bold uppercase dark:text-[#e9edef] hover:bg-neutral-50 dark:hover:bg-[#233138] rounded-lg">Contacto</Link>
              </div>
            )}
          </div>

          <button onClick={onUserClick} className="w-8 h-8 flex items-center justify-center text-black dark:text-[#e9edef]">
            <i className={`fa-solid fa-circle-user text-xl ${isPro ? 'text-green-600' : ''}`}></i>
          </button>
          <button onClick={toggleTheme} className="text-black dark:text-[#e9edef] hover:opacity-70 transition-opacity">
            <i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} text-xl`}></i>
          </button>
        </div>
      </div>

     {/* Cambiamos max-w-md por max-w-2xl para que sea mucho más ancho */}
{!hideSearch && (
  <div className="relative mb-2 max-w-2xl mx-auto w-full px-2"> 
    <i className="fa-solid fa-search absolute left-6 top-1/2 -translate-y-1/2 text-neutral-500 text-xs"></i>
    <input 
      type="text" 
      placeholder="BUSCAR PRODUCTO..." 
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="w-full bg-neutral-50 dark:bg-[#1f2c34] border border-neutral-200 dark:border-[#233138] rounded-lg py-2 pl-12 pr-10 text-sm font-medium focus:outline-none transition-all text-black dark:text-[#e9edef] placeholder:text-neutral-500"
    />
    {searchTerm && (
      <button 
        onClick={() => setSearchTerm('')}
        className="absolute right-6 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-black dark:hover:text-white transition-colors w-6 h-6 flex items-center justify-center"
      >
        <i className="fa-solid fa-xmark text-sm"></i>
      </button>
    )}
  </div>
)}

      {!['/chango', '/acerca-de', '/terminos', '/contacto'].includes(location.pathname) && (
        <div className="flex gap-2">
          <button 
            onClick={() => setTrendFilter(trendFilter === 'down' ? null : 'down')} 
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-[11px] font-[800] uppercase border transition-all ${trendFilter === 'down' ? 'bg-green-600 text-white border-green-600 shadow-lg shadow-green-600/20' : 'bg-white dark:bg-primary text-green-600 dark:border-[#233138] dark:border-[#233138]'}`}
          >
            <i className="fa-solid fa-arrow-trend-down"></i> Precios bajando
          </button>
          <button 
            onClick={() => setTrendFilter(trendFilter === 'up' ? null : 'up')} 
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-[11px] font-[800] uppercase border transition-all ${trendFilter === 'up' ? 'bg-red-600 text-white border-red-600 shadow-lg shadow-red-600/20' : 'bg-white dark:bg-primary text-red-600 dark:border-[#233138] dark:border-[#233138]'}`}
          >
            <i className="fa-solid fa-arrow-trend-up"></i> Precios subiendo
          </button>
        </div>
      )}

      {showHero && (
        <div className="mt-8 text-center px-4 animate-in fade-in duration-500">
          <h2 className="text-[22px] font-[800] text-black dark:text-white leading-none tracking-tight font-sans">Los precios del súper como nunca los viste</h2>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-500 font-medium tracking-tight">Analizá tendencias y compará antes de comprar</p>
        </div>
      )}
    </header>
  );
};

export default Header;
