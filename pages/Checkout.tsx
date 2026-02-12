
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { DatabaseService, generateId } from '../services/mockDatabase';
import { User, PartnerType, Order, OrderStatus } from '../types';
import { useNavigate } from 'react-router-dom';
import { MapPin, Truck, CheckCircle, Store, AlertCircle, Banknote, Smartphone, Lock, Loader2, ArrowRight, Copy, Check, Ticket, X } from 'lucide-react';

const CITIES = ['Abidjan', 'Yamoussoukro', 'Bouaké', 'San-Pédro', 'Korhogo', 'Daloa'];
const COMMUNES_ABIDJAN = ['Cocody', 'Yopougon', 'Abobo', 'Plateau', 'Marcory', 'Koumassi', 'Port-Bouët', 'Adjame'];

export const Checkout: React.FC = () => {
  const { cart, cartTotal, clearCart, siteConfig } = useApp();
  const navigate = useNavigate();
  const [partners, setPartners] = useState<User[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    city: 'Abidjan',
    commune: 'Cocody',
    address: '',
    deliveryMethod: 'HOME' as 'HOME' | 'PICKUP',
    pickupPointId: ''
  });

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<'CASH_ON_DELIVERY' | 'MOBILE_MONEY'>('CASH_ON_DELIVERY');
  const [mmPhoneNumber, setMmPhoneNumber] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isPaymentValidated, setIsPaymentValidated] = useState(false);

  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string, amount: number, message: string } | null>(null);
  const [couponMessage, setCouponMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [isCheckingCoupon, setIsCheckingCoupon] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState<Order | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Load Pickup Points (Agences / Partenaires)
    const loadPartners = async () => {
      const users = await DatabaseService.getUsers();
      // Filter users who are PARTNERS (Agencies)
      const agencies = users.filter(u => u.role === 'PARTNER' && u.isActive);
      setPartners(agencies);
    };
    loadPartners();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'phone') {
        // Validation: Digits only, max 10
        if (!/^\d*$/.test(value)) return;
        if (value.length > 10) return;
    }
    
    if (name === 'fullName') {
        // Validation: Letters, spaces, and accents only
        if (!/^[a-zA-Z\s\u00C0-\u00FF]*$/.test(value)) return;
    }

    setFormData({ ...formData, [name]: value });
  };

  const calculateDeliveryFee = () => {
    if (formData.deliveryMethod === 'PICKUP') return 0;
    
    if (siteConfig && siteConfig.deliveryRules) {
        const cityRule = siteConfig.deliveryRules.find(r => r.active && r.zoneName.toLowerCase() === formData.city.toLowerCase());
        if (cityRule) return cityRule.price;

        if (formData.city !== 'Abidjan') {
            const interiorRule = siteConfig.deliveryRules.find(r => r.active && r.zoneName.toLowerCase() === 'intérieur');
            if (interiorRule) return interiorRule.price;
        }

        if (formData.city === 'Abidjan') {
             const abjRule = siteConfig.deliveryRules.find(r => r.active && r.zoneName.toLowerCase() === 'abidjan');
             if (abjRule) return abjRule.price;
        }
    }

    if (formData.city === 'Abidjan') return 1500;
    return 3000;
  };

  const deliveryFee = calculateDeliveryFee();
  const subTotal = cartTotal + deliveryFee;
  // Final Total Logic: cannot be less than 0
  const totalAmount = Math.max(0, subTotal - (appliedCoupon?.amount || 0));

  const handleApplyCoupon = async () => {
      if (!couponCode.trim()) return;
      setIsCheckingCoupon(true);
      setCouponMessage(null);

      const result = await DatabaseService.validateCoupon(couponCode);
      
      if (result.isValid) {
          setAppliedCoupon({ code: couponCode.trim().toUpperCase(), amount: result.value, message: result.message });
          setCouponMessage({ text: result.message || "Coupon appliqué avec succès !", type: 'success' });
          setCouponCode('');
      } else {
          setCouponMessage({ text: result.message || "Coupon invalide.", type: 'error' });
      }
      setIsCheckingCoupon(false);
  };

  const removeCoupon = () => {
      setAppliedCoupon(null);
      setCouponMessage(null);
  };

  const handleMobileMoneyPayment = async () => {
    if (!mmPhoneNumber || mmPhoneNumber.length < 10) {
      alert("Veuillez entrer un numéro de téléphone valide (10 chiffres).");
      return;
    }
    setIsProcessingPayment(true);
    await new Promise(resolve => setTimeout(resolve, 2500));
    setIsProcessingPayment(false);
    setIsPaymentValidated(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    
    // Strict Length Validation for Submit
    if (formData.phone.length !== 10) {
        alert("Le numéro de téléphone doit comporter exactement 10 chiffres.");
        return;
    }

    if (paymentMethod === 'MOBILE_MONEY' && !isPaymentValidated && totalAmount > 0) {
      alert("Veuillez valider le paiement Mobile Money avant de confirmer la commande.");
      return;
    }

    if (formData.deliveryMethod === 'PICKUP' && !formData.pickupPointId) {
        alert("Veuillez sélectionner une agence point relais.");
        return;
    }

    setIsSubmitting(true);

    try {
      let assignedPartnerId: string | undefined = undefined;
      
      if (formData.deliveryMethod === 'PICKUP') {
        assignedPartnerId = formData.pickupPointId;
      } else {
        const locationKey = formData.city === 'Abidjan' ? formData.commune : formData.city;
        const responsiblePartner = partners.find(p => p.assignedZone === locationKey);
        assignedPartnerId = responsiblePartner?.id;
      }

      // Update: Commission is now 1.5% (0.015)
      const commissionAmount = assignedPartnerId ? cartTotal * 0.015 : 0;

      const newOrder: Order = {
        id: generateId(),
        shortId: Math.random().toString(36).substring(2, 8).toUpperCase(),
        createdAt: new Date().toISOString(),
        customer: {
          ...formData,
          commune: formData.city === 'Abidjan' ? formData.commune : undefined,
          pickupPointId: formData.pickupPointId || undefined
        },
        items: [...cart],
        total: totalAmount,
        status: formData.deliveryMethod === 'PICKUP' ? OrderStatus.READY : OrderStatus.NEW, // Pickup orders start as READY if stock confirms (simplified here)
        statusHistory: [{ status: formData.deliveryMethod === 'PICKUP' ? OrderStatus.READY : OrderStatus.NEW, date: new Date().toISOString(), note: 'Commande créée' }],
        assignedPartnerId,
        commissionAmount,
        // If total is 0 due to coupon, consider it paid
        isPaid: totalAmount === 0 ? true : (paymentMethod === 'MOBILE_MONEY' && isPaymentValidated),
        paymentMethod: paymentMethod,
        deliveryValidatedByPartner: false,
        customerConfirmedReceipt: false,
        // Coupon Data
        usedCouponCode: appliedCoupon?.code,
        discountAmount: appliedCoupon?.amount,
        // Generate Collection Code if Pickup
        collectionCode: formData.deliveryMethod === 'PICKUP' ? Math.floor(1000 + Math.random() * 9000).toString() : undefined
      };

      await DatabaseService.createOrder(newOrder);
      clearCart();
      setOrderComplete(newOrder);
      
    } catch (error) {
      console.error(error);
      alert("Erreur lors de la commande.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = () => {
      if (orderComplete) {
          navigator.clipboard.writeText(orderComplete.shortId);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
      }
  };

  if (orderComplete) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4 animate-scale-in">
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-2xl border border-gray-100 max-w-lg w-full text-center">
          <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
            <CheckCircle className="text-green-500" size={48} strokeWidth={3} />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Merci pour votre commande !</h2>
          <p className="text-gray-500 mb-8">Nous préparons votre colis avec soin.</p>
          
          <div className="bg-gray-50 p-6 rounded-2xl mb-8 border border-gray-100 relative group">
             <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Numéro de suivi</p>
             <div className="flex items-center justify-center gap-3">
                <p className="font-mono text-4xl font-bold text-secondary tracking-widest">{orderComplete.shortId}</p>
                <button 
                    onClick={copyToClipboard}
                    className="p-2 rounded-full hover:bg-gray-200 transition-colors text-gray-500"
                    title="Copier le code"
                >
                    {copied ? <Check size={20} className="text-green-600"/> : <Copy size={20}/>}
                </button>
             </div>
             {orderComplete.collectionCode && (
                 <div className="mt-4 pt-4 border-t border-gray-200">
                     <p className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-1">Code de Retrait Agence</p>
                     <p className="font-mono text-2xl font-bold text-purple-800 tracking-widest">{orderComplete.collectionCode}</p>
                 </div>
             )}
             {copied && <span className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-green-600 font-bold">Copié !</span>}
          </div>

          <div className="space-y-3">
             <button onClick={() => navigate('/tracking')} className="w-full bg-secondary text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl">
               Suivre ma commande
             </button>
             <button onClick={() => navigate('/')} className="w-full text-gray-500 py-2 hover:text-gray-900 font-medium">
               Retour à la boutique
             </button>
          </div>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-4">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Store className="text-gray-400" size={32}/>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Votre panier est vide</h2>
        <p className="text-gray-500 mb-6">Trouvez votre bonheur dans notre catalogue.</p>
        <button onClick={() => navigate('/')} className="bg-primary text-white px-8 py-3 rounded-full font-bold hover:bg-emerald-700 shadow-lg">
            Commencer les achats
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8">
            <div className="flex items-center gap-3 mb-8">
               <div className="bg-primary/10 p-3 rounded-xl">
                 <Truck className="text-primary" size={24} />
               </div>
               <h1 className="text-3xl font-bold text-gray-900">Finalisation</h1>
            </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-soft border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-3">
                <span className="bg-gray-900 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-lg">1</span>
                Informations Personnelles
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Nom complet</label>
                  <input required name="fullName" value={formData.fullName} onChange={handleInputChange} type="text" className="w-full border-gray-200 bg-gray-50 rounded-xl focus:ring-2 focus:ring-primary focus:bg-white text-gray-900 placeholder-gray-400 p-3 transition-all outline-none" placeholder="Ex: Kouassi Jean" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Téléphone (10 chiffres)</label>
                  <input required name="phone" value={formData.phone} onChange={handleInputChange} type="tel" maxLength={10} className="w-full border-gray-200 bg-gray-50 rounded-xl focus:ring-2 focus:ring-primary focus:bg-white text-gray-900 placeholder-gray-400 p-3 transition-all outline-none" placeholder="Ex: 0707000000" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-soft border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-3">
                <span className="bg-gray-900 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-lg">2</span>
                Mode de Livraison
              </h3>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <button type="button" onClick={() => setFormData({...formData, deliveryMethod: 'HOME'})} className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-3 transition-all duration-300 ${formData.deliveryMethod === 'HOME' ? 'border-primary bg-primary/5 text-primary shadow-md' : 'border-gray-100 text-gray-500 hover:border-gray-300 hover:bg-gray-50'}`}>
                  <Truck size={28} />
                  <span className="font-bold">À Domicile</span>
                </button>
                <button type="button" onClick={() => setFormData({...formData, deliveryMethod: 'PICKUP'})} className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-3 transition-all duration-300 ${formData.deliveryMethod === 'PICKUP' ? 'border-primary bg-primary/5 text-primary shadow-md' : 'border-gray-100 text-gray-500 hover:border-gray-300 hover:bg-gray-50'}`}>
                  <Store size={28} />
                  <span className="font-bold">Point Relais (Agence)</span>
                </button>
              </div>

              <div className="animate-fade-in">
              {formData.deliveryMethod === 'HOME' ? (
                <div className="space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Ville</label>
                      <select name="city" value={formData.city} onChange={handleInputChange} className="w-full border-gray-200 bg-gray-50 rounded-xl p-3 focus:ring-2 focus:ring-primary text-gray-900 outline-none">
                        {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    {formData.city === 'Abidjan' && (
                       <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Commune</label>
                        <select name="commune" value={formData.commune} onChange={handleInputChange} className="w-full border-gray-200 bg-gray-50 rounded-xl p-3 focus:ring-2 focus:ring-primary text-gray-900 outline-none">
                          {COMMUNES_ABIDJAN.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    )}
                   </div>
                   <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Adresse précise / Quartier</label>
                      <input required name="address" value={formData.address} onChange={handleInputChange} type="text" className="w-full border-gray-200 bg-gray-50 rounded-xl p-3 focus:ring-2 focus:ring-primary focus:bg-white text-gray-900 placeholder-gray-400 outline-none" placeholder="Ex: Angré 8ème tranche, près de la pharmacie..." />
                   </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Sélectionner une Agence Partenaire</label>
                  <select required name="pickupPointId" value={formData.pickupPointId} onChange={handleInputChange} className="w-full border-gray-200 bg-gray-50 rounded-xl p-3 focus:ring-2 focus:ring-primary text-gray-900 outline-none">
                    <option value="">-- Choisir une agence --</option>
                    {partners.map(p => (
                      <option key={p.id} value={p.id}>
                          {p.name} - Zone: {p.assignedZone || 'Non définie'}
                      </option>
                    ))}
                  </select>
                   {partners.length === 0 ? (
                       <p className="text-xs text-red-500 mt-2 flex items-center gap-1"><AlertCircle size={12}/> Aucune agence disponible pour le moment.</p>
                   ) : (
                       <p className="text-xs text-gray-500 mt-2 flex items-center gap-1"><InfoIcon/> Le colis sera disponible au retrait dans l'agence sélectionnée.</p>
                   )}
                </div>
              )}
              </div>
            </div>

            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-soft border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-3">
                 <span className="bg-gray-900 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-lg">3</span>
                 Paiement
              </h3>
              
              <div className="space-y-4">
                 {/* COUPON SECTION */}
                 <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
                     <div className="flex items-center gap-2 mb-2 font-bold text-gray-700 text-sm">
                         <Ticket size={16} className="text-primary"/> Code Promo / Bon d'achat
                     </div>
                     {!appliedCoupon ? (
                         <div className="flex gap-2">
                             <input 
                                type="text" 
                                placeholder="Entrez votre code" 
                                className="flex-1 border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary outline-none uppercase font-mono"
                                value={couponCode}
                                onChange={e => setCouponCode(e.target.value)}
                             />
                             <button 
                                type="button" 
                                onClick={handleApplyCoupon}
                                disabled={!couponCode || isCheckingCoupon}
                                className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-900 disabled:opacity-50"
                             >
                                 {isCheckingCoupon ? <Loader2 className="animate-spin" size={16}/> : 'Appliquer'}
                             </button>
                         </div>
                     ) : (
                         <div className="flex items-center justify-between bg-green-100 border border-green-200 rounded-lg p-3 text-green-800">
                             <div className="flex flex-col">
                                <span className="font-bold flex items-center gap-1"><CheckCircle size={14}/> Coupon appliqué: {appliedCoupon.code}</span>
                                <span className="text-xs">-{appliedCoupon.amount.toLocaleString()} F ({appliedCoupon.message})</span>
                             </div>
                             <button type="button" onClick={removeCoupon} className="p-1 hover:bg-green-200 rounded-full"><X size={16}/></button>
                         </div>
                     )}
                     {couponMessage && !appliedCoupon && (
                         <div className={`mt-2 text-xs font-bold flex items-center gap-1 ${couponMessage.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                             {couponMessage.type === 'success' ? <CheckCircle size={12}/> : <AlertCircle size={12}/>}
                             {couponMessage.text}
                         </div>
                     )}
                 </div>

                 {/* Payment Methods */}
                 {totalAmount > 0 ? (
                     <>
                        <div onClick={() => { setPaymentMethod('CASH_ON_DELIVERY'); setIsPaymentValidated(false); }} className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between group ${paymentMethod === 'CASH_ON_DELIVERY' ? 'border-primary bg-primary/5 shadow-md' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}>
                            <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl transition-colors ${paymentMethod === 'CASH_ON_DELIVERY' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}><Banknote size={24} /></div>
                            <div><p className="font-bold text-gray-900 text-lg">Paiement à la livraison</p><p className="text-sm text-gray-500">Espèces à la réception du colis</p></div>
                            </div>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'CASH_ON_DELIVERY' ? 'border-primary' : 'border-gray-300'}`}>{paymentMethod === 'CASH_ON_DELIVERY' && <div className="w-3 h-3 rounded-full bg-primary"></div>}</div>
                        </div>

                        <div onClick={() => setPaymentMethod('MOBILE_MONEY')} className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col group ${paymentMethod === 'MOBILE_MONEY' ? 'border-blue-500 bg-blue-50/50 shadow-md' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}>
                            <div className="flex items-center justify-between w-full mb-2">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-xl transition-colors ${paymentMethod === 'MOBILE_MONEY' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'}`}><Smartphone size={24} /></div>
                                <div>
                                    <p className="font-bold text-gray-900 text-lg">Mobile Money</p>
                                    <div className="flex gap-2 mt-1">
                                        <span className="text-[10px] font-bold bg-white border px-2 py-0.5 rounded text-orange-600">Orange</span>
                                        <span className="text-[10px] font-bold bg-white border px-2 py-0.5 rounded text-blue-600">Wave</span>
                                        <span className="text-[10px] font-bold bg-white border px-2 py-0.5 rounded text-yellow-600">MTN</span>
                                    </div>
                                </div>
                            </div>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'MOBILE_MONEY' ? 'border-blue-500' : 'border-gray-300'}`}>{paymentMethod === 'MOBILE_MONEY' && <div className="w-3 h-3 rounded-full bg-blue-500"></div>}</div>
                            </div>

                            {paymentMethod === 'MOBILE_MONEY' && (
                                <div className="mt-4 pt-4 border-t border-blue-100 w-full animate-slide-up cursor-default" onClick={e => e.stopPropagation()}>
                                {!isPaymentValidated ? (
                                    <div className="space-y-4 max-w-sm">
                                        <p className="text-sm text-gray-600 flex items-center gap-2"><Lock size={14} /> Connexion sécurisée 256-bit</p>
                                        <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Numéro Mobile (10 chiffres)</label>
                                        <input type="tel" placeholder="0707XXXXXX" maxLength={10} className="w-full border border-gray-300 rounded-lg p-3 text-xl tracking-widest font-mono focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400 outline-none" value={mmPhoneNumber} onChange={e => { if (/^\d*$/.test(e.target.value)) setMmPhoneNumber(e.target.value); }} disabled={isProcessingPayment} />
                                        </div>
                                        <button type="button" onClick={handleMobileMoneyPayment} disabled={isProcessingPayment || mmPhoneNumber.length < 10} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30">
                                        {isProcessingPayment ? <Loader2 className="animate-spin" size={20} /> : 'Valider le paiement'}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="bg-green-100 border border-green-200 rounded-xl p-4 flex items-center gap-4 text-green-800 animate-scale-in">
                                        <div className="bg-white p-2 rounded-full shadow-sm"><CheckCircle size={24} className="text-green-600" /></div>
                                        <div><p className="font-bold">Paiement Validé avec succès !</p><p className="text-sm opacity-80">Montant reçu: {totalAmount.toLocaleString()} F</p></div>
                                    </div>
                                )}
                                </div>
                            )}
                        </div>
                     </>
                 ) : (
                     <div className="p-5 rounded-2xl bg-green-50 border border-green-200 text-center">
                         <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-2 text-green-600 shadow-sm"><CheckCircle size={24}/></div>
                         <h3 className="font-bold text-green-800">Commande 100% payée par coupon</h3>
                         <p className="text-sm text-green-600">Aucun paiement supplémentaire requis.</p>
                     </div>
                 )}
              </div>
            </div>

            <button type="submit" disabled={isSubmitting || (paymentMethod === 'MOBILE_MONEY' && !isPaymentValidated && totalAmount > 0)} className="w-full bg-secondary text-white py-5 rounded-2xl font-bold text-xl hover:bg-slate-800 transition-all shadow-xl shadow-secondary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transform hover:-translate-y-1">
                {isSubmitting ? <Loader2 className="animate-spin" /> : <>Confirmer la commande <ArrowRight /></>}
            </button>
          </form>
        </div>

        <div className="lg:col-span-4">
          <div className="bg-white p-6 rounded-2xl shadow-soft border border-gray-100 sticky top-24">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Récapitulatif</h3>
            <div className="space-y-4 mb-6 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2">
              {cart.map(item => (
                <div key={item.id} className="flex gap-4 items-start">
                  <div className="w-16 h-16 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0 border border-gray-100"><img src={item.image || item.images[0]} className="w-full h-full object-cover"/></div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-bold text-gray-900 truncate">{item.name}</p><p className="text-xs text-gray-500 mt-1">Qté: {item.quantity}</p></div>
                  <span className="font-bold text-sm">{(item.price * item.quantity).toLocaleString()} F</span>
                </div>
              ))}
            </div>
            
            <div className="border-t border-dashed border-gray-200 pt-6 space-y-3">
              <div className="flex justify-between text-gray-600"><span>Sous-total</span><span>{cartTotal.toLocaleString()} F</span></div>
              <div className="flex justify-between text-gray-600"><span>Livraison ({formData.deliveryMethod === 'PICKUP' ? 'Retrait Agence' : 'Domicile'})</span><span className={formData.deliveryMethod === 'PICKUP' ? 'text-green-600 font-bold' : ''}>{calculateDeliveryFee() === 0 ? 'Gratuit' : `${calculateDeliveryFee().toLocaleString()} F`}</span></div>
              
              {appliedCoupon && (
                  <div className="flex justify-between text-green-600 font-bold">
                      <span>Remise Coupon</span>
                      <span>- {appliedCoupon.amount.toLocaleString()} F</span>
                  </div>
              )}

              <div className="flex justify-between text-2xl font-extrabold text-primary pt-4 border-t border-gray-200"><span>Total</span><span>{totalAmount.toLocaleString()} <span className="text-sm font-normal text-gray-500">FCFA</span></span></div>
            </div>

            <div className="mt-6 bg-blue-50 p-4 rounded-xl flex gap-3 text-blue-800 text-xs leading-relaxed border border-blue-100">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <p>En validant votre commande, vous acceptez nos CGV. Les retours sont possibles sous 7 jours.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
);
