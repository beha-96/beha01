import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Home, ShoppingBag, Package, User, LogIn, ShoppingCart } from 'lucide-react';
import { ChatWidget } from './ChatWidget';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, cart, siteConfig } = useApp();
  const location = useLocation();

  const MobileBottomNav = () => {
    const navItems = [
      { path: '/', label: 'Accueil', icon: Home },
      { path: '/shop', label: 'Boutique', icon: ShoppingBag },
      { path: '/tracking', label: 'Suivi', icon: Package },
      { 
        path: user ? (user.role === 'ADMIN' ? '/admin' : user.role === 'PARTNER' ? '/partner' : user.role === 'INVESTOR' ? '/investor' : '/') : '/login', 
        label: user ? 'Compte' : 'Pro', 
        icon: User 
      }
    ];

    return (
        <div className="md:hidden fixed bottom-0 w-full bg-white/95 backdrop-blur-xl border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-50 pb-[env(safe-area-inset-bottom)] transition-transform duration-300">
           <div className="flex justify-around items-center h-[64px] px-2 max-w-md mx-auto">
              {navItems.map((item) => {
                 const isActive = location.pathname === item.path;
                 return (
                   <Link 
                        key={item.path} 
                        to={item.path} 
                        className="flex-1 flex flex-col items-center justify-center h-full touch-manipulation group select-none active:scale-95 transition-transform duration-200"
                   >
                      <div className={`
                          relative p-1.5 rounded-xl transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1)
                          ${isActive ? 'bg-primary/10 text-primary transform -translate-y-2' : 'text-slate-400 group-hover:text-slate-600'}
                      `}>
                         <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} fill={isActive ? "currentColor" : "none"} className={`transition-all duration-500 ${isActive ? 'scale-110' : ''}`}/>
                      </div>
                      <span className={`text-[10px] mt-0.5 transition-all duration-500 font-medium ${isActive ? 'text-primary translate-y-0 opacity-100' : 'text-slate-400 opacity-80'}`}>
                        {item.label}
                      </span>
                   </Link>
                 );
              })}
           </div>
        </div>
    );
  };

  const Header = () => (
    <header className="bg-white shadow-sm sticky top-0 z-40 hidden md:block">
      <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
           <div className="bg-primary text-white p-2 rounded-lg font-black text-xl tracking-tighter">
             {siteConfig?.appName ? siteConfig.appName.substring(0,2).toUpperCase() : 'BS'}
           </div>
           <span className="font-bold text-gray-900 text-lg tracking-tight">{siteConfig?.appName || 'BEHASHOP'}</span>
        </Link>

        <nav className="flex gap-8">
           <Link to="/" className={`font-bold hover:text-primary transition-colors ${location.pathname === '/' ? 'text-primary' : 'text-gray-600'}`}>Accueil</Link>
           <Link to="/shop" className={`font-bold hover:text-primary transition-colors ${location.pathname === '/shop' ? 'text-primary' : 'text-gray-600'}`}>Boutique</Link>
           <Link to="/tracking" className={`font-bold hover:text-primary transition-colors ${location.pathname === '/tracking' ? 'text-primary' : 'text-gray-600'}`}>Suivi</Link>
           <Link to="/transit" className={`font-bold hover:text-primary transition-colors ${location.pathname === '/transit' ? 'text-primary' : 'text-gray-600'}`}>Transit</Link>
        </nav>

        <div className="flex items-center gap-4">
           <Link to="/cart" className="relative p-2 hover:bg-gray-100 rounded-full transition-colors group">
              <ShoppingCart size={24} className="text-gray-700 group-hover:text-primary"/>
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full border-2 border-white">
                  {cart.length}
                </span>
              )}
           </Link>

           {user ? (
             <Link to={user.role === 'ADMIN' ? '/admin' : user.role === 'PARTNER' ? '/partner' : user.role === 'INVESTOR' ? '/investor' : '/'} className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-full transition-colors">
                <User size={18} className="text-gray-700"/>
                <span className="font-bold text-sm text-gray-900">{user.name}</span>
             </Link>
           ) : (
             <Link to="/login" className="bg-primary text-white px-6 py-2.5 rounded-full font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-primary/20 flex items-center gap-2">
                <LogIn size={18} /> Espace Pro
             </Link>
           )}
        </div>
      </div>
    </header>
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-gray-900">
      <Header />
      
      <header className="md:hidden sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 h-16 flex items-center justify-between">
         <Link to="/" className="font-black text-xl text-gray-900 tracking-tight">{siteConfig?.appName || 'BEHASHOP'}</Link>
         <div className="flex items-center gap-3">
            <Link to="/cart" className="relative p-2">
               <ShoppingCart size={24} className="text-gray-900"/>
               {cart.length > 0 && (
                 <span className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-bold h-4 w-4 flex items-center justify-center rounded-full">
                   {cart.length}
                 </span>
               )}
            </Link>
         </div>
      </header>

      <main className="flex-grow">
        {children}
      </main>

      <MobileBottomNav />
      <ChatWidget />
    </div>
  );
};
