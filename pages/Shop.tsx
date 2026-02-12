import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Filter, ShoppingBag, ArrowRight, Heart, Eye, CheckCircle } from 'lucide-react';

export const Shop: React.FC = () => {
  const { products, addToCart, siteConfig } = useApp();
  const navigate = useNavigate();

  const [selectedCategory, setSelectedCategory] = useState('Tout');
  const [sortOption, setSortOption] = useState('newest');
  const [minPrice, setMinPrice] = useState<number | ''>('');
  const [maxPrice, setMaxPrice] = useState<number | ''>('');

  // Determine current banner based on category
  const currentCategoryData = siteConfig?.categories.find(c => c.name === selectedCategory);
  
  // Default to a generic shop banner if "Tout" or no specific banner set
  const activeBannerUrl = selectedCategory !== 'Tout' && currentCategoryData?.bannerUrl 
    ? currentCategoryData.bannerUrl 
    : (siteConfig?.banners?.[0] || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80');

  const activeBannerTitle = selectedCategory === 'Tout' 
    ? (siteConfig?.heroTitle || 'Notre Catalogue') 
    : (currentCategoryData?.bannerTitle || selectedCategory);

  const activeBannerSubtitle = selectedCategory === 'Tout' 
    ? (siteConfig?.heroSubtitle || 'Découvrez nos meilleurs produits') 
    : (currentCategoryData?.bannerSubtitle || `Explorez notre collection ${selectedCategory}`);

  const categories = useMemo(() => {
    if (siteConfig?.categories && siteConfig.categories.length > 0) {
        return ['Tout', ...siteConfig.categories.filter(c => c.active).map(c => c.name)];
    }
    return ['Tout', ...Array.from(new Set(products.map(p => p.category)))];
  }, [siteConfig, products]);

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      if (!product.active) return false;
      if (selectedCategory !== 'Tout' && product.category !== selectedCategory) return false;
      if (minPrice !== '' && product.price < minPrice) return false;
      if (maxPrice !== '' && product.price > maxPrice) return false;
      return true;
    }).sort((a, b) => {
      if (sortOption === 'price-asc') return a.price - b.price;
      if (sortOption === 'price-desc') return b.price - a.price;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }, [products, selectedCategory, minPrice, maxPrice, sortOption]);

  const handleResetFilters = () => {
    setSelectedCategory('Tout');
    setMinPrice('');
    setMaxPrice('');
    setSortOption('newest');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Dynamic Banner */}
      <div className="relative h-64 md:h-80 bg-gray-900 overflow-hidden">
        <div className="absolute inset-0 bg-black/40 z-10"></div>
        <img src={activeBannerUrl} alt="Shop Banner" className="w-full h-full object-cover" />
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center p-4">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-2">{activeBannerTitle}</h1>
          <p className="text-lg text-gray-200">{activeBannerSubtitle}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters & Sort */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          
          <div className="flex flex-wrap gap-2">
             {categories.map(cat => (
               <button
                 key={cat}
                 onClick={() => setSelectedCategory(cat)}
                 className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${selectedCategory === cat ? 'bg-primary text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
               >
                 {cat}
               </button>
             ))}
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
             <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                <span className="text-xs font-bold text-gray-500">Prix:</span>
                <input 
                  type="number" placeholder="Min" 
                  className="w-16 bg-white border border-gray-300 rounded px-2 py-1 text-xs outline-none focus:border-primary"
                  value={minPrice} onChange={e => setMinPrice(e.target.value ? Number(e.target.value) : '')}
                />
                <span className="text-gray-400">-</span>
                <input 
                  type="number" placeholder="Max" 
                  className="w-16 bg-white border border-gray-300 rounded px-2 py-1 text-xs outline-none focus:border-primary"
                  value={maxPrice} onChange={e => setMaxPrice(e.target.value ? Number(e.target.value) : '')}
                />
             </div>
             
             <select 
               className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-primary/20"
               value={sortOption}
               onChange={e => setSortOption(e.target.value)}
             >
               <option value="newest">Nouveautés</option>
               <option value="price-asc">Prix croissant</option>
               <option value="price-desc">Prix décroissant</option>
             </select>
          </div>
        </div>

        {/* Product Grid */}
        {filteredProducts.length === 0 ? (
           <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
             <ShoppingBag size={48} className="mx-auto text-gray-300 mb-4"/>
             <h3 className="text-xl font-bold text-gray-700">Aucun produit trouvé</h3>
             <button onClick={handleResetFilters} className="mt-4 text-primary font-bold hover:underline">Réinitialiser les filtres</button>
           </div>
        ) : (
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
             {filteredProducts.map(product => (
               <ShopProductCard key={product.id} product={product} navigate={navigate} addToCart={addToCart} />
             ))}
           </div>
        )}
      </div>
    </div>
  );
};

const ShopProductCard: React.FC<{ product: any, navigate: any, addToCart: any }> = ({ product, navigate, addToCart }) => {
   const [isAdded, setIsAdded] = useState(false);

   const handleAdd = (e: React.MouseEvent) => {
     e.stopPropagation();
     addToCart(product);
     setIsAdded(true);
     setTimeout(() => setIsAdded(false), 2000);
   };

   return (
     <div 
       onClick={() => navigate(`/product/${product.id}`)}
       className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group cursor-pointer hover:shadow-lg transition-all duration-300"
     >
       <div className="aspect-[4/5] bg-gray-100 relative overflow-hidden">
         <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
         {product.originalPrice && (
           <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded">Promo</span>
         )}
       </div>
       <div className="p-4">
         <p className="text-xs text-gray-500 font-bold uppercase mb-1">{product.category}</p>
         <h3 className="font-bold text-gray-900 line-clamp-2 mb-2 group-hover:text-primary transition-colors">{product.name}</h3>
         <div className="flex items-end justify-between">
           <div className="flex flex-col">
             <span className="text-lg font-black text-primary">{product.price.toLocaleString()} F</span>
             {product.originalPrice && <span className="text-xs text-gray-400 line-through">{product.originalPrice.toLocaleString()} F</span>}
           </div>
           <button 
             onClick={handleAdd}
             disabled={product.stock <= 0}
             className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-md active:scale-90 ${product.stock > 0 ? 'bg-gray-900 text-white hover:bg-primary' : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}
           >
             {isAdded ? <CheckCircle size={18} className="text-green-400"/> : <ShoppingBag size={18} />}
           </button>
         </div>
       </div>
     </div>
   );
};