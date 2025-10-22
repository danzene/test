import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { useAuth } from '@getmocha/users-service/react';
import Navbar from '@/react-app/components/Navbar';
import PriceChart from '@/react-app/components/PriceChart';
import AlertForm from '@/react-app/components/AlertForm';
import MarketComparison from '@/react-app/components/MarketComparison';
import WishlistButton from '@/react-app/components/WishlistButton';
import { EnhancedProductDetailsResponse } from '@/shared/types';
import { ExternalLink, ArrowLeft, Bell, CheckCircle, AlertTriangle } from 'lucide-react';

export default function Product() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [data, setData] = useState<EnhancedProductDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Removed reprocessing state - everything is automatic now

  const formatPrice = (price: number | null) => {
    if (!price) return 'Preço indisponível';
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
      kabum: 'KaBuM!',
      magazineluiza: 'Magalu',
    };
    return domainNames[domain] || domain;
  };

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`/api/product/${id}`, {
          credentials: 'include',
        });

        const data = await response.json();
        
        if (!response.ok || !data?.ok) {
          if (data?.error === 'not_found') {
            setError('Produto não encontrado');
          } else {
            setError('Erro ao carregar produto');
          }
          return;
        }

        setData(data);
      } catch (err) {
        setError('Erro ao carregar produto');
      } finally {
        setLoading(false);
      }
    };

    if (id && !isNaN(parseInt(id))) {
      fetchProduct();
    } else {
      setError('ID do produto inválido');
      setLoading(false);
    }
  }, [id]);

  const handleAlertCreated = async () => {
    // Refresh product data to get updated alert info
    const response = await fetch(`/api/product/${id}`, {
      credentials: 'include',
    });
    if (response.ok) {
      const productData = await response.json();
      setData(productData);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="animate-pulse text-gray-500">Carregando produto...</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <div className="text-red-500 text-xl mb-4">{error}</div>
          <Link to="/" className="text-blue-500 hover:underline">
            Voltar ao início
          </Link>
        </div>
      </div>
    );
  }

  const { 
    product, 
    pricePoints, 
    matches, 
    userAlert, 
    collectedFrom, 
    collectedAt, 
    source, 
    dataQuality, 
    stats90d, 
    verified,
    collecting 
  } = data;

  // Show collecting state ONLY if explicitly marked as collecting (never collected before)
  if (collecting) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link 
            to="/" 
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Link>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* Product header skeleton */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex flex-col sm:flex-row gap-6">
                  {product.image_url && (
                    <div className="flex-shrink-0">
                      <img
                        src={product.image_url}
                        alt={product.title}
                        className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <h1 className="text-xl font-semibold text-gray-900 mb-3 leading-tight">
                      {product.title}
                    </h1>
                    <div className="text-sm text-gray-600 mb-4">
                      Coletando dados do produto... Volte em alguns minutos.
                    </div>
                    <div className="animate-pulse">
                      <div className="h-8 bg-gray-200 rounded w-32 mb-4"></div>
                      <div className="h-4 bg-gray-200 rounded w-48"></div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Chart skeleton */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="text-center py-16">
                  <div className="text-4xl mb-4">📊</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Coletando dados de preço...
                  </h3>
                  <p className="text-gray-600">
                    Aguarde enquanto buscamos o histórico de preços
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const formatRelativeTime = (dateString: string | null) => {
    if (!dateString) return 'Data desconhecida';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) return 'Há poucos minutos';
    if (diffHours < 24) return `Há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    if (diffDays < 7) return `Há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
    
    return date.toLocaleDateString('pt-BR');
  };

  // Verification status now comes from the API response

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <Link 
          to="/" 
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Product header */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex flex-col sm:flex-row gap-6">
                {product.image_url && (
                  <div className="flex-shrink-0">
                    <img
                      src={product.image_url}
                      alt={product.title}
                      className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded-md">
                      {getDomainName(collectedFrom)}
                    </span>
                    {product.brand && (
                      <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded-md">
                        {product.brand}
                      </span>
                    )}
                    {verified ? (
                      <span className="inline-flex items-center text-sm bg-green-100 text-green-700 px-2 py-1 rounded-md">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        ✅ Verificado por ID
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-sm bg-yellow-100 text-yellow-700 px-2 py-1 rounded-md">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        ⚠️ Parcial — pode variar por modelo
                      </span>
                    )}
                  </div>
                  <h1 className="text-xl font-semibold text-gray-900 mb-3 leading-tight">
                    {product.title}
                  </h1>
                  <div className="text-sm text-gray-600 mb-3">
                    Coletado de {getDomainName(collectedFrom)} • {formatRelativeTime(collectedAt)} • Fonte: {source === 'adapter' ? 'Adaptador específico' : 'Extrator universal'} • {dataQuality === 'verified' ? 'Verificado' : 'Parcial'}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold text-green-600">
                      {formatPrice(product.last_price)}
                    </div>
                    <div className="flex items-center gap-3">
                      <WishlistButton productId={product.id} />
                      <a
                        href={product.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        <span>Ver na loja</span>
                        <ExternalLink className="w-4 h-4 ml-1" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Price chart with real stats */}
            <PriceChart 
              pricePoints={pricePoints.map(p => ({
                id: 0,
                product_id: Number(product.id),
                price: p.price,
                currency: 'BRL',
                captured_at: p.date,
                created_at: p.date,
                updated_at: p.date,
              }))} 
              stats90d={stats90d}
              targetPrice={userAlert?.target_price}
            />

            {/* Market comparison section */}
            <MarketComparison productId={product.id} />

            {/* Equivalent products */}
            {matches.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Mesma Peça em Outras Lojas</h2>
                <div className="space-y-4">
                  {matches.map((offer) => (
                    <div key={`${offer.domain}-${offer.productId}`} className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors">
                      {offer.imageUrl && (
                        <div className="flex-shrink-0">
                          <img
                            src={offer.imageUrl}
                            alt={offer.title}
                            className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md">
                            {getDomainName(offer.domain)}
                          </span>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-md">
                            {Math.round(offer.confidence * 100)}% confiança
                          </span>
                        </div>
                        <h3 className="font-medium text-gray-900 mb-1 line-clamp-1">
                          {offer.title}
                        </h3>
                        <div className="text-lg font-semibold text-green-600">
                          {formatPrice(offer.price)}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <a
                          href={offer.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <span>Ver oferta</span>
                          <ExternalLink className="w-4 h-4 ml-2" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Price alert */}
            {user ? (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center mb-4">
                  <Bell className="w-5 h-5 text-blue-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Alerta de Preço</h3>
                </div>
                
                {userAlert ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center text-green-700 mb-2">
                        <Bell className="w-4 h-4 mr-2" />
                        <span className="font-medium">Alerta ativo</span>
                      </div>
                      <p className="text-green-600">
                        Você será notificado quando o preço for igual ou menor que{' '}
                        <strong>{formatPrice(userAlert.target_price)}</strong>
                      </p>
                      <div className="mt-2 text-sm text-green-600">
                        Canais: {JSON.parse(userAlert.channels).join(', ')}
                      </div>
                    </div>
                  </div>
                ) : (
                  <AlertForm productId={product.id} onSuccess={handleAlertCreated} />
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="text-center">
                  <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Criar Alerta de Preço
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Faça login para receber alertas quando o preço baixar
                  </p>
                  <Link
                    to="/"
                    className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Fazer Login
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
