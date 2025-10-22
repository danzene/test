import { useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@getmocha/users-service/react';
import { Bell, User, LogOut, MessageCircle, Heart, Settings } from 'lucide-react';
import FeedbackModal from '@/react-app/components/FeedbackModal';
import UserPreferencesModal from '@/react-app/components/UserPreferencesModal';
import { useToast } from '@/react-app/hooks/useToast';

export default function Navbar() {
  const { user, redirectToLogin, logout } = useAuth();
  const [showFeedback, setShowFeedback] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const { success, error } = useToast();

  const handleFeedbackSubmit = async (feedback: {
    type: string;
    message: string;
    rating?: number;
  }) => {
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(feedback),
      });

      if (response.ok) {
        success('Feedback enviado!', 'Obrigado por nos ajudar a melhorar o PriceAlert+');
      } else {
        throw new Error('Failed to submit feedback');
      }
    } catch (err) {
      error('Erro ao enviar feedback', 'Tente novamente mais tarde');
    }
  };

  // Check if user is admin
  // For now, we'll hardcode admin access based on user ID
  const adminUserIds = ['admin-user-id']; // Replace with actual admin user IDs
  const isAdmin = user && adminUserIds.includes((user as any).id);

  return (
    <>
      <nav className="bg-white/80 backdrop-blur-lg border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Bell className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                PriceAlert+
              </span>
              <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full font-medium">
                v1.0.6
              </span>
            </Link>

            <div className="flex items-center space-x-6">
              <Link to="/offers" className="text-gray-600 hover:text-gray-900 transition-colors">
                Ofertas
              </Link>
              <Link to="/pricing" className="text-gray-600 hover:text-gray-900 transition-colors">
                Planos
              </Link>
              
              {user && (
                <>
                  <Link
                    to="/wishlist"
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <Heart className="w-4 h-4" />
                    <span>Lista de Desejos</span>
                  </Link>
                  <button
                    onClick={() => setShowPreferences(true)}
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Preferências</span>
                  </button>
                  <button
                    onClick={() => setShowFeedback(true)}
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Feedback</span>
                  </button>
                </>
              )}

              {user ? (
                <div className="flex items-center space-x-4">
                  <Link 
                    to="/dashboard" 
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    <span>Dashboard</span>
                  </Link>
                  {isAdmin && (
                    <Link 
                      to="/admin" 
                      className="flex items-center space-x-2 text-purple-600 hover:text-purple-700 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Admin</span>
                    </Link>
                  )}
                  <button
                    onClick={logout}
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sair</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={redirectToLogin}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all duration-200"
                >
                  Entrar
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <FeedbackModal
        isOpen={showFeedback}
        onClose={() => setShowFeedback(false)}
        onSubmit={handleFeedbackSubmit}
      />

      <UserPreferencesModal
        isOpen={showPreferences}
        onClose={() => setShowPreferences(false)}
      />
    </>
  );
}
