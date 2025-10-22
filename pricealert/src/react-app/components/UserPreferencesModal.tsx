import { useState, useEffect } from 'react';
import { X, Settings, Bell, MessageCircle, Clock, Globe } from 'lucide-react';
import { UpdatePreferencesRequest, UserPreferences } from '@/shared/types';
import { useToast } from '@/react-app/hooks/useToast';

interface UserPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserPreferencesModal({ isOpen, onClose }: UserPreferencesModalProps) {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { success, error } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchPreferences();
    }
  }, [isOpen]);

  const fetchPreferences = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/me/preferences', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
      } else {
        error('Erro ao carregar preferências', 'Tente novamente mais tarde');
      }
    } catch (err) {
      error('Erro de conexão', 'Verifique sua conexão e tente novamente');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!preferences) return;

    setSaving(true);
    try {
      const updateData: UpdatePreferencesRequest = {
        email_notifications: preferences.email_notifications,
        whatsapp_notifications: preferences.whatsapp_notifications,
        price_drop_threshold: preferences.price_drop_threshold,
        notification_frequency: preferences.notification_frequency as 'immediate' | 'daily' | 'weekly',
        timezone: preferences.timezone,
      };

      const response = await fetch('/api/me/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        success('Preferências salvas!', 'Suas configurações foram atualizadas');
        onClose();
      } else {
        const errorData = await response.json();
        error('Erro ao salvar', errorData.error || 'Tente novamente mais tarde');
      }
    } catch (err) {
      error('Erro de conexão', 'Verifique sua conexão e tente novamente');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Settings className="w-6 h-6 text-blue-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">Preferências</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Carregando preferências...</p>
            </div>
          ) : preferences ? (
            <div className="space-y-6">
              {/* Notifications */}
              <div>
                <div className="flex items-center mb-4">
                  <Bell className="w-5 h-5 text-gray-600 mr-2" />
                  <h3 className="text-lg font-medium text-gray-900">Notificações</h3>
                </div>
                <div className="space-y-4 ml-7">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences.email_notifications}
                      onChange={(e) => setPreferences({
                        ...preferences,
                        email_notifications: e.target.checked
                      })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-3 text-gray-700">Receber alertas por email</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences.whatsapp_notifications}
                      onChange={(e) => setPreferences({
                        ...preferences,
                        whatsapp_notifications: e.target.checked
                      })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-3 text-gray-700">Receber alertas por WhatsApp</span>
                    <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Gold/Premium</span>
                  </label>
                </div>
              </div>

              {/* Price sensitivity */}
              <div>
                <div className="flex items-center mb-4">
                  <MessageCircle className="w-5 h-5 text-gray-600 mr-2" />
                  <h3 className="text-lg font-medium text-gray-900">Sensibilidade de Preço</h3>
                </div>
                <div className="ml-7">
                  <label className="block text-sm text-gray-600 mb-2">
                    Notificar quando o preço cair pelo menos:
                  </label>
                  <select
                    value={preferences.price_drop_threshold}
                    onChange={(e) => setPreferences({
                      ...preferences,
                      price_drop_threshold: parseFloat(e.target.value)
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={0.01}>1%</option>
                    <option value={0.05}>5%</option>
                    <option value={0.10}>10%</option>
                    <option value={0.15}>15%</option>
                    <option value={0.20}>20%</option>
                  </select>
                </div>
              </div>

              {/* Frequency */}
              <div>
                <div className="flex items-center mb-4">
                  <Clock className="w-5 h-5 text-gray-600 mr-2" />
                  <h3 className="text-lg font-medium text-gray-900">Frequência</h3>
                </div>
                <div className="ml-7">
                  <label className="block text-sm text-gray-600 mb-2">
                    Como deseja receber as notificações:
                  </label>
                  <select
                    value={preferences.notification_frequency}
                    onChange={(e) => setPreferences({
                      ...preferences,
                      notification_frequency: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="immediate">Imediatamente</option>
                    <option value="daily">Resumo diário</option>
                    <option value="weekly">Resumo semanal</option>
                  </select>
                </div>
              </div>

              {/* Timezone */}
              <div>
                <div className="flex items-center mb-4">
                  <Globe className="w-5 h-5 text-gray-600 mr-2" />
                  <h3 className="text-lg font-medium text-gray-900">Fuso Horário</h3>
                </div>
                <div className="ml-7">
                  <select
                    value={preferences.timezone}
                    onChange={(e) => setPreferences({
                      ...preferences,
                      timezone: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="America/Sao_Paulo">São Paulo (UTC-3)</option>
                    <option value="America/Manaus">Manaus (UTC-4)</option>
                    <option value="America/Rio_Branco">Rio Branco (UTC-5)</option>
                    <option value="America/Noronha">Fernando de Noronha (UTC-2)</option>
                  </select>
                </div>
              </div>

              {/* Save button */}
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {saving ? 'Salvando...' : 'Salvar Preferências'}
                </button>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-gray-500">
              Erro ao carregar preferências
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
