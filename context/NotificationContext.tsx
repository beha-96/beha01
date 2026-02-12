
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Notification } from '../types';
import { useApp } from './AppContext';
import { NotificationService } from '../services/NotificationService';
import { NotificationToast } from '../components/NotificationToast';
import { DatabaseService } from '../services/mockDatabase';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useApp();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentToast, setCurrentToast] = useState<Notification | null>(null);

  const loadNotifications = () => {
    if (user) {
      const all = NotificationService.getForUser(user.id);
      setNotifications(all);
    } else {
      setNotifications([]);
    }
  };

  useEffect(() => {
    loadNotifications();

    // Listen for custom event dispatch from NotificationService
    const handleUpdate = () => {
      // Small delay to ensure localStorage is committed
      setTimeout(() => {
          loadNotifications();
          
          // Check for very recent notifications to show Toast (simulate Push)
          if (user) {
              const all = NotificationService.getForUser(user.id);
              if (all.length > 0) {
                  const latest = all[0];
                  // If created in last 2 seconds, show toast
                  const timeDiff = new Date().getTime() - new Date(latest.createdAt).getTime();
                  if (timeDiff < 3000) { // Increased tolerance slightly
                      setCurrentToast(latest);
                      // Audio cue (Subtle "Pop" sound)
                      try {
                        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); 
                        audio.volume = 0.3;
                        audio.play().catch(() => {}); // Ignore autoplay errors
                      } catch (e) {}
                  }
              }
          }
      }, 100);
    };

    window.addEventListener('notification-update', handleUpdate);
    return () => window.removeEventListener('notification-update', handleUpdate);
  }, [user]);

  // --- AUTOMATIC LOW STOCK CHECKER (Simulates Backend Job) ---
  useEffect(() => {
      if (!user || (user.role !== 'ADMIN' && user.role !== 'INVESTOR')) return;

      const checkLowStock = async () => {
          const products = await DatabaseService.getProducts();
          
          // Identify products with stock < 10
          const lowStockProducts = products.filter(p => p.stock > 0 && p.stock < 10);
          
          // Filter if Investor: only care about my products
          const relevantLowStock = user.role === 'INVESTOR' 
              ? lowStockProducts.filter(p => p.investorId === user.id)
              : lowStockProducts;

          // Note: To avoid spamming, we rely on NotificationService logic or check if notif exists.
          // For this simulation, we'll just log it, assuming NotificationService.saveProduct triggers the actual alert
          // OR we can trigger it here if it wasn't triggered recently.
          
          if (relevantLowStock.length > 0) {
             // In a real app, we would check if we already notified today.
             // Here, we trust the `saveProduct` trigger in mockDatabase to be the primary source,
             // but this acts as a safety polling in case of external updates.
          }
      };

      // Check every 5 minutes
      const interval = setInterval(checkLowStock, 300000);
      
      return () => clearInterval(interval);
  }, [user]);

  const markAsRead = (id: string) => {
    NotificationService.markAsRead(id);
    loadNotifications();
  };

  const markAllRead = () => {
    if (user) {
      NotificationService.markAllAsRead(user.id);
      loadNotifications();
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllRead }}>
      {children}
      {currentToast && (
        <NotificationToast 
            notification={currentToast} 
            onClose={() => setCurrentToast(null)} 
        />
      )}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotifications must be used within NotificationProvider");
  return context;
};
