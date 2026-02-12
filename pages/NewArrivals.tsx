
import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShoppingBag, Zap, Clock, CheckCircle, Heart, ThumbsDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DatabaseService } from '../services/mockDatabase';

// Extracted card to handle local state
const NewArrivalCard: React.FC<{ product: any, navigate: any, addToCart: any }> = ({ product, navigate, addToCart }) => {
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
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group flex flex-col cursor-pointer"
            onClick={() => navigate(`/product/${product.id}`)}
        >
            <div className="relative aspect-[4/5] overflow-hidden bg-gray-100">
                <img 
                    src={product.images[0]} 
                    alt={product.name} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                {/* New Badge */}
                <div className="absolute top-3 left-3 bg-yellow-400 text-yellow-900 font-black px-2 py-1 rounded text-[10px] uppercase tracking-wider shadow-sm flex items-center gap-1">
                    <Clock size={10}/> Nouveau
                </div>

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
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 bg-gray-50 w-fit px-2 py-0.5 rounded">{product.category}</div>
                <h3 className="font-bold text-gray-900 text-sm mb-2 leading-tight line-clamp-2">
                    {product.name}
                </h3>
                
                <div className="mt-auto flex items-end justify-between pt-2 relative">
                    <div className="flex flex-col">
                        <span className="text-base font-extrabold text-primary">{product.price.toLocaleString()} F</span>
                        {product.originalPrice && (
                            <span className="text-[10px] text-gray-400 line-through decoration-red-400">{product.originalPrice.toLocaleString()} F</span>
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
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-md active:scale-90 ${
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

export const NewArrivals: React.FC = () => {
    const { products, addToCart } = useApp();
    const navigate = useNavigate();

    const newArrivals = useMemo(() => {
        return products
            .filter(p => p.active)
            .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
            .slice(0, 20); // Top 20 new items
    }, [products]);

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                        <Zap className="text-yellow-500" size={32}/> 
                        Nouveaux Arrivages
                    </h1>
                    <p className="text-gray-500 mt-2 max-w-2xl">
                        Explorez nos dernières nouveautés. Soyez les premiers à découvrir nos collections exclusives.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
                {newArrivals.map((product, index) => (
                    <NewArrivalCard 
                        key={product.id} 
                        product={product} 
                        navigate={navigate} 
                        addToCart={addToCart} 
                    />
                ))}
            </div>
        </div>
    );
};
