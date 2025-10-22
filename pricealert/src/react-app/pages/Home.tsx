import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@getmocha/users-service/react';
import Navbar from '@/react-app/components/Navbar';
import { isLikelyUrl } from '@/react-app/utils/isLikelyUrl';
import { Search, TrendingDown, Bell, Zap } from 'lucide-react';

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user, redirectToLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      redirectToLogin();
      return;
    }

    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setError('Por favor, insira uma URL válida');
      return;
    }

    // Universal URL validation - accept any http(s) URL
    if (!isLikelyUrl(trimmedUrl)) {
      setError('Por favor, insira uma URL válida (deve começar com http:// ou https://)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ url: trimmedUrl }),
      });

      const data = await response.json();
      
      if (!response.ok || !data?.ok || !data?.productId) {
        if (response.status === 429) {
          setError('Limite de buscas diário atingido. Considere fazer upgrade do seu plano.');
        } else {
          setError(data?.error || 'Erro ao processar a URL. Verifique se é um link válido de produto.');
        }
        return;
      }

      // Navigate with the guaranteed productId
      navigate(`/product/${data.productId}`);
    } catch (err) {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Monitore preços e{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              economize dinheiro
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-10 leading-relaxed">
            Adicione produtos de Amazon, Mercado Livre e outras lojas. 
            Receba alertas quando o preço baixar e encontre produtos similares mais baratos.
          </p>

          {/* Search Form */}
          <div className="max-w-2xl mx-auto">
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Cole aqui o link do produto (Amazon, Mercado Livre...)"
                  className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !url.trim()}
                className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {loading ? 'Processando...' : 'Monitorar Preço'}
              </button>
            </form>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}

            {!user && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-700">
                  <button 
                    onClick={redirectToLogin}
                    className="font-semibold underline hover:no-underline"
                  >
                    Faça login
                  </button>{' '}
                  para começar a monitorar preços
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center p-8 bg-white/50 backdrop-blur-sm rounded-2xl border border-gray-100">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <TrendingDown className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Histórico de Preços</h3>
            <p className="text-gray-600">
              Veja gráficos dos últimos 90 dias e identifique os melhores momentos para comprar.
            </p>
          </div>

          <div className="text-center p-8 bg-white/50 backdrop-blur-sm rounded-2xl border border-gray-100">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Bell className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Alertas Inteligentes</h3>
            <p className="text-gray-600">
              Receba notificações por email ou WhatsApp quando o preço atingir seu valor desejado.
            </p>
          </div>

          <div className="text-center p-8 bg-white/50 backdrop-blur-sm rounded-2xl border border-gray-100">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Produtos Similares</h3>
            <p className="text-gray-600">
              Encontre automaticamente produtos equivalentes em outras lojas com preços melhores.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16 p-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl text-white">
          <h2 className="text-3xl font-bold mb-4">Pronto para economizar?</h2>
          <p className="text-xl mb-8 opacity-90">
            Junte-se a milhares de usuários que já economizam com o PriceAlert+
          </p>
          {!user ? (
            <button
              onClick={redirectToLogin}
              className="bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              Começar Gratuitamente
            </button>
          ) : (
            <div className="text-lg opacity-90">
              Cole um link de produto acima para começar!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
