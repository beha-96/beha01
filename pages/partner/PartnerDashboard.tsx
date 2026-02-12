
import React, { useEffect, useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { DatabaseService, generateId } from '../../services/mockDatabase';
import { Order, OrderStatus, Dispute, EarningsRecord, DeliveryDriver, User, ChatMessage } from '../../types';
import { 
  Check, Package, Clock, AlertTriangle, FileText, Download, Printer, 
  QrCode, LogOut, History, Archive, ArrowRight, Truck, ScanLine, 
  Eye, X, Star, Lock, RefreshCcw, Users, Settings, MessageCircle, 
  TrendingUp, MapPin, Phone, Send, ChevronRight, Search, Plus, Power, CheckCircle, Calendar, Upload, FileCheck, Shield
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type Tab = 'overview' | 'orders' | 'drivers' | 'messages' | 'settings';

export const PartnerDashboard: React.FC = () => {
  const { user, logout } = useApp();
  const navigate = useNavigate();
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Data State
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<DeliveryDriver[]>([]);
  const [earnings, setEarnings] = useState<EarningsRecord[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter State
  const [orderFilter, setOrderFilter] = useState<'ALL' | 'ACTIVE' | 'RETURNS' | 'HISTORY'>('ACTIVE');
  const [searchTerm, setSearchTerm] = useState('');

  // Scanning State
  const [isScanning, setIsScanning] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [collectionCode, setCollectionCode] = useState('');
  const [scannedOrder, setScannedOrder] = useState<Order | null>(null);

  // Modal States
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [driverForm, setDriverForm] = useState<Partial<DeliveryDriver>>({});
  
  // Problem Report Modal State
  const [showProblemModal, setShowProblemModal] = useState(false);
  const [problemOrder, setProblemOrder] = useState<Order | null>(null);
  const [problemType, setProblemType] = useState<'RETURN' | 'WITHDRAWAL_EXCEEDED'>('RETURN');
  const [problemReason, setProblemReason] = useState('Produit défectueux');

  // Return Details Modal State
  const [selectedDispute, setSelectedDispute] = useState<{order: Order, dispute: Dispute} | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');

  // Chat State
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- INITIALIZATION ---
  const fetchData = async () => {
    if (!user) return;
    
    // 1. Get All Orders
    const allOrders = await DatabaseService.getOrders();
    const myOrders = allOrders.filter(o => {
        if (o.assignedPartnerId === user.id) return true;
        // Fallback logic for zone-based matching if not explicitly assigned
        if (!o.assignedPartnerId && o.customer.deliveryMethod === 'HOME') {
            return o.customer.city === user.assignedZone || o.customer.commune === user.assignedZone;
        }
        return false;
    });
    setOrders(myOrders);

    // 2. Get Drivers (Filter out archived)
    const allDrivers = await DatabaseService.getDrivers();
    // Filter only drivers belonging to this agency (partner)
    setDrivers(allDrivers.filter(d => d.agencyId === user.id && d.status !== 'ARCHIVED'));

    // 3. Get Earnings (Automatically pruned > 3 months by service)
    setEarnings(await DatabaseService.getEarningsHistory(user.id));

    // 4. Get Messages
    const allMsgs = await DatabaseService.getMessages();
    setMessages(allMsgs.filter(m => m.receiverId === user.id || m.senderId === user.id));

    // 5. Get Disputes (For Returns)
    const allDisputes = await DatabaseService.getDisputes();
    setDisputes(allDisputes.filter(d => d.partnerId === user.id));

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // Real-time sync
    const handleUpdate = () => fetchData();
    window.addEventListener('order-update', handleUpdate);
    window.addEventListener('chat-update', handleUpdate);
    return () => {
        window.removeEventListener('order-update', handleUpdate);
        window.removeEventListener('chat-update', handleUpdate);
    };
  }, [user]);

  // --- COMPUTED DATA ---
  const filteredOrders = orders.filter(o => {
      // Search Filter
      const matchesSearch = o.shortId.includes(searchTerm.toUpperCase()) || o.customer.fullName.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      // Status Filter
      if (orderFilter === 'ACTIVE') {
          return ![OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.REFUNDED, OrderStatus.RETURN_REQUESTED, OrderStatus.RETURN_ACCEPTED, OrderStatus.RETURN_PROCESSING].includes(o.status);
      }
      if (orderFilter === 'RETURNS') {
          return [OrderStatus.RETURN_REQUESTED, OrderStatus.RETURN_ACCEPTED, OrderStatus.RETURN_PROCESSING].includes(o.status);
      }
      if (orderFilter === 'HISTORY') {
          return [OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.REFUNDED].includes(o.status);
      }
      return true;
  });

  // --- REVENUE CALCULATION LOGIC (5th of Month Reset) ---
  const calculateCurrentPeriodRevenue = () => {
      const now = new Date();
      const currentDay = now.getDate();
      const currentMonth = now.getMonth(); // 0-11
      const currentYear = now.getFullYear();

      // Define Cycle Start Date (The 5th of the relevant month)
      let cycleStartDate: Date;
      
      if (currentDay >= 5) {
          // If we are past the 5th, cycle started this month on the 5th
          cycleStartDate = new Date(currentYear, currentMonth, 5);
      } else {
          // If we are before the 5th (e.g. 2nd), cycle started last month on the 5th
          cycleStartDate = new Date(currentYear, currentMonth - 1, 5);
      }

      // Sum commissions from orders strictly within this cycle
      // Only count completed/valid orders for revenue display
      const periodRevenue = orders
          .filter(o => {
              const orderDate = new Date(o.createdAt);
              const isValidStatus = o.status !== OrderStatus.CANCELLED && o.status !== OrderStatus.REFUNDED;
              return isValidStatus && orderDate >= cycleStartDate;
          })
          .reduce((acc, curr) => acc + (curr.commissionAmount || 0), 0);

      return {
          amount: periodRevenue,
          cycleStart: cycleStartDate
      };
  };

  const currentRevenueData = calculateCurrentPeriodRevenue();

  const stats = {
      activeOrders: orders.filter(o => ![OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.REFUNDED].includes(o.status)).length,
      returns: orders.filter(o => [OrderStatus.RETURN_REQUESTED, OrderStatus.RETURN_ACCEPTED, OrderStatus.RETURN_PROCESSING].includes(o.status)).length,
      drivers: drivers.filter(d => d.status === 'ACTIVE').length,
      revenue: currentRevenueData.amount // Dynamic calculation based on date
  };

  // --- ACTIONS ---

  const handleStatusUpdate = async (orderId: string, status: OrderStatus) => {
      let confirmationMessage = `Confirmer le changement de statut vers : ${status} ?`;
      
      if (status === OrderStatus.RETURN_PROCESSING) {
          confirmationMessage = "Confirmer la réception du colis retour en agence ? Cela informera le client du traitement.";
      } else if (status === OrderStatus.REFUNDED) {
          confirmationMessage = "Finaliser le remboursement ? Cela générera automatiquement un bon d'achat pour le client.";
      }

      if(confirm(confirmationMessage)) {
          await DatabaseService.updateOrderStatus(orderId, status, `Mise à jour Partenaire (${user?.name})`);
          fetchData();
          // If refund, check if automated simulation is preferred or manual.
          if (status === OrderStatus.REFUNDED) {
              // Trigger coupon generation if not done
              DatabaseService.simulateReturnProgression(orderId); // Reusing helper logic or implement direct coupon gen here
          }
      }
  };

  const handleQuickReceipt = async (order: Order) => {
      if(!user) return;
      
      // Visual feedback: open scanner and fill input
      setScanInput(order.shortId);
      setIsScanning(true);
      
      // Artificial delay to show "Auto-filling"
      setTimeout(async () => {
          const result = await DatabaseService.scanQRCode(order.shortId, user.id);
          if (result) {
              alert("Code inséré et réception confirmée !");
              setScanInput('');
              setIsScanning(false);
              fetchData();
          } else {
              alert("Erreur lors de la confirmation automatique.");
          }
      }, 500);
  };

  const handleDriverSave = async () => {
      if(!driverForm.name || !driverForm.phone || !user) return;
      
      // Basic Validation for Docs
      if (!driverForm.documents?.idCard || !driverForm.documents?.license) {
          alert("Veuillez télécharger la pièce d'identité et le permis de conduire.");
          return;
      }

      await DatabaseService.saveDriver({
          ...driverForm,
          id: driverForm.id || generateId(),
          agencyId: user.id, // Explicitly link to this agency
          // Force Pending if creating new or simple update (handled in service, but nice to be explicit)
          status: 'PENDING_APPROVAL', 
          joinedAt: driverForm.joinedAt || new Date().toISOString(),
          rating: driverForm.rating || 5,
          totalDeliveries: driverForm.totalDeliveries || 0
      } as DeliveryDriver, user.id);
      
      alert("Demande envoyée ! Le livreur est en attente de validation par l'administrateur.");
      setShowDriverModal(false);
      fetchData();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'idCard' | 'license') => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setDriverForm(prev => ({
                  ...prev,
                  documents: {
                      ...prev.documents || { idCard: '', license: '' },
                      [type]: reader.result as string
                  }
              }));
          };
          reader.readAsDataURL(file);
      }
  };

  const handleArchiveDriver = async (id: string) => {
      if(!user) return;
      if(confirm("Voulez-vous supprimer ce livreur ? Il sera archivé et ne pourra plus être utilisé.")) {
          await DatabaseService.archiveDriver(id, user.id);
          fetchData();
      }
  };

  const handleScan = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!user) return;
      const order = await DatabaseService.scanQRCode(scanInput.toUpperCase(), user.id);
      if (order) {
          if (order.status === OrderStatus.READY) {
              setScannedOrder(order);
          } else {
              alert("Colis scanné et reçu en agence avec succès !");
              setScanInput('');
              fetchData();
          }
      } else {
          alert("Code invalide ou commande non autorisée.");
      }
  };

  const handleValidateDelivery = async (e: React.FormEvent) => {
      e.preventDefault();
      if(scannedOrder) {
          const success = await DatabaseService.validateCollectionCode(scannedOrder.shortId, collectionCode);
          if(success) {
              alert("Livraison validée !");
              setScannedOrder(null);
              setCollectionCode('');
              setScanInput('');
              fetchData();
          } else {
              alert("Code de retrait incorrect.");
          }
      }
  };

  const handleResolveReturn = async (order: Order, accepted: boolean) => {
      // Validation for rejection
      if (!accepted && !rejectionNote.trim()) {
          alert("Veuillez saisir un motif de refus pour informer le client.");
          return;
      }

      // Find associated dispute
      const dispute = disputes.find(d => d.orderId === order.shortId && d.type === 'RETURN');
      
      if (dispute) {
          // Resolve dispute (Partner Authority)
          // This triggers automated flow + NOTIFICATIONS in backend
          await DatabaseService.resolveDispute(dispute.id, accepted ? 'ACCEPTED' : 'REJECTED', rejectionNote);
          
          // Close modal and reset
          setSelectedDispute(null);
          setRejectionNote('');
          alert(accepted ? "Retour accepté et client notifié." : "Retour refusé et client notifié.");
      } else {
          // Fallback if no dispute object exists but status needs update
          if (accepted) {
              await DatabaseService.updateOrderStatus(order.id, OrderStatus.RETURN_ACCEPTED, 'Retour validé manuellement');
          } else {
              await handleStatusUpdate(order.id, OrderStatus.DELIVERED);
          }
      }
      fetchData();
  };

  const handleViewReturnDetails = (order: Order) => {
      const dispute = disputes.find(d => d.orderId === order.shortId && d.type === 'RETURN');
      if (dispute) {
          setSelectedDispute({ order, dispute });
          setRejectionNote('');
      } else {
          alert("Détails du signalement introuvables.");
      }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!chatInput.trim() || !user || !selectedChatId) return;
      
      await DatabaseService.sendMessage({
          id: generateId(),
          senderId: user.id,
          senderName: user.name,
          receiverId: selectedChatId, // Could be Admin or specific Customer ID
          content: chatInput,
          timestamp: new Date().toISOString(),
          read: false
      });
      setChatInput('');
      fetchData();
  };

  const handleReportProblemSubmit = async () => {
      if(!problemOrder || !user) return;
      
      if (confirm("Valider le signalement ? Le processus de retour (remboursement automatique) sera déclenché immédiatement et la commission annulée.")) {
          await DatabaseService.reportPartnerProblem(
              problemOrder.id, 
              user.id, 
              problemType, 
              problemReason
          );
          setShowProblemModal(false);
          setProblemOrder(null);
          fetchData();
      }
  };

  // --- PRINT & DOWNLOAD HANDLERS ---
  const handlePrintHistory = () => {
      const printWindow = window.open('', '', 'width=800,height=600');
      if (printWindow) {
          printWindow.document.write('<html><head><title>Historique des Gains</title>');
          printWindow.document.write('<style>body{font-family:sans-serif;} table{width:100%;border-collapse:collapse;} th,td{border:1px solid #ddd;padding:8px;text-align:left;} th{background-color:#f2f2f2;}</style>');
          printWindow.document.write('</head><body>');
          printWindow.document.write(`<h1>Historique des Gains - ${user?.name}</h1>`);
          printWindow.document.write(`<p>Date d'impression: ${new Date().toLocaleDateString()}</p>`);
          printWindow.document.write('<table><thead><tr><th>Date</th><th>Montant</th><th>Période</th></tr></thead><tbody>');
          earnings.forEach(e => {
              const date = new Date(e.generatedAt).toLocaleDateString();
              printWindow.document.write(`<tr><td>${date}</td><td>${e.amount.toLocaleString()} F</td><td>${e.month + 1}/${e.year}</td></tr>`);
          });
          printWindow.document.write('</tbody></table>');
          printWindow.document.write('<p style="font-size:10px; margin-top:20px;">* L\'historique est conservé pendant 3 mois uniquement.</p>');
          printWindow.document.write('</body></html>');
          printWindow.document.close();
          printWindow.print();
      }
  };

  const handleDownloadCSV = () => {
      const headers = ["Date", "Montant (FCFA)", "Période (M/A)"];
      const rows = earnings.map(e => [
          new Date(e.generatedAt).toLocaleDateString(),
          e.amount,
          `${e.month + 1}/${e.year}`
      ]);

      const csvContent = "data:text/csv;charset=utf-8," 
          + headers.join(",") + "\n" 
          + rows.map(e => e.join(",")).join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `historique_gains_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  if (!user) return <div className="p-10 text-center">Accès Refusé</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      
      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
              <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                      <Truck size={20} />
                  </div>
                  <div>
                      <h1 className="font-bold text-gray-900 leading-tight">{user.name}</h1>
                      <p className="text-xs text-gray-500 font-medium">Zone: {user.assignedZone}</p>
                  </div>
              </div>
              <div className="flex items-center gap-3">
                  <button onClick={() => { logout(); navigate('/'); }} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors">
                      <LogOut size={20} />
                  </button>
              </div>
          </div>
          
          {/* MOBILE TABS SCROLLABLE */}
          <div className="flex overflow-x-auto no-scrollbar border-t border-gray-100 bg-gray-50/50">
              {[
                  { id: 'overview', icon: TrendingUp, label: 'Aperçu' },
                  { id: 'orders', icon: Package, label: 'Commandes' },
                  { id: 'drivers', icon: Users, label: 'Mes Livreurs' },
                  { id: 'messages', icon: MessageCircle, label: 'Messages' },
                  { id: 'settings', icon: Settings, label: 'Paramètres' },
              ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as Tab)}
                    className={`flex items-center gap-2 px-6 py-4 whitespace-nowrap text-sm font-bold border-b-2 transition-colors ${activeTab === tab.id ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                  >
                      <tab.icon size={18}/> {tab.label}
                  </button>
              ))}
          </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
          
          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
              <div className="space-y-6 animate-fade-in">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                          <p className="text-xs text-gray-500 uppercase font-bold mb-1">Commandes Actives</p>
                          <h3 className="text-2xl font-black text-blue-600">{stats.activeOrders}</h3>
                      </div>
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                          <p className="text-xs text-gray-500 uppercase font-bold mb-1">Retours / Litiges</p>
                          <h3 className="text-2xl font-black text-orange-600">{stats.returns}</h3>
                      </div>
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                          <p className="text-xs text-gray-500 uppercase font-bold mb-1">Livreurs Actifs</p>
                          <h3 className="text-2xl font-black text-green-600">{stats.drivers}</h3>
                      </div>
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden">
                          <div className="relative z-10">
                              <p className="text-xs text-gray-500 uppercase font-bold mb-1 flex items-center gap-1">
                                  Gains du Mois <InfoTooltip text="Réinitialisé automatiquement le 5 de chaque mois" />
                              </p>
                              <h3 className="text-2xl font-black text-gray-900">{stats.revenue.toLocaleString()} F</h3>
                              <p className="text-[9px] text-gray-400 mt-1">Depuis le {currentRevenueData.cycleStart.toLocaleDateString()}</p>
                          </div>
                          <div className="absolute right-0 top-0 h-full w-1 bg-blue-500"></div>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* SCANNER SHORTCUT */}
                      <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-xl shadow-blue-200 flex flex-col items-center text-center justify-center gap-4">
                          <div>
                              <h2 className="text-xl font-bold mb-1">Scanner un Colis</h2>
                              <p className="text-blue-100 text-sm">Réception ou Validation Retrait</p>
                          </div>
                          <button 
                            onClick={() => { setIsScanning(true); setActiveTab('orders'); }}
                            className="bg-white text-blue-600 px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-50 transition-colors shadow-sm w-full justify-center max-w-xs"
                          >
                              <ScanLine size={20}/> Ouvrir le Scanner
                          </button>
                      </div>

                      {/* EARNINGS HISTORY */}
                      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                          <div className="flex justify-between items-center mb-4">
                              <h3 className="font-bold text-gray-800 flex items-center gap-2"><History className="text-gray-400"/> Historique Gains</h3>
                              <div className="flex gap-2">
                                  <button onClick={handlePrintHistory} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-600" title="Imprimer"><Printer size={16}/></button>
                                  <button onClick={handleDownloadCSV} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-600" title="Télécharger CSV"><Download size={16}/></button>
                              </div>
                          </div>
                          
                          <div className="overflow-y-auto max-h-48 custom-scrollbar">
                              {earnings.length === 0 ? (
                                  <p className="text-sm text-gray-400 text-center py-4">Aucun historique disponible.</p>
                              ) : (
                                  <table className="w-full text-sm text-left">
                                      <thead className="text-xs text-gray-500 bg-gray-50 uppercase">
                                          <tr>
                                              <th className="p-2 rounded-l-lg">Période</th>
                                              <th className="p-2">Date</th>
                                              <th className="p-2 text-right rounded-r-lg">Montant</th>
                                          </tr>
                                      </thead>
                                      <tbody>
                                          {earnings.map(e => (
                                              <tr key={e.id} className="border-b border-gray-50 last:border-0">
                                                  <td className="p-2 font-medium">{e.month + 1}/{e.year}</td>
                                                  <td className="p-2 text-gray-500 text-xs">{new Date(e.generatedAt).toLocaleDateString()}</td>
                                                  <td className="p-2 text-right font-bold text-gray-900">{e.amount.toLocaleString()} F</td>
                                              </tr>
                                          ))}
                                      </tbody>
                                  </table>
                              )}
                          </div>
                          <p className="text-[10px] text-gray-400 mt-2 text-center bg-yellow-50 p-1 rounded text-yellow-700 border border-yellow-100">
                              <Archive size={10} className="inline mr-1"/>
                              Historique conservé 3 mois. Téléchargez vos rapports régulièrement.
                          </p>
                      </div>
                  </div>
              </div>
          )}

          {/* TAB: ORDERS & RETURNS */}
          {activeTab === 'orders' && (
              <div className="space-y-6 animate-fade-in">
                  
                  {/* Tools Bar */}
                  <div className="flex flex-col md:flex-row gap-4 justify-between">
                      <div className="flex bg-white p-1 rounded-lg border border-gray-200 shadow-sm w-full md:w-auto overflow-x-auto no-scrollbar">
                          {['ACTIVE', 'RETURNS', 'HISTORY', 'ALL'].map(f => (
                              <button 
                                key={f}
                                onClick={() => setOrderFilter(f as any)}
                                className={`px-4 py-2 rounded-md text-xs font-bold whitespace-nowrap transition-colors ${orderFilter === f ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                              >
                                  {f === 'ACTIVE' ? 'En Cours' : f === 'RETURNS' ? 'Retours' : f === 'HISTORY' ? 'Historique' : 'Tout'}
                              </button>
                          ))}
                      </div>
                      
                      <div className="flex gap-2 w-full md:w-auto">
                          <div className="relative flex-grow">
                              <input 
                                type="text" 
                                placeholder="Rechercher ID ou Client..." 
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                              />
                              <Search className="absolute left-3 top-2.5 text-gray-400" size={16}/>
                          </div>
                          <button 
                            onClick={() => setIsScanning(!isScanning)} 
                            className={`p-2.5 rounded-xl border transition-colors ${isScanning ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                          >
                              <QrCode size={20}/>
                          </button>
                      </div>
                  </div>

                  {/* SCANNER AREA */}
                  {isScanning && (
                      <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-2xl animate-scale-in">
                          <h3 className="font-bold mb-4 flex items-center gap-2"><ScanLine className="text-green-400"/> Scanner / Entrée Manuelle</h3>
                          
                          {!scannedOrder ? (
                              <form onSubmit={handleScan} className="flex gap-2">
                                  <input 
                                    autoFocus
                                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-lg font-mono tracking-widest focus:ring-2 focus:ring-green-500 outline-none text-white uppercase placeholder-slate-500"
                                    placeholder="SCAN ID (ex: 8X90A)"
                                    value={scanInput}
                                    onChange={e => setScanInput(e.target.value)}
                                  />
                                  <button type="submit" className="bg-green-500 text-slate-900 px-6 py-3 rounded-xl font-bold hover:bg-green-400 transition-colors">Valider</button>
                              </form>
                          ) : (
                              <div className="bg-white text-slate-900 rounded-xl p-6">
                                  <div className="flex justify-between items-start mb-6">
                                      <div>
                                          <h4 className="font-bold text-xl">Commande {scannedOrder.shortId}</h4>
                                          <p className="text-sm text-gray-500">{scannedOrder.customer.fullName}</p>
                                      </div>
                                      <button onClick={() => setScannedOrder(null)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20}/></button>
                                  </div>
                                  
                                  <div className="mb-6 bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-yellow-800 text-sm font-medium flex items-center gap-2">
                                      <Lock size={16}/> Code de retrait requis
                                  </div>

                                  <form onSubmit={handleValidateDelivery} className="flex flex-col gap-4">
                                      <input 
                                        type="text" 
                                        maxLength={4}
                                        placeholder="Code Client (4 chiffres)"
                                        className="w-full text-center text-3xl font-bold tracking-[1em] p-4 border-2 border-gray-300 rounded-xl focus:border-green-500 outline-none"
                                        value={collectionCode}
                                        onChange={e => setCollectionCode(e.target.value)}
                                      />
                                      <button disabled={collectionCode.length < 4} type="submit" className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 disabled:opacity-50 shadow-lg">
                                          Confirmer la Livraison
                                      </button>
                                  </form>
                              </div>
                          )}
                      </div>
                  )}

                  {/* ORDERS LIST */}
                  <div className="space-y-4">
                      {filteredOrders.length === 0 ? (
                          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                              <Package className="mx-auto text-gray-300 mb-4" size={48}/>
                              <p className="text-gray-500 font-medium">Aucune commande trouvée.</p>
                          </div>
                      ) : filteredOrders.map(order => (
                          <div key={order.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                                  <div>
                                      <div className="flex items-center gap-2 mb-1">
                                          <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-mono font-bold">{order.shortId}</span>
                                          <span className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</span>
                                      </div>
                                      <h3 className="font-bold text-gray-900">{order.customer.fullName}</h3>
                                      <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin size={10}/> {order.customer.address} ({order.customer.deliveryMethod === 'PICKUP' ? 'Retrait' : 'Livraison'})</p>
                                  </div>
                                  <div className="flex flex-col items-end">
                                      <span className={`px-3 py-1 rounded-full text-xs font-bold mb-1 ${
                                          [OrderStatus.RETURN_REQUESTED, OrderStatus.RETURN_ACCEPTED, OrderStatus.RETURN_PROCESSING].includes(order.status) ? 'bg-orange-100 text-orange-700' :
                                          order.status === OrderStatus.READY ? 'bg-purple-100 text-purple-700' :
                                          order.status === OrderStatus.REFUNDED ? 'bg-green-100 text-green-700' :
                                          'bg-blue-50 text-blue-700'
                                      }`}>
                                          {order.status}
                                      </span>
                                      <span className="font-bold text-gray-900">{order.total.toLocaleString()} F</span>
                                  </div>
                              </div>

                              {/* ACTIONS WORKFLOW */}
                              <div className="border-t border-gray-50 pt-4 flex flex-wrap gap-2">
                                  
                                  {/* Normal Flow - QUICK RECEIPT CONFIRMATION */}
                                  {order.status === OrderStatus.OUT_FOR_DELIVERY && (
                                      <button onClick={() => handleQuickReceipt(order)} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-green-700 w-full md:w-auto justify-center shadow-md animate-pulse">
                                          <Check size={16}/> Confirmer Réception
                                      </button>
                                  )}

                                  {order.status === OrderStatus.READY && (
                                      <button onClick={() => { setIsScanning(true); setScanInput(order.shortId); }} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-purple-700 w-full md:w-auto justify-center">
                                          <Lock size={16}/> Entrer Code Retrait
                                      </button>
                                  )}

                                  {/* Return Flow - PARTNER MANAGEMENT */}
                                  
                                  {/* 1. Request Received -> Accept/Reject */}
                                  {order.status === OrderStatus.RETURN_REQUESTED && (
                                      <div className="flex flex-col md:flex-row gap-2 w-full">
                                          <button onClick={() => handleViewReturnDetails(order)} className="flex-1 bg-orange-600 text-white px-4 py-3 rounded-lg text-sm font-bold hover:bg-orange-700 flex items-center justify-center gap-2">
                                              <Eye size={16}/> Voir Détails & Valider
                                          </button>
                                      </div>
                                  )}

                                  {/* 2. Request Accepted -> Item Received (Processing) */}
                                  {order.status === OrderStatus.RETURN_ACCEPTED && (
                                      <div className="flex flex-col md:flex-row gap-2 w-full">
                                          <button onClick={() => handleStatusUpdate(order.id, OrderStatus.RETURN_PROCESSING)} className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center justify-center gap-2">
                                              <Package size={16}/> Confirmer Réception Colis
                                          </button>
                                          <button onClick={() => handleViewReturnDetails(order)} className="bg-gray-100 text-gray-600 px-4 py-3 rounded-lg text-sm font-bold hover:bg-gray-200">
                                              Détails
                                          </button>
                                      </div>
                                  )}

                                  {/* 3. Processing -> Refund (Voucher) */}
                                  {order.status === OrderStatus.RETURN_PROCESSING && (
                                      <div className="flex flex-col md:flex-row gap-2 w-full">
                                          <button onClick={() => DatabaseService.simulateReturnProgression(order.id)} className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg text-sm font-bold hover:bg-green-700 flex items-center justify-center gap-2">
                                              <RefreshCcw size={16}/> Finaliser Remboursement
                                          </button>
                                          <button onClick={() => handleViewReturnDetails(order)} className="bg-gray-100 text-gray-600 px-4 py-3 rounded-lg text-sm font-bold hover:bg-gray-200">
                                              Détails
                                          </button>
                                      </div>
                                  )}

                                  {/* Dispute / History - REPORT PROBLEM BUTTON */}
                                  {order.status === OrderStatus.DELIVERED && (
                                      <div className="w-full flex justify-end">
                                          <button 
                                            onClick={() => { setProblemOrder(order); setShowProblemModal(true); }}
                                            className="text-gray-400 hover:text-red-500 text-xs font-bold flex items-center gap-1 transition-colors px-3 py-2 hover:bg-red-50 rounded-lg"
                                          >
                                              <AlertTriangle size={12}/> Signaler problème
                                          </button>
                                      </div>
                                  )}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {/* TAB: DRIVERS */}
          {activeTab === 'drivers' && (
              <div className="space-y-6 animate-fade-in">
                  <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm gap-4">
                      <div className="flex-1">
                          <h2 className="font-bold text-gray-900 flex items-center gap-2"><Users className="text-blue-600"/> Mes Livreurs</h2>
                          <p className="text-sm text-gray-500">Ajoutez et gérez vos livreurs. La validation de l'admin est requise.</p>
                      </div>
                      <button onClick={() => { setDriverForm({}); setShowDriverModal(true); }} className="bg-blue-600 text-white px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 shadow-md">
                          <Plus size={16}/> Nouveau Livreur
                      </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {drivers.map(driver => (
                          <div key={driver.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm relative group hover:shadow-md transition-shadow">
                              <div className="flex justify-between items-start mb-4">
                                  <div className="flex items-center gap-3">
                                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 font-bold text-lg uppercase">
                                          {driver.name.charAt(0)}
                                      </div>
                                      <div>
                                          <h3 className="font-bold text-gray-900">{driver.name}</h3>
                                          <p className="text-xs text-gray-500 font-mono">{driver.phone}</p>
                                      </div>
                                  </div>
                                  {driver.status === 'PENDING_APPROVAL' && <span className="bg-yellow-100 text-yellow-800 text-[10px] font-bold px-2 py-1 rounded">EN ATTENTE</span>}
                                  {driver.status === 'ACTIVE' && <span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-1 rounded">VALIDÉ</span>}
                                  {driver.status === 'REJECTED' && <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-1 rounded">REJETÉ</span>}
                                  {driver.status === 'BUSY' && <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-1 rounded">EN COURSE</span>}
                              </div>
                              
                              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-4">
                                  <div className="bg-gray-50 p-2 rounded">
                                      <span className="block text-[10px] text-gray-400 uppercase">Zone</span>
                                      <span className="font-medium">{driver.zone}</span>
                                  </div>
                                  <div className="bg-gray-50 p-2 rounded">
                                      <span className="block text-[10px] text-gray-400 uppercase">Courses</span>
                                      <span className="font-medium">{driver.totalDeliveries}</span>
                                  </div>
                              </div>

                              {driver.adminNote && driver.status === 'REJECTED' && (
                                  <div className="bg-red-50 p-3 rounded-lg text-xs text-red-700 mb-4 border border-red-100">
                                      <strong>Motif rejet:</strong> {driver.adminNote}
                                  </div>
                              )}

                              <div className="flex gap-2">
                                  <button onClick={() => { setDriverForm(driver); setShowDriverModal(true); }} className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm font-bold hover:bg-gray-50 flex items-center justify-center gap-1">
                                      <FileText size={14}/> Modifier
                                  </button>
                                  {/* Archive Button for Partner */}
                                  <button 
                                    className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                                    onClick={() => handleArchiveDriver(driver.id)}
                                    title="Archiver (Supprimer)"
                                  >
                                      <Archive size={18}/>
                                  </button>
                              </div>
                          </div>
                      ))}
                      {drivers.length === 0 && (
                          <div className="col-span-full text-center py-10 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                              <Users size={32} className="mx-auto mb-2 opacity-50"/>
                              <p>Aucun livreur enregistré.</p>
                          </div>
                      )}
                  </div>
              </div>
          )}

          {/* TAB: SETTINGS */}
          {activeTab === 'settings' && (
              <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
                  <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                      <h2 className="font-bold text-lg mb-6 flex items-center gap-2"><Settings className="text-gray-400"/> Paramètres Agence</h2>
                      
                      <div className="space-y-4">
                          <div>
                              <label className="block text-sm font-bold text-gray-700 mb-1">Nom de l'agence</label>
                              <input disabled value={user.name} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-500 cursor-not-allowed" />
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-gray-700 mb-1">Zone de Couverture</label>
                              <input disabled value={user.assignedZone} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-500 cursor-not-allowed" />
                              <p className="text-xs text-gray-400 mt-1">Contactez l'admin pour changer votre zone.</p>
                          </div>
                          
                          <div className="flex items-center justify-between py-4 border-t border-gray-100 mt-4">
                              <div>
                                  <span className="block font-bold text-gray-900">Paiement à la livraison</span>
                                  <span className="text-xs text-gray-500">Accepter les espèces via vos livreurs</span>
                              </div>
                              <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full bg-green-500 cursor-pointer">
                                  <span className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform translate-x-6"></span>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {/* TAB: MESSAGES */}
          {activeTab === 'messages' && (
              <div className="h-[calc(100vh-140px)] bg-white rounded-xl shadow-sm border border-gray-100 flex overflow-hidden animate-fade-in">
                  {/* Sidebar List */}
                  <div className="w-1/3 border-r border-gray-100 overflow-y-auto">
                      <div className="p-4 border-b border-gray-50 bg-gray-50/50">
                          <h3 className="font-bold text-gray-700">Conversations</h3>
                      </div>
                      <div onClick={() => setSelectedChatId('admin1')} className={`p-4 border-b border-gray-50 cursor-pointer hover:bg-blue-50 transition-colors ${selectedChatId === 'admin1' ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''}`}>
                          <div className="font-bold text-sm text-gray-900">Administrateur</div>
                          <div className="text-xs text-gray-500 truncate">Support technique & logistique</div>
                      </div>
                      {/* Placeholder for Customer Chats if implemented */}
                  </div>
                  
                  {/* Chat Area */}
                  <div className="flex-1 flex flex-col bg-gray-50/30">
                      {selectedChatId ? (
                          <>
                              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                                  {messages.filter(m => (m.senderId === user.id && m.receiverId === selectedChatId) || (m.senderId === selectedChatId && m.receiverId === user.id))
                                      .sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                                      .map(m => {
                                          const isMe = m.senderId === user.id;
                                          return (
                                              <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                  <div className={`max-w-[70%] p-3 rounded-xl text-sm ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-gray-200 rounded-bl-none text-gray-800'}`}>
                                                      <p>{m.content}</p>
                                                      <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>{new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                                  </div>
                                              </div>
                                          );
                                      })
                                  }
                                  <div ref={messagesEndRef}/>
                              </div>
                              <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-200 flex gap-2">
                                  <input 
                                    className="flex-1 bg-gray-100 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" 
                                    placeholder="Écrivez votre message..." 
                                    value={chatInput}
                                    onChange={e => setChatInput(e.target.value)}
                                  />
                                  <button type="submit" className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"><Send size={20}/></button>
                              </form>
                          </>
                      ) : (
                          <div className="flex-1 flex items-center justify-center text-gray-400 flex-col gap-2">
                              <MessageCircle size={48} className="opacity-20"/>
                              <p>Sélectionnez une conversation</p>
                          </div>
                      )}
                  </div>
              </div>
          )}

      </div>

      {/* DRIVER MODAL */}
      {showDriverModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
                  <h3 className="font-bold text-xl mb-6 text-gray-900">Information Livreur</h3>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Nom Complet</label>
                          <input className="w-full border border-gray-200 rounded-lg p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={driverForm.name || ''} onChange={e => setDriverForm({...driverForm, name: e.target.value})} placeholder="Ex: Kouassi Paul" />
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Téléphone</label>
                          <input className="w-full border border-gray-200 rounded-lg p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={driverForm.phone || ''} onChange={e => setDriverForm({...driverForm, phone: e.target.value})} placeholder="0707..." />
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Zone de livraison</label>
                          <input className="w-full border border-gray-200 rounded-lg p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={driverForm.zone || ''} onChange={e => setDriverForm({...driverForm, zone: e.target.value})} placeholder="Ex: Cocody Centre" />
                      </div>
                      
                      <div className="border-t border-gray-100 pt-4 mt-2">
                          <h4 className="font-bold text-sm text-gray-900 mb-3 flex items-center gap-2"><FileCheck size={16}/> Documents Requis (Validation)</h4>
                          
                          <div className="grid grid-cols-2 gap-4">
                              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                                  <p className="text-xs font-bold text-gray-600 mb-2">Carte CNI / Passeport</p>
                                  <label className="cursor-pointer block">
                                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm border">
                                          {driverForm.documents?.idCard ? <Check className="text-green-500"/> : <Upload size={20} className="text-gray-400"/>}
                                      </div>
                                      <span className="text-[10px] text-blue-600 font-bold underline">Choisir Fichier</span>
                                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'idCard')} />
                                  </label>
                              </div>
                              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                                  <p className="text-xs font-bold text-gray-600 mb-2">Permis de Conduire</p>
                                  <label className="cursor-pointer block">
                                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm border">
                                          {driverForm.documents?.license ? <Check className="text-green-500"/> : <Upload size={20} className="text-gray-400"/>}
                                      </div>
                                      <span className="text-[10px] text-blue-600 font-bold underline">Choisir Fichier</span>
                                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'license')} />
                                  </label>
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="mt-8 flex gap-3">
                      <button onClick={() => setShowDriverModal(false)} className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl">Annuler</button>
                      <button onClick={handleDriverSave} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg">Soumettre pour validation</button>
                  </div>
              </div>
          </div>
      )}

      {/* Helper Tooltip Component */}
      <Tooltip />

    </div>
  );
};

const Tooltip: React.FC<{text?: string}> = ({text}) => {
    if(!text) return null;
    return (
        <span className="group relative inline-block ml-1">
            <Clock size={12} className="text-gray-400 cursor-help"/>
            <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-max max-w-[200px] rounded bg-gray-800 p-2 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100 z-50">
                {text}
            </span>
        </span>
    );
};

// Fake Component to avoid error since I used it inside the main component before defining
const InfoTooltip: React.FC<{text: string}> = ({text}) => <Tooltip text={text} />;
