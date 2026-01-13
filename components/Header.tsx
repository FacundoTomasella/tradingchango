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
    <header className="sticky top-0 z-40 bg-white dark:bg-black p-4 border-b border-slate-100 dark:border-transparent">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate('home')}>
          <div className="relative flex items-center justify-center h-8 w-8">
            <i className="fa-solid fa-cart-shopping text-[22px] text-black dark:text-white"></i>
            <i className="fa-solid fa-arrow-trend-up text-[10px] text-[#00c853] absolute -top-[4px] -right-[2px] bg-white dark:bg-black rounded-full p-[1px]"></i>
          </div>
          <span className="font-[800] text-[22px] tracking-[-1px] text-black dark:text-white leading-none">TradingChango</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-4 mr-2">
            <button onClick={() => onNavigate('about')} className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-black dark:hover:text-white transition-colors">Acerca de</button>
            <button onClick={() => onNavigate('terms')} className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-black dark:hover:text-white transition-colors">Términos</button>
            <button onClick={() => onNavigate('contact')} className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-black dark:hover:text-white transition-colors">Contacto</button>
          </div>

          {/* Mobile Info Menu */}
          <div className="relative md:hidden" ref={menuRef}>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="w-8 h-8 flex items-center justify-center text-black dark:text-white">
              <i className="fa-solid fa-circle-info text-xl"></i>
            </button>
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#2a2a2a] rounded-xl shadow-xl p-1 z-50 animate-in fade-in zoom-in duration-200">
                <button onClick={() => { onNavigate('about'); setIsMenuOpen(false); }} className="w-full text-left px-4 py-3 text-[10px] font-bold uppercase dark:text-white hover:bg-slate-50 dark:hover:bg-[#1a1a1a] rounded-lg">Acerca de</button>
                <button onClick={() => { onNavigate('terms'); setIsMenuOpen(false); }} className="w-full text-left px-4 py-3 text-[10px] font-bold uppercase dark:text-white hover:bg-slate-50 dark:hover:bg-[#1a1a1a] rounded-lg">Términos</button>
                <button onClick={() => { onNavigate('contact'); setIsMenuOpen(false); }} className="w-full text-left px-4 py-3 text-[10px] font-bold uppercase dark:text-white hover:bg-slate-50 dark:hover:bg-[#1a1a1a] rounded-lg">Contacto</button>
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
        <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
        <input 
          type="text" 
          placeholder="BUSCAR PRODUCTO..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-[#2a2a2a] rounded-lg py-3.5 pl-12 pr-4 text-sm font-medium focus:outline-none transition-all text-black dark:text-white placeholder:text-slate-400"
        />
      </div>

      {!['favs', 'about', 'terms', 'contact'].includes(currentTab) && (
        <div className="flex gap-2">
          <button 
            onClick={() => setTrendFilter(trendFilter === 'down' ? null : 'down')} 
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-[11px] font-[800] uppercase border transition-all ${trendFilter === 'down' ? 'bg-[#00c853] text-white border-[#00c853]' : 'bg-white dark:bg-black text-[#00c853] border-slate-200 dark:border-[#2a2a2a]'}`}
          >
            <i className="fa-solid fa-arrow-trend-down"></i> Precios Bajando
          </button>
          <button 
            onClick={() => setTrendFilter(trendFilter === 'up' ? null : 'up')} 
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-[11px] font-[800] uppercase border transition-all ${trendFilter === 'up' ? 'bg-[#f23645] text-white border-[#f23645]' : 'bg-white dark:bg-black text-[#f23645] border-slate-200 dark:border-[#2a2a2a]'}`}
          >
            <i className="fa-solid fa-arrow-trend-up"></i> Precios Subiendo
          </button>
        </div>
      )}

      {showHero && (
        <div className="mt-8 text-center px-4 animate-in fade-in duration-500">
          <h2 className="text-[22px] font-[800] text-black dark:text-white leading-none tracking-tight">Los precios del super como nunca los viste</h2>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 font-medium tracking-tight">Analizá los precios, tendencias, y compará antes de comprar</p>
        </div>
      )}
    </header>
  );
};

export default Header;