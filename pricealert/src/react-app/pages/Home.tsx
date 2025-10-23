import { useState } from 'react';
import { useAuth } from '@getmocha/users-service/react';
import Navbar from '@/react-app/components/Navbar';
import { Search, TrendingDown, Bell, Zap, Loader2 } from 'lucide-react';
import { useToast } from '@/react-app/hooks/useToast';

interface ProductResult {
  title: string;
  price: number;
  domain: string;
  url: string;
  imageUrl?: string;
  confidence: number;
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ProductResult[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductResult | null>(null);
  const [targetPrice, setTargetPrice] = useState('');
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(true);
  const [creatingAlert, setCreatingAlert] = useState(false);
  
  const { user, redirectToLogin } = useAuth();
  const { success, error } = useToast();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      redirectToLogin();
      return;
    }
    
    const query = searchQuery.trim();
    if (query.length < 2) {
      error('Digite pelo menos 2 caracteres');
      return;
    }
    
    setLoading(true);
    setResults([]);
    setSelectedProduct(null);
    
    try {
      const response = await fetch('/api/search-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ query, maxResults: 5 }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        error('Erro na busca', data.error || 'Tente novamente');
        return;
      }
      
      if (data.results.length === 0) {
        if (data.warning) {
          error('Nenhum produto encontrado', data.warning);
        } else {
          error('Nenhum produto encontrado', 'Tente um termo de busca diferente ou mais específico');
        }
        return;
      }
      
      setResults(data.results);
      success(`Encontrados ${data.results.length} produtos`);
      
    } catch (err) {
      error('Erro de conexão', 'Tente novamente');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAlert = async () => {
    if (!selectedProduct || !targetPrice) {
      error('Selecione um produto e defina um preço');
      return;
    }
    
    const channels = [];
    if (notifyEmail) channels.push('email');
    if (notifyWhatsapp) channels.push('whatsapp');
    
    if (channels.length === 0) {
      error('Selecione pelo menos um canal de notificação');
      return;
    }
    
    setCreatingAlert(true);
    
    try {
      // Passo 1: Ingerir o produto
      console.log('📥 Ingesting product:', selectedProduct.title);
      
      const ingestResponse = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ url: selectedProduct.url }),
      });
      
      const ingestData = await ingestResponse.json();
      
      if (!ingestData.ok) {
        console.error('Ingest failed:', ingestData);
        error('Erro ao adicionar produto');
        return;
      }
      
      const productId = ingestData.productId;
      console.log('✅ Product ingested with ID:', productId);
      
      // Passo 2: Criar alerta
      console.log('🔔 Creating alert for product:', productId);
      
      const alertResponse = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          productId: productId,
          targetPrice: parseFloat(targetPrice),
          channels,
        }),
      });
      
      if (!alertResponse.ok) {
        const errorData = await alertResponse.json();
        console.error('Alert creation failed:', errorData);
        error('Erro ao criar alerta');
        return;
      }
      
      console.log('✅ Alert created successfully');
      
      // Passo 3: Ir para dashboard
      success('Alerta criado com sucesso!');
      
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1500);
      
    } catch (err) {
      console.error('Error creating alert:', err);
      error('Erro ao criar alerta');
    } finally {
      setCreatingAlert(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const getDomainName = (domain: string) => {
    const names: Record<string, string> = {
      'amazon.com.br': 'Amazon',
      'mercadolivre.com.br': 'Mercado Livre',
      'magazineluiza.com.br': 'Magalu',
      'kabum.com.br': 'KaBuM',
      'americanas.com.br': 'Americanas',
    };
    return names[domain] || domain;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Encontre o melhor{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              preço
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-10 leading-relaxed">
            Digite o nome do produto. Nós buscamos as 5 lojas mais baratas. 
            Você define o preço que quer pagar e recebe alerta por email ou WhatsApp.
          </p>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-12">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ex: iPhone 15 Pro, PS5, Notebook..."
                  className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !searchQuery.trim()}
                className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Buscar
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Results Section */}
          {results.length > 0 && (
            <div className="max-w-2xl mx-auto mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">TOP 5 Menores Preços</h2>
              
              <div className="space-y-3">
                {results.map((product, index) => (
                  <div
                    key={`${product.domain}-${index}`}
                    onClick={() => setSelectedProduct(product)}
                    className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      selectedProduct === product
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-blue-300'
                    }`}
                  >
                    {product.imageUrl && (
                      <img
                        src={product.imageUrl}
                        alt={product.title}
                        className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                        onError={(e) => {
                          e.currentTarget.src = 'https://via.placeholder.com/80x80?text=Sem+Imagem';
                        }}
                      />
                    )}
                    
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-600 mb-1">
                        #{index + 1} - {product.title}
                      </p>
                      <p className="text-sm text-gray-500 mb-2">
                        {getDomainName(product.domain)}
                      </p>
                      <a
                        href={product.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Ver na loja →
                      </a>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">
                        {formatPrice(product.price)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alert Configuration */}
          {selectedProduct && (
            <div className="max-w-2xl mx-auto bg-white rounded-2xl p-8 shadow-lg border border-gray-100 mb-12">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Configurar Alerta</h3>
              
              <div className="mb-6">
                <p className="text-gray-600 mb-2">
                  Você selecionou: <strong>{selectedProduct.title}</strong>
                </p>
                <p className="text-gray-600 mb-4">
                  Preço atual: <strong className="text-2xl text-green-600">
                    {formatPrice(selectedProduct.price)}
                  </strong>
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quero pagar até:
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R$</span>
                  <input
                    type="number"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="mb-6">
                <p className="block text-sm font-medium text-gray-700 mb-3">Como deseja ser notificado?</p>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={notifyEmail}
                      onChange={(e) => setNotifyEmail(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600"
                    />
                    <span className="ml-3 text-gray-700">📧 Email</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={notifyWhatsapp}
                      onChange={(e) => setNotifyWhatsapp(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600"
                    />
                    <span className="ml-3 text-gray-700">💬 WhatsApp</span>
                  </label>
                </div>
              </div>

              <button
                onClick={handleCreateAlert}
                disabled={creatingAlert || !targetPrice}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-lg hover:shadow-lg disabled:opacity-50 transition-all duration-200 font-semibold flex items-center justify-center gap-2"
              >
                {creatingAlert ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Criando alerta...
                  </>
                ) : (
                  <>
                    <Bell className="w-5 h-5" />
                    Criar Alerta
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mt-20">
          <div className="text-center p-8 bg-white/50 backdrop-blur-sm rounded-2xl border border-gray-100">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Search className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Busca Inteligente</h3>
            <p className="text-gray-600">
              Digite o nome e nós procuramos em todas as lojas do Brasil.
            </p>
          </div>

          <div className="text-center p-8 bg-white/50 backdrop-blur-sm rounded-2xl border border-gray-100">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <TrendingDown className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Top 5 Preços</h3>
            <p className="text-gray-600">
              Mostramos os 5 menores preços do menor pro maior.
            </p>
          </div>

          <div className="text-center p-8 bg-white/50 backdrop-blur-sm rounded-2xl border border-gray-100">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Bell className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Alertas Instantâneos</h3>
            <p className="text-gray-600">
              Receba notificação por email ou WhatsApp quando o preço baixar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
