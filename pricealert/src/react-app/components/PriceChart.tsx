import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { PricePoint, PriceStats90d } from '@/shared/types';
import { TrendingDown, TrendingUp } from 'lucide-react';

interface PriceChartProps {
  pricePoints: PricePoint[];
  stats90d: PriceStats90d;
  currency?: string;
  targetPrice?: number;
}

export default function PriceChart({ pricePoints, stats90d, currency = 'BRL', targetPrice }: PriceChartProps) {
  const formatPrice = (value: number | null) => {
    if (!value) return 'Indisponível';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  const chartData = pricePoints.map(point => ({
    date: point.captured_at,
    price: point.price,
    formattedDate: formatDate(point.captured_at),
  }));

  // Use real statistics from backend
  const { min, max, changePct } = stats90d;
  const currentPrice = pricePoints[pricePoints.length - 1]?.price;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Histórico de Preços (90 dias)</h2>
          {changePct !== 0 && pricePoints.length > 1 && (
            <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
              changePct > 0 
                ? 'bg-red-100 text-red-700' 
                : 'bg-green-100 text-green-700'
            }`}>
              {changePct > 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span>{Math.abs(changePct).toFixed(1)}%</span>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-gray-50 rounded-lg p-3">
            <span className="text-gray-500 block">Atual</span>
            <span className="font-semibold text-gray-900">{formatPrice(currentPrice || 0)}</span>
          </div>
          
          <div className="bg-green-50 rounded-lg p-3">
            <span className="text-gray-500 block">Menor</span>
            <span className="font-semibold text-green-600">
              {min !== null ? formatPrice(min) : 'Sem dados'}
            </span>
          </div>
          
          <div className="bg-red-50 rounded-lg p-3">
            <span className="text-gray-500 block">
              {pricePoints.length <= 1 ? 'Atual' : 'Maior'}
            </span>
            <span className="font-semibold text-red-600">
              {max !== null ? formatPrice(max) : 'Sem dados'}
            </span>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-3">
            <span className="text-gray-500 block">Variação</span>
            <span className="font-semibold text-blue-600">
              {changePct !== undefined ? `${changePct.toFixed(1)}%` : '0%'}
            </span>
          </div>
        </div>
      </div>

      {pricePoints.length > 0 ? (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="formattedDate"
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#e5e7eb' }}
                tickFormatter={(value) => formatPrice(value)}
              />
              <Tooltip 
                formatter={(value: number) => [formatPrice(value), 'Preço']}
                labelFormatter={(label) => `Data: ${label}`}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              />
              {targetPrice && (
                <ReferenceLine 
                  y={targetPrice} 
                  stroke="#10b981" 
                  strokeDasharray="5 5"
                  label={{ value: "Meta", position: "right", fill: "#10b981" }}
                />
              )}
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke="#3b82f6" 
                strokeWidth={3}
                dot={{ r: 4, fill: '#3b82f6' }}
                activeDot={{ r: 6, fill: '#1d4ed8' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-64 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <div className="text-4xl mb-2">📊</div>
            <p>Sem histórico suficiente ainda — volte mais tarde</p>
            <p className="text-sm mt-1">ou clique em Reprocessar para coletar dados</p>
          </div>
        </div>
      )}
    </div>
  );
}
