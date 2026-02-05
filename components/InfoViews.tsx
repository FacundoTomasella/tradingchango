import React from 'react';

interface InfoViewProps {
  onClose: () => void;
  content?: string;
}

export const AboutView: React.FC<InfoViewProps> = ({ onClose, content }) => (
  <div className="p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
    <button onClick={onClose} className="mb-8 text-neutral-400 hover:text-black dark:hover:text-white flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest transition-colors">
      <i className="fa-solid fa-arrow-left"></i> Volver al Inicio
    </button>
    
    <h1 className="text-4xl font-black text-black dark:text-white mb-6 tracking-tighter">Acerca de TradingChango</h1>
    
    <div className="space-y-6 text-neutral-600 dark:text-neutral-400 leading-relaxed font-medium">
      {content ? (
        /* 1. Si hay contenido en Supabase, lo renderizamos como HTML */
        <div 
          className="dynamic-html-content"
          dangerouslySetInnerHTML={{ __html: content }} 
        />
      ) : (
        /* 2. Si NO hay contenido (o está cargando), mostramos el texto por defecto */
        <>
          <p>
            TradingChango nació de una necesidad simple pero poderosa: <span className="text-black dark:text-white font-bold">dejar de pagar de más por lo mismo.</span> En un contexto de alta volatilidad de precios, saber dónde comprar es la herramienta de ahorro más efectiva que tenemos.
          </p>
          <p>
            Nuestra plataforma procesa diariamente miles de precios de las cadenas más importantes de Argentina para ofrecerte una comparativa en tiempo real.
          </p>
          
          {/* Solo mostramos este cuadro de Misión si NO hay contenido en Supabase */}
          <div className="bg-green-50 dark:bg-green-900/10 p-6 rounded-3xl border border-green-100 dark:border-green-900/30 mt-8">
            <h3 className="text-green-600 dark:text-green-400 font-black uppercase text-[10px] tracking-widest mb-2">Nuestra Misión</h3>
            <p className="text-black dark:text-neutral-200 text-sm italic">
              "Empoderar al consumidor argentino mediante la transparencia de datos."
            </p>
          </div>
        </>
      )}
    </div>
  </div>
);

export const TermsView: React.FC<InfoViewProps> = ({ onClose, content }) => (
  <div className="p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
    <button onClick={onClose} className="mb-8 text-neutral-400 hover:text-black dark:hover:text-white flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest transition-colors">
      <i className="fa-solid fa-arrow-left"></i> Volver al Inicio
    </button>
    <h1 className="text-4xl font-black text-black dark:text-white mb-6 tracking-tighter">Términos y Condiciones</h1>
    <div className="space-y-6 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
      {content ? (
        /* Renderizado de HTML desde Supabase */
        <div dangerouslySetInnerHTML={{ __html: content }} />
      ) : (
        /* Contenido por defecto si no hay datos */
        <section>
          <h3 className="text-black dark:text-white font-bold mb-2 uppercase text-[10px] tracking-widest">Naturaleza de los Datos</h3>
          <p>Los precios mostrados son obtenidos mediante técnicas de recolección de datos públicos de los sitios web de cada supermercado.</p>
        </section>
      )}
      
      <section className="pt-6 border-t border-neutral-100 dark:border-neutral-900 text-[9px] font-mono uppercase text-neutral-400">
        Última actualización: {new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
      </section>
    </div>
  </div>
);

export const ContactView: React.FC<InfoViewProps & { email?: string }> = ({ onClose, content, email }) => (
  <div className="p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
    <button onClick={onClose} className="mb-8 text-neutral-400 hover:text-black dark:hover:text-white flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest transition-colors">
      <i className="fa-solid fa-arrow-left"></i> Volver al Inicio
    </button>
    <h1 className="text-4xl font-black text-black dark:text-white mb-6 tracking-tighter">Contacto</h1>
    <div className="space-y-5 text-neutral-600 dark:text-neutral-400 leading-relaxed font-medium">
  <p className="text-black dark:text-white font-bold text-lg">
    ¿Tenés una sugerencia, detectaste un error o te interesa colaborar con TradingChango?
  </p>
  
  <p>
    Estamos abiertos a propuestas de publicidad, alianzas, integraciones y proyectos profesionales vinculados a datos, consumo y tecnología.
  </p>
  
  <p>
    Escribinos y te responderemos a la brevedad.
  </p>
</div>


    
    <div className="mt-8 space-y-4">
      {/* Botón de Email Principal */}
      <a href="mailto:soporte@tradingchango.com" className="flex items-center justify-between p-6 bg-neutral-50 dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 hover:scale-[1.02] transition-transform shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white rounded-2xl flex items-center justify-center text-xl">
            <i className="fa-solid fa-envelope"></i>
          </div>
          <div>
            <h4 className="font-bold text-black dark:text-white">Email Soporte</h4>
            <p className="text-[10px] font-mono text-neutral-400 uppercase">soporte@tradingchango.com</p>
          </div>
        </div>
        <i className="fa-solid fa-chevron-right text-neutral-300"></i>
      </a>
      
      {/* Contenido Dinámico (HTML) desde Supabase */}
      {content && (
        <div 
          className="mt-6 p-6 bg-neutral-50 dark:bg-neutral-900 rounded-3xl text-xs text-neutral-500 border border-neutral-100 dark:border-neutral-800"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      )}
    </div>
  </div>
);