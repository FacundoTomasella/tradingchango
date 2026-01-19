
import React from 'react';
import { TabType } from '../types';

interface BottomNavProps {
  currentTab: TabType;
  setCurrentTab: (tab: TabType) => void;
  cartCount: number;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentTab, setCurrentTab, cartCount }) => {
  const tabs: { id: TabType; label: string; icon: string; badge?: number }[] = [
    { id: 'home', label: 'Inicio', icon: 'fa-house' },
    { id: 'carnes', label: 'Carnes', icon: 'fa-drumstick-bite' },
    { id: 'verdu', label: 'Verdu', icon: 'fa-carrot' },
    { id: 'varios', label: 'Varios', icon: 'fa-layer-group' },
    { id: 'favs', label: 'Chango', icon: 'fa-cart-shopping', badge: cartCount }
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-screen-md bg-white dark:bg-primary border-t border-neutral-100 dark:border-neutral-900 flex justify-around py-3.5 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      {tabs.map((tab) => (
        <button 
          key={tab.id}
          onClick={() => setCurrentTab(tab.id)}
          className={`relative flex flex-col items-center gap-1.5 w-1/5 transition-all ${currentTab === tab.id ? 'text-black dark:text-white scale-110' : 'text-neutral-400'}`}
        >
          <i className={`fa-solid ${tab.icon} text-[20px]`}></i>
          <span className={`text-[10px] font-[800] tracking-tight ${currentTab === tab.id ? 'opacity-100' : 'opacity-60'}`}>{tab.label}</span>
          
          {tab.badge !== undefined && tab.badge > 0 && (
            <span className="absolute -top-1 right-[15%] bg-primary dark:bg-white text-white dark:text-black text-[9px] font-[800] min-w-[16px] h-4 rounded-full flex items-center justify-center px-1 border-2 border-white dark:border-black animate-in zoom-in">
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
};

export default BottomNav;