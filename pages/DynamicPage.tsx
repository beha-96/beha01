
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DatabaseService } from '../services/mockDatabase';
import { Page, PageComponent, Product, SiteConfig } from '../types';
import { useApp } from '../context/AppContext';
import { ShoppingBag, ArrowRight, ArrowLeft, Smartphone, Shirt, Home, Watch, Grid, MoreHorizontal, ShoppingCart, Activity, Briefcase, Smile, Coffee, Filter, X, Check, CheckCircle, Heart, ThumbsDown } from 'lucide-react';

export const DynamicPage: React.FC<{ slug?: string }> = ({ slug: propSlug }) => {
  const { slug: routeSlug, category: routeCategory } = useParams<{ slug: string, category: string }>();
  const navigate = useNavigate();
  const { products, addToCart, siteConfig } = useApp();
  
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);

  // Determine active slug
  const activeSlug = propSlug || routeSlug || (routeCategory ? `category-${routeCategory}` : 'home');

  useEffect(() => {
    const loadPage = async () => {
      setLoading(true);
      
      // 1. Try fetching specific page from DB
      let foundPage = await DatabaseService.getPageBySlug(activeSlug);

      // 2. If not found, and it's a category route, generate it on the fly
      if (!foundPage && routeCategory) {
          foundPage = {
              id: `cat-${routeCategory}`,
              slug: activeSlug,
              title: routeCategory,
              type: 'CATEGORY',
              active: true,
              components: [
                  { id: 'c1', type: 'HERO', data: { title: routeCategory, subtitle: 'Découvrez notre sélection', imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8' } },
                  { id: 'c2', type: 'PRODUCT_GRID', data: { filterType: 'CATEGORY', category: routeCategory } }
              ]
          };
      } 
      // 3. Fallback for Home if not in DB yet (First run)
      else if (!foundPage && activeSlug === 'home') {
          foundPage = {
              id: 'home',
              slug: 'home',
              title: 'Accueil',
              type: 'HOME',
              active: true,
              components: [
                  { 
                      id: 'h1', type: 'HERO', 
                      data: { 
                          title: siteConfig?.heroTitle || 'Excellence & Qualité', 
                          subtitle: siteConfig?.heroSubtitle || 'La référence en ligne.', 
                          imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=80' 
                      } 
                  },
                  { id: 'cat_list', type: 'CATEGORY_LIST', data: { title: 'Nos Catégories' } },
                  { 
                      id: 'promo_banner', type: 'IMAGE_BANNER', 
                      data: { 
                          title: 'OFFRE SPÉCIALE', 
                          imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1600&q=80',
                          link: '/popular'
                      } 
                  },
                  // Replaced static grids with interactive Filterable Grid
                  { id: 'main_shop', type: 'FILTERABLE_GRID', data: { title: 'Notre Catalogue' } }
              ]
          };
      }

      setPage(foundPage);
      setLoading(false);
    };
    loadPage();
  }, [activeSlug, routeCategory, siteConfig]);

  if (loading) return <div className="p-20 text-center animate-pulse">Chargement de la page...</div>;
  if (!page) return <div className="p-20 text-center">Page introuvable. <button onClick={() => navigate('/')} className="text-primary underline">Retour</button></div>;

  return (
    <div className="pb-20 w-full overflow-x-hidden">
        {page.components.map((comp, index) => (
            <ComponentRenderer key={comp.id} component={comp} products={products} addToCart={addToCart} navigate={navigate} siteConfig={siteConfig} />
        ))}
    </div>
  );
};

// Sub-components for rendering blocks
const ComponentRenderer: React.FC<{ component: PageComponent, products: Product[], addToCart: any, navigate: any, siteConfig: any }> = ({ component, products, addToCart, navigate, siteConfig }) => {
    switch (component.type) {
        case 'HERO':
            return (
                <div className="relative h-[50vh] md:h-[600px] w-full overflow-hidden bg-gray-900 group mb-8">
                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent z-10"></div>
                    <img src={component.data.imageUrl} alt={component.data.title} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                    <div className="absolute inset-0 z-20 flex flex-col justify-center px-6 md:px-24 max-w-5xl">
                        <span className="text-primary font-bold tracking-widest uppercase mb-4 text-sm md:text-base animate-slide-up">Bienvenue sur {siteConfig?.appName}</span>
                        <h2 className="text-4xl md:text-7xl font-black text-white mb-6 leading-tight animate-slide-up" style={{ animationDelay: '0.1s' }}>{component.data.title}</h2>
                        {component.data.subtitle && <p className="text-lg md:text-2xl text-gray-200 mb-10 max-w-2xl font-light leading-relaxed animate-slide-up" style={{ animationDelay: '0.2s' }}>{component.data.subtitle}</p>}
                        <div className="flex gap-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
                            <button onClick={() => navigate('/shop')} className="bg-white text-gray-900 px-8 py-4 rounded-full font-bold hover:bg-gray-100 transition-transform hover:scale-105 shadow-lg active:scale-95">Acheter Maintenant</button>
                            <button onClick={() => navigate('/new-arrivals')} className="bg-white/10 backdrop-blur-md border border-white/30 text-white px-8 py-4 rounded-full font-bold hover:bg-white/20 transition-transform hover:scale-105 active:scale-95">Nouveautés</button>
                        </div>
                    </div>
                </div>
            );
        case 'FILTERABLE_GRID':
            return <FilterableProductGridRenderer config={component.data} products={products} addToCart={addToCart} navigate={navigate} siteConfig={siteConfig} />;
        case 'PRODUCT_GRID':
            return <ProductGridRenderer config={component.data} products={products} addToCart={addToCart} navigate={navigate} />;
        case 'CATEGORY_LIST':
            return <CategoryListRenderer title={component.data.title} siteConfig={siteConfig} navigate={navigate} />;
        case 'IMAGE_BANNER':
            return (
                <div className="max-w-7xl mx-auto px-4 py-12 animate-fade-in">
                    <div className="relative rounded-3xl overflow-hidden shadow-2xl group cursor-pointer h-64 md:h-96" onClick={() => component.data.link && navigate(component.data.link)}>
                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors z-10"></div>
                        <img src={component.data.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center p-4">
                            <h3 className="text-3xl md:text-6xl font-black text-white uppercase tracking-widest mb-4 drop-shadow-lg">{component.data.title}</h3>
                            <span className="bg-white text-gray-900 px-6 py-2 rounded-full font-bold text-sm hover:bg-primary hover:text-white transition-colors">Découvrir l'offre</span>
                        </div>
                    </div>
                </div>
            );
        case 'TEXT_BLOCK':
            return (
                <div className="max-w-4xl mx-auto px-6 py-12 prose prose-lg text-gray-700 text-center">
                    <div dangerouslySetInnerHTML={{ __html: component.data.content }} />
                </div>
            );
        default:
            return null;
    }
};

// --- NEW COMPONENT: Interactive Filter Grid for Homepage ---
const FilterableProductGridRenderer: React.FC<{ config: any, products: Product[], addToCart: any, navigate: any, siteConfig: any }> = ({ config, products, addToCart, navigate, siteConfig }) => {
    const activeProducts = products.filter(p => p.active);
    
    // State for Filters
    const [selectedCategory, setSelectedCategory] = useState<string>('Tout');
    const [minPrice, setMinPrice] = useState<number | ''>('');
    const [maxPrice, setMaxPrice] = useState<number | ''>('');
    const [appliedPriceRange, setAppliedPriceRange] = useState<{min: number, max: number} | null>(null);

    // Get Categories
    const categories = useMemo(() => {
        if (siteConfig?.categories && siteConfig.categories.length > 0) {
            return siteConfig.categories.filter((c: any) => c.active).sort((a: any, b: any) => a.displayOrder - b.displayOrder).map((c: any) => c.name);
        }
        return Array.from(new Set(activeProducts.map(p => p.category)));
    }, [siteConfig, activeProducts]);

    // Apply Filters
    const filteredProducts = useMemo(() => {
        return activeProducts.filter(p => {
            const matchesCategory = selectedCategory === 'Tout' || p.category === selectedCategory;
            const matchesMinPrice = appliedPriceRange ? p.price >= appliedPriceRange.min : true;
            const matchesMaxPrice = appliedPriceRange ? (appliedPriceRange.max > 0 ? p.price <= appliedPriceRange.max : true) : true;
            return matchesCategory && matchesMinPrice && matchesMaxPrice;
        });
    }, [activeProducts, selectedCategory, appliedPriceRange]);

    const handleApplyPrice = () => {
        const min = typeof minPrice === 'number' ? minPrice : 0;
        const max = typeof maxPrice === 'number' ? maxPrice : 0;
        setAppliedPriceRange({ min, max });
    };

    const handleResetPrice = () => {
        setMinPrice('');
        setMaxPrice('');
        setAppliedPriceRange(null);
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-12 animate-fade-in" id="shop-section">
            <div className="text-center mb-10">
                <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">{config.title || 'Notre Catalogue'}</h2>
                <div className="h-1 w-20 bg-primary mx-auto rounded-full"></div>
            </div>

            {/* FILTER CONTROLS */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-10 flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
                
                {/* Category Pills */}
                <div className="w-full lg:w-auto overflow-x-auto pb-2 no-scrollbar">
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setSelectedCategory('Tout')}
                            className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${selectedCategory === 'Tout' ? 'bg-secondary text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            Tout voir
                        </button>
                        {categories.map((cat: string) => (
                            <button 
                                key={cat} 
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-primary text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Price Filter */}
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto bg-gray-50 p-3 rounded-xl border border-gray-200">
                    <span className="text-sm font-bold text-gray-500 flex items-center gap-2"><Filter size={16}/> Prix:</span>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <input 
                            type="number" 
                            placeholder="Min" 
                            className="w-full sm:w-24 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:border-primary"
                            value={minPrice}
                            onChange={e => setMinPrice(e.target.value ? parseInt(e.target.value) : '')}
                        />
                        <span className="text-gray-400">-</span>
                        <input 
                            type="number" 
                            placeholder="Max" 
                            className="w-full sm:w-24 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:border-primary"
                            value={maxPrice}
                            onChange={e => setMaxPrice(e.target.value ? parseInt(e.target.value) : '')}
                        />
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <button onClick={handleApplyPrice} className="flex-1 sm:flex-none bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors">
                            OK
                        </button>
                        {(appliedPriceRange) && (
                            <button onClick={handleResetPrice} className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Réinitialiser Prix">
                                <X size={18} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* RESULTS */}
            {filteredProducts.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                    <ShoppingBag size={48} className="mx-auto text-gray-300 mb-4"/>
                    <h3 className="text-xl font-bold text-gray-700">Aucun produit trouvé</h3>
                    <p className="text-gray-500 mt-2">Essayez de modifier vos filtres.</p>
                    <button 
                        onClick={() => { setSelectedCategory('Tout'); handleResetPrice(); }}
                        className="mt-6 px-6 py-2 bg-white border border-gray-300 rounded-full font-bold text-gray-600 hover:bg-gray-100"
                    >
                        Tout effacer
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
                    {filteredProducts.map((product, index) => (
                        <ProductCard key={product.id} product={product} navigate={navigate} addToCart={addToCart} index={index} />
                    ))}
                </div>
            )}
        </div>
    );
};

const ProductGridRenderer: React.FC<{ config: any, products: Product[], addToCart: any, navigate: any }> = ({ config, products, addToCart, navigate }) => {
    const activeProducts = products.filter(p => p.active);
    
    const filtered = useMemo(() => {
        let list = [...activeProducts];
        if (config.filterType === 'CATEGORY' && config.category) {
            list = list.filter(p => p.category === config.category);
        } else if (config.filterType === 'NEW') {
            list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        } else if (config.filterType === 'POPULAR') {
            list.sort((a, b) => (b.views || 0) - (a.views || 0));
        }

        if (config.limit) {
            list = list.slice(0, config.limit);
        }
        return list;
    }, [activeProducts, config]);

    if (filtered.length === 0) return null;

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
            {config.title && (
                <div className="flex justify-between items-end mb-8 px-2 border-b border-gray-100 pb-4">
                    <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900">{config.title}</h2>
                    <button onClick={() => navigate(config.filterType === 'POPULAR' ? '/popular' : '/shop')} className="text-sm text-primary font-bold hover:underline flex items-center gap-1">
                        Voir tout <ArrowRight size={16}/>
                    </button>
                </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
                {filtered.map((product, index) => (
                    <ProductCard key={product.id} product={product} navigate={navigate} addToCart={addToCart} index={index} />
                ))}
            </div>
        </div>
    );
};

const getCategoryIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('élect') || lower.includes('phone') || lower.includes('tech')) return Smartphone;
    if (lower.includes('mode') || lower.includes('vête') || lower.includes('habit')) return Shirt;
    if (lower.includes('maison') || lower.includes('deco')) return Home;
    if (lower.includes('access') || lower.includes('montre') || lower.includes('bijou')) return Watch;
    if (lower.includes('sport') || lower.includes('fitness')) return Activity;
    if (lower.includes('beaute') || lower.includes('soin') || lower.includes('parfum')) return Smile;
    if (lower.includes('bureau') || lower.includes('pro')) return Briefcase;
    if (lower.includes('cuisine') || lower.includes('manger')) return Coffee;
    if (lower.includes('course') || lower.includes('super')) return ShoppingCart;
    return Grid;
};

const CategoryListRenderer: React.FC<{ title: string, siteConfig: any, navigate: any }> = ({ title, siteConfig, navigate }) => {
    const categories = siteConfig?.categories || [];
    if (categories.length === 0) return null;

    const displayedCategories = categories.slice(0, 10);

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl md:text-2xl font-extrabold text-gray-900">{title}</h2>
                <button 
                    onClick={() => navigate('/shop')} 
                    className="text-sm font-bold text-primary hover:text-emerald-700 transition-colors flex items-center gap-1"
                >
                    Voir tout <ArrowRight size={16}/>
                </button>
            </div>
            
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar snap-x snap-mandatory">
                {displayedCategories.map((cat: any) => {
                    const Icon = getCategoryIcon(cat.name);
                    return (
                        <button 
                            key={cat.id} 
                            onClick={() => navigate(`/category/${cat.name}`)}
                            className="flex flex-col items-center gap-3 w-20 md:w-24 flex-shrink-0 snap-start group"
                        >
                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center group-hover:bg-primary group-hover:text-white group-hover:scale-110 transition-all duration-300">
                                <Icon size={28} strokeWidth={1.5} />
                            </div>
                            <span className="text-xs font-bold text-gray-700 text-center truncate w-full group-hover:text-primary">{cat.name}</span>
                        </button>
                    );
                })}

                {/* Voir Plus Button as the last item */}
                <button 
                    onClick={() => navigate('/shop')}
                    className="flex flex-col items-center gap-3 w-20 md:w-24 flex-shrink-0 snap-start group"
                >
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gray-50 border border-gray-200 shadow-inner flex items-center justify-center group-hover:bg-gray-100 transition-all duration-300 text-gray-500">
                        <ArrowRight size={28} strokeWidth={2} />
                    </div>
                    <span className="text-xs font-bold text-gray-500 text-center truncate w-full">Voir plus</span>
                </button>
            </div>
        </div>
    );
};

// Reused Product Card with Variant Support
const ProductCard: React.FC<{ product: Product, navigate: any, addToCart: any, index: number }> = ({ product, navigate, addToCart, index }) => {
    const { siteConfig } = useApp();
    const [showAdded, setShowAdded] = useState(false);
    
    // Like/Dislike State
    const [isLiked, setIsLiked] = useState(false);
    const [isDisliked, setIsDisliked] = useState(false);
    const [localLikes, setLocalLikes] = useState(product.likes || 0);
    const [localDislikes, setLocalDislikes] = useState(product.dislikes || 0);
    
    // Variant State
    const [selectedColor, setSelectedColor] = useState(product.variants?.colors?.[0] || '');
    const [selectedSize, setSelectedSize] = useState(product.variants?.sizes?.[0] || '');
    
    // Dynamic Price Logic
    const currentPrice = useMemo(() => {
        let price = product.price;
        
        // Priority: Size first for clothing/shoes logic usually
        if (selectedSize) {
            if (product.variantPrices && product.variantPrices[selectedSize]) price = product.variantPrices[selectedSize];
            else {
                const glob = siteConfig?.globalVariants?.sizes?.find(v => v.value === selectedSize);
                if (glob) price += glob.priceAdjustment;
            }
        }
        else if (selectedColor) {
             const glob = siteConfig?.globalVariants?.colors?.find(v => v.value === selectedColor);
             if (glob) price += glob.priceAdjustment;
        }
        return price;
    }, [product, selectedColor, selectedSize, siteConfig]);

    // Dynamic Image Logic
    const activeImage = useMemo(() => {
        if (selectedColor && product.variantImages && product.variantImages[selectedColor]) {
            return product.variantImages[selectedColor];
        }
        const globalColor = siteConfig?.globalVariants?.colors.find(c => c.value === selectedColor);
        if (globalColor && globalColor.imageUrl && !globalColor.imageUrl.startsWith('#')) {
            return globalColor.imageUrl;
        }
        return product.images[0];
    }, [product, selectedColor, siteConfig]);

    const discount = product.originalPrice ? Math.round(((product.originalPrice - currentPrice) / product.originalPrice) * 100) : 0;
    
    const handleAddToCart = (e: React.MouseEvent) => {
        e.stopPropagation();
        addToCart({
            ...product,
            price: currentPrice,
            image: activeImage,
            selectedColor,
            selectedSize
        });
        setShowAdded(true);
        setTimeout(() => setShowAdded(false), 2000);
    };

    const handleLike = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isLiked) {
            setIsLiked(false);
            setLocalLikes(prev => Math.max(0, prev - 1));
        } else {
            setIsLiked(true);
            setLocalLikes(prev => prev + 1);
            if (isDisliked) {
                setIsDisliked(false);
                setLocalDislikes(prev => Math.max(0, prev - 1));
            }
            DatabaseService.likeProduct(product.id);
        }
    };

    const handleDislike = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isDisliked) {
            setIsDisliked(false);
            setLocalDislikes(prev => Math.max(0, prev - 1));
        } else {
            setIsDisliked(true);
            setLocalDislikes(prev => prev + 1);
            if (isLiked) {
                setIsLiked(false);
                setLocalLikes(prev => Math.max(0, prev - 1));
            }
            DatabaseService.dislikeProduct(product.id);
        }
    };

    const totalVotes = localLikes + localDislikes;
    const likePercentage = totalVotes === 0 ? 0 : Math.round((localLikes / totalVotes) * 100);

    const getColorHex = (name: string) => {
        const globalColor = siteConfig?.globalVariants?.colors.find(c => c.value === name);
        if (globalColor && globalColor.imageUrl?.startsWith('#')) return globalColor.imageUrl;
        const map: Record<string, string> = { 'Rouge': '#ef4444', 'Bleu': '#3b82f6', 'Vert': '#22c55e', 'Noir': '#171717', 'Blanc': '#ffffff', 'Or': '#eab308', 'Argent': '#d1d5db', 'Rose': '#ec4899', 'Gris': '#6b7280', 'Titane Naturel': '#a8a29e', 'Titane Bleu': '#1e3a8a', 'Titane Noir': '#0f172a', 'Jaune': '#facc15', 'Orange': '#f97316', 'Violet': '#a855f7' };
        return map[name] || '#e5e7eb';
    };

    return (
        <div 
            className="bg-white rounded-2xl shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 overflow-hidden group flex flex-col h-full relative border border-gray-100 animate-slide-up"
            style={{ animationDelay: `${index * 50}ms` }}
        >
            <div className="relative aspect-[4/5] md:aspect-[4/3] overflow-hidden bg-gray-100 cursor-pointer" onClick={() => navigate(`/product/${product.id}`)}>
                <img src={activeImage} alt={product.name} className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-700" loading="lazy" />
                {discount > 0 && <span className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded shadow-md">-{discount}%</span>}
                
                {/* Like / Dislike Interaction */}
                <div className={`absolute top-2 right-2 z-10 flex flex-col items-end gap-1 transition-opacity duration-300 ${isLiked || isDisliked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    <div className="bg-white/90 backdrop-blur-sm rounded-full shadow-sm border border-gray-100 flex items-center p-1 gap-1">
                        <button 
                            className={`p-1.5 rounded-full transition-all duration-200 ${isLiked ? 'text-red-500 bg-red-50 scale-110' : 'text-gray-400 hover:text-red-500 hover:bg-gray-50'}`}
                            onClick={handleLike}
                            title="J'aime"
                        >
                            <Heart size={16} fill={isLiked ? "currentColor" : "none"} />
                        </button>
                        <div className="w-px h-3 bg-gray-200"></div>
                        <button 
                            className={`p-1.5 rounded-full transition-all duration-200 ${isDisliked ? 'text-slate-800 bg-slate-100 scale-110' : 'text-gray-400 hover:text-slate-800 hover:bg-gray-50'}`}
                            onClick={handleDislike}
                            title="Je n'aime pas"
                        >
                            <ThumbsDown size={16} fill={isDisliked ? "currentColor" : "none"} />
                        </button>
                    </div>
                    
                    {totalVotes > 0 && (
                        <div className="bg-white/90 backdrop-blur-sm px-1.5 py-1 rounded-full shadow-sm border border-gray-100 flex items-center gap-1.5 animate-scale-in">
                            <div className="w-12 h-1 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full transition-all duration-500 ${likePercentage >= 50 ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-red-400 to-red-500'}`}
                                    style={{ width: `${likePercentage}%` }}
                                />
                            </div>
                            <span className={`text-[8px] font-bold ${likePercentage >= 50 ? 'text-green-600' : 'text-red-500'}`}>{likePercentage}%</span>
                        </div>
                    )}
                </div>
            </div>
            <div className="p-4 flex flex-col flex-grow">
                <div className="text-[9px] text-gray-400 font-bold mb-1 uppercase tracking-wider truncate">{product.category}</div>
                <h3 onClick={() => navigate(`/product/${product.id}`)} className="text-sm md:text-base font-bold text-gray-900 mb-2 line-clamp-2 cursor-pointer leading-snug hover:text-primary transition-colors">{product.name}</h3>
                
                {/* Variant Swatches */}
                {(product.variants?.colors?.length || 0) > 0 && (
                    <div className="flex gap-1 mb-2 overflow-x-auto no-scrollbar" onClick={e => e.stopPropagation()}>
                        {product.variants!.colors!.slice(0,5).map(c => {
                            const hex = getColorHex(c);
                            const isActive = selectedColor === c;
                            return (
                                <button 
                                    key={c} 
                                    onClick={() => setSelectedColor(c)}
                                    className={`w-4 h-4 rounded-full border border-gray-200 transition-transform ${isActive ? 'scale-125 ring-1 ring-primary ring-offset-1' : 'hover:scale-110'}`}
                                    style={{backgroundColor: hex}}
                                    title={c}
                                />
                            );
                        })}
                    </div>
                )}

                {/* Size Chips */}
                {!product.variants?.colors?.length && (product.variants?.sizes?.length || 0) > 0 && (
                    <div className="flex gap-1 mb-2 overflow-x-auto no-scrollbar" onClick={e => e.stopPropagation()}>
                        {product.variants!.sizes!.slice(0,3).map(s => (
                            <button 
                                key={s}
                                onClick={() => setSelectedSize(s)}
                                className={`text-[9px] border px-1.5 py-0.5 rounded transition-colors ${selectedSize === s ? 'bg-gray-800 text-white border-gray-800' : 'text-gray-500 border-gray-200 hover:border-gray-400'}`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                )}

                <div className="mt-auto flex items-end justify-between gap-2 border-t border-gray-50 pt-3 relative">
                    <div className="flex flex-col">
                        <span className="text-lg font-black text-primary transition-all duration-300">{currentPrice.toLocaleString('fr-CI')} <span className="text-[10px] font-normal text-gray-400">F</span></span>
                        {product.originalPrice && <span className="text-[10px] text-gray-400 line-through decoration-red-300">{product.originalPrice.toLocaleString('fr-CI')} F</span>}
                    </div>
                    
                    {showAdded && (
                        <span className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-green-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg z-20 whitespace-nowrap animate-fade-in flex items-center gap-1">
                            <CheckCircle size={10}/> Commande ajoutée au panier
                        </span>
                    )}

                    <button onClick={handleAddToCart} disabled={product.stock <= 0} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-md active:scale-90 ${product.stock > 0 ? 'bg-gray-900 text-white hover:bg-primary' : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}><ShoppingBag size={18} /></button>
                </div>
            </div>
        </div>
    );
};
