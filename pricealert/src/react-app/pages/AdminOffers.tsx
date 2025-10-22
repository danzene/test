import { useState, useEffect } from 'react';
import AdminLayout from '@/react-app/components/AdminLayout';
import { 
  Plus, 
  Search, 
  Filter,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Pin,
  PinOff
} from 'lucide-react';
import { useToast } from '@/react-app/hooks/useToast';

interface OfferItem {
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
  expires_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface OfferFormData {
  title: string;
  store: string;
  domain: string;
  image_url: string;
  url: string;
  price: string;
  currency: string;
  drop_pct: string;
  category: string;
  tags: string;
  active: boolean;
  pinned: boolean;
  expires_at: string;
}

export default function AdminOffers() {
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState<OfferItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const { success, error } = useToast();

  const [formData, setFormData] = useState<OfferFormData>({
    title: '',
    store: '',
    domain: '',
    image_url: '',
    url: '',
    price: '',
    currency: 'BRL',
    drop_pct: '',
    category: '',
    tags: '',
    active: true,
    pinned: false,
    expires_at: '',
  });

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      const response = await fetch('/api/admin/offers', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setOffers(data.items || []);
      } else if (response.status === 403) {
        error('Acesso negado', 'Você não tem permissão para acessar esta área');
      }
    } catch (err) {
      error('Erro', 'Falha ao carregar ofertas');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.url || !formData.store) {
      error('Erro de validação', 'Título, URL e loja são obrigatórios');
      return;
    }

    try {
      const payload = {
        ...formData,
        price: formData.price ? parseFloat(formData.price) : null,
        drop_pct: formData.drop_pct ? parseFloat(formData.drop_pct) : null,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        expires_at: formData.expires_at || null,
      };

      const response = await fetch(
        editingOffer ? `/api/admin/offers/${editingOffer.id}` : '/api/admin/offers',
        {
          method: editingOffer ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(payload),
        }
      );

      if (response.ok) {
        success(
          editingOffer ? 'Oferta atualizada!' : 'Oferta criada!',
          'A oferta foi salva com sucesso'
        );
        setShowForm(false);
        setEditingOffer(null);
        resetForm();
        fetchOffers();
      } else {
        const errorData = await response.json();
        error('Erro ao salvar', errorData.error || 'Tente novamente');
      }
    } catch (err) {
      error('Erro de conexão', 'Verifique sua conexão e tente novamente');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      store: '',
      domain: '',
      image_url: '',
      url: '',
      price: '',
      currency: 'BRL',
      drop_pct: '',
      category: '',
      tags: '',
      active: true,
      pinned: false,
      expires_at: '',
    });
  };

  const handleEdit = (offer: OfferItem) => {
    setEditingOffer(offer);
    setFormData({
      title: offer.title,
      store: offer.store,
      domain: offer.domain,
      image_url: offer.image_url || '',
      url: offer.url,
      price: offer.price?.toString() || '',
      currency: offer.currency,
      drop_pct: offer.drop_pct?.toString() || '',
      category: offer.category || '',
      tags: offer.tags.join(', '),
      active: offer.active,
      pinned: offer.pinned,
      expires_at: offer.expires_at ? offer.expires_at.split('T')[0] : '',
    });
    setShowForm(true);
  };

  const handleDelete = async (offerId: string) => {
    if (!confirm('Tem certeza que deseja deletar esta oferta?')) return;

    try {
      const response = await fetch(`/api/admin/offers/${offerId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        success('Oferta deletada!', 'A oferta foi removida com sucesso');
        fetchOffers();
      } else {
        error('Erro ao deletar', 'Tente novamente');
      }
    } catch (err) {
      error('Erro de conexão', 'Verifique sua conexão e tente novamente');
    }
  };

  const handleToggleActive = async (offer: OfferItem) => {
    try {
      const response = await fetch(`/api/admin/offers/${offer.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ active: !offer.active }),
      });

      if (response.ok) {
        success(
          offer.active ? 'Oferta desativada' : 'Oferta ativada',
          'Status atualizado com sucesso'
        );
        fetchOffers();
      }
    } catch (err) {
      error('Erro', 'Falha ao atualizar status');
    }
  };

  const handleTogglePin = async (offer: OfferItem) => {
    try {
      const response = await fetch(`/api/admin/offers/${offer.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ pinned: !offer.pinned }),
      });

      if (response.ok) {
        success(
          offer.pinned ? 'Oferta despregada' : 'Oferta pregada',
          'Status atualizado com sucesso'
        );
        fetchOffers();
      }
    } catch (err) {
      error('Erro', 'Falha ao atualizar status');
    }
  };

  const filteredOffers = offers.filter(offer => {
    const matchesSearch = offer.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         offer.store.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesActive = filterActive === 'all' || 
                         (filterActive === 'active' && offer.active) ||
                         (filterActive === 'inactive' && !offer.active);
    const matchesCategory = filterCategory === 'all' || offer.category === filterCategory;
    
    return matchesSearch && matchesActive && matchesCategory;
  });

  const formatPrice = (price?: number) => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const categories = [...new Set(offers.map(o => o.category).filter(Boolean))];

  return (
    <AdminLayout>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gerenciar Ofertas</h1>
            <p className="text-gray-600 mt-2">Administre as ofertas do PriceAlert+</p>
          </div>
          <button
            onClick={() => {
              setShowForm(true);
              setEditingOffer(null);
              resetForm();
            }}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Oferta
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar ofertas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos os status</option>
            <option value="active">Apenas ativas</option>
            <option value="inactive">Apenas inativas</option>
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todas as categorias</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>

          <div className="flex items-center">
            <Filter className="w-4 h-4 text-gray-400 mr-2" />
            <span className="text-sm text-gray-600">
              {filteredOffers.length} de {offers.length} ofertas
            </span>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                {editingOffer ? 'Editar Oferta' : 'Nova Oferta'}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Título *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Loja *
                  </label>
                  <input
                    type="text"
                    value={formData.store}
                    onChange={(e) => setFormData({ ...formData, store: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: Amazon, Magalu"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Domínio
                  </label>
                  <input
                    type="text"
                    value={formData.domain}
                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="amazon.com.br"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoria
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Eletrônicos, Livros, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preço (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Desconto (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.drop_pct}
                    onChange={(e) => setFormData({ ...formData, drop_pct: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL *
                </label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL da Imagem
                </label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (separadas por vírgula)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="promoção, oferta, limitada"
                />
              </div>

              <div className="mb-6 flex items-center space-x-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Ativa</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.pinned}
                    onChange={(e) => setFormData({ ...formData, pinned: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Destacar</span>
                </label>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingOffer(null);
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingOffer ? 'Atualizar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Offers Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Carregando ofertas...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Oferta
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Loja
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Preço
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Criada
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOffers.map((offer) => (
                  <tr key={offer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {offer.image_url && (
                          <img
                            src={offer.image_url}
                            alt={offer.title}
                            className="h-10 w-10 rounded-lg object-cover mr-3"
                          />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900 line-clamp-2">
                            {offer.title}
                          </div>
                          {offer.category && (
                            <div className="text-xs text-gray-500">{offer.category}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{offer.store}</div>
                      <div className="text-xs text-gray-500">{offer.domain}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatPrice(offer.price)}
                      </div>
                      {offer.drop_pct && (
                        <div className="text-xs text-green-600">-{offer.drop_pct}%</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          offer.active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {offer.active ? 'Ativa' : 'Inativa'}
                        </span>
                        {offer.pinned && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            Destacada
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(offer.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleToggleActive(offer)}
                          className="text-gray-400 hover:text-gray-600"
                          title={offer.active ? 'Desativar' : 'Ativar'}
                        >
                          {offer.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        
                        <button
                          onClick={() => handleTogglePin(offer)}
                          className="text-gray-400 hover:text-gray-600"
                          title={offer.pinned ? 'Desfixar' : 'Fixar'}
                        >
                          {offer.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                        </button>
                        
                        <button
                          onClick={() => handleEdit(offer)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => handleDelete(offer.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Deletar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredOffers.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-500">
                  {searchTerm || filterActive !== 'all' || filterCategory !== 'all'
                    ? 'Nenhuma oferta encontrada com os filtros aplicados'
                    : 'Nenhuma oferta cadastrada ainda'
                  }
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
