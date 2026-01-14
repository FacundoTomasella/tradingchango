
import React, { useState, useRef, useEffect } from 'react';
import { TabType } from '../types';

interface HeaderProps {
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  toggleTheme: () => void;
  theme: 'light' | 'dark';
  onUserClick: () => void;
  user: any;
  subscription?: string;
  trendFilter: 'up' | 'down' | null;
  setTrendFilter: (val: 'up' | 'down' | null) => void;
  showHero: boolean;
  onNavigate: (tab: TabType) => void;
  currentTab: TabType;
}

const Header: React.FC<HeaderProps> = ({ 
  searchTerm, 
  setSearchTerm, 
  toggleTheme, 
  theme, 
  onUserClick, 
  user,
  subscription = 'free',
  trendFilter,
  setTrendFilter,
  showHero,
  onNavigate,
  currentTab
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-black p-4 border-b border-neutral-100 dark:border-neutral-900">
      <div className="flex justify-between items-center mb-4">
        <div className="logo-link" onClick={() => onNavigate('home')}>
          <div className="logo">
            <div className="logo-icon-wrapper">
               <i className="fa-solid fa-cart-shopping" style={{ fontSize: '18px' }}></i>
               <i className="fa-solid fa-arrow-trend-up trend-icon-overlay"></i>
            </div>
            TradingChango
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-4 mr-2">
            <button onClick={() => onNavigate('about')} className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 hover:text-black dark:hover:text-white transition-colors">Acerca de</button>
            <button onClick={() => onNavigate('terms')} className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 hover:text-black dark:hover:text-white transition-colors">Términos</button>
            <button onClick={() => onNavigate('contact')} className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 hover:text-black dark:hover:text-white transition-colors">Contacto</button>
          </div>

          <div className="relative md:hidden" ref={menuRef}>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="w-8 h-8 flex items-center justify-center text-black dark:text-white">
              <i className="fa-solid fa-circle-info text-xl"></i>
            </button>
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl p-1 z-50 animate-in fade-in zoom-in duration-200">
                <button onClick={() => { onNavigate('about'); setIsMenuOpen(false); }} className="w-full text-left px-4 py-3 text-[11px] font-bold uppercase dark:text-white hover:bg-neutral-50 dark:hover:bg-neutral-900 rounded-lg">Acerca de</button>
                <button onClick={() => { onNavigate('terms'); setIsMenuOpen(false); }} className="w-full text-left px-4 py-3 text-[11px] font-bold uppercase dark:text-white hover:bg-neutral-50 dark:hover:bg-neutral-900 rounded-lg">Términos</button>
                <button onClick={() => { onNavigate('contact'); setIsMenuOpen(false); }} className="w-full text-left px-4 py-3 text-[11px] font-bold uppercase dark:text-white hover:bg-neutral-50 dark:hover:bg-neutral-900 rounded-lg">Contacto</button>
              </div>
            )}
          </div>

          <button onClick={onUserClick} className="w-8 h-8 flex items-center justify-center text-black dark:text-white">
            <i className="fa-solid fa-circle-user text-xl"></i>
          </button>
          <button onClick={toggleTheme} className="text-black dark:text-white hover:opacity-70 transition-opacity">
            <i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} text-xl`}></i>
          </button>
        </div>
      </div>

      <div className="relative mb-3">
        <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500"></i>
        <input 
          type="text" 
          placeholder="BUSCAR PRODUCTO..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg py-3 pl-12 pr-10 text-sm font-medium focus:outline-none transition-all text-black dark:text-white placeholder:text-neutral-500"
        />
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-black dark:hover:text-white transition-colors w-6 h-6 flex items-center justify-center"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        )}
      </div>

      {!['favs', 'about', 'terms', 'contact'].includes(currentTab) && (
        <div className="flex gap-2">
          <button 
            onClick={() => setTrendFilter(trendFilter === 'down' ? null : 'down')} 
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-[11px] font-[800] uppercase border transition-all ${trendFilter === 'down' ? 'bg-green-500 text-white border-green-500 shadow-lg shadow-green-500/20' : 'bg-white dark:bg-black text-green-500 border-neutral-100 dark:border-neutral-900'}`}
          >
            <i className="fa-solid fa-arrow-trend-down"></i> Precios bajando
          </button>
          <button 
            onClick={() => setTrendFilter(trendFilter === 'up' ? null : 'up')} 
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-[11px] font-[800] uppercase border transition-all ${trendFilter === 'up' ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20' : 'bg-white dark:bg-black text-red-500 border-neutral-100 dark:border-neutral-900'}`}
          >
            <i className="fa-solid fa-arrow-trend-up"></i> Precios subiendo
          </button>
        </div>
      )}

      {showHero && (
        <div className="mt-8 text-center px-4 animate-in fade-in duration-500">
          <h2 className="text-[22px] font-[800] text-black dark:text-white leading-none tracking-tight font-sans">Los precios del super como nunca los viste</h2>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-500 font-medium tracking-tight">Analizá tendencias y ahorrá en cada compra.</p>
        </div>
      )}
    </header>
  );
};

export default Header;
