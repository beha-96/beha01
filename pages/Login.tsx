
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../types';
import { Lock, User, AlertTriangle, ArrowLeft } from 'lucide-react';
import { DatabaseService } from '../services/mockDatabase';

export const Login: React.FC = () => {
  const { login } = useApp();
  const navigate = useNavigate();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<React.ReactNode>('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Check if user exists in DB
      const existingUser = await DatabaseService.getUserRaw(username);
      
      if (!existingUser) {
          setError("Identifiants incorrects.");
          setLoading(false);
          return;
      }

      // 2. Check if account is active
      if (!existingUser.isActive) {
        setError("Ce compte a été désactivé. Veuillez contacter l'administrateur.");
        setLoading(false);
        return;
      }

      // 3. Perform Login (Pass password for verification)
      const success = await login(username, password);
      
      if (success) {
        // 4. Automatic Redirection based on Role
        switch (existingUser.role) {
            case UserRole.ADMIN:
                navigate('/admin');
                break;
            case UserRole.INVESTOR:
                navigate('/investor');
                break;
            case UserRole.PARTNER:
                navigate('/partner');
                break;
            default:
                // Fallback for generic users or undefined roles
                navigate('/');
                break;
        }
      } else {
        setError("Identifiants incorrects.");
      }
    } catch (err) {
      console.error(err);
      setError("Une erreur technique est survenue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center bg-background px-4 animate-scale-in">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 border border-gray-100 relative overflow-hidden">
        
        {/* Back Button */}
        <button 
          onClick={() => navigate('/')}
          className="absolute top-8 left-8 text-gray-400 hover:text-gray-900 transition-colors p-1 hover:bg-gray-100 rounded-full"
          title="Retour à l'accueil"
        >
          <ArrowLeft size={24} />
        </button>

        <div className="text-center mb-10 pt-6">
           <div className="mx-auto w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4">
             <User size={32}/>
           </div>
          
          <h1 className="text-2xl font-extrabold text-gray-900">Connexion</h1>
          <p className="text-gray-500 text-sm mt-2">Accédez à votre espace professionnel</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 ml-1">Identifiant</label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:bg-white text-gray-900 placeholder-gray-400 transition-all font-medium outline-none"
                placeholder="Votre identifiant"
                required
              />
              <User className="absolute left-4 top-4 text-gray-400" size={20} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 ml-1">Mot de passe</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:bg-white text-gray-900 placeholder-gray-400 transition-all font-medium outline-none"
                placeholder="••••••••"
                required
              />
              <Lock className="absolute left-4 top-4 text-gray-400" size={20} />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 p-4 rounded-xl flex items-start justify-center gap-3 animate-slide-up border border-red-100">
               <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
               <div className="text-left font-medium">{error}</div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-secondary text-white py-4 rounded-xl font-bold text-lg hover:bg-slate-800 transition-all shadow-xl shadow-secondary/20 hover:shadow-2xl hover:-translate-y-1 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? 'Vérification...' : 'Se Connecter'}
          </button>
        </form>

        <div className="mt-8 text-center">
           <a href="#" className="text-xs text-gray-400 hover:text-primary transition-colors">Mot de passe oublié ? Contactez le support.</a>
        </div>
      </div>
    </div>
  );
};
