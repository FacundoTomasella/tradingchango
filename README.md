# 🛒 TradingChango - El súper en tiempo real

**TradingChango** es una plataforma informativa independiente diseñada para aportar transparencia al mercado de consumo masivo en Argentina. Permite a los usuarios comparar precios entre las principales cadenas de supermercados, analizar tendencias y tomar decisiones de ahorro inteligentes.

![Licencia](https://img.shields.io/badge/license-MIT-green)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white)

---

## 🚀 Características Principales

- **Comparativa en tiempo real:** Precios actualizados de Coto, Carrefour, Día, Jumbo y MasOnline.
- **Análisis de Tendencias:** Indicadores visuales de precios subiendo ▲ y bajando ▼ en los últimos 7 días.
- **Tu Chango:** Gestión de lista de compras con persistencia híbrida (LocalStorage + Nube).
- **URLs Amigables:** Navegación optimizada por categorías y productos (`/carnes/nombre-producto`).
- **PWA (Progressive Web App):** Instalable en dispositivos móviles para uso rápido en el supermercado.
- **Sistema de Usuarios:** Perfiles con niveles Free y Pro, con guardado de múltiples listas de compra.
- **Modo Oscuro:** Interfaz optimizada para cualquier condición de luz.

## 🛠️ Tech Stack

- **Frontend:** React 18 con Vite y TypeScript.
- **Estilos:** Tailwind CSS (diseño responsive y modo oscuro).
- **Backend/Base de Datos:** Supabase (PostgreSQL, Auth, Realtime).
- **Infraestructura:** 
  - Dominio gestionado en **Cloudflare** (WAF y Email Routing).
  - Hosting en **Vercel** con despliegue continuo desde GitHub.
 
 🔐 Seguridad y Persistencia
Resiliencia al minimizar: Uso del evento visibilitychange para asegurar el guardado de datos antes de que el navegador suspenda la pestaña.
Protección Cloudflare: Escudo contra ataques y gestión de certificados SSL modo Full.
Email Corporativo: Sistema de soporte y recuperación de contraseñas vía soporte@tradingchango.com.

---

Creado por @facutom (https://linktr.ee/facutom))
