
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Product, SiteConfig, ProductReview } from '../types';
import { ShoppingBag, ArrowLeft, Star, Truck, ShieldCheck, MessageCircle, Heart, Check, CheckCircle, CreditCard, X, ChevronRight, Maximize2, ChevronLeft, ZoomIn, ZoomOut, Image as ImageIcon, ThumbsDown, FileText } from 'lucide-react';
import { DatabaseService, generateId } from '../services/mockDatabase';

export const ProductDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { products, addToCart, siteConfig, user } = useApp();
  const [product, setProduct] = useState<Product | null>(null);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  
  // Gallery & Carousel State
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);

  // Variants State
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedWeight, setSelectedWeight] = useState<string>('');
  const [selectedVolume, setSelectedVolume] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');

  // Interaction State
  const [likes, setLikes] = useState(0);
  const [dislikes, setDislikes] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [hasDisliked, setHasDisliked] = useState(false);

  // Description Modal State
  const [isDescOpen, setIsDescOpen] = useState(false);

  // Added Animation State
  const [showAddedConfirmation, setShowAddedConfirmation] = useState(false);

  // Reviews State
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewForm, setReviewForm] = useState({ rating: 5, name: '', comment: '' });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const isCustomer = !user || (user.role !== 'ADMIN' && user.role !== 'INVESTOR' && user.role !== 'PARTNER');

  // Helper to get Color Value (Hex or Default) from Global Config
  const getColorHex = (name: string) => {
      // 1. Check Global Config
      const globalColor = siteConfig?.globalVariants?.colors.find(c => c.value === name);
      if (globalColor && globalColor.imageUrl?.startsWith('#')) {
          return globalColor.imageUrl;
      }
      // 2. Fallback Map
      const map: Record<string, string> = {
        'Rouge': '#ef4444',
        'Bleu': '#3b82f6',
        'Vert': '#22c55e',
        'Noir': '#171717',
        'Blanc': '#ffffff',
        'Or': '#eab308',
        'Argent': '#d1d5db',
        'Rose': '#ec4899',
        'Gris': '#6b7280',
        'Titane Naturel': '#a8a29e',
        'Titane Bleu': '#1e3a8a',
        'Titane Noir': '#0f172a',
        'Jaune': '#facc15',
        'Orange': '#f97316',
        'Violet': '#a855f7'
      };
      return map[name] || '#e5e7eb';
  };

  useEffect(() => {
    // Scroll to top when changing products
    window.scrollTo(0, 0);

    const loadProductData = async () => {
        if (id && products.length > 0) {
            const found = products.find(p => p.id === id);
            if (found) {
                setProduct(found);
                // Default to first image
                setCurrentImageIndex(0);
                
                // Initialize Selections with first available option
                setSelectedColor(found.variants?.colors?.[0] || '');
                setSelectedSize(found.variants?.sizes?.[0] || '');
                setSelectedWeight(found.variants?.weights?.[0] || '');
                setSelectedVolume(found.variants?.volumes?.[0] || '');
                setSelectedModel(found.variants?.models?.[0] || '');
                
                // Init stats
                setLikes(found.likes || 0);
                setDislikes(found.dislikes || 0);
                setHasLiked(false); 
                setHasDisliked(false);

                // Find similar items (Logic: Same Category First, Then Others, Limit 9)
                const sameCategory = products.filter(p => p.category === found.category && p.id !== found.id && p.active);
                const otherCategories = products.filter(p => p.category !== found.category && p.id !== found.id && p.active);
                // Combine and slice to exactly 9 items
                const suggestions = [...sameCategory, ...otherCategories].slice(0, 9);
                setSimilarProducts(suggestions);

                // AUTO-INCREMENT VIEWS IF CUSTOMER
                if (isCustomer) {
                    DatabaseService.incrementProductViews(found.id);
                }

                // Load Reviews
                const loadedReviews = await DatabaseService.getProductReviews(found.id);
                setReviews(loadedReviews);
            }
        }
    };
    loadProductData();
  }, [id, products, isCustomer]);

  // Consolidate all images for the carousel
  const galleryImages = useMemo(() => {
      if (!product) return [];
      // Combine main images and unique variant images
      const mainImages = product.images || [];
      const variantImages = Object.values(product.variantImages || {});
      // Create a Set to remove duplicates based on URL
      return Array.from(new Set([...mainImages, ...variantImages])).filter(img => img);
  }, [product]);

  // Update carousel when color changes
  useEffect(() => {
      if (product && selectedColor) {
          let targetImage = '';
          // 1. Check Product Specific Override (Exact match variant name)
          if (product.variantImages && product.variantImages[selectedColor]) {
              targetImage = product.variantImages[selectedColor];
          } else {
              // 2. Check Global Config for Image URL (not hex)
              const globalColor = siteConfig?.globalVariants?.colors.find(c => c.value === selectedColor);
              if (globalColor && globalColor.imageUrl && !globalColor.imageUrl.startsWith('#')) {
                  targetImage = globalColor.imageUrl;
              }
          }

          if (targetImage) {
              const idx = galleryImages.indexOf(targetImage);
              if (idx !== -1) setCurrentImageIndex(idx);
          }
      }
  }, [selectedColor, product, siteConfig, galleryImages]);

  // Dynamic Price Calculation
  const currentPrice = useMemo(() => {
      if (!product) return 0;
      
      // Priority 1: Specific Price Overrides in Product Data
      if (selectedModel && product.variantPrices?.[selectedModel]) return product.variantPrices[selectedModel];
      if (selectedSize && product.variantPrices?.[selectedSize]) return product.variantPrices[selectedSize];
      if (selectedColor && product.variantPrices?.[selectedColor]) return product.variantPrices[selectedColor];
      if (selectedWeight && product.variantPrices?.[selectedWeight]) return product.variantPrices[selectedWeight];
      if (selectedVolume && product.variantPrices?.[selectedVolume]) return product.variantPrices[selectedVolume];

      // Priority 2: Base Price + Global Adjustments from SiteConfig
      let price = product.price;
      
      const applyGlobalAdj = (type: keyof NonNullable<SiteConfig['globalVariants']>, val: string) => {
          const glob = siteConfig?.globalVariants?.[type]?.find(v => v.value === val);
          if (glob) price += glob.priceAdjustment;
      };

      if (selectedModel) applyGlobalAdj('models', selectedModel);
      if (selectedSize) applyGlobalAdj('sizes', selectedSize);
      if (selectedColor) applyGlobalAdj('colors', selectedColor);
      if (selectedWeight) applyGlobalAdj('weights', selectedWeight);
      if (selectedVolume) applyGlobalAdj('volumes', selectedVolume);

      return price;
  }, [product, selectedModel, selectedSize, selectedWeight, selectedVolume, selectedColor, siteConfig]);

  // Dynamic Stock Calculation
  const currentStock = useMemo(() => {
      if (!product) return 0;
      
      // Check specific stock for any selected variant
      if (selectedModel && product.variantStocks?.[selectedModel] !== undefined) return product.variantStocks[selectedModel];
      if (selectedSize && product.variantStocks?.[selectedSize] !== undefined) return product.variantStocks[selectedSize];
      if (selectedColor && product.variantStocks?.[selectedColor] !== undefined) return product.variantStocks[selectedColor];
      if (selectedWeight && product.variantStocks?.[selectedWeight] !== undefined) return product.variantStocks[selectedWeight];
      if (selectedVolume && product.variantStocks?.[selectedVolume] !== undefined) return product.variantStocks[selectedVolume];

      // Fallback to main stock
      return product.stock;
  }, [product, selectedModel, selectedSize, selectedColor, selectedWeight, selectedVolume]);

  const handleAddToCart = () => {
      if(!product) return;
      addToCart({
          ...product,
          price: currentPrice, // Use dynamic price
          image: galleryImages[currentImageIndex], // Use current visible image
          selectedColor,
          selectedSize,
          selectedWeight,
          selectedVolume,
          selectedModel
      });

      setShowAddedConfirmation(true);
      setTimeout(() => setShowAddedConfirmation(false), 2000);
  };

  const handleBuyNow = () => {
      if(!product) return;
      addToCart({
          ...product,
          price: currentPrice,
          image: galleryImages[currentImageIndex],
          selectedColor,
          selectedSize,
          selectedWeight,
          selectedVolume,
          selectedModel
      });
      navigate('/checkout');
  };
  
  const handleWhatsAppClick = () => {
      if (!product || !siteConfig) return;
      const phone = siteConfig.contactPhone?.replace(/[^0-9]/g, '') || '2250707000000';
      const variantDetails = [selectedColor, selectedSize, selectedModel, selectedWeight, selectedVolume].filter(Boolean).join(', ');
      const message = `Bonjour, je suis intéressé par : ${product.name} ${variantDetails ? `(${variantDetails})` : ''} à ${currentPrice.toLocaleString()} F. Lien: ${window.location.href}`;
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // Review Handler
  const handleSubmitReview = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!product || !reviewForm.name || !reviewForm.comment) return;
      setIsSubmittingReview(true);

      const newReview: ProductReview = {
          id: generateId(),
          productId: product.id,
          userName: reviewForm.name,
          rating: reviewForm.rating,
          comment: reviewForm.comment,
          createdAt: new Date().toISOString()
      };

      await DatabaseService.addProductReview(newReview);
      
      // Refresh reviews
      const updatedReviews = await DatabaseService.getProductReviews(product.id);
      setReviews(updatedReviews);
      
      // Reset form
      setReviewForm({ rating: 5, name: '', comment: '' });
      setIsSubmittingReview(false);
      alert('Merci pour votre avis !');
  };

  // Carousel Navigation
  const nextImage = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setCurrentImageIndex((prev) => (prev + 1) % galleryImages.length);
  };

  const prevImage = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setCurrentImageIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  };

  const handleImageClick = () => {
      setZoomScale(1);
      setIsZoomOpen(true);
  };

  // Interaction Handlers
  const handleLike = async () => { if (!product || !isCustomer) return; if (hasLiked) { setHasLiked(false); setLikes(prev => Math.max(0, prev - 1)); } else { setHasLiked(true); setLikes(prev => prev + 1); await DatabaseService.likeProduct(product.id); if (hasDisliked) { setHasDisliked(false); setDislikes(prev => Math.max(0, prev - 1)); } } };
  const handleDislike = async () => { if (!product || !isCustomer) return; if (hasDisliked) { setHasDisliked(false); setDislikes(prev => Math.max(0, prev - 1)); } else { setHasDisliked(true); setDislikes(prev => prev + 1); await DatabaseService.dislikeProduct(product.id); if (hasLiked) { setHasLiked(false); setLikes(prev => Math.max(0, prev - 1)); } } };
  
  if (!product) return <div className="p-20 text-center animate-pulse">Chargement du produit...</div>;

  const discountPercentage = product.originalPrice 
    ? Math.round(((product.originalPrice - currentPrice) / product.originalPrice) * 100) 
    : 0;

  const isOutOfStock = currentStock <= 0;

  // --- LOGIC FOR SIMILAR PRODUCTS LAYOUT ---
  const topRow = similarProducts.slice(0, 3);
  const middleStack = similarProducts.slice(3, 6);
  const bottomRow = similarProducts.slice(6, 9);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in relative">
      <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-500 hover:text-primary mb-6 transition-colors group">
        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> Retour à la boutique
      </button>

      {/* Main Detail Section */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-12 border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-8">
          
          {/* Gallery Section with Carousel */}
          <div className="p-4 md:p-8 bg-gray-50 select-none">
            <div className="aspect-square bg-white rounded-2xl shadow-sm relative overflow-hidden group mb-4">
               {/* Carousel Wrapper */}
               <div 
                 className="flex transition-transform ease-out duration-500 h-full w-full" 
                 style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
               >
                   {galleryImages.map((img, idx) => (
                       <div key={idx} className="w-full h-full flex-shrink-0 cursor-zoom-in" onClick={handleImageClick}>
                           <img src={img} alt={`${product.name} - Vue ${idx+1}`} className="w-full h-full object-cover" />
                       </div>
                   ))}
               </div>

               {/* Carousel Controls */}
               {galleryImages.length > 1 && (
                   <>
                       <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full shadow-md text-gray-800 hover:bg-white transition-opacity opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100">
                           <ChevronLeft size={24} />
                       </button>
                       <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full shadow-md text-gray-800 hover:bg-white transition-opacity opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100">
                           <ChevronRight size={24} />
                       </button>
                       {/* Dots Indicator */}
                       <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                           {galleryImages.map((_, idx) => (
                               <div key={idx} className={`w-2 h-2 rounded-full transition-all shadow-sm ${idx === currentImageIndex ? 'bg-primary w-4' : 'bg-white/70'}`}></div>
                           ))}
                       </div>
                   </>
               )}

               {/* Badges */}
               {isOutOfStock && <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 pointer-events-none"><span className="text-white font-bold text-xl border-4 border-white px-6 py-2 rounded-lg transform -rotate-12">RUPTURE DE STOCK</span></div>}
               {discountPercentage > 0 && <div className="absolute top-4 right-4 bg-red-500 text-white font-bold px-3 py-1 rounded-full shadow-lg text-sm animate-pulse-slow">-{discountPercentage}%</div>}
            </div>
            
            {/* Thumbnails */}
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                 {galleryImages.map((img, idx) => (
                   <button 
                    key={`thumb-${idx}`} 
                    onClick={() => setCurrentImageIndex(idx)} 
                    className={`relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${currentImageIndex === idx ? 'border-primary ring-2 ring-primary/20 scale-105' : 'border-transparent opacity-70 hover:opacity-100'}`}
                   >
                     <img src={img} className="w-full h-full object-cover" alt={`Miniature ${idx + 1}`} />
                   </button>
                 ))}
            </div>
          </div>
          
          {/* Info Section */}
          <div className="p-8 md:p-12 flex flex-col justify-center animate-slide-up">
             <div className="mb-6">
                <span className="text-sm font-bold text-gray-400 tracking-wider uppercase bg-gray-100 px-3 py-1 rounded-full">{product.category}</span>
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mt-3 leading-tight">{product.name}</h1>
                <div className="flex items-center gap-4 mt-3">
                   <div className="flex items-center text-yellow-400 text-sm">
                      {[...Array(5)].map((_, i) => (
                          <Star key={i} size={16} fill={i < Math.floor(product.averageRating || 0) ? "currentColor" : "none"} className={i < Math.floor(product.averageRating || 0) ? "" : "text-gray-300"} />
                      ))}
                      <span className="ml-2 text-gray-500 font-bold">({product.reviewCount || 0} avis)</span>
                   </div>
                   <span className="text-gray-300">|</span>
                   <span className={`text-sm font-bold flex items-center gap-1 ${isOutOfStock ? 'text-red-500' : 'text-green-600'}`}>
                       <CheckCircle size={14}/> {isOutOfStock ? 'Indisponible' : 'En stock'}
                   </span>
                </div>
             </div>

             <div className="flex items-end gap-4 mb-8 pb-8 border-b border-gray-100">
                <div className="flex flex-col">
                   <span className="text-4xl font-black text-primary">{currentPrice.toLocaleString('fr-CI')} F</span>
                   {product.originalPrice && <span className="text-sm text-gray-400 line-through font-medium">Prix initial: {product.originalPrice.toLocaleString('fr-CI')} F</span>}
                </div>
             </div>

             {/* VARIANTS SELECTION */}
             <div className="space-y-6 mb-8">
                 {/* Models */}
                 {product.variants?.models && product.variants.models.length > 0 && (
                     <div>
                         <label className="text-sm font-bold text-gray-900 mb-2 block">Modèle</label>
                         <div className="flex flex-wrap gap-2">
                             {product.variants.models.map(m => (
                                 <button key={m} onClick={() => setSelectedModel(m)} className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${selectedModel === m ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'}`}>
                                     {m}
                                 </button>
                             ))}
                         </div>
                     </div>
                 )}

                 {/* Colors */}
                 {product.variants?.colors && product.variants.colors.length > 0 && (
                     <div>
                         <label className="text-sm font-bold text-gray-900 mb-2 block">Couleur: <span className="font-normal text-gray-500">{selectedColor}</span></label>
                         <div className="flex flex-wrap gap-3">
                             {product.variants.colors.map(c => {
                                 const hex = getColorHex(c);
                                 return (
                                     <button 
                                        key={c} 
                                        onClick={() => setSelectedColor(c)}
                                        className={`w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center ${selectedColor === c ? 'border-primary ring-2 ring-primary/20 scale-110' : 'border-gray-200 hover:scale-105'}`}
                                        style={{ backgroundColor: hex }}
                                        title={c}
                                     >
                                         {selectedColor === c && <Check size={16} className={['#ffffff', '#fff', 'white'].includes(hex.toLowerCase()) ? 'text-black' : 'text-white'} />}
                                     </button>
                                 );
                             })}
                         </div>
                     </div>
                 )}

                 {/* Sizes */}
                 {product.variants?.sizes && product.variants.sizes.length > 0 && (
                     <div>
                         <label className="text-sm font-bold text-gray-900 mb-2 block">Taille / Pointure</label>
                         <div className="flex flex-wrap gap-2">
                             {product.variants.sizes.map(s => (
                                 <button key={s} onClick={() => setSelectedSize(s)} className={`min-w-[3rem] h-10 px-2 rounded-lg text-sm font-bold border transition-all ${selectedSize === s ? 'bg-primary text-white border-primary shadow-md' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'}`}>
                                     {s}
                                 </button>
                             ))}
                         </div>
                     </div>
                 )}

                 {/* Weights */}
                 {(product.variants?.weights?.length || 0) > 0 && (
                     <div>
                         <label className="text-sm font-bold text-gray-900 mb-2 block">Poids</label>
                         <div className="flex flex-wrap gap-2">
                             {product.variants?.weights?.map(w => (
                                 <button key={w} onClick={() => setSelectedWeight(w)} className={`px-3 py-1.5 rounded-md text-xs font-bold border ${selectedWeight === w ? 'bg-gray-800 text-white' : 'bg-white text-gray-600'}`}>{w}</button>
                             ))}
                         </div>
                     </div>
                 )}
                 
                 {/* Volumes */}
                 {(product.variants?.volumes?.length || 0) > 0 && (
                     <div>
                         <label className="text-sm font-bold text-gray-900 mb-2 block">Volume</label>
                         <div className="flex flex-wrap gap-2">
                             {product.variants?.volumes?.map(v => (
                                 <button key={v} onClick={() => setSelectedVolume(v)} className={`px-3 py-1.5 rounded-md text-xs font-bold border ${selectedVolume === v ? 'bg-gray-800 text-white' : 'bg-white text-gray-600'}`}>{v}</button>
                             ))}
                         </div>
                     </div>
                 )}
             </div>

             <div className="flex flex-col sm:flex-row gap-4 mt-auto">
                <button 
                    onClick={handleAddToCart}
                    disabled={isOutOfStock}
                    className={`flex-1 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 ${isOutOfStock ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white border-2 border-secondary text-secondary hover:bg-gray-50'}`}
                >
                    {showAddedConfirmation ? <Check size={24} className="text-green-600"/> : <ShoppingBag size={22} />}
                    {showAddedConfirmation ? 'Ajouté !' : 'Ajouter au panier'}
                </button>
                <button 
                    onClick={handleBuyNow}
                    disabled={isOutOfStock}
                    className={`flex-1 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 ${isOutOfStock ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-primary text-white hover:bg-emerald-700 hover:shadow-xl'}`}
                >
                    <CreditCard size={22} />
                    Acheter maintenant
                </button>
             </div>

             <div className="mt-6 flex items-center justify-between text-xs text-gray-500 border-t border-gray-100 pt-4">
                 <div className="flex gap-4">
                     <span className="flex items-center gap-1"><Truck size={14}/> Livraison 24h/48h</span>
                     <span className="flex items-center gap-1"><ShieldCheck size={14}/> Garantie satisfait</span>
                 </div>
                 <button onClick={handleWhatsAppClick} className="text-green-600 font-bold hover:underline flex items-center gap-1">
                     <MessageCircle size={14}/> Question ?
                 </button>
             </div>
          </div>
        </div>
      </div>

      {/* FULL SCREEN IMAGE ZOOM MODAL */}
      {isZoomOpen && (
          <div className="fixed inset-0 z-[80] bg-black/95 flex flex-col animate-fade-in touch-none">
              {/* Controls */}
              <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-50 text-white bg-gradient-to-b from-black/50 to-transparent">
                  <span className="text-sm font-mono">{currentImageIndex + 1} / {galleryImages.length}</span>
                  <div className="flex gap-4 items-center">
                      <button onClick={() => setZoomScale(Math.max(1, zoomScale - 0.5))} className="p-2 hover:bg-white/20 rounded-full"><ZoomOut size={24} /></button>
                      <button onClick={() => setZoomScale(Math.min(3, zoomScale + 0.5))} className="p-2 hover:bg-white/20 rounded-full"><ZoomIn size={24} /></button>
                      <button onClick={() => setIsZoomOpen(false)} className="p-2 bg-white/20 hover:bg-white/40 rounded-full ml-4"><X size={24} /></button>
                  </div>
              </div>

              {/* Main Image Area */}
              <div className="flex-1 flex items-center justify-center overflow-hidden relative">
                  <button onClick={prevImage} className="absolute left-4 z-50 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-sm transition-all"><ChevronLeft size={32} /></button>
                  
                  <div className="w-full h-full flex items-center justify-center overflow-auto p-4 cursor-grab active:cursor-grabbing">
                      <img 
                        src={galleryImages[currentImageIndex]} 
                        alt="Zoom" 
                        className="max-w-full max-h-full object-contain transition-transform duration-200"
                        style={{ transform: `scale(${zoomScale})` }}
                      />
                  </div>

                  <button onClick={nextImage} className="absolute right-4 z-50 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-sm transition-all"><ChevronRight size={32} /></button>
              </div>

              {/* Thumbnails Strip */}
              <div className="h-20 bg-black/50 backdrop-blur-md flex items-center justify-center gap-2 overflow-x-auto px-4">
                  {galleryImages.map((img, idx) => (
                      <button 
                        key={idx} 
                        onClick={() => { setCurrentImageIndex(idx); setZoomScale(1); }}
                        className={`w-12 h-12 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${currentImageIndex === idx ? 'border-primary opacity-100' : 'border-transparent opacity-50 hover:opacity-80'}`}
                      >
                          <img src={img} className="w-full h-full object-cover" />
                      </button>
                  ))}
              </div>
          </div>
      )}

      {/* DESCRIPTION & REVIEWS TABS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
              {/* Description - Trigger Button */}
              <div 
                className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors group"
                onClick={() => setIsDescOpen(true)}
              >
                  <div className="flex items-center gap-4">
                      <div className="bg-primary/10 p-3 rounded-full text-primary group-hover:scale-110 transition-transform">
                          <FileText size={24} />
                      </div>
                      <div>
                          <h2 className="text-lg font-bold text-gray-900">Description</h2>
                          <p className="text-sm text-gray-500 hidden md:block">Détails, caractéristiques et images supplémentaires.</p>
                      </div>
                  </div>
                  <button className="bg-gray-100 px-4 py-2 rounded-full text-gray-600 hover:bg-gray-200 group-hover:bg-primary group-hover:text-white transition-colors text-sm font-bold flex items-center gap-2">
                      Voir la description <Maximize2 size={16} />
                  </button>
              </div>

              {/* Reviews */}
              <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2"><Star className="text-yellow-400" fill="currentColor"/> Avis Clients ({reviews.length})</h2>
                  
                  {/* Review Form */}
                  <form onSubmit={handleSubmitReview} className="mb-8 bg-gray-50 p-6 rounded-xl border border-gray-100">
                      <h3 className="font-bold text-gray-800 mb-4 text-sm">Donnez votre avis</h3>
                      <div className="flex gap-2 mb-4">
                          {[1,2,3,4,5].map(star => (
                              <button key={star} type="button" onClick={() => setReviewForm({...reviewForm, rating: star})}>
                                  <Star size={24} className={star <= reviewForm.rating ? "text-yellow-400 fill-current" : "text-gray-300"} />
                              </button>
                          ))}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <input required placeholder="Votre nom" className="p-3 rounded-lg border border-gray-200 text-sm outline-none focus:border-primary" value={reviewForm.name} onChange={e => setReviewForm({...reviewForm, name: e.target.value})} />
                      </div>
                      <textarea required placeholder="Votre commentaire..." className="w-full p-3 rounded-lg border border-gray-200 text-sm outline-none focus:border-primary h-24 mb-4" value={reviewForm.comment} onChange={e => setReviewForm({...reviewForm, comment: e.target.value})} />
                      <button disabled={isSubmittingReview} className="bg-gray-900 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-black transition-colors">Publier</button>
                  </form>

                  {/* Reviews List */}
                  <div className="space-y-6">
                      {reviews.map(review => (
                          <div key={review.id} className="border-b border-gray-100 pb-6 last:border-0">
                              <div className="flex justify-between items-start mb-2">
                                  <div>
                                      <span className="font-bold text-gray-900 text-sm">{review.userName}</span>
                                      <div className="flex text-yellow-400 text-xs mt-1">
                                          {[...Array(5)].map((_, i) => <Star key={i} size={12} fill={i < review.rating ? "currentColor" : "none"} className={i < review.rating ? "" : "text-gray-300"} />)}
                                      </div>
                                  </div>
                                  <span className="text-[10px] text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</span>
                              </div>
                              <p className="text-gray-600 text-sm">{review.comment}</p>
                          </div>
                      ))}
                      {reviews.length === 0 && <p className="text-gray-400 text-center text-sm py-4">Aucun avis pour le moment.</p>}
                  </div>
              </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
              {/* Similar Products */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-24">
                  <h3 className="font-bold text-gray-900 mb-6">Produits Similaires</h3>
                  
                  <div className="space-y-6">
                      {/* Row 1: 3 Side-by-Side (Grid) */}
                      {topRow.length > 0 && (
                          <div className="grid grid-cols-3 gap-2">
                              {topRow.map(p => (
                                <div key={p.id} onClick={() => navigate(`/product/${p.id}`)} className="cursor-pointer group flex flex-col gap-1">
                                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-100">
                                        <img src={p.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={p.name}/>
                                    </div>
                                    <p className="text-[10px] font-bold text-gray-900 truncate group-hover:text-primary">{p.name}</p>
                                    <p className="text-[10px] text-gray-500">{p.price.toLocaleString()} F</p>
                                </div>
                              ))}
                          </div>
                      )}

                      {/* Row 2: 3 Stacked (List/Stack) */}
                      {middleStack.length > 0 && (
                          <div className="space-y-4 pt-4 border-t border-gray-50">
                              {middleStack.map(p => (
                                <div key={p.id} onClick={() => navigate(`/product/${p.id}`)} className="flex gap-3 cursor-pointer group">
                                    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-100">
                                        <img src={p.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt={p.name}/>
                                    </div>
                                    <div className="flex flex-col justify-center">
                                        <h4 className="text-sm font-bold text-gray-800 line-clamp-2 group-hover:text-primary transition-colors leading-tight">{p.name}</h4>
                                        <p className="text-xs text-primary font-bold mt-1">{p.price.toLocaleString()} F</p>
                                    </div>
                                </div>
                              ))}
                          </div>
                      )}

                      {/* Row 3: 3 Side-by-Side (Grid) */}
                      {bottomRow.length > 0 && (
                          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-50">
                              {bottomRow.map(p => (
                                <div key={p.id} onClick={() => navigate(`/product/${p.id}`)} className="cursor-pointer group flex flex-col gap-1">
                                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-100">
                                        <img src={p.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={p.name}/>
                                    </div>
                                    <p className="text-[10px] font-bold text-gray-900 truncate group-hover:text-primary">{p.name}</p>
                                    <p className="text-[10px] text-gray-500">{p.price.toLocaleString()} F</p>
                                </div>
                              ))}
                          </div>
                      )}
                      
                      {similarProducts.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Aucun produit similaire.</p>}
                  </div>
              </div>
          </div>
      </div>

      {/* FULL SCREEN DESCRIPTION MODAL */}
      {isDescOpen && (
          <div className="fixed inset-0 z-[60] bg-white md:bg-black/50 md:backdrop-blur-sm flex items-center justify-center animate-fade-in">
              <div className="w-full h-full md:h-[90vh] md:w-[90vw] md:max-w-4xl bg-white md:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-up">
                  {/* Header */}
                  <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
                      <h2 className="text-xl font-bold flex items-center gap-2"><FileText className="text-primary"/> Description</h2>
                      <button onClick={() => setIsDescOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={24}/></button>
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 custom-scrollbar">
                      <div className="prose prose-lg text-gray-700 leading-relaxed whitespace-pre-wrap max-w-none">
                          {product.description}
                      </div>
                      
                      {/* Description Images Gallery (Optional 4 images) */}
                      {product.descriptionImages && product.descriptionImages.length > 0 && (
                          <div className="mt-8 pt-8 border-t border-gray-100">
                              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2"><ImageIcon size={20} className="text-gray-400"/> Images supplémentaires</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  {product.descriptionImages.slice(0, 4).map((img, idx) => (
                                      <div key={idx} className="rounded-2xl overflow-hidden shadow-sm border border-gray-100 group">
                                          <img src={img} alt={`Description ${idx + 1}`} className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-700" />
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>

                  {/* Footer (Mobile Only) */}
                  <div className="p-4 border-t border-gray-100 md:hidden bg-white sticky bottom-0 z-10">
                      <button onClick={() => setIsDescOpen(false)} className="w-full bg-secondary text-white py-3 rounded-xl font-bold shadow-lg">Fermer</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
