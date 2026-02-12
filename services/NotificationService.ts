
import { Notification, Order, User, UserRole, Dispute, Product } from '../types';
import { generateId } from './mockDatabase';

// Helper to get users from storage (mirroring database)
const getUsers = (): User[] => {
  const data = localStorage.getItem('users_v5'); // Updated to v5 to match DB
  return data ? JSON.parse(data) : [];
};

const getNotifications = (): Notification[] => {
  const data = localStorage.getItem('notifications');
  return data ? JSON.parse(data) : [];
};

const saveNotifications = (notifs: Notification[]) => {
  localStorage.setItem('notifications', JSON.stringify(notifs));
  // Dispatch event for real-time update in other components
  window.dispatchEvent(new Event('notification-update'));
};

export class NotificationService {
  
  // Send a raw notification to a specific user
  static send(userId: string, title: string, message: string, type: 'ORDER' | 'STATUS' | 'INFO' | 'ALERT' | 'COUPON', link?: string) {
    const newNotif: Notification = {
      id: generateId(),
      userId,
      title,
      message,
      type,
      read: false,
      createdAt: new Date().toISOString(),
      link
    };
    
    const all = getNotifications();
    all.unshift(newNotif); // Add to top
    saveNotifications(all);
  }

  // --- BUSINESS LOGIC NOTIFICATIONS ---

  static async notifyNewOrder(order: Order) {
    const users = getUsers();
    const admin = users.find(u => u.role === UserRole.ADMIN);
    
    // 1. Notify Admin
    if (admin) {
      this.send(
        admin.id, 
        'Nouvelle Commande', 
        `Commande ${order.shortId} reçue de ${order.customer.fullName}. Total: ${order.total.toLocaleString()} F`, 
        'ORDER',
        `/admin?tab=orders`
      );
    }

    // 2. Notify Assigned Partner (if selected directly)
    if (order.assignedPartnerId) {
      this.send(
        order.assignedPartnerId,
        'Nouvelle Commande Assignée',
        `Vous avez reçu la commande ${order.shortId} à traiter.`,
        'ORDER',
        '/partner'
      );
    }

    // 3. Notify Investors (Check items in order)
    const notifiedInvestors = new Set<string>();
    
    order.items.forEach(item => {
      if (item.investorId && !notifiedInvestors.has(item.investorId)) {
        this.send(
          item.investorId,
          'Vente Réalisée !',
          `Un de vos produits (${item.name}) a été commandé (Réf: ${order.shortId}).`,
          'ORDER',
          '/investor?tab=orders'
        );
        notifiedInvestors.add(item.investorId);
      }
    });
  }

  static async notifyStatusChange(order: Order, oldStatus: string, newStatus: string) {
    const users = getUsers();
    const admin = users.find(u => u.role === UserRole.ADMIN);

    const message = `Votre commande ${order.shortId} est maintenant : ${newStatus}`;

    // 1. Notify Admin
    if (admin) {
      this.send(admin.id, `Status: ${order.shortId}`, message, 'STATUS', '/admin?tab=orders');
    }

    // 2. Notify Partner
    if (order.assignedPartnerId) {
      this.send(order.assignedPartnerId, `MAJ Commande: ${order.shortId}`, `Le statut a changé vers : ${newStatus}`, 'STATUS', '/partner');
    }

    // 3. Notify Investors (Relevant to stock/returns)
    const notifiedInvestors = new Set<string>();
    order.items.forEach(item => {
      if (item.investorId && !notifiedInvestors.has(item.investorId)) {
        this.send(
          item.investorId,
          `Info Commande`,
          `La commande ${order.shortId} contenant vos produits est passée à : ${newStatus}`,
          'STATUS',
          '/investor?tab=orders'
        );
        notifiedInvestors.add(item.investorId);
      }
    });
    
    // 4. Notify Customer
    // Case A: Guest Tracking (via ID)
    this.send(
        `guest_${order.shortId}`,
        'Mise à jour Commande',
        message,
        'STATUS'
    );

    // Case B: Registered Client (If phone matches a user)
    // In a real app, order would have userId. Here we try to match phone number to find a registered user.
    const registeredClient = users.find(u => u.role === UserRole.CLIENT && u.username === order.customer.phone); // Assuming phone is username for clients
    if (registeredClient) {
        this.send(
            registeredClient.id,
            'Suivi de Commande',
            message,
            'STATUS',
            '/tracking'
        );
    }
  }

  static async notifyLowStock(product: Product) {
    const users = getUsers();
    const admin = users.find(u => u.role === UserRole.ADMIN);
    const message = `Alerte Stock: Le produit "${product.name}" est en faible quantité (${product.stock} restants).`;

    // 1. Notify Admin - Link to Catalog
    if (admin) {
      this.send(admin.id, 'Stock Critique', message, 'ALERT', '/admin?tab=catalog');
    }

    // 2. Notify Investor linked to product - Link to Stocks
    if (product.investorId) {
      this.send(product.investorId, 'Alerte Réapprovisionnement', message, 'ALERT', '/investor?tab=stocks');
    }
  }

  static async notifyRefundCoupon(order: Order) {
      if (!order.refundCouponCode || !order.refundCouponValue) return;

      const message = `Remboursement Validé. Bon d'achat de ${order.refundCouponValue.toLocaleString()} F disponible. Code: ${order.refundCouponCode}`;
      
      // Notify Tracking (In-App)
      this.send(
          `guest_${order.shortId}`,
          'Bon d\'achat disponible !',
          message,
          'COUPON'
      );

      // Notify Registered Client
      const users = getUsers();
      const registeredClient = users.find(u => u.role === UserRole.CLIENT && u.username === order.customer.phone);
      if (registeredClient) {
          this.send(registeredClient.id, 'Remboursement', message, 'COUPON', '/tracking');
      }
  }

  // --- DISPUTE & RETURN FLOW ---

  static async notifyReturnRequest(order: Order, reason: string) {
      const users = getUsers();
      const admin = users.find(u => u.role === UserRole.ADMIN);
      
      const message = `Demande de Retour pour la commande ${order.shortId}. Motif: ${reason}`;

      // 1. Notify Assigned Partner (Primary Handler)
      if (order.assignedPartnerId) {
          this.send(
              order.assignedPartnerId,
              'Nouvelle Demande de Retour',
              message,
              'ALERT',
              '/partner?tab=orders&filter=RETURNS'
          );
      }

      // 2. Notify Admin
      if (admin) {
          this.send(admin.id, 'Retour Client', message, 'ALERT', '/admin?tab=disputes');
      }
  }

  static async notifyReturnResolution(order: Order, accepted: boolean, note?: string) {
      const users = getUsers();
      const admin = users.find(u => u.role === UserRole.ADMIN);
      
      const title = accepted ? 'Retour Accepté' : 'Retour Refusé';
      const baseMsg = accepted 
          ? `Votre demande de retour pour la commande ${order.shortId} a été validée.` 
          : `Votre demande de retour pour la commande ${order.shortId} a été refusée.`;
      
      const fullMsg = note ? `${baseMsg} Note de l'agence: "${note}"` : baseMsg;

      // 1. Notify Customer (Guest + Registered)
      this.send(`guest_${order.shortId}`, title, fullMsg, 'STATUS');
      
      const registeredClient = users.find(u => u.role === UserRole.CLIENT && u.username === order.customer.phone);
      if (registeredClient) {
          this.send(registeredClient.id, title, fullMsg, 'STATUS', '/tracking');
      }

      // 2. Notify Admin (Info)
      if (admin) {
          this.send(admin.id, `Retour ${accepted ? 'Validé' : 'Refusé'} (Partenaire)`, `Cde ${order.shortId} traitée.`, 'INFO');
      }
  }

  static notifyDisputeCreated(dispute: Dispute, investorIds: string[]) {
      const users = getUsers();
      const admin = users.find(u => u.role === UserRole.ADMIN);
      
      const message = `Nouveau signalement: ${dispute.type} sur la commande ${dispute.orderId}.`;

      // 1. Always notify Admin
      if (admin) {
          this.send(admin.id, 'Litige / Signalement', message, 'ALERT', '/admin?tab=disputes');
      }

      // 2. Notify relevant Investors ONLY
      investorIds.forEach(id => {
          this.send(
              id, 
              'Litige Investissement', 
              `Un litige (${dispute.type}) a été ouvert sur un produit de votre portefeuille (Cde: ${dispute.orderId}). Veuillez consulter le tableau de bord.`, 
              'ALERT', 
              '/investor?tab=disputes'
          );
      });
  }

  // --- CLIENT METHODS ---

  static getForUser(userId: string): Notification[] {
    const all = getNotifications();
    return all.filter(n => n.userId === userId);
  }

  static markAsRead(notificationId: string) {
    const all = getNotifications();
    const updated = all.map(n => n.id === notificationId ? { ...n, read: true } : n);
    saveNotifications(updated);
  }

  static markAllAsRead(userId: string) {
    const all = getNotifications();
    const updated = all.map(n => n.userId === userId ? { ...n, read: true } : n);
    saveNotifications(updated);
  }
}
