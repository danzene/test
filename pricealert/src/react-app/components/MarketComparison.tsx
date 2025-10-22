import { useState, useEffect } from 'react';
import { MarketSnapshotResponse } from '@/shared/types';
import { ExternalLink, RefreshCw, Store, TrendingDown, BarChart3 } from 'lucide-react';

interface MarketComparisonProps {
  productId: number;
}

export default function MarketComparison({ productId }: MarketComparisonProps) {
  const [data, setData] = useState<MarketSnapshotResponse | null>(null);
  const [loading, setLoading] = useState(true);
  // Removed updating state - everything is automatic now
  const [error, setError] = useState('');

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const getDomainName = (domain: string) => {
    const domainNames: Record<string, string> = {
      'amazon.com.br': 'Amazon',
      'mercadolivre.com.br': 'Mercado Livre',
      'magazineluiza.com.br': 'Magalu',
      'americanas.com.br': 'Americanas',
      'submarino.com.br': 'Submarino',
      'casasbahia.com.br': 'Casas Bahia',
      'kabum.com.br': 'KaBuM!',
    };
    
    return domainNames[domain] || domain.replace('www.', '').replace('.com.br', '').replace('.com', '');
  };

  const fetchMarketData = async () => {
    try {
      const response = await fetch(`/api/product/${productId}/market`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch market data');
      }

      const marketData = await response.json();
      setData(marketData);
      setError('');
    } catch (err) {
      setError('Erro ao carregar dados do mercado');
      console.error('Market data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh data every 10 seconds for 60 seconds (incremental loading)
  useEffect(() => {
    if (!data || data.items.length === 0) {
      const interval = setInterval(() => {
        fetchMarketData();
      }, 10000); // Every 10 seconds
      
      // Stop after 60 seconds
      const timeout = setTimeout(() => {
        clearInterval(interval);
      }, 60000);
      
      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [data]);

  useEffect(() => {
    fetchMarketData();
  }, [productId]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-3">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const { items, snapshotStats } = data || { items: [], snapshotStats: { min: null, max: null, avg: null, stores: 0 } };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Comparativo de Mercado (tempo real)
            </h2>
            {data?.verified && (
              <span className="inline-flex items-center text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                ✅ Verificado por ID
              </span>
            )}
            {data && !data.verified && (
              <span className="inline-flex items-center text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                ⚠️ Parcial — pode variar por modelo
              </span>
            )}
            {data?.disabled && (
              <span className="inline-flex items-center text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                🔍 Busca limitada
              </span>
            )}
          </div>
          {loading && (
            <div className="flex items-center text-sm text-gray-500">
              <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
              Buscando...
            </div>
          )}
        </div>

        {snapshotStats.stores > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-green-50 rounded-lg p-3">
              <span className="text-gray-500 block">Menor agora</span>
              <span className="font-semibold text-green-600">
                {snapshotStats.min ? formatPrice(snapshotStats.min) : 'N/A'}
              </span>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <span className="text-gray-500 block">Maior agora</span>
              <span className="font-semibold text-red-600">
                {snapshotStats.max ? formatPrice(snapshotStats.max) : 'N/A'}
              </span>
            </div>
            <div className="bg-blue-50 rounded-lg p-3">
              <span className="text-gray-500 block">Média de mercado</span>
              <span className="font-semibold text-blue-600">
                {snapshotStats.avg ? formatPrice(snapshotStats.avg) : 'N/A'}
              </span>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <span className="text-gray-500 block">Lojas analisadas</span>
              <span className="font-semibold text-purple-600">
                {snapshotStats.stores}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {items.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-gray-900 mb-3">
            Preços em outras lojas (menor → maior)
          </h3>
          {items.map((item, index) => {
            const isLowest = index === 0; // First item is lowest (already sorted)
            const isHighest = index === items.length - 1 && items.length > 1; // Last item is highest
            
            return (
              <div key={`${item.domain}-${index}`} className={`flex items-center gap-4 p-4 border rounded-xl transition-colors hover:border-gray-300 ${
                isLowest ? 'border-green-200 bg-green-50' : 
                isHighest && items.length > 2 ? 'border-red-200 bg-red-50' : 
                'border-gray-200'
              }`}>
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Store className="w-6 h-6 text-gray-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {getDomainName(item.domain)}
                    </span>
                    {isLowest && (
                      <span className="inline-flex items-center text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        <TrendingDown className="w-3 h-3 mr-1" />
                        Menor preço
                      </span>
                    )}
                    {item.confidence && (
                      <span className="inline-flex items-center text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        {Math.round(item.confidence * 100)}% confiança
                      </span>
                    )}
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    {formatPrice(item.price)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Atualizado: {new Date(item.collected_at).toLocaleString('pt-BR')}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    <span>Abrir</span>
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🛍️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {loading ? 'Buscando equivalentes...' : data?.disabled ? 'Busca limitada' : 'Nenhum equivalente encontrado'}
          </h3>
          <p className="text-gray-600 mb-4">
            {loading 
              ? 'Verificando preços em tempo real em outras lojas.'
              : data?.disabled 
                ? 'Configure SERP_API_KEY para busca completa em tempo real.'
                : 'Não encontramos o mesmo produto em outras lojas.'
            }
          </p>
          {data?.partial && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-700 text-sm">
                📍 Busca parcial concluída. Continuamos procurando mais lojas em segundo plano.
              </p>
            </div>
          )}
          {!loading && !data?.disabled && (
            <p className="text-sm text-gray-500">
              Dica: produtos com GTIN/EAN ou ASIN têm mais resultados.
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
