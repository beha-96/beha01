
import React from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { NotificationProvider } from './context/NotificationContext';
import { Layout } from './components/Layout';
import { Shop } from './pages/Shop';
import { Checkout } from './pages/Checkout';
import { OrderTracking } from './pages/OrderTracking';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { PartnerDashboard } from './pages/partner/PartnerDashboard';
import { InvestorDashboard } from './pages/investor/InvestorDashboard';
import { ProductDetails } from './pages/ProductDetails';
import { Transit } from './pages/Transit';
import { DynamicPage } from './pages/DynamicPage';
import { PopularProducts } from './pages/PopularProducts';
import { NewArrivals } from './pages/NewArrivals';
import { UserRole } from './types';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole?: UserRole }> = ({ children, requiredRole }) => {
  const { user } = useApp();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Admin has super access, but for specific dashboards, we might want strict separation.
  // The request says "Investor space is distinct".
  if (requiredRole && user.role !== requiredRole && user.role !== UserRole.ADMIN) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// Simple Cart Page Component (defined here for file compactness)
const CartPage: React.FC = () => {
  const { cart, removeFromCart, updateQuantity, cartTotal } = useApp();
  const navigate = useNavigate();

  if (cart.length === 0) return (
    <div className="text-center py-20 px-4">
      <h2 className="text-2xl font-bold text-gray-700 mb-4">Votre panier est vide</h2>
      <button onClick={() => navigate('/')} className="text-primary hover:underline">Continuer mes achats</button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      <h1 className="text-2xl font-bold mb-6">Mon Panier</h1>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        {cart.map(item => (
          <div key={item.id} className="p-4 border-b flex items-center gap-4 hover:bg-gray-50 transition-colors">
            <img src={item.image || (item.images && item.images[0])} alt={item.name} className="w-20 h-20 object-cover rounded-lg bg-gray-100 border border-gray-200" />
            <div className="flex-grow">
              <h3 className="font-bold text-gray-900">{item.name}</h3>
              <p className="text-sm text-primary font-bold">{item.price.toLocaleString()} F</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-lg font-bold flex items-center justify-center text-gray-600 transition-colors">-</button>
              <span className="w-8 text-center font-bold">{item.quantity}</span>
              <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-lg font-bold flex items-center justify-center text-gray-600 transition-colors">+</button>
            </div>
            <button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors text-sm font-medium">Supprimer</button>
          </div>
        ))}
        <div className="p-6 bg-gray-50">
          <div className="flex justify-between items-center text-xl font-bold mb-6 text-gray-900">
            <span>Total</span>
            <span>{cartTotal.toLocaleString()} FCFA</span>
          </div>
          <button onClick={() => navigate('/checkout')} className="w-full bg-primary text-white py-4 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg transform active:scale-95">
            Commander maintenant
          </button>
        </div>
      </div>
    </div>
  );
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      {/* New Dynamic Home Page serves as default route */}
      <Route path="/" element={<Layout><DynamicPage slug="home" /></Layout>} />
      {/* Keep Shop logic available as general catalog if needed, or replace */}
      <Route path="/shop" element={<Layout><Shop /></Layout>} />
      
      {/* New Popular Products Route */}
      <Route path="/popular" element={<Layout><PopularProducts /></Layout>} />
      <Route path="/new-arrivals" element={<Layout><NewArrivals /></Layout>} />

      {/* Dynamic Pages Routing */}
      <Route path="/page/:slug" element={<Layout><DynamicPage /></Layout>} />
      <Route path="/category/:category" element={<Layout><DynamicPage /></Layout>} />

      <Route path="/product/:id" element={<Layout><ProductDetails /></Layout>} />
      <Route path="/cart" element={<Layout><CartPage /></Layout>} />
      <Route path="/checkout" element={<Layout><Checkout /></Layout>} />
      <Route path="/tracking" element={<Layout><OrderTracking /></Layout>} />
      <Route path="/login" element={<Layout><Login /></Layout>} />
      <Route path="/transit" element={<Layout><Transit /></Layout>} />

      {/* Protected Routes */}
      <Route path="/admin" element={
        <ProtectedRoute requiredRole={UserRole.ADMIN}>
          <Layout><AdminDashboard /></Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/partner" element={
        <ProtectedRoute requiredRole={UserRole.PARTNER}>
          <Layout><PartnerDashboard /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/investor" element={
        <ProtectedRoute requiredRole={UserRole.INVESTOR}>
          <Layout><InvestorDashboard /></Layout>
        </ProtectedRoute>
      } />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <NotificationProvider>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </NotificationProvider>
    </AppProvider>
  );
};

export default App;
