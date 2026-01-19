import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="mt-4 mb-6 px-4 py-4 border-t border-neutral-100 dark:border-neutral-900">
      <div className="flex flex-col items-center text-center">
        <div className="flex justify-center w-full max-w-screen-md mx-auto mb-4 text-xs gap-8">
          <a href="https://linktr.ee/facutom" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white">
            <img src="https://ugc.production.linktr.ee/2fb027da-4522-4b25-8855-39f77182ce8b_mQO6eyvY-400x400.png?io=true&size=avatar-v3_0" alt="Facu Tom" className="w-5 h-5 rounded-full" />
            Creado por @facutom
          </a>
          <a href="https://cafecito.app/facutom" target="_blank" rel="noopener noreferrer" className="flex items-center text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white">
            Invitame un Cafecito ☕
          </a>
        </div>
        <p className="text-[10px] font-mono font-bold text-neutral-300 dark:text-neutral-700 uppercase tracking-[0.2em]">
          © 2026 TradingChango Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
