import { useState } from 'react';
import { Channel } from '@/shared/types';
import { Bell, Mail, MessageCircle } from 'lucide-react';

interface AlertFormProps {
  productId: number;
  onSuccess: () => void;
}

export default function AlertForm({ productId, onSuccess }: AlertFormProps) {
  const [targetPrice, setTargetPrice] = useState('');
  const [channels, setChannels] = useState<Channel[]>(['email']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!targetPrice || parseFloat(targetPrice) <= 0) {
      setError('Insira um preço válido');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          productId,
          targetPrice: parseFloat(targetPrice),
          channels,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          setError('Limite de itens monitorados atingido. Considere fazer upgrade do seu plano.');
        } else {
          setError('Erro ao criar alerta. Tente novamente.');
        }
        return;
      }

      onSuccess();
    } catch (err) {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleChannelChange = (channel: Channel, checked: boolean) => {
    if (checked) {
      setChannels([...channels, channel]);
    } else {
      setChannels(channels.filter(c => c !== channel));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="targetPrice" className="block text-sm font-medium text-gray-700 mb-2">
          Quero pagar até:
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R$</span>
          <input
            type="number"
            id="targetPrice"
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
            step="0.01"
            min="0"
            placeholder="0,00"
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Como você quer ser notificado?
        </label>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={channels.includes('email')}
              onChange={(e) => handleChannelChange('email', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <Mail className="w-4 h-4 ml-3 mr-2 text-gray-500" />
            <span className="text-sm text-gray-700">Email</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={channels.includes('whatsapp')}
              onChange={(e) => handleChannelChange('whatsapp', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <MessageCircle className="w-4 h-4 ml-3 mr-2 text-gray-500" />
            <span className="text-sm text-gray-700">WhatsApp</span>
            <span className="text-xs text-gray-500 ml-2">(Planos Gold e Premium)</span>
          </label>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || channels.length === 0}
        className="w-full flex items-center justify-center py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Bell className="w-4 h-4 mr-2" />
        {loading ? 'Criando...' : 'Criar Alerta'}
      </button>
    </form>
  );
}
