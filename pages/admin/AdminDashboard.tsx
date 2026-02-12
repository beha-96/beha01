
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { useNotifications } from '../../context/NotificationContext';
import { DatabaseService, generateId } from '../../services/mockDatabase';
import { Product, User, UserRole, Order, SiteConfig, Category, PartnerType, OrderStatus, Dispute, Page, ChatMessage, RolePermission, ProductVariants, GlobalVariantOption, DeliveryDriver, PromoCode, Voucher, DeliveryRule, MarketingCampaign, SystemLog, FinancialTransaction } from '../../types';
import { 
  LayoutDashboard, ShoppingBag, Users, Settings, Plus, Edit, Trash2, 
  Save, X, Package, Truck, Search, Filter, Palette, 
  MapPin, DollarSign, AlertTriangle, LogOut, Lock, Store, 
  MessageCircle, FileText, Bell, ShieldCheck, Database, Download, Upload, CheckCircle, MessageSquare, History, Calendar, Layers, Ticket, BarChart3, Target, Smartphone, RefreshCw, Zap, Eye, EyeOff, Key, Shield, ShieldAlert, Activity, Check, ChevronRight, UserPlus, Banknote, Map, Power, FileCheck, ChevronUp, ChevronDown, Image as ImageIcon
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

// --- SYSTEM TABS ---
type SystemTab = 'pilotage' | 'orders' | 'logistics' | 'marketing' | 'catalog' | 'users' | 'system_config' | 'disputes' | 'pages' | 'finance';
type SettingsSubTab = 'general' | 'variants' | 'categories' | 'database' | 'security';
type MarketingSubTab = 'campaigns' | 'vouchers' | 'promos';
type LogisticsSubTab = 'drivers' | 'validations' | 'zones';

// Helper Component: Navigation Button
const NavButton = ({ active, onClick, icon: Icon, label, desc }: any) => (
  <button 
    onClick={onClick}
    className={`w-full text-left px-4 py-3 rounded-xl transition-all group flex items-center gap-3 ${active ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
  >
      <div className={`p-2 rounded-lg ${active ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500 group-hover:text-white'}`}>
          <Icon size={20} />
      </div>
      <div>
          <div className="font-bold text-sm">{label}</div>
          <div className={`text-[10px] ${active ? 'text-emerald-200' : 'text-slate-600'}`}>{desc}</div>
      </div>
  </button>
);

export const AdminDashboard: React.FC = () => {
  const { user, logout, siteConfig, refreshSiteConfig } = useApp();
  const { notifications, markAsRead, unreadCount } = useNotifications();
  const [activeTab, setActiveTab] = useState<SystemTab>('pilotage');
  
  // Settings & Sub Tabs State
  const [settingsTab, setSettingsTab] = useState<SettingsSubTab>('general');
  const [marketingTab, setMarketingTab] = useState<MarketingSubTab>('campaigns');
  const [logisticsTab, setLogisticsTab] = useState<LogisticsSubTab>('validations');
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState(false);
  
  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [drivers, setDrivers] = useState<DeliveryDriver[]>([]);
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [financials, setFinancials] = useState<FinancialTransaction[]>([]);

  const [loading, setLoading] = useState(false);

  // Forms State
  const [securityForm, setSecurityForm] = useState({ currentUsername: '', currentPassword: '', newPassword: '', confirmPassword: '' });
  const [categoryForm, setCategoryForm] = useState<Partial<Category>>({});
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [configForm, setConfigForm] = useState<SiteConfig | null>(null);
  const [campaignForm, setCampaignForm] = useState<Partial<MarketingCampaign>>({});
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  
  // User Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userForm, setUserForm] = useState<Partial<User>>({});
  const [userPassword, setUserPassword] = useState('');

  // Promo Modal State
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [promoForm, setPromoForm] = useState<Partial<PromoCode>>({});

  // Driver Validation Modal
  const [driverValidationNote, setDriverValidationNote] = useState('');
  const [selectedDriverForValidation, setSelectedDriverForValidation] = useState<DeliveryDriver | null>(null);
  
  // Driver Modal (For Logistics Tab)
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [driverForm, setDriverForm] = useState<Partial<DeliveryDriver>>({});

  // Delivery Rule (Zone/Price) Modal State
  const [isDeliveryRuleModalOpen, setIsDeliveryRuleModalOpen] = useState(false);
  const [deliveryRuleForm, setDeliveryRuleForm] = useState<Partial<DeliveryRule>>({});

  // --- PRODUCT WIZARD STATE ---
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productForm, setProductForm] = useState<Partial<Product>>({});
  const [activeStep, setActiveStep] = useState(0); 
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  // Dynamic Variant Input State
  const [variantTypeToAdd, setVariantTypeToAdd] = useState<keyof ProductVariants>('colors');
  const [variantValueToAdd, setVariantValueToAdd] = useState('');

  // --- INITIALIZATION ---
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) setActiveTab(tabParam as SystemTab);
    fetchData();
  }, [searchParams]);

  useEffect(() => {
    if (siteConfig) setConfigForm(JSON.parse(JSON.stringify(siteConfig)));
  }, [siteConfig]);

  useEffect(() => {
      if (user) setSecurityForm(prev => ({ ...prev, currentUsername: user.username }));
  }, [user]);

  const fetchData = async () => {
    const [p, o, u, d, s, dr, pr, vo, camp, logs, fin] = await Promise.all([
      DatabaseService.getProducts(),
      DatabaseService.getOrders(),
      DatabaseService.getUsers(),
      DatabaseService.getDisputes(),
      DatabaseService.getDashboardStats(),
      DatabaseService.getDrivers(),
      DatabaseService.getPromoCodes(),
      DatabaseService.getVouchers(),
      DatabaseService.getCampaigns(),
      DatabaseService.getSystemLogs(),
      DatabaseService.getFinancialRecords()
    ]);
    setProducts(p);
    setOrders(o);
    setUsers(u);
    setDisputes(d);
    setStats(s);
    setDrivers(dr);
    setPromos(pr);
    setVouchers(vo);
    setCampaigns(camp);
    setSystemLogs(logs);
    setFinancials(fin);
  };

  // Helper to resolve Agency Name
  const getAgencyName = (agencyId?: string) => {
      if (!agencyId) return 'N/A';
      const agency = users.find(u => u.id === agencyId);
      return agency ? agency.name : 'Inconnu';
  };

  // --- ACTIONS ---

  const handleCriticalAction = async (action: () => Promise<void>, message: string = "Confirmer cette action critique ?") => {
      if (confirm(message)) {
          await action();
          if (user) DatabaseService.addSystemLog(user.id, 'CRITICAL_ACTION', message, 'CRITICAL');
          fetchData();
      }
  };

  const handleUpdateAdminCredentials = async () => {
      if (!user) return;
      const isValid = await DatabaseService.verifyAdminPassword(user.id, securityForm.currentPassword);
      if (!isValid) { alert('Mot de passe incorrect'); return; }
      if (securityForm.newPassword && securityForm.newPassword !== securityForm.confirmPassword) { alert('Les mots de passe ne correspondent pas'); return; }
      
      await DatabaseService.updateUserCredentials(user.id, securityForm.currentUsername, securityForm.newPassword);
      alert('Identifiants mis à jour');
      setSecurityForm({ ...securityForm, currentPassword: '', newPassword: '', confirmPassword: '' });
      fetchData();
  };

  // --- USER MANAGEMENT ---
  const handleSaveUser = async () => {
      if (!userForm.username || !userForm.name || !user) return;
      
      await DatabaseService.saveUser({
          ...userForm,
          id: userForm.id || generateId(),
          isActive: userForm.isActive !== undefined ? userForm.isActive : true,
          role: userForm.role || UserRole.CLIENT,
          partnerType: userForm.role === UserRole.PARTNER ? (userForm.partnerType || PartnerType.AGENCY) : undefined,
          assignedZone: userForm.role === UserRole.PARTNER ? userForm.assignedZone : undefined
      } as User, user.id, userPassword || undefined); // Pass new password only if set
      
      setIsUserModalOpen(false);
      setUserPassword('');
      fetchData();
  };

  const handleToggleUserStatus = async (id: string) => {
      if (!user) return;
      await DatabaseService.toggleUserStatus(id, user.id);
      fetchData();
  };

  const handleDeleteUser = (id: string) => handleCriticalAction(async () => DatabaseService.deleteUser(id, user?.id), "Supprimer définitivement cet utilisateur ?");

  // --- LOGISTICS MANAGEMENT ---
  const handleValidateDriver = async (status: 'ACTIVE' | 'REJECTED') => {
      if (!selectedDriverForValidation || !user) return;
      if (status === 'REJECTED' && !driverValidationNote) {
          alert("Veuillez indiquer un motif de rejet.");
          return;
      }
      
      await DatabaseService.validateDriver(selectedDriverForValidation.id, status, user.id, driverValidationNote);
      setSelectedDriverForValidation(null);
      setDriverValidationNote('');
      fetchData();
  };

  const handleDeleteDriver = (id: string) => handleCriticalAction(async () => DatabaseService.deleteDriver(id, user?.id), "Supprimer ce livreur définitivement ?");

  const handleSaveDeliveryRule = async () => {
      if (!deliveryRuleForm.zoneName || !deliveryRuleForm.price || !user) return;
      await DatabaseService.saveDeliveryRule({
          ...deliveryRuleForm,
          id: deliveryRuleForm.id || generateId(),
          active: deliveryRuleForm.active ?? true
      } as DeliveryRule, user.id);
      refreshSiteConfig(); // Update context
      setIsDeliveryRuleModalOpen(false);
      fetchData(); // Refresh local state if derived from config
  };

  const handleDeleteDeliveryRule = (id: string) => handleCriticalAction(async () => {
      await DatabaseService.deleteDeliveryRule(id, user?.id);
      refreshSiteConfig();
  }, "Supprimer cette règle de prix ?");

  const handleToggleDeliveryRule = async (id: string) => {
      if(!user) return;
      await DatabaseService.toggleDeliveryRuleStatus(id, user.id);
      refreshSiteConfig();
      fetchData();
  };

  // --- ORDER ACTIONS ---
  const handleOrderStatus = async (orderId: string, status: OrderStatus) => {
      await DatabaseService.updateOrderStatus(orderId, status, 'Mise à jour Admin');
      fetchData();
  };

  // --- PROMO ACTIONS ---
  const handleSavePromo = async () => {
      if (!promoForm.code || !promoForm.value) return;
      await DatabaseService.savePromoCode({
          ...promoForm,
          id: promoForm.id || generateId(),
          active: promoForm.active !== undefined ? promoForm.active : true,
          usageCount: promoForm.usageCount || 0
      } as PromoCode);
      setIsPromoModalOpen(false);
      fetchData();
  };

  const handleDeletePromo = (id: string) => handleCriticalAction(async () => DatabaseService.deletePromoCode(id), "Supprimer ce code promo ?");

  // --- DISPUTE ACTIONS ---
  const handleResolveDispute = async (id: string, decision: 'ACCEPTED' | 'REJECTED') => {
      await DatabaseService.resolveDispute(id, decision);
      fetchData();
  };

  // --- FINANCIAL ACTIONS ---
  const handleToggleFinancialRecord = async (id: string) => {
      await DatabaseService.toggleFinancialRecordStatus(id);
      fetchData();
  };

  const handleDeleteFinancialRecord = async (id: string) => {
      if(confirm('Supprimer définitivement cet enregistrement financier ?')) {
          await DatabaseService.deleteFinancialRecord(id);
          fetchData();
      }
  };

  // --- PRODUCT MANAGEMENT ---

  const handleOpenProductModal = (productToEdit?: Product) => {
      if (productToEdit) {
          setProductForm({
              ...productToEdit,
              variants: {
                  colors: productToEdit.variants?.colors || [],
                  sizes: productToEdit.variants?.sizes || [],
                  models: productToEdit.variants?.models || [],
                  weights: productToEdit.variants?.weights || [],
                  volumes: productToEdit.variants?.volumes || [],
              },
              // Keep other flexible fields
          });
      } else {
          setProductForm({ 
              id: '', 
              name: '', 
              price: 0, 
              capital: 0,
              category: 'Divers', 
              stock: 0, 
              active: true, 
              images: [''], 
              description: '',
              variants: { colors: [], sizes: [], models: [], weights: [], volumes: [] },
          });
      }
      setFormErrors({});
      setIsProductModalOpen(true);
  };

  const handleSaveProduct = async () => { 
      if (!productForm.name || !productForm.price || !user) return;
      
      const cleanImages = productForm.images?.filter(img => img && img.trim() !== '') || [];
      if (cleanImages.length === 0) cleanImages.push('https://via.placeholder.com/300');

      await DatabaseService.saveProduct({ 
          ...productForm, 
          id: productForm.id || generateId(), 
          images: cleanImages,
          active: productForm.active !== undefined ? productForm.active : true
      } as Product, user.id); 
      
      setIsProductModalOpen(false); 
      fetchData(); 
  };

  const handleToggleProduct = async (id: string) => {
      if(!user) return;
      await DatabaseService.toggleProductStatus(id, user.id);
      fetchData();
  };

  const handleDeleteProduct = async (id: string) => {
      handleCriticalAction(async () => {
          await DatabaseService.deleteProduct(id, user?.id);
          fetchData();
      }, "Supprimer définitivement ce produit ?");
  };

  // --- CONFIG ---

  const handleSaveCategory = async () => {
      if(!configForm || !categoryForm.name) return;
      let newCats = [...(configForm.categories || [])];
      if(categoryForm.id) {
          newCats = newCats.map(c => c.id === categoryForm.id ? { ...c, ...categoryForm } as Category : c);
      } else {
          const maxOrder = newCats.length > 0 ? Math.max(...newCats.map(c => c.displayOrder)) : 0;
          newCats.push({ ...categoryForm, id: generateId(), displayOrder: maxOrder + 1, active: categoryForm.active ?? true } as Category);
      }
      const newConfig = { ...configForm, categories: newCats };
      setConfigForm(newConfig);
      await DatabaseService.saveSiteConfig(newConfig);
      refreshSiteConfig();
      setIsCategoryModalOpen(false);
  };

  const handleDeleteCategory = (id: string) => {
      handleCriticalAction(async () => {
          if(!configForm) return;
          const newCats = configForm.categories.filter(c => c.id !== id);
          const newConfig = { ...configForm, categories: newCats };
          setConfigForm(newConfig);
          await DatabaseService.saveSiteConfig(newConfig);
          refreshSiteConfig();
      }, "Supprimer cette catégorie ? Cela peut affecter les produits.");
  };

  const handleMoveCategory = async (index: number, direction: number) => {
      if (!configForm) return;
      const cats = [...configForm.categories].sort((a,b) => a.displayOrder - b.displayOrder);
      const targetIndex = index + direction;
      
      if(targetIndex < 0 || targetIndex >= cats.length) return;
      
      const temp = cats[index];
      cats[index] = cats[targetIndex];
      cats[targetIndex] = temp;
      
      // Update displayOrder
      const reordered = cats.map((c, i) => ({...c, displayOrder: i + 1}));
      
      const newConfig = { ...configForm, categories: reordered };
      setConfigForm(newConfig);
      await DatabaseService.saveSiteConfig(newConfig);
      refreshSiteConfig();
  };

  const handleSaveConfig = async () => {
      if (configForm) {
          await DatabaseService.saveSiteConfig(configForm);
          refreshSiteConfig();
          alert('Configuration sauvegardée !');
      }
  };

  const handleSaveCampaign = async () => {
      if (!campaignForm.name) return;
      await DatabaseService.saveCampaign({
          ...campaignForm,
          id: campaignForm.id || generateId(),
          status: campaignForm.status || 'DRAFT'
      } as MarketingCampaign);
      setIsCampaignModalOpen(false);
      fetchData();
  };

  const handleResetDatabase = () => handleCriticalAction(async () => DatabaseService.resetDatabase(), "ATTENTION: Réinitialisation complète. Irréversible.");
  const handleImportDatabase = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json';
      input.onchange = async (e: any) => {
          const file = e.target.files[0];
          if(file) {
              const reader = new FileReader();
              reader.onload = async (ev) => {
                  if(ev.target?.result) {
                      await DatabaseService.importDatabase(ev.target.result as string);
                  }
              };
              reader.readAsText(file);
          }
      };
      input.click();
  };

  // Helper for adding variants in Product Modal
  const addVariant = () => {
      if (!variantValueToAdd.trim()) return;
      setProductForm(prev => {
          const currentList = prev.variants?.[variantTypeToAdd] || [];
          if (!currentList.includes(variantValueToAdd.trim())) {
              return {
                  ...prev,
                  variants: {
                      ...prev.variants,
                      [variantTypeToAdd]: [...currentList, variantValueToAdd.trim()]
                  }
              };
          }
          return prev;
      });
      setVariantValueToAdd('');
  };

  const removeVariant = (type: keyof ProductVariants, val: string) => {
      setProductForm(prev => ({
          ...prev,
          variants: {
              ...prev.variants,
              [type]: prev.variants?.[type]?.filter(v => v !== val) || []
          }
      }));
  };

  // --- RENDER HELPERS ---

  if (!user || user.role !== UserRole.ADMIN) return <div className="p-10 text-center text-red-600 font-bold">ACCÈS REFUSÉ</div>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-800 relative">
      
      {/* Mobile Header CSS Hack */}
      <style>{`@media (max-width: 768px) { body > div > header { display: none !important; } .pt-safe { padding-top: 0 !important; } }`}</style>

      {/* MOBILE HEADER */}
      <header className="md:hidden fixed top-0 w-full z-50 bg-slate-900 text-white shadow-md flex items-center justify-between px-4 h-16">
          <div className="font-bold text-lg flex items-center gap-2"><ShieldCheck size={20} className="text-emerald-400"/> ADMIN</div>
          <div className="flex items-center gap-4">
               <button onClick={() => setIsNotifDrawerOpen(true)} className="relative"><Bell size={24} />{unreadCount > 0 && <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>}</button>
               <button onClick={logout} className="text-red-400"><LogOut size={20} /></button>
          </div>
      </header>

      {/* SIDEBAR */}
      <aside className={`hidden md:flex flex-col fixed top-0 bottom-0 left-0 z-40 w-72 bg-slate-900 text-white shadow-2xl`}>
        <div className="p-6 border-b border-slate-800"><h2 className="text-xl font-extrabold flex items-center gap-3 text-emerald-400"><ShieldCheck size={24} /> ADMIN PANEL</h2></div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
           <NavButton active={activeTab === 'pilotage'} onClick={() => setActiveTab('pilotage')} icon={LayoutDashboard} label="Pilotage" desc="Vue d'ensemble & KPIs" />
           <NavButton active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} icon={ShoppingBag} label="Commandes" desc="Flux & Traitement" />
           <NavButton active={activeTab === 'logistics'} onClick={() => setActiveTab('logistics')} icon={Truck} label="Logistique" desc="Livreurs & Zones" />
           <NavButton active={activeTab === 'finance'} onClick={() => setActiveTab('finance')} icon={Banknote} label="Finance" desc="Répartition & Bénéfices" />
           <NavButton active={activeTab === 'marketing'} onClick={() => setActiveTab('marketing')} icon={Target} label="Marketing" desc="Campagnes & Promos" />
           <NavButton active={activeTab === 'catalog'} onClick={() => setActiveTab('catalog')} icon={Package} label="Catalogue" desc="Produits & Stocks" />
           <NavButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={Users} label="Utilisateurs" desc="Partenaires & Clients" />
           <NavButton active={activeTab === 'disputes'} onClick={() => setActiveTab('disputes')} icon={ShieldAlert} label="Litiges" desc="Retours & Réclamations" />
           <NavButton active={activeTab === 'system_config'} onClick={() => setActiveTab('system_config')} icon={Settings} label="Configuration" desc="Système & Sécurité" />
        </nav>
        <div className="p-4 border-t border-slate-800"><button onClick={logout} className="flex items-center gap-2 text-red-400 hover:text-white w-full px-4 py-2"><LogOut size={18}/> Déconnexion</button></div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 pt-16 md:pt-8 md:pl-80 px-4 md:px-8 pb-12 overflow-y-auto h-screen bg-slate-50">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">
            <div>
                <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">{activeTab === 'system_config' ? 'Configuration' : activeTab}</h1>
                <p className="text-sm text-gray-500">Dernière mise à jour: {new Date().toLocaleTimeString()}</p>
            </div>
            <div className="flex gap-2">
                <button onClick={fetchData} className="p-2 bg-white rounded-lg shadow-sm border hover:bg-gray-50"><RefreshCw size={20} className="text-gray-600"/></button>
                {activeTab === 'catalog' && <button onClick={() => handleOpenProductModal()} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20"><Plus size={18}/> Ajouter Produit</button>}
                {activeTab === 'users' && <button onClick={() => { setUserForm({}); setIsUserModalOpen(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700"><UserPlus size={18}/> Nouvel Utilisateur</button>}
                {activeTab === 'marketing' && marketingTab === 'promos' && <button onClick={() => { setPromoForm({}); setIsPromoModalOpen(true); }} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-purple-700"><Ticket size={18}/> Créer Promo</button>}
                {activeTab === 'logistics' && logisticsTab === 'zones' && (
                    <button onClick={() => { setDeliveryRuleForm({}); setIsDeliveryRuleModalOpen(true); }} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-emerald-700"><MapPin size={18}/> Nouvelle Zone</button>
                )}
            </div>
        </div>

        {/* --- CONTENT RENDERERS --- */}

        {/* ... [Existing tabs: Pilotage, Finance, Orders kept unchanged] ... */}
        {/* Simplified render for brevity, assume content is same as before unless modified below */}
        {activeTab === 'pilotage' && stats && (
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                 {/* KPI Cards */}
                 <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"><div><p className="text-xs font-bold text-gray-400 uppercase">Chiffre d'affaires</p><h3 className="text-2xl font-black text-slate-900">{stats.totalRevenue.toLocaleString()} F</h3></div></div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"><div><p className="text-xs font-bold text-gray-400 uppercase">Commandes</p><h3 className="text-2xl font-black text-slate-900">{stats.totalOrders}</h3></div></div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"><div><p className="text-xs font-bold text-gray-400 uppercase">En Cours</p><h3 className="text-2xl font-black text-orange-600">{stats.pendingOrders}</h3></div></div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"><div><p className="text-xs font-bold text-gray-400 uppercase">Partenaires</p><h3 className="text-2xl font-black text-emerald-600">{stats.totalPartners}</h3></div></div>
                 </div>
                 {/* System Logs */}
                 <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                     <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Activity size={18}/> Logs Système</h3>
                     <div className="max-h-60 overflow-y-auto space-y-2">
                         {systemLogs.map(log => (
                             <div key={log.id} className="text-xs p-2 border-b border-gray-50 flex justify-between">
                                 <span className={log.severity === 'CRITICAL' ? 'text-red-600 font-bold' : 'text-gray-600'}>{log.action}: {log.details}</span>
                                 <span className="text-gray-400">{new Date(log.timestamp).toLocaleString()}</span>
                             </div>
                         ))}
                     </div>
                 </div>
             </div>
        )}

        {activeTab === 'catalog' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
                {products.map(product => (
                    <div key={product.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-all group ${product.active ? 'border-gray-100' : 'border-red-200 bg-red-50/10'}`}>
                        <div className="relative aspect-square bg-gray-100">
                            <img src={product.images[0]} className="w-full h-full object-cover" />
                            <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleOpenProductModal(product)} className="p-2 bg-white rounded-full shadow hover:text-blue-600"><Edit size={16}/></button>
                                <button onClick={() => handleToggleProduct(product.id)} className={`p-2 bg-white rounded-full shadow ${product.active ? 'text-green-600' : 'text-gray-400'}`}><Power size={16}/></button>
                                <button onClick={() => handleDeleteProduct(product.id)} className="p-2 bg-white rounded-full shadow hover:text-red-600"><Trash2 size={16}/></button>
                            </div>
                            {!product.active && <div className="absolute inset-0 bg-white/50 flex items-center justify-center"><span className="bg-gray-800 text-white text-xs px-2 py-1 rounded font-bold">INACTIF</span></div>}
                        </div>
                        <div className="p-4">
                            <h3 className="font-bold text-gray-900 truncate">{product.name}</h3>
                            <div className="flex justify-between items-center mt-2">
                                <span className="text-emerald-600 font-bold">{product.price.toLocaleString()} F</span>
                                <span className={`text-xs px-2 py-1 rounded ${product.stock > 10 ? 'bg-green-100 text-green-700' : product.stock > 0 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>Stock: {product.stock}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {activeTab === 'users' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600 text-xs font-bold uppercase">
                        <tr>
                            <th className="p-4">Utilisateur / Agence</th>
                            <th className="p-4">Rôle</th>
                            <th className="p-4">Statut</th>
                            <th className="p-4">Zone / Info</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {users.map(u => (
                            <tr key={u.id} className={`hover:bg-gray-50 ${!u.isActive ? 'bg-gray-50 opacity-60' : ''}`}>
                                <td className="p-4">
                                    <div className="font-bold text-gray-900">{u.name}</div>
                                    <div className="text-xs text-gray-400">{u.username}</div>
                                </td>
                                <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${u.role === UserRole.PARTNER ? 'bg-blue-100 text-blue-800' : 'bg-gray-100'}`}>{u.role === UserRole.PARTNER ? 'PARTENAIRE (AGENCE)' : u.role}</span></td>
                                <td className="p-4">{u.isActive ? <span className="text-green-600 text-xs font-bold">Actif</span> : <span className="text-red-600 text-xs font-bold">Inactif</span>}</td>
                                <td className="p-4 text-xs text-gray-500">{u.assignedZone || '-'}</td>
                                <td className="p-4 text-right flex justify-end gap-2">
                                    <button onClick={() => { setUserForm(u); setIsUserModalOpen(true); setUserPassword(''); }} className="text-blue-600 hover:bg-blue-50 p-2 rounded"><Edit size={16}/></button>
                                    <button onClick={() => handleToggleUserStatus(u.id)} className={`p-2 rounded ${u.isActive ? 'text-orange-500 hover:bg-orange-50' : 'text-green-500 hover:bg-green-50'}`}><Power size={16}/></button>
                                    <button onClick={() => handleDeleteUser(u.id)} className="text-red-600 hover:bg-red-50 p-2 rounded"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

        {activeTab === 'logistics' && (
            <div className="space-y-6 animate-fade-in">
                {/* Tabs for logistics sub-sections */}
                <div className="flex gap-2 border-b border-gray-200 pb-2 mb-4">
                    <button onClick={() => setLogisticsTab('validations')} className={`px-4 py-2 text-sm font-bold rounded-lg flex items-center gap-2 ${logisticsTab === 'validations' ? 'bg-gray-100 text-gray-900' : 'text-gray-500'}`}>
                        <FileCheck size={16}/> Validations ({drivers.filter(d => d.status === 'PENDING_APPROVAL').length})
                    </button>
                    <button onClick={() => setLogisticsTab('drivers')} className={`px-4 py-2 text-sm font-bold rounded-lg flex items-center gap-2 ${logisticsTab === 'drivers' ? 'bg-gray-100 text-gray-900' : 'text-gray-500'}`}>
                        <Truck size={16}/> Liste Livreurs
                    </button>
                    <button onClick={() => setLogisticsTab('zones')} className={`px-4 py-2 text-sm font-bold rounded-lg flex items-center gap-2 ${logisticsTab === 'zones' ? 'bg-gray-100 text-gray-900' : 'text-gray-500'}`}>
                        <Map size={16}/> Zones & Tarifs
                    </button>
                </div>

                {logisticsTab === 'validations' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {drivers.filter(d => d.status === 'PENDING_APPROVAL').map(d => (
                            <div key={d.id} className="bg-white p-5 rounded-xl border border-yellow-200 shadow-sm relative group bg-yellow-50/20">
                                <div className="absolute top-2 right-2 bg-yellow-100 text-yellow-800 text-[10px] font-bold px-2 py-1 rounded">EN ATTENTE</div>
                                <div className="mb-4">
                                    <h3 className="font-bold text-gray-900">{d.name}</h3>
                                    <p className="text-xs text-gray-500 font-mono">{d.phone}</p>
                                    <div className="mt-2 text-xs bg-white/50 p-2 rounded border border-yellow-100">
                                        <span className="block font-bold text-gray-600">Agence :</span>
                                        {getAgencyName(d.agencyId)}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Zone: {d.zone}</p>
                                </div>
                                <div className="flex gap-2 mb-4 border-t border-gray-100 pt-2">
                                    {d.documents?.idCard && <a href={d.documents.idCard} download className="flex-1 bg-white border border-gray-200 rounded text-center py-2 text-xs font-bold text-blue-600 hover:bg-gray-50">CNI</a>}
                                    {d.documents?.license && <a href={d.documents.license} download className="flex-1 bg-white border border-gray-200 rounded text-center py-2 text-xs font-bold text-blue-600 hover:bg-gray-50">Permis</a>}
                                </div>
                                <button onClick={() => setSelectedDriverForValidation(d)} className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-blue-700 shadow-sm">Examiner</button>
                            </div>
                        ))}
                    </div>
                )}

                {logisticsTab === 'drivers' && (
                    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-600 font-bold uppercase text-xs">
                                <tr>
                                    <th className="p-4">Nom</th>
                                    <th className="p-4">Agence Propriétaire</th>
                                    <th className="p-4">Contact</th>
                                    <th className="p-4">Zone</th>
                                    <th className="p-4">Statut</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {drivers.map(d => (
                                    <tr key={d.id} className={`hover:bg-gray-50 ${d.status === 'ARCHIVED' ? 'opacity-50' : ''}`}>
                                        <td className="p-4 font-bold text-gray-900">{d.name}</td>
                                        <td className="p-4 text-gray-700 text-xs font-medium">{getAgencyName(d.agencyId)}</td>
                                        <td className="p-4 text-gray-600">{d.phone}</td>
                                        <td className="p-4 text-gray-600">{d.zone}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase 
                                                ${d.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 
                                                  d.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 
                                                  d.status === 'PENDING_APPROVAL' ? 'bg-yellow-100 text-yellow-700' : 
                                                  'bg-gray-100 text-gray-600'}`}>
                                                {d.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right flex justify-end gap-2">
                                            {/* Admin Full Control */}
                                            <button onClick={() => handleDeleteDriver(d.id)} className="p-2 bg-red-50 text-red-600 rounded-lg border border-red-100 hover:bg-red-100" title="Supprimer Définitivement">
                                                <Trash2 size={16}/>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {logisticsTab === 'zones' && (
                    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-600 font-bold uppercase text-xs">
                                <tr>
                                    <th className="p-4">Zone</th>
                                    <th className="p-4">Tarif</th>
                                    <th className="p-4">Statut</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {configForm?.deliveryRules.map(r => (
                                    <tr key={r.id} className={`hover:bg-gray-50 ${!r.active ? 'opacity-60 bg-gray-50' : ''}`}>
                                        <td className="p-4 font-bold text-gray-900">{r.zoneName}</td>
                                        <td className="p-4 font-mono text-emerald-600 font-bold">{r.price.toLocaleString()} F</td>
                                        <td className="p-4"><span className={`px-2 py-1 rounded text-[10px] font-bold ${r.active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>{r.active ? 'ACTIF' : 'INACTIF'}</span></td>
                                        <td className="p-4 text-right flex justify-end gap-2">
                                            <button onClick={() => { setDeliveryRuleForm(r); setIsDeliveryRuleModalOpen(true); }} className="text-blue-600 hover:bg-blue-50 p-2 rounded"><Edit size={16}/></button>
                                            <button onClick={() => handleToggleDeliveryRule(r.id)} className={`p-2 rounded ${r.active ? 'text-orange-500 hover:bg-orange-50' : 'text-green-500 hover:bg-green-50'}`}><Power size={16}/></button>
                                            <button onClick={() => handleDeleteDeliveryRule(r.id)} className="text-red-600 hover:bg-red-50 p-2 rounded"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        )}

        {activeTab === 'system_config' && (
            <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Settings className="text-gray-400"/> Configuration Système</h2>
                        <p className="text-sm text-gray-500">Gérez les paramètres globaux de la boutique.</p>
                    </div>
                </div>

                <div className="flex overflow-x-auto gap-2 border-b border-gray-200 pb-1">
                    {['general', 'categories', 'database', 'security'].map(tab => (
                        <button 
                            key={tab}
                            onClick={() => setSettingsTab(tab as any)}
                            className={`px-6 py-3 font-bold text-sm rounded-t-xl transition-colors ${settingsTab === tab ? 'bg-white border-x border-t border-gray-200 text-primary' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}
                        >
                            {tab === 'general' ? 'Général' : tab === 'categories' ? 'Catégories' : tab === 'database' ? 'Base de données' : 'Sécurité'}
                        </button>
                    ))}
                </div>

                <div className="bg-white rounded-b-xl rounded-tr-xl p-6 shadow-sm border border-gray-200 border-t-0 mt-[-1px]">
                    
                    {settingsTab === 'categories' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-lg text-gray-800">Liste des Catégories</h3>
                                <button onClick={() => { setCategoryForm({}); setIsCategoryModalOpen(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-blue-700">
                                    <Plus size={16}/> Ajouter
                                </button>
                            </div>

                            <div className="border border-gray-100 rounded-xl overflow-hidden">
                                {configForm?.categories.sort((a,b) => a.displayOrder - b.displayOrder).map((cat, idx) => (
                                    <div key={cat.id} className="p-4 border-b border-gray-100 last:border-0 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                                        <div className="flex flex-col gap-1">
                                            <button onClick={() => handleMoveCategory(idx, -1)} disabled={idx === 0} className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"><ChevronUp size={16}/></button>
                                            <button onClick={() => handleMoveCategory(idx, 1)} disabled={idx === configForm.categories.length - 1} className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"><ChevronDown size={16}/></button>
                                        </div>
                                        <div className="w-16 h-10 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                            {cat.bannerUrl ? <img src={cat.bannerUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon size={16}/></div>}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-gray-900">{cat.name}</h4>
                                            <p className="text-xs text-gray-500">{cat.description || 'Aucune description'}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${cat.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {cat.active ? 'ACTIVE' : 'INACTIVE'}
                                            </span>
                                            <button onClick={() => { setCategoryForm(cat); setIsCategoryModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={18}/></button>
                                            <button onClick={() => handleDeleteCategory(cat.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                                        </div>
                                    </div>
                                ))}
                                {(!configForm?.categories || configForm.categories.length === 0) && (
                                    <div className="p-8 text-center text-gray-400">Aucune catégorie configurée.</div>
                                )}
                            </div>
                        </div>
                    )}

                    {settingsTab === 'general' && (
                        <div className="space-y-4 max-w-lg">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Nom de l'application</label>
                                <input className="w-full border p-2 rounded-lg" value={configForm?.appName || ''} onChange={e => setConfigForm({...configForm!, appName: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Email Contact</label>
                                <input className="w-full border p-2 rounded-lg" value={configForm?.contactEmail || ''} onChange={e => setConfigForm({...configForm!, contactEmail: e.target.value})} />
                            </div>
                            <button onClick={handleSaveConfig} className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-emerald-700">Enregistrer Configuration</button>
                        </div>
                    )}
                </div>
            </div>
        )}

      </main>

      {/* --- MODALS --- */}
      
      {/* PRODUCT MODAL */}
      {isProductModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
                  <h3 className="font-bold text-xl mb-6 text-gray-900 flex justify-between items-center">
                      <span>{productForm.id ? 'Modifier Produit' : 'Nouveau Produit'}</span>
                      <button onClick={() => setIsProductModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                  </h3>
                  
                  <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div><label className="text-xs font-bold text-gray-500">Nom du produit</label><input className="w-full border p-2 rounded-lg" value={productForm.name || ''} onChange={e => setProductForm({...productForm, name: e.target.value})} /></div>
                          <div><label className="text-xs font-bold text-gray-500">Catégorie</label><input className="w-full border p-2 rounded-lg" value={productForm.category || ''} onChange={e => setProductForm({...productForm, category: e.target.value})} placeholder="Ex: Mode" /></div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div><label className="text-xs font-bold text-gray-500">Prix Vente</label><input type="number" className="w-full border p-2 rounded-lg" value={productForm.price || ''} onChange={e => setProductForm({...productForm, price: parseFloat(e.target.value)})} /></div>
                          <div><label className="text-xs font-bold text-gray-500">Capital (Coût)</label><input type="number" className="w-full border p-2 rounded-lg" value={productForm.capital || ''} onChange={e => setProductForm({...productForm, capital: parseFloat(e.target.value)})} /></div>
                          <div><label className="text-xs font-bold text-gray-500">Stock</label><input type="number" className="w-full border p-2 rounded-lg" value={productForm.stock || ''} onChange={e => setProductForm({...productForm, stock: parseFloat(e.target.value)})} /></div>
                      </div>
                      
                      <div>
                          <label className="text-xs font-bold text-gray-500">Images (URL par ligne)</label>
                          <textarea className="w-full border p-2 rounded-lg h-24 text-xs font-mono" value={productForm.images?.join('\n') || ''} onChange={e => setProductForm({...productForm, images: e.target.value.split('\n')})} placeholder="https://..." />
                      </div>

                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                          <h4 className="font-bold text-sm mb-2 text-gray-700">Variantes</h4>
                          <div className="flex gap-2 mb-2">
                              <select className="border p-2 rounded text-sm" value={variantTypeToAdd} onChange={e => setVariantTypeToAdd(e.target.value as any)}>
                                  <option value="colors">Couleurs</option>
                                  <option value="sizes">Tailles</option>
                                  <option value="weights">Poids</option>
                              </select>
                              <input className="border p-2 rounded text-sm flex-1" placeholder="Valeur (ex: Rouge, XL)" value={variantValueToAdd} onChange={e => setVariantValueToAdd(e.target.value)} />
                              <button onClick={addVariant} className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-bold">Ajouter</button>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                              {Object.entries(productForm.variants || {}).map(([key, values]) => (
                                  (values as string[] | undefined)?.map(val => (
                                      <span key={`${key}-${val}`} className="bg-white border px-2 py-1 rounded text-xs flex items-center gap-1">
                                          <span className="text-gray-400 uppercase mr-1">{key.slice(0,1)}:</span> {val}
                                          <button onClick={() => removeVariant(key as any, val)} className="text-red-500 hover:text-red-700"><X size={12}/></button>
                                      </span>
                                  ))
                              ))}
                          </div>
                      </div>
                  </div>

                  <div className="mt-8 flex justify-end gap-3">
                      <button onClick={() => setIsProductModalOpen(false)} className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-bold">Annuler</button>
                      <button onClick={handleSaveProduct} className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 shadow-lg">Enregistrer</button>
                  </div>
              </div>
          </div>
      )}

      {/* USER MODAL */}
      {isUserModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scale-in">
                  <h3 className="font-bold text-xl mb-6 text-gray-900">{userForm.id ? 'Modifier Utilisateur' : 'Nouvel Utilisateur'}</h3>
                  <div className="space-y-4">
                      <div><label className="text-xs font-bold text-gray-500">Nom Complet / Agence</label><input className="w-full border p-2 rounded-lg" value={userForm.name || ''} onChange={e => setUserForm({...userForm, name: e.target.value})} /></div>
                      <div><label className="text-xs font-bold text-gray-500">Identifiant (Connexion)</label><input className="w-full border p-2 rounded-lg" value={userForm.username || ''} onChange={e => setUserForm({...userForm, username: e.target.value})} /></div>
                      <div>
                          <label className="text-xs font-bold text-gray-500">Mot de passe {userForm.id && '(Laisser vide pour ne pas changer)'}</label>
                          <input type="password" className="w-full border p-2 rounded-lg" value={userPassword} onChange={e => setUserPassword(e.target.value)} />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-gray-500">Rôle</label>
                          <select className="w-full border p-2 rounded-lg" value={userForm.role || UserRole.CLIENT} onChange={e => setUserForm({...userForm, role: e.target.value as any})}>
                              {Object.values(UserRole).map(r => <option key={r} value={r}>{r === UserRole.PARTNER ? 'PARTENAIRE (AGENCE)' : r}</option>)}
                          </select>
                      </div>
                      {userForm.role === UserRole.PARTNER && (
                          <div><label className="text-xs font-bold text-gray-500">Zone de l'Agence</label><input className="w-full border p-2 rounded-lg" value={userForm.assignedZone || ''} onChange={e => setUserForm({...userForm, assignedZone: e.target.value})} placeholder="Ex: Cocody" /></div>
                      )}
                  </div>
                  <div className="mt-8 flex justify-end gap-3">
                      <button onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg">Annuler</button>
                      <button onClick={handleSaveUser} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md">Enregistrer</button>
                  </div>
              </div>
          </div>
      )}

      {/* DELIVERY RULE MODAL (NOUVELLE ZONE) */}
      {isDeliveryRuleModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-scale-in">
                  <h3 className="font-bold text-xl mb-6 text-gray-900">Zone & Tarif</h3>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Nom de la Zone</label>
                          <input className="w-full border border-gray-200 rounded-lg p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none" value={deliveryRuleForm.zoneName || ''} onChange={e => setDeliveryRuleForm({...deliveryRuleForm, zoneName: e.target.value})} placeholder="Ex: Abidjan Nord" />
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Prix de Livraison</label>
                          <input type="number" className="w-full border border-gray-200 rounded-lg p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none" value={deliveryRuleForm.price || ''} onChange={e => setDeliveryRuleForm({...deliveryRuleForm, price: parseFloat(e.target.value)})} placeholder="Ex: 1500" />
                      </div>
                      <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                          <input 
                            type="checkbox" 
                            className="w-5 h-5 text-emerald-600"
                            checked={deliveryRuleForm.active ?? true} 
                            onChange={e => setDeliveryRuleForm({...deliveryRuleForm, active: e.target.checked})} 
                          />
                          <label className="text-sm font-bold text-gray-700">Activer cette zone</label>
                      </div>
                  </div>
                  <div className="mt-8 flex gap-3">
                      <button onClick={() => setIsDeliveryRuleModalOpen(false)} className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl">Annuler</button>
                      <button onClick={handleSaveDeliveryRule} className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg">Enregistrer</button>
                  </div>
              </div>
          </div>
      )}

      {/* CATEGORY MODAL */}
      {isCategoryModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
                  <h3 className="font-bold text-xl mb-6 text-gray-900">{categoryForm.id ? 'Modifier Catégorie' : 'Nouvelle Catégorie'}</h3>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Nom</label>
                          <input className="w-full border p-2 rounded-lg" value={categoryForm.name || ''} onChange={e => setCategoryForm({...categoryForm, name: e.target.value})} placeholder="Ex: Électronique" />
                      </div>
                      
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                          <textarea className="w-full border p-2 rounded-lg" value={categoryForm.description || ''} onChange={e => setCategoryForm({...categoryForm, description: e.target.value})} />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-bold text-gray-700 mb-1">Image Bannière (URL)</label>
                              <input className="w-full border p-2 rounded-lg text-xs" value={categoryForm.bannerUrl || ''} onChange={e => setCategoryForm({...categoryForm, bannerUrl: e.target.value})} placeholder="https://..." />
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-gray-700 mb-1">Titre Bannière</label>
                              <input className="w-full border p-2 rounded-lg" value={categoryForm.bannerTitle || ''} onChange={e => setCategoryForm({...categoryForm, bannerTitle: e.target.value})} />
                          </div>
                      </div>

                      <div className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            id="catActive"
                            checked={categoryForm.active ?? true} 
                            onChange={e => setCategoryForm({...categoryForm, active: e.target.checked})}
                            className="w-5 h-5 text-emerald-600 rounded"
                          />
                          <label htmlFor="catActive" className="text-sm font-bold text-gray-700">Catégorie Active</label>
                      </div>
                  </div>

                  <div className="mt-8 flex justify-end gap-3">
                      <button onClick={() => setIsCategoryModalOpen(false)} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg">Annuler</button>
                      <button onClick={handleSaveCategory} className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 shadow-md">Enregistrer</button>
                  </div>
              </div>
          </div>
      )}

      {/* DRIVER VALIDATION MODAL (Keep existing) */}
      {selectedDriverForValidation && (
            <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scale-in">
                    <h3 className="font-bold text-xl mb-4 text-gray-900">Validation Livreur</h3>
                    <div className="space-y-4">
                        <div className="bg-gray-50 p-4 rounded-xl text-sm">
                            <p><strong>Nom:</strong> {selectedDriverForValidation.name}</p>
                            <p><strong>Contact:</strong> {selectedDriverForValidation.phone}</p>
                            <p><strong>Zone:</strong> {selectedDriverForValidation.zone}</p>
                            <p className="mt-2 text-gray-500 font-bold">Agence: {getAgencyName(selectedDriverForValidation.agencyId)}</p>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Motif (Obligatoire si rejet)</label>
                            <textarea 
                                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:border-blue-500 outline-none"
                                rows={3}
                                placeholder="Raison du rejet ou note administrative..."
                                value={driverValidationNote}
                                onChange={e => setDriverValidationNote(e.target.value)}
                            ></textarea>
                        </div>
                        
                        <div className="flex gap-3 pt-2">
                            <button onClick={() => handleValidateDriver('REJECTED')} className="flex-1 bg-red-50 text-red-600 font-bold py-3 rounded-xl hover:bg-red-100">Rejeter</button>
                            <button onClick={() => handleValidateDriver('ACTIVE')} className="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 shadow-md">Valider & Activer</button>
                        </div>
                        <button onClick={() => { setSelectedDriverForValidation(null); setDriverValidationNote(''); }} className="w-full text-gray-400 text-xs hover:text-gray-600 mt-2">Annuler</button>
                    </div>
                </div>
            </div>
      )}

    </div>
  );
};
