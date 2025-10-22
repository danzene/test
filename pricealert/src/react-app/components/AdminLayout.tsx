import { ReactNode } from 'react';
import { useAuth } from '@getmocha/users-service/react';
import { Link, useLocation } from 'react-router';
import Navbar from '@/react-app/components/Navbar';
import { 
  LayoutDashboard, 
  Tag, 
  Users, 
  BarChart3, 
  Settings,
  Shield
} from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user } = useAuth();
  const location = useLocation();

  // This should be validated on the server side as well
  // For now, we'll hardcode admin access based on user ID
  const adminUserIds = ['admin-user-id']; // Replace with actual admin user IDs
  const isAdmin = user && adminUserIds.includes((user as any).id);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h1>
          <p className="text-gray-600 mb-6">
            Você precisa de permissões de administrador para acessar esta área.
          </p>
          <Link
            to="/dashboard"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Voltar ao Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const navItems = [
    {
      href: '/admin',
      label: 'Dashboard',
      icon: LayoutDashboard,
      current: location.pathname === '/admin'
    },
    {
      href: '/admin/offers',
      label: 'Ofertas',
      icon: Tag,
      current: location.pathname.startsWith('/admin/offers')
    },
    {
      href: '/admin/users',
      label: 'Usuários',
      icon: Users,
      current: location.pathname.startsWith('/admin/users')
    },
    {
      href: '/admin/analytics',
      label: 'Analytics',
      icon: BarChart3,
      current: location.pathname.startsWith('/admin/analytics')
    },
    {
      href: '/admin/settings',
      label: 'Configurações',
      icon: Settings,
      current: location.pathname.startsWith('/admin/settings')
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="flex">
        {/* Admin Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 min-h-screen">
          <div className="p-6">
            <div className="flex items-center mb-6">
              <Shield className="w-6 h-6 text-purple-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Admin Panel</h2>
            </div>
            
            <nav className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      item.current
                        ? 'bg-purple-100 text-purple-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-3" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div className="p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
