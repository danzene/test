import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@getmocha/users-service/react';
import Navbar from '@/react-app/components/Navbar';
import LoadingSpinner from '@/react-app/components/LoadingSpinner';
import { UserLimitsResponse, DashboardResponse } from '@/shared/types';
import { Bell, TrendingDown, Crown, Plus, Trash2, Heart, History, Clock } from 'lucide-react';
import { useToast } from '@/react-app/hooks/useToast';

export default function Dashboard() {
  const { user, redirectToLogin } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [limits, setLimits] = useState<UserLimitsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingAlert, setDeletingAlert] = useState<number | null>(null);
  const { success, error } = useToast();

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

  const getPlanName = (plan: string) => {
    const planNames: Record<string, string> = {
      FREE: 'Gratuito',
      GOLD: 'Gold',
      PREMIUM: 'Premium',
    };
    return planNames[plan] || plan;
  };

  const getPlanColor = (plan: string) => {
    const planColors: Record<string, string> = {
      FREE: 'bg-gray-100 text-gray-700',
      GOLD: 'bg-yellow-100 text-yellow-700',
      PREMIUM: 'bg-purple-100 text-purple-700',
    };
    return planColors[plan] || 'bg-gray-100 text-gray-700';
  };

  useEffect(() => {
    if (!user) {
      redirectToLogin();
      return;
    }

    const fetchDashboardData = async () => {
      try {
        const [dashboardResponse, limitsResponse] = await Promise.all([
          fetch('/api/me/dashboard', { credentials: 'include' }),
          fetch('/api/me/limits', { credentials: 'include' }),
        ]);

        if (dashboardResponse.ok) {
          const data = await dashboardResponse.json();
          setDashboardData(data);
        }

        if (limitsResponse.ok) {
          const limitsData = await limitsResponse.json();
          setLimits(limitsData);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, redirectToLogin]);

  const handleDeleteAlert = async (alertId: number) => {
    setDeletingAlert(alertId);
    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        if (dashboardData) {
          setDashboardData({
            ...dashboardData,
            alerts: dashboardData.alerts.filter(alert => alert.id !== alertId)
          });
        }
        success('Alerta removido', 'O alerta foi desativado com sucesso');
      } else {
        throw new Error('Failed to delete alert');
      }
    } catch (err) {
      error('Erro ao remover alerta', 'Tente novamente mais tarde');
    } finally {
      setDeletingAlert(null);
    }
  };

  if (!user) {
    return <div>Redirecionando...</div>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" text="Carregando dashboard..." />
        </div>
      </div>
    );
  }

  const usagePercentage = limits ? {
    items: Math.min((limits.usage.monitoredItems / limits.limits.maxMonitoredItems) * 100, 100),
    searches: Math.min((limits.usage.searchesToday / limits.limits.maxSearchesPerDay) * 100, 100),
    wishlist: dashboardData ? Math.min((dashboardData.wishlistCount / (limits.limits as any).maxWishlistItems) * 100, 100) : 0,
  } : { items: 0, searches: 0, wishlist: 0 };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Gerencie seus alertas de preço e monitore seu consumo</p>
        </div>

        {/* Plan and Usage Stats */}
        {limits && dashboardData && (
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Plano Atual</h3>
                <Crown className="w-5 h-5 text-yellow-500" />
              </div>
              <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getPlanColor(limits.plan)}`}>
                {getPlanName(limits.plan)}
              </div>
              {limits.plan === 'FREE' && (
                <div className="mt-4">
                  <Link
                    to="/pricing"
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Fazer upgrade →
                  </Link>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Itens Monitorados</h3>
                <Bell className="w-5 h-5 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-2">
                {limits.usage.monitoredItems} / {limits.limits.maxMonitoredItems}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${usagePercentage.items}%` }}
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Buscas Hoje</h3>
                <TrendingDown className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-2">
                {limits.usage.searchesToday} / {limits.limits.maxSearchesPerDay}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${usagePercentage.searches}%` }}
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Lista de Desejos</h3>
                <Heart className="w-5 h-5 text-red-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-2">
                {dashboardData.wishlistCount} / {(limits.limits as any).maxWishlistItems}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-red-500 h-2 rounded-full transition-all"
                  style={{ width: `${usagePercentage.wishlist}%` }}
                />
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Active Alerts */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Alertas Ativos</h2>
                <Link
                  to="/"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar
                </Link>
              </div>
            </div>

            <div className="p-6">
              {dashboardData && dashboardData.alerts.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nenhum produto monitorado
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Adicione produtos para receber alertas quando o preço baixar
                  </p>
                  <Link
                    to="/"
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Adicionar Primeiro Produto
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {dashboardData && dashboardData.alerts.map((alert) => (
                    <div key={alert.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors">
                      {alert.image_url && (
                        <div className="flex-shrink-0">
                          <img
                            src={alert.image_url}
                            alt={alert.title}
                            className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md">
                            {getDomainName(alert.domain)}
                          </span>
                        </div>
                        <h3 className="font-medium text-gray-900 mb-1 line-clamp-1">
                          {alert.title}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>Alerta: <strong>{formatPrice(alert.target_price)}</strong></span>
                          <span>Atual: <strong>{formatPrice(alert.last_price)}</strong></span>
                          <span>Canais: {JSON.parse(alert.channels).join(', ')}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/product/${alert.product_id}`}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Ver detalhes
                        </Link>
                        <button
                          onClick={() => handleDeleteAlert(alert.id)}
                          disabled={deletingAlert === alert.id}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                          title="Remover alerta"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Alert History */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center">
                <History className="w-5 h-5 text-gray-600 mr-2" />
                <h2 className="text-xl font-semibold text-gray-900">Histórico de Alertas</h2>
              </div>
            </div>

            <div className="p-6">
              {dashboardData && dashboardData.alertHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600">Nenhum alerta disparado ainda</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dashboardData && dashboardData.alertHistory.slice(0, 10).map((historyItem) => (
                    <div key={historyItem.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 line-clamp-1">
                          {historyItem.title}
                        </p>
                        <p className="text-xs text-gray-600">
                          Alerta: {formatPrice(historyItem.target_price)} • 
                          Preço: {formatPrice(historyItem.actual_price)}
                        </p>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(historyItem.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
