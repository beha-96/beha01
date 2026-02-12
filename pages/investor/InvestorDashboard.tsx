
import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useNotifications } from '../../context/NotificationContext';
import { DatabaseService } from '../../services/mockDatabase';
import { Order, OrderStatus, Product, Dispute } from '../../types';
import { Briefcase, TrendingUp, Package, AlertCircle, DollarSign, Bell, CheckCircle, AlertTriangle, LogOut, X, RefreshCcw, XCircle, Truck, Layers } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export const InvestorDashboard: React.FC = () => {
  const { user, logout, siteConfig } = useApp();
  const { notifications, markAsRead } = useNotifications();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'stocks' | 'finance' | 'disputes'>('overview');
  const [investorProducts, setInvestorProducts] = useState<Product[]>([]);
  const [relatedOrders, setRelatedOrders] = useState<Order[]>([]);
  const [myDisputes, setMyDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);

  // Stats
  const [stats, setStats] = useState({
    totalInvested: 0,
    totalRevenue: 0,
    totalProfit: 0,
    totalLosses: 0,
    totalStockValue: 0,
    stockCount: 0,
    returnCount: 0,
    cancelCount: 0,
    transitCount: 0
  });

  const loadData = async () => {
      if (!user) return;
      // setLoading(true); // Prevent flicker on real-time update
      
      const allProducts = await DatabaseService.getProducts();
      // SECURITY: Filter only products linked to this investor
      const myProducts = allProducts.filter(p => p.investorId === user.id);
      setInvestorProducts(myProducts);

      const allOrders = await DatabaseService.getOrders();
      // SECURITY: Find orders that contain ANY of my products
      const myOrders = allOrders.filter(o => 
        o.items.some(item => myProducts.some(mp => mp.id === item.id))
      );
      setRelatedOrders(myOrders);

      // DISPUTES
      const allDisputes = await DatabaseService.getDisputes();
      // Filter disputes that affect products of this investor
      const relevantDisputes = allDisputes.filter(d => 
         d.affectedProductIds.some(pid => myProducts.some(mp => mp.id === pid))
      );
      setMyDisputes(relevantDisputes);

      // Calculate Stats
      let revenue = 0;
      let stockVal = 0;
      let stockCnt = 0;
      let losses = 0;
      
      let returns = 0;
      let cancels = 0;
      let transit = 0;

      // Logic loop
      myOrders.forEach(o => {
        // Count Statuses
        if (o.status === OrderStatus.CANCELLED) cancels++;
        if ([OrderStatus.RETURN_REQUESTED, OrderStatus.RETURN_ACCEPTED, OrderStatus.RETURN_PROCESSING, OrderStatus.REFUNDED].includes(o.status)) returns++;
        if ([OrderStatus.IN_TRANSIT, OrderStatus.OUT_FOR_DELIVERY].includes(o.status)) transit++;

        if (o.status !== OrderStatus.CANCELLED) {
          o.items.forEach(item => {
            if (myProducts.some(mp => mp.id === item.id)) {
               // Only count towards realized revenue if paid or at least not cancelled
               revenue += item.price * item.quantity;
            }
          });
        } else {
           // Calculate potential losses from cancelled orders (simulated operational cost or lost opportunity)
           o.items.forEach(item => {
             if (myProducts.some(mp => mp.id === item.id)) {
                losses += (item.price * item.quantity); // Tracking lost revenue
             }
           });
        }
      });

      // Calculate Realized Profit (Strictly Paid Orders)
      let realizedProfit = 0;
      myOrders.forEach(o => {
          if (o.status !== OrderStatus.CANCELLED && o.isPaid) {
              o.items.forEach(item => {
                  if (myProducts.some(mp => mp.id === item.id)) {
                      realizedProfit += (item.price * item.quantity) * 0.25; // Mock 25% margin
                  }
              });
          }
      });

      myProducts.forEach(p => {
        stockVal += p.price * p.stock;
        stockCnt += p.stock;
      });

      setStats({
        totalInvested: stockVal * 0.7, // Mock: Assume cost was 70% of current retail value
        totalRevenue: revenue,
        totalProfit: realizedProfit,
        totalLosses: losses,
        totalStockValue: stockVal,
        stockCount: stockCnt,
        returnCount: returns,
        cancelCount: cancels,
        transitCount: transit
      });

      setLoading(false);
  };

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) setActiveTab(tabParam as any);
    
    // Initial Load
    setLoading(true);
    loadData().then(() => setLoading(false));
  }, [user, searchParams]);

  // REAL-TIME SYNC
  useEffect(() => {
      const handleUpdate = () => loadData();
      window.addEventListener('order-update', handleUpdate);
      return () => window.removeEventListener('order-update', handleUpdate);
  }, [user]);

  const handleLogout = () => {
    logout();
    const redirect = siteConfig?.logoutConfig?.redirectUrl || '/';
    navigate(redirect);
  };

  const logoutLabel = siteConfig?.logoutConfig?.label || "Déconnexion";
  const canLogout = siteConfig?.logoutConfig?.enableInvestor !== false;

  // STOCK ALERTS
  const stockAlerts = notifications.filter(n => n.type === 'ALERT' && !n.read);

  if (!user) return <div>Accès refusé</div>;

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'NOUVEAU': return 'bg-blue-100 text-blue-800';
      case 'LIVRE': return 'bg-green-100 text-green-800';
      case 'ANNULE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Briefcase className="text-blue-600" /> Espace Investisseur
          </h1>
          <p className="text-gray-500">Bienvenue, {user.name} | ID: {user.username}</p>
        </div>
        
        <div className="flex items-center gap-3 self-end md:self-auto">
            <div className="flex items-center gap-2 bg-yellow-50 text-yellow-800 px-4 py-2 rounded-lg text-sm border border-yellow-100">
              <Bell size={16} />
              <span className="hidden md:inline">Notifications actives</span>
            </div>

            {canLogout && (
              <button 
                  onClick={handleLogout}
                  className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-colors flex items-center gap-2 shadow-sm font-medium"
              >
                <LogOut size={16} /> {logoutLabel}
              </button>
            )}
        </div>
      </div>

      {loading ? <div className="p-8 text-center">Chargement des données confidentielles...</div> : (
        <>
          {/* Tabs */}
          <div className="flex overflow-x-auto gap-2 mb-6 border-b pb-2">
            {[
              { id: 'overview', label: 'Vue Générale', icon: TrendingUp },
              { id: 'orders', label: 'Commandes', icon: Package },
              { id: 'stocks', label: 'Stocks', icon: Package },
              { id: 'finance', label: 'Ventes & Gains', icon: DollarSign },
              { id: 'disputes', label: 'Signalements', icon: AlertTriangle },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                  activeTab === tab.id 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <tab.icon size={18} /> {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 min-h-[400px]">
            
            {activeTab === 'overview' && (
              <div className="space-y-8 animate-fade-in">
                
                {/* ALERT SECTION */}
                {stockAlerts.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-6 shadow-sm mb-6 animate-fade-in">
                        <h3 className="text-xl font-bold text-red-700 mb-4 flex items-center gap-2">
                            <AlertCircle /> Attention : Alertes de Stock Prioritaires
                        </h3>
                        <div className="space-y-3 max-h-60 overflow-y-auto">
                            {stockAlerts.map(alert => (
                                <div key={alert.id} className="bg-white p-3 rounded-lg border border-red-100 flex justify-between items-center shadow-sm">
                                    <div>
                                        <p className="text-sm font-bold text-gray-800">{alert.message}</p>
                                        <p className="text-xs text-gray-500">{new Date(alert.createdAt).toLocaleString()}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => { markAsRead(alert.id); if(alert.link) navigate(alert.link); }} 
                                            className="text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded font-bold hover:bg-red-200"
                                        >
                                            Gérer
                                        </button>
                                        <button onClick={() => markAsRead(alert.id)} className="text-gray-400 hover:text-gray-600"><X size={16}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* FINANCIAL METRICS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                   <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                      <p className="text-sm text-blue-600 font-medium mb-1 flex items-center gap-1"><DollarSign size={14}/> Total Ventes</p>
                      <h3 className="text-2xl font-bold text-gray-900">{stats.totalRevenue.toLocaleString()} F</h3>
                   </div>
                   <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                      <p className="text-sm text-green-600 font-medium mb-1 flex items-center gap-1"><TrendingUp size={14}/> Profit Réalisé</p>
                      <h3 className="text-2xl font-bold text-gray-900">{stats.totalProfit.toLocaleString()} F</h3>
                   </div>
                   <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                      <p className="text-sm text-purple-600 font-medium mb-1 flex items-center gap-1"><Layers size={14}/> Valeur Stock</p>
                      <h3 className="text-2xl font-bold text-gray-900">{stats.totalStockValue.toLocaleString()} F</h3>
                      <p className="text-xs text-purple-400">{stats.stockCount} unités</p>
                   </div>
                   <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                      <p className="text-sm text-red-600 font-medium mb-1 flex items-center gap-1"><TrendingUp size={14} className="transform rotate-180"/> Pertes (Annulé)</p>
                      <h3 className="text-2xl font-bold text-gray-900">{stats.totalLosses.toLocaleString()} F</h3>
                   </div>
                </div>

                {/* OPERATIONAL METRICS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm text-indigo-600 font-bold mb-1">Livraisons en cours</p>
                                <h3 className="text-3xl font-black text-gray-900">{stats.transitCount}</h3>
                            </div>
                            <div className="bg-indigo-200 p-2 rounded-lg text-indigo-700"><Truck size={20}/></div>
                        </div>
                        <p className="text-xs text-indigo-400 mt-2">Colis en transit ou en cours de livraison</p>
                    </div>

                    <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm text-orange-600 font-bold mb-1">Retours / Litiges</p>
                                <h3 className="text-3xl font-black text-gray-900">{stats.returnCount}</h3>
                            </div>
                            <div className="bg-orange-200 p-2 rounded-lg text-orange-700"><RefreshCcw size={20}/></div>
                        </div>
                        <p className="text-xs text-orange-400 mt-2">Produits retournés ou remboursés</p>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm text-gray-600 font-bold mb-1">Annulations</p>
                                <h3 className="text-3xl font-black text-gray-900">{stats.cancelCount}</h3>
                            </div>
                            <div className="bg-gray-200 p-2 rounded-lg text-gray-700"><XCircle size={20}/></div>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">Commandes annulées avant livraison</p>
                    </div>
                </div>

                <div>
                   <h3 className="font-bold text-gray-800 mb-4">Activité Récente</h3>
                   <div className="border rounded-lg divide-y">
                     {relatedOrders.slice(0, 5).map(o => (
                       <div key={o.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                          <div>
                            <span className="font-mono text-sm bg-gray-200 px-2 py-0.5 rounded mr-2">{o.shortId}</span>
                            <span className="text-sm text-gray-600">Commande contenant vos produits</span>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(o.status)}`}>{o.status}</span>
                       </div>
                     ))}
                     {relatedOrders.length === 0 && <div className="p-4 text-center text-gray-500">Aucune activité récente.</div>}
                   </div>
                </div>
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="animate-fade-in">
                <h3 className="font-bold text-gray-800 mb-4">Historique des Commandes (Temps Réel)</h3>
                <p className="text-xs text-gray-500 mb-4">Seules les commandes contenant vos produits sont affichées ici.</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-600 text-sm">
                      <tr>
                        <th className="p-3">ID</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Vos Articles</th>
                        <th className="p-3">Statut</th>
                        <th className="p-3">Paiement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {relatedOrders.map(o => {
                        // Filter items to show only investor's items in this order row
                        const myItems = o.items.filter(i => investorProducts.some(p => p.id === i.id));
                        return (
                          <tr key={o.id} className="hover:bg-gray-50">
                            <td className="p-3 font-mono">{o.shortId}</td>
                            <td className="p-3 text-sm">{new Date(o.createdAt).toLocaleDateString()}</td>
                            <td className="p-3 text-sm">
                              {myItems.map((i, idx) => (
                                <div key={idx} className="flex justify-between w-full max-w-xs">
                                  <span>{i.quantity}x {i.name}</span>
                                  <span className="font-medium text-gray-700">{(i.price * i.quantity).toLocaleString()} F</span>
                                </div>
                              ))}
                            </td>
                            <td className="p-3"><span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(o.status)}`}>{o.status}</span></td>
                            <td className="p-3">
                                {o.isPaid 
                                    ? <span className="text-green-600 font-bold text-xs">PAYÉ</span>
                                    : <span className="text-orange-500 font-bold text-xs">EN ATTENTE</span>
                                }
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'stocks' && (
              <div className="animate-fade-in">
                <h3 className="font-bold text-gray-800 mb-4">État des Stocks</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {investorProducts.map(p => (
                     <div key={p.id} className={`border rounded-xl p-4 flex gap-4 ${p.stock < 10 ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
                        <img src={p.images && p.images.length > 0 ? p.images[0] : ''} alt={p.name} className="w-20 h-20 object-cover rounded-lg bg-gray-100" />
                        <div className="flex-1">
                           <h4 className="font-bold text-gray-900 line-clamp-1">{p.name}</h4>
                           <div className="mt-2 flex justify-between items-end">
                              <div>
                                <p className="text-xs text-gray-500">Prix vente</p>
                                <p className="font-medium">{p.price.toLocaleString()} F</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-500">Stock</p>
                                <p className={`font-bold text-xl ${p.stock < 10 ? 'text-red-600' : 'text-green-600'}`}>
                                    {p.stock}
                                </p>
                                {p.stock < 10 && <span className="text-[10px] text-red-600 font-bold uppercase animate-pulse">Stock Faible</span>}
                              </div>
                           </div>
                        </div>
                     </div>
                   ))}
                </div>
              </div>
            )}

            {activeTab === 'finance' && (
              <div className="animate-fade-in">
                <h3 className="font-bold text-gray-800 mb-4">Rapport Financier (3 Derniers Mois)</h3>
                <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center border border-dashed border-gray-300">
                   <p className="text-gray-400">Graphique des ventes (Simulation)</p>
                </div>
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="border p-4 rounded-lg">
                      <h4 className="font-bold mb-2">Gains par mois (Estimé)</h4>
                      <ul className="space-y-2 text-sm">
                        <li className="flex justify-between"><span>Ce mois</span> <span className="font-bold">{(stats.totalProfit * 0.4).toLocaleString()} F</span></li>
                        <li className="flex justify-between"><span>Mois dernier</span> <span className="font-bold">{(stats.totalProfit * 0.35).toLocaleString()} F</span></li>
                        <li className="flex justify-between"><span>Il y a 2 mois</span> <span className="font-bold">{(stats.totalProfit * 0.25).toLocaleString()} F</span></li>
                      </ul>
                   </div>
                </div>
              </div>
            )}

            {activeTab === 'disputes' && (
              <div className="animate-fade-in">
                <h3 className="font-bold text-gray-800 mb-4">Litiges & Retours (Vos Produits)</h3>
                {myDisputes.length === 0 ? (
                  <div className="text-center py-10 bg-green-50 rounded-lg border border-green-100">
                    <CheckCircle className="mx-auto text-green-500 mb-2" size={32} />
                    <p className="text-green-700">Aucun signalement concernant vos produits.</p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                     {myDisputes.map(d => (
                       <li key={d.id} className="p-4 border border-red-100 bg-red-50 rounded-lg">
                          <div className="flex justify-between mb-1">
                             <span className="font-bold text-red-700 flex items-center gap-2"><AlertTriangle size={16}/> Signalement: {d.type}</span>
                             <span className="text-xs text-red-500">{new Date(d.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-sm text-gray-700 font-bold mb-1">Commande: {d.orderId}</p>
                          <p className="text-sm text-gray-700 italic">"{d.description}"</p>
                          <div className="mt-2 flex justify-end">
                             <span className={`text-xs px-2 py-1 rounded font-bold ${d.status === 'OPEN' ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'}`}>
                                {d.status === 'OPEN' ? 'EN COURS' : 'RÉSOLU'}
                             </span>
                          </div>
                       </li>
                     ))}
                  </ul>
                )}
              </div>
            )}

          </div>
        </>
      )}
    </div>
  );
};
