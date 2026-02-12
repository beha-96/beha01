
import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { DatabaseService } from '../services/mockDatabase';
import { Order, OrderStatus, User, UserRole } from '../types';
import { 
  Map, Truck, Search, CheckCircle, Clock, Package, MapPin, 
  ArrowRight, AlertCircle, Edit2, Save, X, Filter, Store 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Transit: React.FC = () => {
  const { user } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [partners, setPartners] = useState<User[]>([]);
  
  // Filter State (Admin/Partner)
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Editing State
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState<OrderStatus>(OrderStatus.NEW);
  const [statusNote, setStatusNote] = useState('');
  const [assignedPartner, setAssignedPartner] = useState('');

  // Client Tracking State
  const [clientSearchId, setClientSearchId] = useState('');
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    const [allOrders, allUsers] = await Promise.all([
      DatabaseService.getOrders(),
      DatabaseService.getUsers()
    ]);

    setPartners(allUsers.filter(u => u.role === UserRole.PARTNER));

    // Admin/Partner View Logic
    if (user && (user.role === UserRole.ADMIN || user.role === UserRole.PARTNER)) {
      let visibleOrders = allOrders.filter(o => o.status !== OrderStatus.CANCELLED && o.status !== OrderStatus.DELIVERED); // Default: Show active logistics
      
      // Allow viewing history via filter if needed, but primary view is active transit
      if (statusFilter !== 'ALL') {
          visibleOrders = allOrders.filter(o => o.status === statusFilter);
      } else {
          // Show recently delivered/cancelled too in 'ALL' but mostly active
          visibleOrders = allOrders;
      }

      if (user.role === UserRole.PARTNER) {
        // Partners only see orders assigned to them or in their zone
        visibleOrders = visibleOrders.filter(o => o.assignedPartnerId === user.id || (o.customer.city === user.assignedZone));
      }

      setOrders(visibleOrders.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } 
    // Client View Logic (Logged In)
    else if (user) {
        // Find orders matching user details (Mock: simple filter by name or if we had userId in Order)
        // Since we don't have explicit User-Order link in types, we'll just show nothing or rely on search.
        // For this demo, we'll let logged-in non-pro users use the Search ID interface.
    }

    setLoading(false);
  };

  useEffect(() => {
    if (user && (user.role === UserRole.ADMIN || user.role === UserRole.PARTNER)) {
      fetchOrders();
    }
  }, [user, statusFilter]);

  const handleStatusUpdate = async () => {
    if (!editingOrder) return;
    
    // Optimistic update
    const updatedOrder = { ...editingOrder, status: newStatus };
    if (assignedPartner && assignedPartner !== editingOrder.assignedPartnerId) {
        updatedOrder.assignedPartnerId = assignedPartner;
    }

    // Call Service
    await DatabaseService.updateOrderStatus(editingOrder.id, newStatus, statusNote || 'Mise à jour Transit');
    
    // Refresh
    setEditingOrder(null);
    setStatusNote('');
    fetchOrders();
  };

  const handleTrackOrder = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!clientSearchId) return;
      const order = await DatabaseService.getOrderById(clientSearchId.toUpperCase());
      setTrackedOrder(order);
  };

  // --- RENDER HELPERS ---

  const getStatusBadge = (status: OrderStatus) => {
      const styles = {
          [OrderStatus.NEW]: 'bg-gray-100 text-gray-700',
          [OrderStatus.PROCESSING]: 'bg-blue-50 text-blue-700',
          [OrderStatus.IN_TRANSIT]: 'bg-purple-50 text-purple-700 border-purple-200',
          [OrderStatus.READY]: 'bg-indigo-50 text-indigo-700',
          [OrderStatus.OUT_FOR_DELIVERY]: 'bg-yellow-50 text-yellow-700 border-yellow-200',
          [OrderStatus.DELIVERED]: 'bg-green-50 text-green-700 border-green-200',
          [OrderStatus.CANCELLED]: 'bg-red-50 text-red-700'
      };
      return <span className={`px-2 py-1 rounded-full text-xs font-bold border border-transparent ${styles[status]}`}>{status}</span>;
  };

  const getPartnerName = (id?: string) => {
      const p = partners.find(part => part.id === id);
      return p ? p.name : 'Non assigné';
  };

  // --- VIEWS ---

  const AdminPartnerView = () => (
    <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Map className="text-primary"/> Transit & Logistique</h1>
                <p className="text-sm text-gray-500">Gestion des flux de commandes en temps réel.</p>
            </div>
            <div className="flex gap-2">
                <select 
                    className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none"
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                >
                    <option value="ALL">Tous les statuts</option>
                    {Object.values(OrderStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={fetchOrders} className="bg-primary text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm hover:bg-emerald-700">Actualiser</button>
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                        <tr>
                            <th className="p-4">ID / Date</th>
                            <th className="p-4">Client / Destination</th>
                            <th className="p-4">Contenu</th>
                            <th className="p-4">Relais / Partenaire</th>
                            <th className="p-4">Statut Actuel</th>
                            <th className="p-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {orders.length === 0 ? (
                            <tr><td colSpan={6} className="p-8 text-center text-gray-400">Aucune commande en transit.</td></tr>
                        ) : orders.map(order => (
                            <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                <td className="p-4">
                                    <span className="font-mono font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded">{order.shortId}</span>
                                    <div className="text-xs text-gray-400 mt-1">{new Date(order.createdAt).toLocaleDateString()}</div>
                                </td>
                                <td className="p-4">
                                    <div className="font-bold text-gray-900">{order.customer.fullName}</div>
                                    <div className="text-xs text-gray-500 flex items-center gap-1"><MapPin size={10}/> {order.customer.city}</div>
                                </td>
                                <td className="p-4">
                                    <div className="text-xs text-gray-600">{order.items.length} article(s)</div>
                                    <div className="text-[10px] text-gray-400">{order.items[0]?.name} {order.items.length > 1 ? `+${order.items.length - 1}` : ''}</div>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <Truck size={14} className="text-gray-400"/>
                                        <span className="text-xs font-medium text-gray-700">{getPartnerName(order.assignedPartnerId)}</span>
                                    </div>
                                </td>
                                <td className="p-4">{getStatusBadge(order.status)}</td>
                                <td className="p-4 text-right">
                                    <button 
                                        onClick={() => { setEditingOrder(order); setNewStatus(order.status); setAssignedPartner(order.assignedPartnerId || ''); }}
                                        className="bg-white border border-gray-200 text-gray-600 p-2 rounded-lg hover:bg-primary hover:text-white hover:border-primary transition-all"
                                    >
                                        <Edit2 size={16}/>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Modal for Status Update */}
        {editingOrder && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-2xl animate-scale-in">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-gray-900">Mise à jour Transit : {editingOrder.shortId}</h3>
                        <button onClick={() => setEditingOrder(null)} className="p-1 hover:bg-gray-100 rounded"><X size={20}/></button>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Statut</label>
                            <select 
                                className="w-full border border-gray-300 rounded-lg p-2"
                                value={newStatus}
                                onChange={e => setNewStatus(e.target.value as OrderStatus)}
                            >
                                {Object.values(OrderStatus).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        {user.role === UserRole.ADMIN && (
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Assigner Partenaire Logistique</label>
                                <select 
                                    className="w-full border border-gray-300 rounded-lg p-2"
                                    value={assignedPartner}
                                    onChange={e => setAssignedPartner(e.target.value)}
                                >
                                    <option value="">-- Aucun --</option>
                                    {partners.map(p => <option key={p.id} value={p.id}>{p.name} ({p.assignedZone})</option>)}
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Note de suivi (Interne/Client)</label>
                            <textarea 
                                className="w-full border border-gray-300 rounded-lg p-2 h-20 text-sm"
                                placeholder="Ex: Colis reçu au hub central, départ imminent..."
                                value={statusNote}
                                onChange={e => setStatusNote(e.target.value)}
                            ></textarea>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <button onClick={() => setEditingOrder(null)} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg">Annuler</button>
                        <button onClick={handleStatusUpdate} className="px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-emerald-700 shadow-md">Enregistrer</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );

  const ClientView = () => (
      <div className="max-w-2xl mx-auto py-8 px-4 animate-fade-in">
          <div className="text-center mb-10">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Truck size={32} />
              </div>
              <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Suivi Transit</h1>
              <p className="text-gray-500">Visualisez le parcours détaillé de votre commande.</p>
          </div>

          {/* Search Box */}
          <div className="bg-white p-2 rounded-2xl shadow-lg border border-gray-100 flex gap-2 mb-10">
              <input 
                type="text" 
                placeholder="Entrez votre ID de commande (ex: 8X90A)" 
                className="flex-1 pl-4 bg-transparent outline-none text-lg font-mono uppercase text-gray-900 placeholder-gray-400"
                value={clientSearchId}
                onChange={e => setClientSearchId(e.target.value)}
              />
              <button 
                onClick={handleTrackOrder}
                className="bg-primary text-white p-3 rounded-xl font-bold shadow-md hover:bg-emerald-700 transition-transform active:scale-95"
              >
                  <Search size={20} />
              </button>
          </div>

          {trackedOrder ? (
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-slide-up">
                  <div className="bg-gray-900 p-6 text-white flex justify-between items-center">
                      <div>
                          <div className="text-xs text-gray-400 uppercase tracking-widest font-bold">Commande</div>
                          <div className="text-2xl font-mono font-bold tracking-wider">{trackedOrder.shortId}</div>
                      </div>
                      <div className="text-right">
                          <div className="text-xs text-gray-400 uppercase tracking-widest font-bold">Statut</div>
                          <div className="font-bold text-primary">{trackedOrder.status}</div>
                      </div>
                  </div>
                  
                  <div className="p-6 md:p-8 relative">
                      {/* Vertical Timeline */}
                      <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-gray-200"></div>
                      
                      <div className="space-y-8 relative">
                          {trackedOrder.statusHistory.slice().reverse().map((hist, idx) => (
                              <div key={idx} className="flex gap-6 items-start group">
                                  <div className={`relative z-10 w-4 h-4 rounded-full border-2 border-white shadow-sm mt-1.5 ${idx === 0 ? 'bg-primary scale-125' : 'bg-gray-300'}`}></div>
                                  <div className={`flex-1 p-4 rounded-xl border ${idx === 0 ? 'bg-blue-50 border-blue-100' : 'bg-white border-gray-100'}`}>
                                      <div className="flex justify-between items-start mb-1">
                                          <h4 className={`font-bold text-sm ${idx === 0 ? 'text-gray-900' : 'text-gray-500'}`}>{hist.status}</h4>
                                          <span className="text-[10px] text-gray-400">{new Date(hist.date).toLocaleDateString()} {new Date(hist.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                      </div>
                                      {hist.note && (
                                          <p className="text-xs text-gray-600 mt-1 leading-relaxed bg-white/50 p-2 rounded">
                                              {hist.note}
                                          </p>
                                      )}
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>

                  <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
                      <span>Destination: {trackedOrder.customer.city}</span>
                      {trackedOrder.assignedPartnerId && (
                          <span className="flex items-center gap-1"><Store size={12}/> Pris en charge par un partenaire</span>
                      )}
                  </div>
              </div>
          ) : (
              <div className="text-center p-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <Package size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 text-sm">Entrez un numéro de commande pour voir les détails d'acheminement.</p>
              </div>
          )}
      </div>
  );

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
        <div className="max-w-7xl mx-auto px-4 py-6">
            {user && (user.role === UserRole.ADMIN || user.role === UserRole.PARTNER) ? (
                <AdminPartnerView />
            ) : (
                <ClientView />
            )}
        </div>
    </div>
  );
};
