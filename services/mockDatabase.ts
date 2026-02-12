
import { 
  Product, User, Order, SiteConfig, Dispute, ChatMessage, 
  Page, RolePermission, EarningsRecord, DeliveryDriver, 
  PromoCode, Voucher, InternationalShipment, ReviewDetails, 
  ProductReview, OrderStatus, UserRole, MarketingCampaign, SystemLog, FinancialTransaction, DeliveryRule
} from '../types';
import { NotificationService } from './NotificationService';

// Constants for LocalStorage Keys
const DB_KEYS = {
  PRODUCTS: 'products',
  USERS: 'users_v5',
  ORDERS: 'orders',
  SITE_CONFIG: 'site_config',
  DISPUTES: 'disputes',
  PAGES: 'pages',
  MESSAGES: 'messages',
  ROLES: 'roles',
  EARNINGS: 'earnings',
  DRIVERS: 'drivers',
  PROMOS: 'promos',
  VOUCHERS: 'vouchers',
  REVIEWS: 'reviews',
  CAMPAIGNS: 'campaigns',
  LOGS: 'system_logs',
  FINANCE: 'financial_records' // New Key
};

export const generateId = () => Math.random().toString(36).substr(2, 9);

// Simple Hashing Helper (Web Crypto API)
const hashPassword = async (password: string, salt: string): Promise<string> => {
    const enc = new TextEncoder();
    const data = enc.encode(password + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export class DatabaseService {
  private static getStored<T>(key: string, defaultValue: T): T {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  }

  private static setStored<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // --- FINANCIAL ENGINE ---
  
  static async getFinancialRecords(): Promise<FinancialTransaction[]> {
      return this.getStored<FinancialTransaction[]>(DB_KEYS.FINANCE, []);
  }

  static async processOrderFinancials(order: Order): Promise<void> {
      if (order.financialProcessed) return;

      const products = await this.getProducts();
      let totalSales = 0;
      let totalCapital = 0;

      // 1. Calculate Totals (Sales & Capital)
      order.items.forEach(item => {
          const product = products.find(p => p.id === item.id);
          const capitalUnit = product?.capital || 0; // Default to 0 if not set
          
          totalSales += item.price * item.quantity;
          totalCapital += capitalUnit * item.quantity;
      });

      // 2. Calculate Gross Profit
      // Profit Brut = Prix de Vente - Capital Initial
      const grossProfit = Math.max(0, totalSales - totalCapital);

      // 3. Distribution Rules
      // Investisseur: 30% | TVA: 18% | Partenaire: 17% | Admin: 35%
      const distributions = {
          investor: Math.round(grossProfit * 0.30),
          vat: Math.round(grossProfit * 0.18),
          partner: Math.round(grossProfit * 0.17),
          admin: Math.round(grossProfit * 0.35)
      };

      // 4. Save Record
      const transaction: FinancialTransaction = {
          id: generateId(),
          orderId: order.id,
          orderShortId: order.shortId,
          date: new Date().toISOString(),
          totalSales,
          totalCapital,
          grossProfit,
          distributions,
          status: 'ACTIVE'
      };

      const records = await this.getFinancialRecords();
      records.unshift(transaction);
      this.setStored(DB_KEYS.FINANCE, records);

      // 5. Mark Order as Processed
      order.financialProcessed = true;
      const orders = await this.getOrders();
      const orderIdx = orders.findIndex(o => o.id === order.id);
      if (orderIdx >= 0) {
          orders[orderIdx] = order;
          this.setStored(DB_KEYS.ORDERS, orders);
      }
  }

  static async deleteFinancialRecord(id: string): Promise<void> {
      const records = await this.getFinancialRecords();
      const updated = records.filter(r => r.id !== id);
      this.setStored(DB_KEYS.FINANCE, updated);
  }

  static async toggleFinancialRecordStatus(id: string): Promise<void> {
      const records = await this.getFinancialRecords();
      const record = records.find(r => r.id === id);
      if (record) {
          record.status = record.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE';
          this.setStored(DB_KEYS.FINANCE, records);
      }
  }

  // --- USERS & AUTH ---
  static async getUsers(): Promise<User[]> {
    let users = this.getStored<User[]>(DB_KEYS.USERS, []);
    
    // Ensure Default Admin Exists
    const adminExists = users.some(u => u.username === 'Beha96');
    if (!adminExists) {
        const salt = generateId();
        const hash = await hashPassword('Bonjour2031', salt);
        
        const defaultAdmin: User = {
            id: 'admin1',
            username: 'Beha96',
            name: 'Administrateur Principal',
            role: UserRole.ADMIN,
            isActive: true,
            passwordHash: hash,
            passwordSalt: salt,
            passwordHistory: [{ date: new Date().toISOString(), reason: 'Initialisation système' }]
        };
        users.push(defaultAdmin);
        this.setStored(DB_KEYS.USERS, users);
    }
    
    return users;
  }

  static async getUserRaw(username: string): Promise<User | null> {
    const users = await this.getUsers();
    return users.find(u => u.username === username) || null;
  }

  static async login(username: string, password?: string): Promise<User | null> {
    const user = await this.getUserRaw(username);
    if (!user) return null;

    // Security Check
    if (user.role === UserRole.ADMIN) {
        if (!password || !user.passwordHash || !user.passwordSalt) return null;
        const inputHash = await hashPassword(password, user.passwordSalt);
        if (inputHash !== user.passwordHash) return null;
        
        this.addSystemLog(user.id, 'LOGIN', 'Connexion administrateur réussie', 'INFO');
    } 
    else {
        return user;
    }

    return user;
  }

  static async updateUserCredentials(userId: string, newUsername: string, newPassword?: string): Promise<boolean> {
      const users = await this.getUsers();
      const userIndex = users.findIndex(u => u.id === userId);
      if (userIndex === -1) return false;

      const user = users[userIndex];
      user.username = newUsername;

      if (newPassword) {
          const newSalt = generateId();
          const newHash = await hashPassword(newPassword, newSalt);
          user.passwordSalt = newSalt;
          user.passwordHash = newHash;
          
          if (!user.passwordHistory) user.passwordHistory = [];
          user.passwordHistory.unshift({
              date: new Date().toISOString(),
              reason: 'Changement manuel par administrateur',
              ip: '127.0.0.1'
          });
      }

      users[userIndex] = user;
      this.setStored(DB_KEYS.USERS, users);
      
      NotificationService.send(userId, 'Sécurité', 'Vos identifiants ont été mis à jour.', 'INFO');
      this.addSystemLog(userId, 'UPDATE_CREDENTIALS', 'Modification des identifiants', 'WARNING');
      
      return true;
  }

  static async verifyAdminPassword(userId: string, password: string): Promise<boolean> {
      const users = await this.getUsers();
      const user = users.find(u => u.id === userId);
      if (!user || !user.passwordHash || !user.passwordSalt) return false;
      const hash = await hashPassword(password, user.passwordSalt);
      return hash === user.passwordHash;
  }

  static async saveUser(user: User, adminId?: string, password?: string): Promise<void> {
    const users = await this.getUsers();
    const index = users.findIndex(u => u.id === user.id);
    
    // Password Logic
    if (password) {
        const salt = generateId();
        const hash = await hashPassword(password, salt);
        user.passwordSalt = salt;
        user.passwordHash = hash;
    } else if (index >= 0) {
        // Keep old password if not changing
        user.passwordHash = users[index].passwordHash;
        user.passwordSalt = users[index].passwordSalt;
    }

    let action = 'CREATE';
    if (index >= 0) {
      users[index] = user;
      action = 'UPDATE';
    } else {
      users.push(user);
    }
    this.setStored(DB_KEYS.USERS, users);

    if (adminId) {
        this.addSystemLog(adminId, `USER_${action}`, `Utilisateur: ${user.username} (${user.role})`, 'INFO');
    }
  }

  static async deleteUser(id: string, adminId?: string): Promise<void> {
    const users = await this.getUsers();
    // Prevent self-delete
    if (id === adminId) throw new Error("Impossible de supprimer son propre compte");
    
    const userToDelete = users.find(u => u.id === id);
    this.setStored(DB_KEYS.USERS, users.filter(u => u.id !== id));

    if (adminId) {
        this.addSystemLog(adminId, 'DELETE_USER', `Suppression Utilisateur: ${userToDelete?.username}`, 'WARNING');
    }
  }

  static async toggleUserStatus(id: string, adminId?: string): Promise<void> {
      const users = await this.getUsers();
      const user = users.find(u => u.id === id);
      if (user) {
          user.isActive = !user.isActive;
          this.setStored(DB_KEYS.USERS, users);
          if (adminId) {
              this.addSystemLog(adminId, 'TOGGLE_USER', `Utilisateur ${user.username} ${user.isActive ? 'activé' : 'désactivé'}`, 'INFO');
          }
      }
  }

  // --- LOGGING ---
  static async getSystemLogs(): Promise<SystemLog[]> {
      return this.getStored<SystemLog[]>(DB_KEYS.LOGS, []);
  }

  static async addSystemLog(adminId: string, action: string, details: string, severity: 'INFO' | 'WARNING' | 'CRITICAL'): Promise<void> {
      const logs = await this.getSystemLogs();
      logs.unshift({
          id: generateId(),
          adminId,
          action,
          details,
          timestamp: new Date().toISOString(),
          severity
      });
      if (logs.length > 200) logs.pop(); // Increased log limit
      this.setStored(DB_KEYS.LOGS, logs);
  }

  // --- PRODUCTS ---
  static async getProducts(): Promise<Product[]> {
    return this.getStored<Product[]>(DB_KEYS.PRODUCTS, []);
  }

  static async saveProduct(product: Product, adminId?: string): Promise<void> {
    const products = await this.getProducts();
    const index = products.findIndex(p => p.id === product.id);
    
    let action = 'CREATE';
    if (index >= 0) {
      products[index] = product;
      action = 'UPDATE';
    } else {
      products.push(product);
    }
    this.setStored(DB_KEYS.PRODUCTS, products);

    if (adminId) {
        this.addSystemLog(adminId, `PRODUCT_${action}`, `Produit: ${product.name}, Prix: ${product.price}`, 'INFO');
    }
  }

  static async deleteProduct(id: string, adminId?: string): Promise<void> {
    const products = await this.getProducts();
    const prod = products.find(p => p.id === id);
    this.setStored(DB_KEYS.PRODUCTS, products.filter(p => p.id !== id));

    if (adminId) {
        this.addSystemLog(adminId, 'DELETE_PRODUCT', `Suppression Produit: ${prod?.name}`, 'WARNING');
    }
  }

  static async toggleProductStatus(id: string, adminId?: string): Promise<void> {
      const products = await this.getProducts();
      const prod = products.find(p => p.id === id);
      if (prod) {
          prod.active = !prod.active;
          this.setStored(DB_KEYS.PRODUCTS, products);
          if (adminId) {
              this.addSystemLog(adminId, 'TOGGLE_PRODUCT', `Produit ${prod.name} ${prod.active ? 'activé' : 'désactivé'}`, 'INFO');
          }
      }
  }

  static async likeProduct(id: string): Promise<void> {
    const products = await this.getProducts();
    const p = products.find(p => p.id === id);
    if (p) {
        p.likes = (p.likes || 0) + 1;
        this.setStored(DB_KEYS.PRODUCTS, products);
    }
  }

  static async dislikeProduct(id: string): Promise<void> {
    const products = await this.getProducts();
    const p = products.find(p => p.id === id);
    if (p) {
        p.dislikes = (p.dislikes || 0) + 1;
        this.setStored(DB_KEYS.PRODUCTS, products);
    }
  }

  static async incrementProductViews(id: string): Promise<void> {
    const products = await this.getProducts();
    const p = products.find(p => p.id === id);
    if (p) {
        p.views = (p.views || 0) + 1;
        this.setStored(DB_KEYS.PRODUCTS, products);
    }
  }

  // --- ORDERS ---
  static async getOrders(): Promise<Order[]> {
    return this.getStored<Order[]>(DB_KEYS.ORDERS, []);
  }

  static async getOrderById(id: string): Promise<Order | null> {
    const orders = await this.getOrders();
    return orders.find(o => o.id === id || o.shortId === id) || null;
  }

  static async createOrder(order: Order): Promise<void> {
    const orders = await this.getOrders();
    orders.push(order);
    this.setStored(DB_KEYS.ORDERS, orders);
    window.dispatchEvent(new Event('order-update'));
    NotificationService.notifyNewOrder(order);
  }

  static async updateOrderStatus(id: string, status: OrderStatus, note?: string, isPaid?: boolean): Promise<void> {
    const orders = await this.getOrders();
    const order = orders.find(o => o.id === id);
    if (order) {
      const oldStatus = order.status;
      order.status = status;
      if (note) {
        order.statusHistory.push({ status, date: new Date().toISOString(), note });
      }
      if (isPaid !== undefined) {
        order.isPaid = isPaid;
      }
      if (status === OrderStatus.DELIVERED && !order.deliveredAt) {
          order.deliveredAt = new Date().toISOString();
      }
      
      // TRIGGER FINANCIAL PROCESSING IF DELIVERED
      if (status === OrderStatus.DELIVERED) {
          // Assuming paid upon delivery or before
          this.processOrderFinancials(order);
      }

      this.setStored(DB_KEYS.ORDERS, orders);
      window.dispatchEvent(new Event('order-update'));
      NotificationService.notifyStatusChange(order, oldStatus, status);
    }
  }

  static async cancelOrder(id: string, reason: string): Promise<void> {
    await this.updateOrderStatus(id, OrderStatus.CANCELLED, reason);
  }

  static async confirmReceipt(orderId: string, review: ReviewDetails): Promise<void> {
      const orders = await this.getOrders();
      const order = orders.find(o => o.id === orderId);
      if (order) {
          order.customerConfirmedReceipt = true;
          order.reviewDetails = review;
          this.setStored(DB_KEYS.ORDERS, orders);
      }
  }

  // --- SITE CONFIG & ZONES/PRICES ---
  static async getSiteConfig(): Promise<SiteConfig> {
    return this.getStored<SiteConfig>(DB_KEYS.SITE_CONFIG, {
        appName: 'BEHASHOP',
        heroTitle: 'Bienvenue',
        heroSubtitle: 'La boutique en ligne',
        contactEmail: 'contact@behashop.com',
        contactPhone: '+225 0707000000',
        primaryColor: '#00AEEF',
        secondaryColor: '#171717',
        termsOfService: '',
        privacyPolicy: '',
        banners: [],
        categories: [],
        deliveryRules: [],
        enableCashOnDelivery: true,
        globalVariants: { colors: [], sizes: [], weights: [], volumes: [], models: [] }
    });
  }

  static async saveSiteConfig(config: SiteConfig): Promise<void> {
    this.setStored(DB_KEYS.SITE_CONFIG, config);
  }

  static async saveDeliveryRule(rule: DeliveryRule, adminId?: string): Promise<void> {
      const config = await this.getSiteConfig();
      const index = config.deliveryRules.findIndex(r => r.id === rule.id);
      
      let action = 'CREATE';
      if (index >= 0) {
          config.deliveryRules[index] = rule;
          action = 'UPDATE';
      } else {
          config.deliveryRules.push(rule);
      }
      
      await this.saveSiteConfig(config);
      
      if (adminId) {
          this.addSystemLog(adminId, `DELIVERY_RULE_${action}`, `Zone: ${rule.zoneName}, Prix: ${rule.price}F`, 'INFO');
      }
  }

  static async deleteDeliveryRule(id: string, adminId?: string): Promise<void> {
      const config = await this.getSiteConfig();
      const rule = config.deliveryRules.find(r => r.id === id);
      config.deliveryRules = config.deliveryRules.filter(r => r.id !== id);
      
      await this.saveSiteConfig(config);
      
      if (adminId) {
          this.addSystemLog(adminId, 'DELETE_DELIVERY_RULE', `Suppression Zone: ${rule?.zoneName}`, 'WARNING');
      }
  }

  static async toggleDeliveryRuleStatus(id: string, adminId?: string): Promise<void> {
      const config = await this.getSiteConfig();
      const rule = config.deliveryRules.find(r => r.id === id);
      if (rule) {
          rule.active = !rule.active;
          await this.saveSiteConfig(config);
          
          if (adminId) {
              this.addSystemLog(adminId, 'TOGGLE_RULE_STATUS', `Zone ${rule.zoneName} est maintenant ${rule.active ? 'ACTIVE' : 'INACTIVE'}`, 'INFO');
          }
      }
  }

  // --- DISPUTES ---
  static async getDisputes(): Promise<Dispute[]> {
    return this.getStored<Dispute[]>(DB_KEYS.DISPUTES, []);
  }

  static async createDispute(dispute: Dispute): Promise<void> {
    const disputes = await this.getDisputes();
    disputes.push(dispute);
    this.setStored(DB_KEYS.DISPUTES, disputes);
    
    // Also update order status if needed
    await this.updateOrderStatus(dispute.orderId, OrderStatus.RETURN_REQUESTED, 'Litige ouvert');
    
    const order = await this.getOrderById(dispute.orderId);
    if (order) {
        NotificationService.notifyReturnRequest(order, dispute.description);
        // Find relevant investors
        const products = await this.getProducts();
        const investorIds = order.items
            .map(i => products.find(p => p.id === i.id)?.investorId)
            .filter((id): id is string => !!id);
        const uniqueInvestorIds = Array.from(new Set(investorIds));
        
        NotificationService.notifyDisputeCreated(dispute, uniqueInvestorIds);
    }
  }

  static async resolveDispute(id: string, decision: 'ACCEPTED' | 'REJECTED', note?: string): Promise<void> {
    const disputes = await this.getDisputes();
    const dispute = disputes.find(d => d.id === id);
    if (dispute) {
      dispute.status = 'RESOLVED';
      dispute.adminDecision = decision;
      this.setStored(DB_KEYS.DISPUTES, disputes);

      const newStatus = decision === 'ACCEPTED' ? OrderStatus.RETURN_ACCEPTED : OrderStatus.DELIVERED;
      
      const order = await this.getOrderById(dispute.orderId);
      if (order) {
          await this.updateOrderStatus(order.id, newStatus, `Décision Litige: ${decision}. Note: ${note || ''}`);
          NotificationService.notifyReturnResolution(order, decision === 'ACCEPTED', note);
      }
    }
  }
  
  // --- DRIVERS LOGISTICS ---
  static async getDrivers(): Promise<DeliveryDriver[]> {
      return this.getStored<DeliveryDriver[]>(DB_KEYS.DRIVERS, []);
  }
  
  static async saveDriver(driver: DeliveryDriver, userId?: string): Promise<void> {
      const drivers = await this.getDrivers();
      const users = await this.getUsers();
      const currentUser = users.find(u => u.id === userId);
      const idx = drivers.findIndex(d => d.id === driver.id);
      
      // If Partner (Agency) adds/edits driver, force status to PENDING
      if (currentUser && currentUser.role === UserRole.PARTNER) {
          driver.status = 'PENDING_APPROVAL';
      }

      let action = 'CREATE';
      if(idx >= 0) {
          drivers[idx] = driver;
          action = 'UPDATE';
      } else {
          drivers.push(driver);
      }
      this.setStored(DB_KEYS.DRIVERS, drivers);

      if (userId) {
          const logMsg = currentUser?.role === UserRole.PARTNER 
              ? `Agence ${currentUser.name}: Demande livreur ${driver.name} (En attente)` 
              : `Admin: Gestion Livreur ${driver.name}, Statut: ${driver.status}`;
          
          const admin = users.find(u => u.role === UserRole.ADMIN);
          if (admin) {
              this.addSystemLog(admin.id, `DRIVER_${action}`, logMsg, 'INFO');
          }
      }
  }

  static async validateDriver(driverId: string, status: 'ACTIVE' | 'REJECTED' | 'INACTIVE', adminId: string, note?: string): Promise<void> {
      const drivers = await this.getDrivers();
      const idx = drivers.findIndex(d => d.id === driverId);
      if (idx >= 0) {
          drivers[idx].status = status;
          if (note) drivers[idx].adminNote = note;
          this.setStored(DB_KEYS.DRIVERS, drivers);
          
          this.addSystemLog(adminId, 'DRIVER_VALIDATION', `Livreur ${drivers[idx].name} passé à ${status}`, status === 'REJECTED' ? 'WARNING' : 'INFO');
      }
  }

  static async archiveDriver(driverId: string, userId: string): Promise<void> {
      const drivers = await this.getDrivers();
      const idx = drivers.findIndex(d => d.id === driverId);
      if (idx >= 0) {
          drivers[idx].status = 'ARCHIVED';
          this.setStored(DB_KEYS.DRIVERS, drivers);
          
          const users = await this.getUsers();
          const admin = users.find(u => u.role === UserRole.ADMIN);
          if (admin) {
              this.addSystemLog(admin.id, 'DRIVER_ARCHIVED', `Livreur ${drivers[idx].name} archivé par partenaire`, 'INFO');
          }
      }
  }
  
  static async deleteDriver(id: string, adminId?: string): Promise<void> {
      const drivers = await this.getDrivers();
      const driver = drivers.find(d => d.id === id);
      this.setStored(DB_KEYS.DRIVERS, drivers.filter(d => d.id !== id));

      if (adminId) {
          this.addSystemLog(adminId, 'DELETE_DRIVER', `Suppression Définitive Livreur: ${driver?.name}`, 'WARNING');
      }
  }

  // --- PAGES ---
  static async getPages(): Promise<Page[]> {
    return this.getStored<Page[]>(DB_KEYS.PAGES, []);
  }

  static async getPageBySlug(slug: string): Promise<Page | null> {
    const pages = await this.getPages();
    return pages.find(p => p.slug === slug) || null;
  }

  static async savePage(page: Page): Promise<void> {
    const pages = await this.getPages();
    const index = pages.findIndex(p => p.id === page.id);
    if (index >= 0) pages[index] = page;
    else pages.push(page);
    this.setStored(DB_KEYS.PAGES, pages);
  }

  static async deletePage(id: string): Promise<void> {
    const pages = await this.getPages();
    this.setStored(DB_KEYS.PAGES, pages.filter(p => p.id !== id));
  }

  // --- MESSAGES ---
  static async getMessages(): Promise<ChatMessage[]> {
    return this.getStored<ChatMessage[]>(DB_KEYS.MESSAGES, []);
  }

  static async sendMessage(msg: ChatMessage): Promise<void> {
    const messages = await this.getMessages();
    messages.push(msg);
    this.setStored(DB_KEYS.MESSAGES, messages);
    window.dispatchEvent(new Event('chat-update'));
  }

  // --- ROLES ---
  static async getRolePermissions(): Promise<RolePermission[]> {
    return this.getStored<RolePermission[]>(DB_KEYS.ROLES, [
        { 
            role: UserRole.PARTNER, label: 'Partenaire', 
            permissions: { orders: {read:true,write:true,delete:false}, products: {read:true,write:false,delete:false}, users: {read:false,write:false,delete:false}, pages: {read:false,write:false,delete:false}, settings: {read:true,write:false,delete:false} }
        },
        { 
            role: UserRole.INVESTOR, label: 'Investisseur', 
            permissions: { orders: {read:true,write:false,delete:false}, products: {read:true,write:false,delete:false}, users: {read:false,write:false,delete:false}, pages: {read:false,write:false,delete:false}, settings: {read:false,write:false,delete:false} }
        }
    ]);
  }

  static async saveRolePermissions(roles: RolePermission[]): Promise<void> {
    this.setStored(DB_KEYS.ROLES, roles);
  }

  // --- STATS ---
  static async getDashboardStats(): Promise<any> {
    const orders = await this.getOrders();
    const partners = (await this.getUsers()).filter(u => u.role === UserRole.PARTNER);
    
    const totalRevenue = orders.filter(o => o.status !== OrderStatus.CANCELLED).reduce((acc, o) => acc + o.total, 0);
    const pendingOrders = orders.filter(o => o.status === OrderStatus.NEW || o.status === OrderStatus.PROCESSING).length;

    return {
      totalOrders: orders.length,
      totalRevenue,
      pendingOrders,
      totalPartners: partners.length
    };
  }

  static async getProductSalesStats(): Promise<Record<string, number>> {
      const orders = await this.getOrders();
      const stats: Record<string, number> = {};
      
      orders.forEach(o => {
          if (o.status !== OrderStatus.CANCELLED) {
              o.items.forEach(i => {
                  stats[i.id] = (stats[i.id] || 0) + i.quantity;
              });
          }
      });
      return stats;
  }

  // --- PROMOS & VOUCHERS ---
  static async getPromoCodes(): Promise<PromoCode[]> {
      return this.getStored<PromoCode[]>(DB_KEYS.PROMOS, []);
  }
  static async savePromoCode(promo: PromoCode): Promise<void> {
      const promos = await this.getPromoCodes();
      const idx = promos.findIndex(p => p.id === promo.id);
      if(idx >= 0) promos[idx] = promo;
      else promos.push(promo);
      this.setStored(DB_KEYS.PROMOS, promos);
  }
  static async deletePromoCode(id: string): Promise<void> {
      const promos = await this.getPromoCodes();
      this.setStored(DB_KEYS.PROMOS, promos.filter(p => p.id !== id));
  }

  static async getVouchers(): Promise<Voucher[]> {
      return this.getStored<Voucher[]>(DB_KEYS.VOUCHERS, []);
  }
  static async saveVoucher(voucher: Voucher): Promise<void> {
      const vouchers = await this.getVouchers();
      const idx = vouchers.findIndex(v => v.id === voucher.id);
      if(idx >= 0) vouchers[idx] = voucher;
      else vouchers.push(voucher);
      this.setStored(DB_KEYS.VOUCHERS, vouchers);
  }
  static async deleteVoucher(id: string): Promise<void> {
      const vouchers = await this.getVouchers();
      this.setStored(DB_KEYS.VOUCHERS, vouchers.filter(v => v.id !== id));
  }

  static async validateCoupon(code: string): Promise<{ isValid: boolean, value: number, message: string }> {
      const vouchers = await this.getVouchers();
      const voucher = vouchers.find(v => v.code === code && v.status === 'ACTIVE');
      if (voucher) {
          return { isValid: true, value: voucher.value, message: "Bon d'achat appliqué" };
      }

      const promos = await this.getPromoCodes();
      const promo = promos.find(p => p.code === code && p.active);
      if (promo) {
          return { isValid: true, value: promo.value, message: `Promo ${promo.type === 'PERCENTAGE' ? '-' + promo.value + '%' : 'Fixe'}` };
      }

      return { isValid: false, value: 0, message: "Code invalide ou expiré" };
  }

  static async redeemCoupon(orderId: string): Promise<void> {
      const orders = await this.getOrders();
      const order = orders.find(o => o.id === orderId);
      if (order && order.refundCouponCode) {
          order.couponRedeemed = true;
          this.setStored(DB_KEYS.ORDERS, orders);
      }
  }

  // --- MARKETING CAMPAIGNS ---
  static async getCampaigns(): Promise<MarketingCampaign[]> {
      return this.getStored<MarketingCampaign[]>(DB_KEYS.CAMPAIGNS, []);
  }
  static async saveCampaign(campaign: MarketingCampaign): Promise<void> {
      const list = await this.getCampaigns();
      const idx = list.findIndex(c => c.id === campaign.id);
      if (idx >= 0) list[idx] = campaign;
      else list.push(campaign);
      this.setStored(DB_KEYS.CAMPAIGNS, list);
  }
  static async deleteCampaign(id: string): Promise<void> {
      const list = await this.getCampaigns();
      this.setStored(DB_KEYS.CAMPAIGNS, list.filter(c => c.id !== id));
  }

  // --- REVIEWS ---
  static async getProductReviews(productId: string): Promise<ProductReview[]> {
      const reviews = this.getStored<ProductReview[]>(DB_KEYS.REVIEWS, []);
      return reviews.filter(r => r.productId === productId);
  }

  static async addProductReview(review: ProductReview): Promise<void> {
      const reviews = this.getStored<ProductReview[]>(DB_KEYS.REVIEWS, []);
      reviews.push(review);
      this.setStored(DB_KEYS.REVIEWS, reviews);

      const productReviews = reviews.filter(r => r.productId === review.productId);
      const avg = productReviews.reduce((acc, r) => acc + r.rating, 0) / productReviews.length;
      
      const products = await this.getProducts();
      const p = products.find(prod => prod.id === review.productId);
      if (p) {
          p.averageRating = parseFloat(avg.toFixed(1));
          p.reviewCount = productReviews.length;
          this.setStored(DB_KEYS.PRODUCTS, products);
      }
  }

  // --- EARNINGS ---
  static async getEarningsHistory(partnerId: string): Promise<EarningsRecord[]> {
      const all = this.getStored<EarningsRecord[]>(DB_KEYS.EARNINGS, []);
      return all.filter(e => e.partnerId === partnerId);
  }

  // --- PARTNER TOOLS ---
  static async scanQRCode(code: string, partnerId: string): Promise<Order | null> {
      const order = await this.getOrderById(code);
      if (!order) return null;
      return order;
  }
  
  static async validateCollectionCode(orderId: string, code: string): Promise<boolean> {
      const order = await this.getOrderById(orderId);
      if (order && order.collectionCode === code) {
          await this.updateOrderStatus(order.id, OrderStatus.DELIVERED, 'Retrait validé par code');
          return true;
      }
      return false;
  }
  
  static async reportPartnerProblem(orderId: string, partnerId: string, type: 'RETURN' | 'WITHDRAWAL_EXCEEDED' | 'OTHER', description: string): Promise<void> {
      const order = await this.getOrderById(orderId);
      if(order) {
          const dispute: Dispute = {
              id: generateId(),
              orderId: order.shortId,
              partnerId,
              type,
              description,
              status: 'OPEN',
              createdAt: new Date().toISOString(),
              affectedProductIds: order.items.map(i => i.id)
          };
          
          await this.createDispute(dispute);
          
          if(type === 'RETURN') {
             await this.simulateReturnProgression(order.id);
          }
      }
  }

  static async simulateReturnProgression(orderId: string): Promise<void> {
      const order = await this.getOrderById(orderId);
      if(!order) return;
      
      if (!order.refundCouponCode) {
          order.refundCouponCode = 'REF-' + Math.random().toString(36).substr(2, 6).toUpperCase();
          order.refundCouponValue = order.total;
          order.status = OrderStatus.REFUNDED;
          
          const orders = await this.getOrders();
          const idx = orders.findIndex(o => o.id === order.id);
          if(idx >= 0) {
              orders[idx] = order;
              this.setStored(DB_KEYS.ORDERS, orders);
          }
          
          NotificationService.notifyRefundCoupon(order);
      }
  }

  // --- DATABASE UTILS ---
  static async resetDatabase(): Promise<void> {
      const users = await this.getUsers();
      const admin = users.find(u => u.username === 'Beha96');
      localStorage.clear();
      if (admin) {
          this.setStored(DB_KEYS.USERS, [admin]);
      }
      window.location.reload();
  }

  static async importDatabase(jsonData: string): Promise<void> {
      try {
          const data = JSON.parse(jsonData);
          if (data.products) this.setStored(DB_KEYS.PRODUCTS, data.products);
          if (data.orders) this.setStored(DB_KEYS.ORDERS, data.orders);
          if (data.users) this.setStored(DB_KEYS.USERS, data.users);
          if (data.siteConfig) this.setStored(DB_KEYS.SITE_CONFIG, data.siteConfig);
          window.location.reload();
      } catch (e) {
          console.error("Import failed", e);
          throw new Error("Format invalide");
      }
  }

  static async exportDatabase(): Promise<string> {
      const db = {
          products: await this.getProducts(),
          orders: await this.getOrders(),
          users: await this.getUsers(),
          disputes: await this.getDisputes(),
          siteConfig: await this.getSiteConfig(),
          pages: await this.getPages(),
          campaigns: await this.getCampaigns()
      };
      return JSON.stringify(db, null, 2);
  }

  static async getInternationalShipment(trackingCode: string): Promise<InternationalShipment | null> {
      if (trackingCode === 'TR-12345-CI') {
          return {
              id: 'int-1',
              trackingCode: 'TR-12345-CI',
              sender: 'Amazon USA',
              recipient: 'Kouassi Jean',
              originCountry: 'USA',
              destinationCountry: 'Côte d\'Ivoire',
              weight: '2.5 kg',
              status: 'IN_FLIGHT',
              estimatedArrival: new Date(Date.now() + 86400000 * 3).toISOString(),
              timeline: [
                  { status: 'RECEIVED_ORIGIN', date: new Date(Date.now() - 86400000 * 2).toISOString(), location: 'New York, USA' },
                  { status: 'CUSTOMS_CLEARANCE', date: new Date(Date.now() - 86400000).toISOString(), location: 'JFK Airport' },
                  { status: 'IN_FLIGHT', date: new Date().toISOString(), location: 'En vol vers Abidjan' }
              ]
          };
      }
      return null;
  }
}
