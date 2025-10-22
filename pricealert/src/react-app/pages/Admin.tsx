import { useState, useEffect } from 'react';
import AdminLayout from '@/react-app/components/AdminLayout';
import { 
  Tag, 
  Users, 
  DollarSign,
  Eye,
  Clock
} from 'lucide-react';

interface AdminStats {
  totalOffers: number;
  activeOffers: number;
  totalUsers: number;
  todaySignups: number;
  totalRevenue: number;
  monthlyRevenue: number;
  totalPageViews: number;
  todayPageViews: number;
}

export default function Admin() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  const statCards = [
    {
      title: 'Ofertas Totais',
      value: stats?.totalOffers || 0,
      subtitle: `${stats?.activeOffers || 0} ativas`,
      icon: Tag,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      title: 'Usuários Totais',
      value: stats?.totalUsers || 0,
      subtitle: `${stats?.todaySignups || 0} hoje`,
      icon: Users,
      color: 'text-green-600',
      bg: 'bg-green-100',
    },
    {
      title: 'Receita Total',
      value: `R$ ${(stats?.totalRevenue || 0).toFixed(2)}`,
      subtitle: `R$ ${(stats?.monthlyRevenue || 0).toFixed(2)} este mês`,
      icon: DollarSign,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
    },
    {
      title: 'Visualizações',
      value: stats?.totalPageViews || 0,
      subtitle: `${stats?.todayPageViews || 0} hoje`,
      icon: Eye,
      color: 'text-orange-600',
      bg: 'bg-orange-100',
    },
  ];

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Administrativo</h1>
        <p className="text-gray-600 mt-2">Visão geral do PriceAlert+</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  <p className="text-sm text-gray-500 mt-1">{stat.subtitle}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bg}`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Ofertas Recentes</h3>
            <Clock className="w-5 h-5 text-gray-400" />
          </div>
          <div className="text-center text-gray-500 py-8">
            Nenhuma oferta recente encontrada
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Usuários Recentes</h3>
            <Users className="w-5 h-5 text-gray-400" />
          </div>
          <div className="text-center text-gray-500 py-8">
            Nenhum usuário recente encontrado
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
