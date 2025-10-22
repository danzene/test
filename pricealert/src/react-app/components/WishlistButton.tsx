import { useState } from 'react';
import { useAuth } from '@getmocha/users-service/react';
import { Heart } from 'lucide-react';
import { useToast } from '@/react-app/hooks/useToast';

interface WishlistButtonProps {
  productId: number;
  isInWishlist?: boolean;
  onToggle?: (added: boolean) => void;
  className?: string;
}

export default function WishlistButton({ 
  productId, 
  isInWishlist = false, 
  onToggle,
  className = '' 
}: WishlistButtonProps) {
  const { user } = useAuth();
  const [inWishlist, setInWishlist] = useState(isInWishlist);
  const [loading, setLoading] = useState(false);
  const { success, error } = useToast();

  const handleToggle = async () => {
    if (!user) {
      error('Login necessário', 'Faça login para adicionar itens à sua lista de desejos');
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch(`/api/wishlist/${productId}`, {
        method: inWishlist ? 'DELETE' : 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const newState = !inWishlist;
        setInWishlist(newState);
        onToggle?.(newState);
        
        if (newState) {
          success('Adicionado!', 'Produto adicionado à sua lista de desejos');
        } else {
          success('Removido!', 'Produto removido da sua lista de desejos');
        }
      } else {
        const errorData = await response.json();
        error('Erro', errorData.error || 'Erro ao atualizar lista de desejos');
      }
    } catch (err) {
      error('Erro de conexão', 'Tente novamente mais tarde');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`p-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
        inWishlist
          ? 'bg-red-100 text-red-600 hover:bg-red-200'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      } ${className}`}
      title={inWishlist ? 'Remover da lista de desejos' : 'Adicionar à lista de desejos'}
    >
      <Heart className={`w-5 h-5 ${inWishlist ? 'fill-current' : ''}`} />
    </button>
  );
}
