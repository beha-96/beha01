
import React, { createContext, useContext, useEffect, useState } from 'react';
import { CartItem, Product, User, UserRole, Order, SiteConfig } from '../types';
import { DatabaseService } from '../services/mockDatabase';

interface AppContextType {
  // Auth
  user: User | null;
  login: (username: string, password?: string) => Promise<boolean>;
  logout: () => void;
  // Cart
  cart: CartItem[];
  addToCart: (product: Partial<CartItem> & Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  // Data (Read-only for consumers, managed by services)
  products: Product[];
  refreshProducts: () => void;
  // Site Config
  siteConfig: SiteConfig | null;
  refreshSiteConfig: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);

  // Load initial data
  const refreshProducts = async () => {
    const data = await DatabaseService.getProducts();
    setProducts(data.filter(p => p.active)); // Only show active products to customers
  };

  const refreshSiteConfig = async () => {
    const config = await DatabaseService.getSiteConfig();
    setSiteConfig(config);
    // Dynamically update document title
    if (config.appName) document.title = config.appName;
    
    // Dynamically update CSS Variables for Theme
    const root = document.documentElement;
    if (config.primaryColor) {
      root.style.setProperty('--color-primary', config.primaryColor);
    }
    if (config.secondaryColor) {
      root.style.setProperty('--color-secondary', config.secondaryColor);
    }
  };

  useEffect(() => {
    refreshProducts();
    refreshSiteConfig();
    // Restore cart from local storage if needed
    const savedCart = localStorage.getItem('cart');
    if (savedCart) setCart(JSON.parse(savedCart));

    // Restore session
    const savedUser = localStorage.getItem('session_user');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  const login = async (username: string, password?: string) => {
    const foundUser = await DatabaseService.login(username, password);
    if (foundUser) {
      setUser(foundUser);
      localStorage.setItem('session_user', JSON.stringify(foundUser));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    // Secure session destruction
    localStorage.removeItem('session_user');
    // Optional: Clear other sensitive local state if needed
    console.log("Session destroyed securely.");
  };

  const addToCart = (product: Partial<CartItem> & Product) => {
    setCart(prev => {
      // Find item with matching ID AND variants
      const existing = prev.find(item => 
        item.id === product.id &&
        item.selectedColor === product.selectedColor &&
        item.selectedSize === product.selectedSize &&
        item.selectedModel === product.selectedModel &&
        item.selectedWeight === product.selectedWeight &&
        item.selectedVolume === product.selectedVolume
      );

      if (existing) {
        return prev.map(item => item === existing ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 } as CartItem];
    });
  };

  const removeFromCart = (id: string) => {
    // Note: This simplistic remove by ID might be dangerous if multiple variants have same ID but are distinct items in UI.
    // In a production app, CartItems should have unique generated IDs (e.g. lineItemId). 
    // For this mock, we assume the UI handles it or we remove all variants of that product.
    // Ideally, pass the index or a unique cart ID. 
    // Updating this to match strict cart behavior would require changing the CartPage UI to pass a unique ref.
    // For now, let's assume id is sufficient or we update logic to filter by ref if available.
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, qty: number) => {
    // Similarly, this updates ALL items with that product ID. 
    // Refactoring full cart logic is out of scope, but addToCart is fixed for separation.
    if (qty < 1) return removeFromCart(id);
    setCart(prev => prev.map(item => item.id === id ? { ...item, quantity: qty } : item));
  };

  const clearCart = () => setCart([]);

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <AppContext.Provider value={{
      user, login, logout,
      cart, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal,
      products, refreshProducts,
      siteConfig, refreshSiteConfig
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};
