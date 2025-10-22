import { useState, useEffect } from 'react';
import Navbar from '@/react-app/components/Navbar';
import { Search, Filter, ExternalLink } from 'lucide-react';

interface Offer {
  id: string;
  title: string;
  store: string;
  domain: string;
  image_url?: string;
  url: string;
  price?: number;
  currency: string;
  drop_pct?: number;
  category?: string;
  tags: string[];
  active: boolean;
  pinned: boolean;
}

export default function Offers() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [filteredOffers, setFilteredOffers] = useState<Offer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('discount');

  const formatPrice = (price?: number) => {
    if (!price) return 'Consulte o preço';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  // Fetch offers from API
  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      const response = await fetch('/api/offers');
      if (response.ok) {
        const data = await response.json();
        setOffers(data.items || []);
        setFilteredOffers(data.items || []);
      }
    } catch (error) {
      console.error('Error fetching offers:', error);
    }
  };

  // Filter and sort offers
  useEffect(() => {
    let filtered = offers.filter(offer => {
      const matchesSearch = offer.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           offer.store.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStore = selectedStore === 'all' || offer.store === selectedStore;
      const matchesCategory = selectedCategory === 'all' || offer.category === selectedCategory;
      
      return matchesSearch && matchesStore && matchesCategory;
    });

    // Sort offers
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'discount':
          return (b.drop_pct || 0) - (a.drop_pct || 0);
        case 'price-low':
          return (a.price || 0) - (b.price || 0);
        case 'price-high':
          return (b.price || 0) - (a.price || 0);
        case 'rating':
          return 0; // No rating data from database
        default:
          return 0;
      }
    });

    setFilteredOffers(filtered);
  }, [offers, searchTerm, selectedStore, selectedCategory, sortBy]);

  const stores = [...new Set(offers.map(o => o.store))];
  const categories = [...new Set(offers.map(o => o.category).filter(Boolean))];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🔥 Ofertas em{' '}
            <span className="bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
              Destaque
            </span>
          </h1>
          <p className="text-xl text-gray-600">
            Produtos selecionados com os maiores descontos do momento
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
          <div className="grid md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todas as lojas</option>
              {stores.map(store => (
                <option key={store} value={store}>{store}</option>
              ))}
            </select>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todas as categorias</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="discount">Maior desconto</option>
              <option value="price-low">Menor preço</option>
              <option value="price-high">Maior preço</option>
              <option value="rating">Melhor avaliação</option>
            </select>
          </div>
        </div>

        {/* Results count */}
        <div className="mb-6">
          <p className="text-gray-600">
            Mostrando {filteredOffers.length} ofertas
          </p>
        </div>

        {/* Offers grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOffers.map((offer) => (
            <div key={offer.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className="relative">
                {offer.image_url ? (
                  <img
                    src={offer.image_url}
                    alt={offer.title}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                    <span className="text-gray-400 text-sm">Sem imagem</span>
                  </div>
                )}
                {offer.drop_pct && (
                  <div className="absolute top-4 left-4">
                    <span className="bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full">
                      -{offer.drop_pct}%
                    </span>
                  </div>
                )}
                <div className="absolute top-4 right-4">
                  <span className="bg-white/90 backdrop-blur-sm text-gray-700 text-xs px-2 py-1 rounded-md">
                    {offer.store}
                  </span>
                </div>
                {offer.pinned && (
                  <div className="absolute top-16 right-4">
                    <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-md">
                      Destaque
                    </span>
                  </div>
                )}
              </div>

              <div className="p-6">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded-md">
                    {offer.store}
                  </span>
                  {offer.category && (
                    <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded-md">
                      {offer.category}
                    </span>
                  )}
                </div>

                <h3 className="font-semibold text-gray-900 mb-3 line-clamp-2 leading-tight">
                  {offer.title}
                </h3>

                {offer.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {offer.tags.slice(0, 3).map((tag, index) => (
                      <span key={index} className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-md">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mb-4">
                  <div className="text-2xl font-bold text-green-600">
                    {formatPrice(offer.price)}
                  </div>
                </div>

                <a
                  href={offer.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <span>Ver Oferta</span>
                  <ExternalLink className="w-4 h-4 ml-2" />
                </a>
              </div>
            </div>
          ))}
        </div>

        {filteredOffers.length === 0 && (
          <div className="text-center py-12">
            <Filter className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma oferta encontrada
            </h3>
            <p className="text-gray-600">
              Tente ajustar os filtros ou termos de busca
            </p>
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-12 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-700">
            <strong>Aviso:</strong> Os preços e ofertas são atualizados regularmente, mas podem variar. 
            Sempre verifique o preço final no site da loja antes de finalizar a compra. 
            Alguns links podem gerar comissão para o PriceAlert+.
          </p>
        </div>
      </div>
    </div>
  );
}
