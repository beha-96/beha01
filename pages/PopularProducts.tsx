
import React, { useEffect, useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { DatabaseService } from '../services/mockDatabase';
import { Product } from '../types';
import { ShoppingBag, Heart, Eye, TrendingUp, Filter, ArrowRight, CheckCircle, ThumbsDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProductWithStats extends Product {
    orderCount: number;
    popularityScore: number;
}

// Extracted card to handle local state
const PopularProductCard: React.FC<{ product: any, navigate: any, addToCart: any, index: number }> = ({ product, navigate, addToCart, index }) => {
    const [showAdded, setShowAdded] = useState(false);
    
    // Like/Dislike State
    const [isLiked, setIsLiked] = useState(false);
    const [isDisliked, setIsDisliked] = useState(false);
    const [localLikes, setLocalLikes] = useState(product.likes || 0);
    const [localDislikes, setLocalDislikes] = useState(product.dislikes || 0);

    const handleAddToCart = (e: React.MouseEvent) => {
        e.stopPropagation();
        addToCart(product);
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

    return (
        <div 
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group flex flex-col"
        >
            <div 
                className="relative aspect-[4/3] overflow-hidden cursor-pointer bg-gray-100"
                onClick={() => navigate(`/product/${product.id}`)}
            >
                <img 
                    src={product.images[0]} 
                    alt={product.name} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                {/* Rank Badge */}
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur text-gray-900 font-black px-3 py-1 rounded-full shadow-lg border border-gray-100 flex items-center gap-1 text-xs">
                    # {index + 1}
                </div>
                
                {/* Like / Dislike Interaction */}
                <div className={`absolute top-3 right-3 z-10 flex flex-col items-end gap-1 transition-opacity duration-300 ${isLiked || isDisliked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
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
                
                {/* Detailed Stats Overlay (Visible on Hover if not covered by controls) */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex justify-around text-white">
                    <div className="flex flex-col items-center">
                        <ShoppingBag size={16} className="mb-1 text-blue-400"/>
                        <span className="font-bold text-sm">{product.orderCount}</span>
                        <span className="text-[10px] opacity-80">Commandes</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <Eye size={16} className="mb-1 text-green-400"/>
                        <span className="font-bold text-sm">{product.views || 0}</span>
                        <span className="text-[10px] opacity-80">Vues</span>
                    </div>
                </div>
            </div>

            <div className="p-5 flex flex-col flex-grow">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{product.category}</div>
                <h3 
                    onClick={() => navigate(`/product/${product.id}`)}
                    className="font-bold text-gray-900 text-lg mb-2 leading-tight cursor-pointer hover:text-primary transition-colors line-clamp-2"
                >
                    {product.name}
                </h3>
                
                {/* Mobile Visible Stats */}
                <div className="flex gap-4 mb-4 text-xs text-gray-500 md:hidden">
                    <span className="flex items-center gap-1"><ShoppingBag size={12}/> {product.orderCount} vtes</span>
                    <span className="flex items-center gap-1"><Heart size={12}/> {localLikes}</span>
                    <span className="flex items-center gap-1"><Eye size={12}/> {product.views || 0}</span>
                </div>

                <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-50 relative">
                    <div className="flex flex-col">
                        <span className="text-xl font-extrabold text-primary">{product.price.toLocaleString()} F</span>
                        {product.originalPrice && (
                            <span className="text-xs text-gray-400 line-through decoration-red-400">{product.originalPrice.toLocaleString()} F</span>
                        )}
                    </div>
                    
                    {showAdded && (
                        <span className="absolute bottom-full mb-2 right-0 bg-green-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg z-20 whitespace-nowrap animate-fade-in flex items-center gap-1">
                            <CheckCircle size={10}/> Commande ajoutée au panier
                        </span>
                    )}

                    <button
                        onClick={handleAddToCart}
                        disabled={product.stock <= 0}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-md active:scale-90 ${
                            product.stock > 0 
                            ? 'bg-gray-900 text-white hover:bg-primary' 
                            : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                        }`}
                    >
                        <ShoppingBag size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export const PopularProducts: React.FC = () => {
    const { products, addToCart } = useApp();
    const navigate = useNavigate();
    const [stats, setStats] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [showAll, setShowAll] = useState(false);

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            const sales = await DatabaseService.getProductSalesStats();
            setStats(sales);
            setLoading(false);
        };
        fetchStats();
    }, []);

    const rankedProducts = useMemo(() => {
        return products
            .filter(p => p.active)
            .map(p => {
                const orderCount = stats[p.id] || 0;
                const likes = p.likes || 0;
                const views = p.views || 0;
                // Weighted Score: Orders * 5 + Likes * 2 + Views * 0.5
                const popularityScore = (orderCount * 5) + (likes * 2) + (views * 0.5);
                return { ...p, orderCount, popularityScore };
            })
            .sort((a, b) => b.popularityScore - a.popularityScore);
    }, [products, stats]);

    const displayedProducts = showAll ? rankedProducts : rankedProducts.slice(0, 6);

    if (loading) return <div className="p-20 text-center animate-pulse">Chargement des tendances...</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                        <TrendingUp className="text-red-500" size={32}/> 
                        Produits Populaires
                    </h1>
                    <p className="text-gray-500 mt-2 max-w-2xl">
                        Découvrez les articles les plus convoités du moment. 
                        Classement basé sur les commandes, les visites et les avis de nos clients.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {displayedProducts.map((product, index) => (
                    <PopularProductCard 
                        key={product.id} 
                        product={product} 
                        navigate={navigate} 
                        addToCart={addToCart} 
                        index={index} 
                    />
                ))}
            </div>

            {!showAll && rankedProducts.length > 6 && (
                <div className="mt-12 text-center">
                    <button 
                        onClick={() => setShowAll(true)}
                        className="bg-primary text-white px-8 py-4 rounded-full font-bold text-lg shadow-lg shadow-primary/30 hover:bg-emerald-700 hover:scale-105 transition-all flex items-center gap-2 mx-auto active:scale-95"
                    >
                        Voir tout le classement <ArrowRight size={20}/>
                    </button>
                    <p className="text-sm text-gray-500 mt-4">
                        Afficher les {rankedProducts.length - 6} autres produits populaires
                    </p>
                </div>
            )}
        </div>
    );
};
