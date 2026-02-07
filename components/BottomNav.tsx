
import React, { useState, useRef, useEffect } from 'react';
import { TabType } from '../types';
import { Link, useLocation } from 'react-router-dom';

interface BottomNavProps {
  cartCount: number;
}

const BottomNav: React.FC<BottomNavProps> = ({ cartCount }) => {
  const location = useLocation();
  const currentPath = location.pathname;
  const [isVariosOpen, setIsVariosOpen] = useState(false);
  const variosRef = useRef<HTMLDivElement>(null);

  const tabs: { id: TabType | 'home'; label: string; icon: string; path: string; badge?: number }[] = [
    { id: 'home', label: 'Inicio', icon: 'fa-house', path: '/' },
    { id: 'carnes', label: 'Carnes', icon: 'fa-drumstick-bite', path: '/carnes' },
    { id: 'verdu', label: 'Verdu', icon: 'fa-carrot', path: '/verdu' },
    { id: 'varios', label: 'Varios', icon: 'fa-layer-group', path: '#' },
    { id: 'chango', label: 'Chango', icon: 'fa-cart-shopping', path: '/chango', badge: cartCount }
  ];

  const variosCategories = [
    { label: 'Bebidas', path: '/bebidas' },
    { label: 'Lacteos', path: '/lacteos' },
    { label: 'Almacén', path: '/almacen' },
    { label: 'Limpieza', path: '/limpieza' },
    { label: 'Perfumería', path: '/perfumeria' },
    { label: 'Mascotas', path: '/mascotas' },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (variosRef.current && !variosRef.current.contains(event.target as Node)) {
        setIsVariosOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleVariosClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsVariosOpen(!isVariosOpen);
  };

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-screen-md bg-white dark:bg-primary border-t border-neutral-100 dark:border-neutral-900 flex justify-around py-3.5 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      {tabs.map((tab) => (
        <div key={tab.id} className="relative w-1/5" ref={tab.id === 'varios' ? variosRef : null}>
          <Link
            to={tab.path}
            onClick={tab.id === 'varios' ? handleVariosClick : undefined}
            className={`relative flex flex-col items-center gap-1.5 transition-all ${currentPath === tab.path || (tab.id === 'varios' && isVariosOpen) ? 'text-black dark:text-white scale-110' : 'text-neutral-400'}`}
          >
            <i className={`fa-solid ${tab.icon} text-[20px]`}></i>
            <span className={`text-[10px] font-[800] tracking-tight ${currentPath === tab.path || (tab.id === 'varios' && isVariosOpen) ? 'opacity-100' : 'opacity-60'}`}>{tab.label}</span>
            
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="absolute -top-1 right-[15%] bg-primary dark:bg-white text-white dark:text-black text-[9px] font-[800] min-w-[16px] h-4 rounded-full flex items-center justify-center px-1 border-2 border-white dark:border-black animate-in zoom-in">
                {tab.badge}
              </span>
            )}
          </Link>
          {tab.id === 'varios' && isVariosOpen && (
            <div className="absolute bottom-full mb-2 w-36 bg-white dark:bg-[#1f2c34] border border-neutral-200 dark:border-[#233138] rounded-xl shadow-xl p-1 z-50 animate-in fade-in zoom-in duration-200">
              {variosCategories.map(category => (
                <Link
                  key={category.path}
                  to={category.path}
                  onClick={() => setIsVariosOpen(false)}
                  className="block w-full text-left px-4 py-3 text-[11px] font-bold dark:text-[#e9edef] hover:bg-neutral-50 dark:hover:bg-[#233138] rounded-lg"
                >
                  {category.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
};

export default BottomNav;