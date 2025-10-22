import { useState, useEffect } from 'react';
import { useAuth } from '@getmocha/users-service/react';
import { Link } from 'react-router';
import Navbar from '@/react-app/components/Navbar';
import LoadingSpinner from '@/react-app/components/LoadingSpinner';
import WishlistButton from '@/react-app/components/WishlistButton';
import { Heart, ExternalLink, Plus, Filter } from 'lucide-react';
import { WishlistResponse } from '@/shared/types';

export default function Wishlist() {
  const { user, redirectToLogin } = useAuth();
  const [wishlist, setWishlist] = useState<WishlistResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  const formatPrice = (price: number | null) => {
    if (!price) return 'Indisponível';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const getDomainName = (domain: string) => {
    const domainNames: Record<string, string> = {
      amazon: 'Amazon',
      mercadolivre: 'Mercado Livre',
      americanas: 'Americanas',
      submarino: 'Submarino',
      casasbahia: 'Casas Bahia',
    };
    return domainNames[domain] || domain;
  };

  useEffect(() => {
    if (!user) {
      redirectToLogin();
      return;
    }

    fetchWishlist();
  }, [user, redirectToLogin]);

  const fetchWishlist = async () => {
    try {
      const response = await fetch('/api/me/wishlist', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setWishlist(data);
      }
    } catch (error) {
      console.error('Error fetching wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWishlistToggle = (productId: number, added: boolean) => {
    if (wishlist && !added) {
      // Remove from local state
      setWishlist({
        ...wishlist,
        items: wishlist.items.filter(item => item.id !== productId)
      });
    }
  };

  const getFilteredAndSortedItems = () => {
    if (!wishlist) return [];

    let filtered = wishlist.items;

    // Apply domain filter
    if (filter !== 'all') {
      filtered = filtered.filter(item => item.domain === filter);
    }

    // Apply sorting
    switch (sortBy) {
      case 'recent':
        filtered.sort((a, b) => new Date(b.wishlist_added_at).getTime() - new Date(a.wishlist_added_at).getTime());
        break;
      case 'price-low':
        filtered.sort((a, b) => (a.last_price || 0) - (b.last_price || 0));
        break;
      case 'price-high':
        filtered.sort((a, b) => (b.last_price || 0) - (a.last_price || 0));
        break;
      case 'name':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    return filtered;
  };

  if (!user) {
    return <div>Redirecionando...</div>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" text="Carregando lista de desejos..." />
        </div>
      </div>
    );
  }

  const filteredItems = getFilteredAndSortedItems();
  const domains = wishlist ? [...new Set(wishlist.items.map(item => item.domain))] : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Heart className="w-8 h-8 text-red-500 mr-3 fill-current" />
            <h1 className="text-3xl font-bold text-gray-900">Lista de Desejos</h1>
          </div>
          <p className="text-gray-600">Produtos que você gostaria de acompanhar</p>
        </div>

        {wishlist && wishlist.items.length > 0 ? (
          <>
            {/* Filters and sorting */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filtrar por loja:
                  </label>
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">Todas as lojas</option>
                    {domains.map(domain => (
                      <option key={domain} value={domain}>{getDomainName(domain)}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ordenar por:
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="recent">Mais recente</option>
                    <option value="price-low">Menor preço</option>
                    <option value="price-high">Maior preço</option>
                    <option value="name">Nome</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Results count */}
            <div className="mb-6">
              <p className="text-gray-600">
                Mostrando {filteredItems.length} de {wishlist.items.length} itens
              </p>
            </div>

            {/* Wishlist items */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="relative">
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <div className="absolute top-4 right-4">
                      <WishlistButton
                        productId={item.id}
                        isInWishlist={true}
                        onToggle={(added) => handleWishlistToggle(item.id, added)}
                        className="bg-white/90 backdrop-blur-sm"
                      />
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md">
                        {getDomainName(item.domain)}
                      </span>
                      {item.brand && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-md">
                          {item.brand}
                        </span>
                      )}
                    </div>

                    <h3 className="font-semibold text-gray-900 mb-3 line-clamp-2 leading-tight">
                      {item.title}
                    </h3>

                    {item.wishlist_notes && (
                      <div className="mb-3 p-2 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">{item.wishlist_notes}</p>
                      </div>
                    )}

                    <div className="text-2xl font-bold text-green-600 mb-4">
                      {formatPrice(item.last_price)}
                    </div>

                    <div className="flex gap-2">
                      <Link
                        to={`/product/${item.id}`}
                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-center text-sm font-medium"
                      >
                        Ver Detalhes
                      </Link>
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                        title="Ver na loja"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>

                    <div className="mt-3 text-xs text-gray-500">
                      Adicionado em {new Date(item.wishlist_added_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredItems.length === 0 && (
              <div className="text-center py-12">
                <Filter className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhum item encontrado
                </h3>
                <p className="text-gray-600">
                  Tente ajustar os filtros para ver mais produtos
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <Heart className="w-20 h-20 text-gray-300 mx-auto mb-6" />
            <h3 className="text-2xl font-medium text-gray-900 mb-4">
              Sua lista de desejos está vazia
            </h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Adicione produtos que você gostaria de acompanhar e receba notificações quando os preços baixarem
            </p>
            <Link
              to="/"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Plus className="w-5 h-5 mr-2" />
              Adicionar Primeiro Produto
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
