
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { DatabaseService, generateId } from '../services/mockDatabase';
import { Order, OrderStatus, User, ReviewDetails, InternationalShipment, Dispute, ChatMessage, Notification } from '../types';
import { Search, Package, CheckCircle, Clock, Truck, AlertTriangle, Star, XCircle, Loader2, ArrowLeft, Copy, MessageCircle, Phone, Bell, Send, User as UserIcon, MapPin, Box, Plane, Globe, Calendar, FileText, ShoppingBag, Upload, Lock, Camera, ThumbsUp, ThumbsDown, X, ChevronLeft, Store, Ticket, DollarSign, Info, RefreshCcw, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useNotifications } from '../context/NotificationContext';

export const OrderTracking: React.FC = () => {
  const navigate = useNavigate();
  const { products, addToCart } = useApp();
  const { markAsRead } = useNotifications();
  
  // Tab State
  const [trackingType, setTrackingType] = useState<'LOCAL' | 'INTERNATIONAL'>('LOCAL');

  // Input State
  const [searchId, setSearchId] = useState('');
  
  // Data State
  const [order, setOrder] = useState<Order | null>(null);
  const [shipment, setShipment] = useState<InternationalShipment | null>(null);
  const [partner, setPartner] = useState<User | null>(null);
  
  // UI State
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [progressWidth, setProgressWidth] = useState(0);

  // Modals State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);

  // Return Form State
  const [returnReason, setReturnReason] = useState('DEFECT');
  const [returnDesc, setReturnDesc] = useState('');
  const [returnPhoto, setReturnPhoto] = useState<string | null>(null);

  // Comment Form State
  const [commentText, setCommentText] = useState('');

  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [hasUnreadMessage, setHasUnreadMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Order Specific Notifications
  const [orderNotifications, setOrderNotifications] = useState<Notification[]>([]);

  // Suggestions
  const suggestedProducts = products.filter(p => p.active).slice(0, 4);

  // Reset state when switching tabs
  useEffect(() => {
      setSearchId('');
      setOrder(null);
      setShipment(null);
      setError('');
      setPartner(null);
      setIsChatOpen(false);
      setOrderNotifications([]);
  }, [trackingType]);

  // Polling for Order Data & Sync (Real-time simulation)
  useEffect(() => {
    let interval: any;
    if (order) {
        // Immediate initial fetch for aux data
        syncOrderData(order);

        interval = setInterval(async () => {
            const updatedOrder = await DatabaseService.getOrderById(order.shortId);
            if (updatedOrder) {
                // Check for status change to trigger animation or alert
                if (updatedOrder.status !== order.status) {
                    setOrder(updatedOrder);
                }
                syncOrderData(updatedOrder);
            }
        }, 2000); // 2s polling for real-time feel
    }
    return () => clearInterval(interval);
  }, [order?.shortId]); // Only restart if ID changes

  const syncOrderData = async (currentOrder: Order) => {
      // 1. Sync Notifications linked to this tracking code
      const allNotifs = JSON.parse(localStorage.getItem('notifications') || '[]');
      const filteredNotifs = allNotifs.filter((n: Notification) => 
          n.message.includes(currentOrder.shortId) || 
          n.title.includes(currentOrder.shortId) ||
          (n.link && n.link.includes(currentOrder.shortId))
      );
      setOrderNotifications(filteredNotifs);

      // 2. Sync Chat Messages linked to this tracking code
      const allMsgs = await DatabaseService.getMessages();
      const guestId = `guest_${currentOrder.shortId}`;
      const relevantMsgs = allMsgs.filter(m => 
          m.senderId === guestId || m.receiverId === guestId
      ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      setChatHistory(relevantMsgs);

      if (relevantMsgs.length > 0) {
          const lastMsg = relevantMsgs[relevantMsgs.length - 1];
          if (lastMsg.senderId !== guestId && !lastMsg.read && !isChatOpen) {
              setHasUnreadMessage(true);
          }
      }
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchId) return;
    setLoading(true);
    setError('');
    setOrder(null);
    setShipment(null);
    setPartner(null);
    setProgressWidth(0);

    try {
      if (trackingType === 'LOCAL') {
          const result = await DatabaseService.getOrderById(searchId.trim().toUpperCase());
          if (result) {
            setOrder(result);
            if (result.assignedPartnerId) {
                const users = await DatabaseService.getUsers();
                const foundPartner = users.find(u => u.id === result.assignedPartnerId);
                setPartner(foundPartner || null);
            }
          } else {
            setError("Commande locale introuvable. Vérifiez l'ID.");
          }
      } else {
          // International Tracking
          const result = await DatabaseService.getInternationalShipment(searchId.trim().toUpperCase());
          if (result) {
              setShipment(result);
          } else {
              setError("Colis international introuvable. Vérifiez le code (ex: TR-XXXX).");
          }
      }
    } catch (err) {
      setError("Erreur de connexion.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const handleRedeemCoupon = async () => {
      if(!order) return;
      if(confirm("Confirmer la récupération du bon d'achat ? Le code de suivi de cette commande sera ensuite archivé.")) {
          await DatabaseService.redeemCoupon(order.id);
          alert("Bon d'achat récupéré ! La commande a été archivée.");
          setOrder(null); // Clear view as tracking ID is now 'invalid' for search
          setSearchId('');
      }
  };

  // --- CHAT LOGIC ---
  const handleSendMessage = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!chatMessage.trim() || !order || !partner) return;

      const guestId = `guest_${order.shortId}`;

      const newMsg: ChatMessage = {
          id: generateId(),
          senderId: guestId, 
          receiverId: partner.id,
          content: chatMessage,
          timestamp: new Date().toISOString(),
          read: false,
          senderName: order.customer.fullName
      };

      await DatabaseService.sendMessage(newMsg);
      setChatMessage('');
      syncOrderData(order);
  };

  useEffect(() => {
      if (isChatOpen) {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          setHasUnreadMessage(false);
      }
  }, [chatHistory, isChatOpen]);

  // --- RETURN LOGIC ---
  const handleReturnSubmit = async () => {
      if (!order || !partner) return;
      
      const newDispute: Dispute = {
          id: generateId(),
          orderId: order.shortId,
          partnerId: partner.id,
          type: 'RETURN',
          description: `[Raison: ${returnReason}] ${returnDesc}`,
          status: 'OPEN',
          createdAt: new Date().toISOString(),
          affectedProductIds: order.items.map(i => i.id),
          photoUrl: returnPhoto || undefined
      };

      await DatabaseService.createDispute(newDispute);
      // Wait a bit for async db write
      await new Promise(resolve => setTimeout(resolve, 500));
      
      alert("Votre demande de retour a été envoyée. Elle est visible par l'agence partenaire.");
      setShowReturnModal(false);
      
      const updated = await DatabaseService.getOrderById(order.shortId);
      if(updated) setOrder(updated);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const fakeUrl = URL.createObjectURL(file);
          setReturnPhoto(fakeUrl);
      }
  };

  // --- CANCELLATION LOGIC ---
  const confirmCancel = async () => {
      if (!order) return;
      setLoading(true);
      await DatabaseService.cancelOrder(order.id, "Annulation par le client");
      const updated = await DatabaseService.getOrderById(order.shortId);
      if (updated) setOrder(updated);
      setLoading(false);
      setShowCancelModal(false);
  };

  // --- REVIEW & COMMENT LOGIC ---
  const handleLikeDislike = async (liked: boolean) => {
      if(!order) return;
      alert(liked ? "Merci pour votre J'aime !" : "Nous sommes désolés que cela ne vous ait pas plu.");
      setShowReviewModal(false);
  };

  const handleCommentSubmit = async () => {
      if(!order || !commentText) return;
      await DatabaseService.confirmReceipt(order.id, {
          productOpinion: commentText,
          serviceOpinion: '',
          storeRating: 5,
          deliveryRating: 5,
          submittedAt: new Date().toISOString()
      });
      alert("Merci pour votre commentaire !");
      setShowCommentModal(false);
      const updated = await DatabaseService.getOrderById(order.shortId);
      if(updated) setOrder(updated);
  };

  // --- PROGRESS LOGIC ---
  const localSteps = [
      { id: 1, label: OrderStatus.NEW, icon: Package }, 
      { id: 2, label: OrderStatus.PROCESSING, icon: Clock }, 
      { id: 3, label: OrderStatus.IN_TRANSIT, icon: Truck }, 
      { id: 4, label: OrderStatus.OUT_FOR_DELIVERY, icon: MapPin }, 
      { id: 5, label: OrderStatus.READY, icon: Store }, 
      { id: 6, label: OrderStatus.DELIVERED, icon: CheckCircle }
  ];

  // Specific steps for the Return Lifecycle
  const returnSteps = [
      { id: 1, label: 'Demande envoyée', icon: Send, status: OrderStatus.RETURN_REQUESTED },
      { id: 2, label: 'Validé par l\'agence', icon: Check, status: OrderStatus.RETURN_ACCEPTED },
      { id: 3, label: 'Traitement retour', icon: RefreshCcw, status: OrderStatus.RETURN_PROCESSING },
      { id: 4, label: 'Remboursé', icon: Ticket, status: OrderStatus.REFUNDED }
  ];

  const getLocalStepIndex = (status: OrderStatus) => {
      const mapping: Record<string, number> = {
          [OrderStatus.NEW]: 0, 
          [OrderStatus.PROCESSING]: 1, 
          [OrderStatus.IN_TRANSIT]: 2, 
          [OrderStatus.OUT_FOR_DELIVERY]: 3, 
          [OrderStatus.READY]: 4, 
          [OrderStatus.DELIVERED]: 5
      };
      return mapping[status] ?? 0;
  };

  const getReturnStepIndex = (status: OrderStatus) => {
      if (status === OrderStatus.RETURN_REQUESTED) return 0;
      if (status === OrderStatus.RETURN_ACCEPTED) return 1;
      if (status === OrderStatus.RETURN_PROCESSING) return 2;
      if (status === OrderStatus.REFUNDED) return 3;
      return 0;
  };

  const intlSteps = [
      { id: 1, label: 'Reçu Origine', icon: Package, statusKey: 'RECEIVED_ORIGIN' },
      { id: 2, label: 'Douane Export', icon: FileText, statusKey: 'CUSTOMS_CLEARANCE' },
      { id: 3, label: 'Vol / Transit', icon: Plane, statusKey: 'IN_FLIGHT' },
      { id: 4, label: 'Arrivé Dest.', icon: Globe, statusKey: 'ARRIVED_DESTINATION' },
      { id: 5, label: 'Dispo Retrait', icon: Box, statusKey: 'AVAILABLE_PICKUP' },
      { id: 6, label: 'Livré', icon: CheckCircle, statusKey: 'DELIVERED' }
  ];

  const getIntlStepIndex = (status: string) => {
      const mapping: Record<string, number> = {
          'RECEIVED_ORIGIN': 0, 'CUSTOMS_CLEARANCE': 1, 'IN_FLIGHT': 2, 
          'ARRIVED_DESTINATION': 3, 'AVAILABLE_PICKUP': 4, 'DELIVERED': 5
      };
      return mapping[status] ?? 0;
  };

  const isReturnActive = order && (
      order.status === OrderStatus.RETURN_REQUESTED || 
      order.status === OrderStatus.RETURN_ACCEPTED || 
      order.status === OrderStatus.RETURN_PROCESSING || 
      order.status === OrderStatus.REFUNDED
  );

  const currentStepIndex = order 
    ? (isReturnActive ? getReturnStepIndex(order.status) : getLocalStepIndex(order.status))
    : shipment 
        ? getIntlStepIndex(shipment.status)
        : 0;

  useEffect(() => {
      if ((order && order.status !== OrderStatus.CANCELLED) || shipment) {
          const maxSteps = order ? (isReturnActive ? returnSteps.length : localSteps.length) : intlSteps.length;
          const percentage = (currentStepIndex / (maxSteps - 1)) * 100;
          const timer = setTimeout(() => setProgressWidth(percentage), 150);
          return () => clearTimeout(timer);
      } else {
          setProgressWidth(0);
      }
  }, [currentStepIndex, order, shipment, isReturnActive]);

  const canCancel = order && [OrderStatus.NEW, OrderStatus.PROCESSING, OrderStatus.IN_TRANSIT].includes(order.status);
  const isDelivered = order && order.status === OrderStatus.DELIVERED;

  // Check return window (10 days)
  const isReturnWindowOpen = useMemo(() => {
      if (!order || order.status !== OrderStatus.DELIVERED) return false;
      if (!order.deliveredAt) return true; 
      
      const deliveryDate = new Date(order.deliveredAt);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - deliveryDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      
      return diffDays <= 10;
  }, [order]);

  const unreadNotifCount = orderNotifications.filter(n => !n.read).length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-12 w-full overflow-x-hidden pb-24 md:pb-12 relative">
      <div className="flex justify-between items-center mb-6">
          <button onClick={() => navigate('/')} className="md:hidden flex items-center gap-2 text-gray-500 font-medium">
             <ArrowLeft size={18} /> Retour
          </button>
          
          {/* Synchronized Notification Bell */}
          {order && (
              <div className="relative ml-auto">
                  <button 
                    onClick={() => setShowNotifDrawer(!showNotifDrawer)} 
                    className="p-2 bg-white rounded-full shadow-sm border border-gray-100 hover:bg-gray-50 relative"
                  >
                      <Bell size={24} className="text-gray-700" />
                      {unreadNotifCount > 0 && (
                          <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                      )}
                  </button>
                  {showNotifDrawer && (
                      <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-scale-in">
                          <div className="p-3 border-b bg-gray-50 font-bold text-xs text-gray-700 flex justify-between items-center">
                              <span>Notifs Commande {order.shortId}</span>
                              <button onClick={() => setShowNotifDrawer(false)}><X size={14}/></button>
                          </div>
                          <div className="max-h-60 overflow-y-auto">
                              {orderNotifications.length === 0 ? (
                                  <div className="p-4 text-center text-xs text-gray-400">Aucune notification pour cette commande.</div>
                              ) : orderNotifications.map(n => (
                                  <div key={n.id} onClick={() => markAsRead(n.id)} className={`p-3 border-b hover:bg-gray-50 cursor-pointer ${!n.read ? 'bg-blue-50/50' : ''}`}>
                                      <p className="text-xs font-bold text-gray-800">{n.title}</p>
                                      <p className="text-[10px] text-gray-500">{n.message}</p>
                                      <p className="text-[9px] text-gray-400 mt-1 text-right">{new Date(n.createdAt).toLocaleTimeString()}</p>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}
              </div>
          )}
      </div>

      <div className="text-center mb-8">
        <h1 className="text-2xl md:text-4xl font-extrabold text-gray-900 mb-2">Centre de Suivi</h1>
        <p className="text-sm md:text-base text-gray-500 max-w-md mx-auto">Suivez vos commandes et gérez vos réceptions en temps réel.</p>
      </div>

      {/* Tracking Type Tabs */}
      <div className="flex justify-center mb-8">
          <div className="bg-gray-100 p-1 rounded-xl inline-flex">
              <button 
                onClick={() => setTrackingType('LOCAL')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${trackingType === 'LOCAL' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}
              >
                  Commande Locale
              </button>
              <button 
                onClick={() => setTrackingType('INTERNATIONAL')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${trackingType === 'INTERNATIONAL' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                  Colis International
              </button>
          </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 md:p-6 rounded-2xl shadow-xl border border-gray-100 mb-12 animate-scale-in">
        <form onSubmit={handleTrack} className="flex items-center gap-2 md:gap-4">
          <div className="relative flex-grow">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                {trackingType === 'LOCAL' ? <Package className="text-gray-400" size={20} /> : <Globe className="text-gray-400" size={20} />}
             </div>
             <input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                placeholder={trackingType === 'LOCAL' ? "ID COMMANDE (ex: 7X89A2)" : "CODE DE SUIVI (ex: TR-8899-CI)"}
                className="w-full pl-10 pr-4 py-3 md:py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/50 text-base md:text-lg font-mono uppercase tracking-widest transition-all focus:bg-white text-gray-900 placeholder-gray-400 outline-none"
              />
          </div>
          <button 
            type="submit" 
            disabled={loading || !searchId}
            className="bg-primary text-white p-3 md:p-4 rounded-xl shadow-lg shadow-primary/20 hover:bg-emerald-700 transition-all active:scale-95 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="animate-spin" size={24} /> : <Search size={24} />}
          </button>
        </form>
        {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm text-center font-medium border border-red-100 flex items-center justify-center gap-2 animate-fade-in">
                <AlertTriangle size={16}/> {error}
            </div>
        )}
      </div>

      {/* --- LOCAL ORDER RESULT --- */}
      {order && trackingType === 'LOCAL' && (
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden animate-slide-up border border-gray-100 mb-12 relative">
          
          <div className="bg-secondary p-5 md:p-6 text-white flex justify-between items-center relative overflow-hidden">
             <div className="relative z-10">
                <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">Commande N°</p>
                <div className="flex items-center gap-3">
                    <p className="font-mono text-3xl font-bold tracking-widest">{order.shortId}</p>
                    <button 
                      onClick={() => copyToClipboard(order.shortId)} 
                      className="p-2 hover:bg-white/20 rounded-full transition-colors" 
                      title="Copier le code"
                    >
                        {copied ? <CheckCircle size={20} className="text-green-400" /> : <Copy size={20} />}
                    </button>
                </div>
             </div>
             <div className="relative z-10 text-right">
                <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">Total</p>
                <p className="font-bold text-2xl">{order.total.toLocaleString()} F</p>
             </div>
          </div>
          
          <div className="p-5 md:p-8">
             
             {/* TIMELINES */}
             {order.status !== OrderStatus.CANCELLED && (
                <div className="mb-10 overflow-x-auto pb-4">
                    {isReturnActive ? (
                        /* RETURN TIMELINE */
                        <div>
                            <h3 className="text-red-600 font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wide"><RefreshCcw size={16}/> Suivi du Retour</h3>
                            <div className="flex items-center justify-between min-w-[500px] relative">
                                <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-red-100 -z-10"></div>
                                <div className="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 bg-red-500 -z-10 transition-all duration-1000 ease-out" style={{ width: `${progressWidth}%` }}></div>
                                {returnSteps.map((step, idx) => {
                                    const isActive = idx <= currentStepIndex;
                                    return (
                                        <div key={step.id} className="flex flex-col items-center gap-2">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all z-10 ${isActive ? 'bg-red-500 border-red-500 text-white scale-110' : 'bg-white border-red-100 text-red-200'}`}>
                                                <step.icon size={18} strokeWidth={3} />
                                            </div>
                                            <span className={`text-xs font-bold text-center w-24 ${isActive ? 'text-red-700' : 'text-gray-400'}`}>{step.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        /* DELIVERY TIMELINE */
                        <div className="flex items-center justify-between min-w-[600px] relative">
                            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-200 -z-10"></div>
                            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 bg-primary -z-10 transition-all duration-1000 ease-out" style={{ width: `${progressWidth}%` }}></div>
                            {localSteps.map((step, idx) => {
                                const isActive = idx <= currentStepIndex;
                                return (
                                    <div key={step.id} className="flex flex-col items-center gap-2">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all z-10 ${isActive ? 'bg-primary border-primary text-white scale-110' : 'bg-white border-gray-300 text-gray-300'}`}>
                                            <step.icon size={18} strokeWidth={3} />
                                        </div>
                                        <span className={`text-xs font-bold text-center w-24 ${isActive ? 'text-primary' : 'text-gray-400'}`}>{step.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
             )}
             
             {/* CANCELLED STATE */}
             {order.status === OrderStatus.CANCELLED && (
                 <div className="mb-8 bg-red-50 border border-red-200 rounded-xl p-4 text-center text-red-700 font-bold flex items-center justify-center gap-2">
                    <XCircle size={24} /> COMMANDE ANNULÉE
                </div>
             )}

             {/* RETURN STATUS DETAIL ALERTS */}
             {order.status === OrderStatus.RETURN_ACCEPTED && (
                 <div className="mb-8 bg-blue-50 border border-blue-200 rounded-xl p-6 text-center animate-fade-in shadow-sm">
                     <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                         <Store size={32} />
                     </div>
                     <h3 className="text-xl font-bold text-blue-800 uppercase tracking-wide mb-2">Retour Validé</h3>
                     <p className="text-sm text-blue-700 font-medium">Veuillez déposer le colis à l'agence partenaire pour inspection.</p>
                 </div>
             )}

             {/* REFUNDED VOUCHER */}
             {order.status === OrderStatus.REFUNDED && order.refundCouponCode && !order.couponRedeemed && (
                 <div className="mb-8 bg-green-50 border border-green-200 rounded-xl p-6 text-center shadow-md animate-scale-in">
                     <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                         <Ticket size={32} />
                     </div>
                     <h3 className="text-2xl font-black text-green-800 uppercase tracking-wide mb-1">Remboursement Effectué</h3>
                     <p className="text-sm text-green-600 mb-6">Voici votre bon d'achat valable immédiatement.</p>
                     
                     <div className="bg-white border-2 border-dashed border-green-300 p-4 rounded-lg inline-block mb-6 relative">
                         <p className="text-xs text-gray-400 uppercase font-bold tracking-widest">Code Coupon</p>
                         <p className="text-3xl font-mono font-black text-gray-800 tracking-widest">{order.refundCouponCode}</p>
                         <p className="text-sm font-bold text-green-600 mt-1">Valeur: {order.refundCouponValue?.toLocaleString()} F</p>
                     </div>

                     <div>
                         <button 
                            onClick={handleRedeemCoupon}
                            className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-green-700 transition-all active:scale-95 flex items-center gap-2 mx-auto"
                         >
                             <CheckCircle size={20}/> Récupérer mon bon
                         </button>
                         <p className="text-[10px] text-gray-400 mt-2 max-w-md mx-auto">
                             En cliquant sur "Récupérer", vous confirmez la réception. Ce code de suivi sera ensuite archivé.
                         </p>
                     </div>
                 </div>
             )}

             {/* COLLECTION CODE DISPLAY (Only if normal flow READY) */}
             {order.status === OrderStatus.READY && order.collectionCode && (
                 <div className="bg-purple-600 text-white rounded-xl p-6 text-center shadow-lg mb-8 animate-scale-in">
                     <Lock size={32} className="mx-auto mb-2 opacity-80" />
                     <h3 className="text-xl font-bold uppercase tracking-wider mb-2">Code de Retrait</h3>
                     <div className="text-5xl font-mono font-black tracking-[0.2em] mb-2">{order.collectionCode}</div>
                     <p className="text-sm opacity-80">Communiquez ce code à l'agence pour récupérer votre colis.</p>
                 </div>
             )}
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Details */}
                 <div className="bg-gray-50 p-4 rounded-xl h-fit">
                     <h3 className="font-bold text-gray-900 mb-2">Détails Livraison</h3>
                     <div className="text-sm text-gray-600 space-y-1">
                         <p><span className="font-medium">Client:</span> {order.customer.fullName}</p>
                         <p><span className="font-medium">Destination:</span> {order.customer.city} ({order.customer.deliveryMethod === 'HOME' ? 'Domicile' : 'Point Relais'})</p>
                         <p><span className="font-medium">Articles:</span> {order.items.length}</p>
                     </div>
                 </div>

                 {/* DEDICATED MESSAGING ACCESS */}
                 {partner && (
                     <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
                         <div className="flex justify-between items-center">
                             <div className="flex items-center gap-3">
                                <div className="bg-blue-200 p-3 rounded-full relative">
                                    <Store size={20} className="text-blue-700"/>
                                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900 text-sm">{partner.name}</p>
                                    <p className="text-xs text-blue-600">Agence Partenaire</p>
                                </div>
                             </div>
                             <button 
                                onClick={() => { setIsChatOpen(true); setHasUnreadMessage(false); }}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-700 transition-all font-bold text-sm flex items-center gap-2 relative overflow-visible"
                             >
                                <MessageCircle size={18} />
                                Discuter
                                {hasUnreadMessage && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}
                             </button>
                         </div>
                     </div>
                 )}
             </div>

             {/* ACTIONS BUTTONS */}
             <div className="mt-8 pt-6 border-t border-gray-100 space-y-3">
                 
                 {/* POST-RECEIPT BUTTONS (Displayed when DELIVERED) */}
                 {isDelivered && !isReturnActive && (
                     <div className="space-y-3 animate-slide-up">
                         <div className="grid grid-cols-2 gap-2">
                             <button onClick={() => setShowReviewModal(true)} className="flex flex-col items-center justify-center bg-gray-50 hover:bg-yellow-50 text-gray-700 hover:text-yellow-600 p-3 rounded-xl border border-gray-200 transition-colors shadow-sm">
                                 <Star size={20} className="mb-1"/>
                                 <span className="text-xs font-bold">Avis</span>
                             </button>
                             <button onClick={() => setShowCommentModal(true)} className="flex flex-col items-center justify-center bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-600 p-3 rounded-xl border border-gray-200 transition-colors shadow-sm">
                                 <MessageCircle size={20} className="mb-1"/>
                                 <span className="text-xs font-bold">Commentaire</span>
                             </button>
                         </div>
                         
                         {isReturnWindowOpen && (
                             <button 
                                onClick={() => setShowReturnModal(true)} 
                                className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
                             >
                                 <AlertTriangle size={18} />
                                 Retourner le produit
                             </button>
                         )}
                     </div>
                 )}

                 {/* CANCEL BUTTON */}
                 {canCancel && (
                     <button 
                        onClick={() => setShowCancelModal(true)}
                        className="w-full py-4 bg-white border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 hover:border-red-300 transition-colors flex items-center justify-center gap-2 shadow-sm"
                     >
                         <XCircle size={20} /> Annuler la commande
                     </button>
                 )}
             </div>
          </div>
        </div>
      )}

      {/* ... [Chat, Cancel, Review, Comment Modals remain unchanged] ... */}
      
      {/* --- DEDICATED MESSAGING PAGE (OVERLAY) --- */}
      {isChatOpen && partner && order && (
          <div className="fixed inset-0 bg-gray-100 z-[100] flex flex-col animate-slide-up">
              {/* Header */}
              <div className="bg-white p-4 shadow-sm flex items-center justify-between sticky top-0 z-10">
                  <div className="flex items-center gap-3">
                      <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                          <ChevronLeft size={24} className="text-gray-600"/>
                      </button>
                      <div className="flex items-center gap-2">
                          <div className="relative">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold">
                                  {partner.name.substring(0,2).toUpperCase()}
                              </div>
                              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                          </div>
                          <div>
                              <h3 className="font-bold text-gray-900">{partner.name}</h3>
                              <p className="text-xs text-gray-500">Commande #{order.shortId}</p>
                          </div>
                      </div>
                  </div>
              </div>

              {/* Chat Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                  {chatHistory.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-50">
                          <MessageCircle size={48} className="mb-2"/>
                          <p>Commencez la discussion...</p>
                      </div>
                  )}
                  {chatHistory.map((msg) => {
                      const guestId = `guest_${order.shortId}`;
                      const isMe = msg.senderId === guestId;
                      return (
                          <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                              <div 
                                className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm relative ${
                                    isMe 
                                    ? 'bg-blue-600 text-white rounded-br-sm' 
                                    : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100'
                                }`}
                              >
                                  <p>{msg.content}</p>
                                  <span className={`text-[9px] block mt-1 text-right ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                                      {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                  </span>
                              </div>
                          </div>
                      );
                  })}
                  <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-200 flex gap-2 items-center safe-area-pb">
                  <input 
                      type="text" 
                      className="flex-1 bg-gray-100 border-0 rounded-full px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                      placeholder="Écrivez votre message..."
                      value={chatMessage}
                      onChange={e => setChatMessage(e.target.value)}
                  />
                  <button 
                    type="submit" 
                    disabled={!chatMessage.trim()}
                    className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                  >
                      <Send size={20} />
                  </button>
              </form>
          </div>
      )}

      {/* --- CANCELLATION MODAL --- */}
      {showCancelModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-scale-in text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                      <AlertTriangle size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Annuler la commande ?</h3>
                  <p className="text-gray-500 text-sm mb-6">Êtes-vous sûr de vouloir annuler cette commande ? Cette action est irréversible.</p>
                  <div className="flex gap-3">
                      <button onClick={() => setShowCancelModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200">Non</button>
                      <button onClick={confirmCancel} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-md">Oui, Annuler</button>
                  </div>
              </div>
          </div>
      )}

      {/* --- REVIEW MODAL --- */}
      {showReviewModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-scale-in text-center">
                  <h3 className="text-lg font-bold text-gray-900 mb-6">Votre avis compte</h3>
                  <div className="flex justify-center gap-6 mb-6">
                      <button onClick={() => handleLikeDislike(true)} className="flex flex-col items-center gap-2 text-gray-400 hover:text-green-600 hover:scale-110 transition-all">
                          <ThumbsUp size={48} />
                          <span className="font-bold text-sm">J'aime</span>
                      </button>
                      <button onClick={() => handleLikeDislike(false)} className="flex flex-col items-center gap-2 text-gray-400 hover:text-red-600 hover:scale-110 transition-all">
                          <ThumbsDown size={48} />
                          <span className="font-bold text-sm">Je n'aime pas</span>
                      </button>
                  </div>
                  <button onClick={() => setShowReviewModal(false)} className="text-gray-400 text-sm hover:text-gray-600">Fermer</button>
              </div>
          </div>
      )}

      {/* --- COMMENT MODAL --- */}
      {showCommentModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scale-in">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold">Laissez un commentaire</h3>
                      <button onClick={() => setShowCommentModal(false)}><X size={20}/></button>
                  </div>
                  <textarea 
                      className="w-full border rounded-xl p-3 h-32 outline-none focus:border-primary resize-none bg-gray-50"
                      placeholder="Votre expérience avec la livraison et le produit..."
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                  ></textarea>
                  <button onClick={handleCommentSubmit} className="w-full bg-primary text-white py-3 rounded-xl font-bold mt-4 hover:bg-emerald-700">Envoyer</button>
              </div>
          </div>
      )}

      {/* --- RETURN MODAL --- */}
      {showReturnModal && order && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6 border-b pb-4">
                      <h3 className="text-xl font-bold text-red-600 flex items-center gap-2"><AlertTriangle /> Demande de Retour</h3>
                      <button onClick={() => setShowReturnModal(false)} className="p-1 hover:bg-gray-100 rounded-full"><XCircle size={24}/></button>
                  </div>
                  
                  <div className="space-y-4">
                      <div className="bg-gray-50 p-3 rounded-lg text-sm">
                          <p><strong>Commande:</strong> {order.shortId}</p>
                          <p><strong>Produit(s):</strong> {order.items.map(i => i.name).join(', ')}</p>
                      </div>

                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Motif du retour</label>
                          <select 
                            className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:border-red-500"
                            value={returnReason}
                            onChange={e => setReturnReason(e.target.value)}
                          >
                              <option value="DEFECT">Produit défectueux / Abîmé</option>
                              <option value="WRONG_ITEM">Erreur de produit</option>
                              <option value="COLOR_SIZE">Erreur de taille / couleur</option>
                              <option value="MISSING_PART">Pièce manquante</option>
                              <option value="OTHER">Autre raison</option>
                          </select>
                      </div>

                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Description détaillée</label>
                          <textarea 
                            className="w-full border border-gray-300 rounded-lg p-3 h-24 outline-none focus:border-red-500 text-sm"
                            placeholder="Expliquez le problème..."
                            value={returnDesc}
                            onChange={e => setReturnDesc(e.target.value)}
                          ></textarea>
                      </div>

                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Photo du produit (Preuve)</label>
                          <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
                              <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handlePhotoUpload} />
                              {returnPhoto ? (
                                  <div className="flex flex-col items-center">
                                      <img src={returnPhoto} alt="Preuve" className="h-24 w-auto rounded shadow-sm mb-2" />
                                      <span className="text-xs text-green-600 font-bold">Image chargée</span>
                                  </div>
                              ) : (
                                  <div className="flex flex-col items-center text-gray-400">
                                      <Camera size={32} className="mb-2" />
                                      <span className="text-xs">Cliquez pour ajouter une photo</span>
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>

                  <div className="mt-8 flex gap-3">
                      <button onClick={() => setShowReturnModal(false)} className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl">Annuler</button>
                      <button onClick={handleReturnSubmit} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-md">Envoyer la demande</button>
                  </div>
              </div>
          </div>
      )}

      {/* Product Suggestions */}
      <div className="border-t border-gray-100 pt-8">
         <h2 className="text-xl font-bold text-gray-900 mb-6 px-1">Ces produits pourraient vous plaire</h2>
         <div className="grid grid-cols-2 gap-3 md:gap-6">
            {suggestedProducts.map((product, index) => (
               <SuggestionCard key={product.id} product={product} navigate={navigate} addToCart={addToCart} index={index} />
            ))}
         </div>
      </div>
    </div>
  );
};

const SuggestionCard: React.FC<{ product: any, navigate: any, addToCart: any, index: number }> = ({ product, navigate, addToCart, index }) => {
  const [showAdded, setShowAdded] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
      e.stopPropagation();
      addToCart(product);
      setShowAdded(true);
      setTimeout(() => setShowAdded(false), 2000);
  };

  return (
    <div 
      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group flex flex-col h-full relative border border-gray-100 animate-slide-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div 
        className="relative aspect-[4/5] overflow-hidden bg-gray-100 cursor-pointer"
        onClick={() => navigate(`/product/${product.id}`)}
      >
        <img 
          src={product.images && product.images.length > 0 ? product.images[0] : ''} 
          alt={product.name} 
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
      </div>
      
      <div className="p-3 flex flex-col flex-grow">
        <h3 onClick={() => navigate(`/product/${product.id}`)} className="text-xs font-bold text-gray-900 mb-2 line-clamp-2 cursor-pointer leading-snug">
          {product.name}
        </h3>
        
        <div className="mt-auto flex items-end justify-between gap-2 relative">
          <div className="flex flex-col">
             <span className="text-sm font-black text-primary block">
               {product.price.toLocaleString('fr-CI')} F
             </span>
             {product.originalPrice && (
                 <span className="text-[10px] text-gray-400 line-through">
                     {product.originalPrice.toLocaleString('fr-CI')} F
                 </span>
             )}
          </div>
          
          {showAdded && (
              <span className="absolute bottom-full mb-2 right-0 bg-green-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg z-20 whitespace-nowrap animate-fade-in flex items-center gap-1">
                  <CheckCircle size={10}/> Ajouté
              </span>
          )}

          <button
            onClick={handleAddToCart}
            disabled={product.stock <= 0}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-md active:scale-90 touch-manipulation ${
              product.stock > 0 
              ? 'bg-secondary text-white hover:bg-primary' 
              : 'bg-gray-100 text-gray-300 cursor-not-allowed'
            }`}
          >
            <ShoppingBag size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
