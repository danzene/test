import { useState } from 'react';
import { useAuth } from '@getmocha/users-service/react';
import Navbar from '@/react-app/components/Navbar';
import { Check, Crown, Zap, Bell } from 'lucide-react';

export default function Pricing() {
  const { user, redirectToLogin } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const plans = [
    {
      id: 'FREE',
      name: 'Gratuito',
      price: 'R$ 0',
      period: '/mês',
      description: 'Perfeito para começar',
      features: [
        '1 item monitorado',
        '2 buscas por dia',
        'Alertas por email',
        'Histórico de 90 dias',
        'Produtos similares'
      ],
      limitations: [
        'Sem WhatsApp',
        'Fila normal'
      ],
      icon: Bell,
      color: 'border-gray-200',
      buttonColor: 'bg-gray-600 hover:bg-gray-700',
      current: true,
    },
    {
      id: 'GOLD',
      name: 'Gold',
      price: 'R$ 19',
      period: '/mês',
      description: 'Para usuários regulares',
      features: [
        '15 itens monitorados',
        '50 buscas por dia',
        'Alertas por email e WhatsApp',
        'Histórico de 90 dias',
        'Produtos similares',
        'Suporte prioritário'
      ],
      limitations: [],
      icon: Crown,
      color: 'border-yellow-300',
      buttonColor: 'bg-yellow-600 hover:bg-yellow-700',
      popular: true,
    },
    {
      id: 'PREMIUM',
      name: 'Premium',
      price: 'R$ 49',
      period: '/mês',
      description: 'Para power users',
      features: [
        '100 itens monitorados',
        '500 buscas por dia',
        'Alertas por email e WhatsApp',
        'Histórico de 90 dias',
        'Produtos similares',
        'Monitoramento prioritário (1h)',
        'Suporte VIP'
      ],
      limitations: [],
      icon: Zap,
      color: 'border-purple-300',
      buttonColor: 'bg-purple-600 hover:bg-purple-700',
    },
  ];

  const handleUpgrade = (planId: string) => {
    if (!user) {
      redirectToLogin();
      return;
    }

    // Mock upgrade process
    setSelectedPlan(planId);
    setTimeout(() => {
      alert(`Upgrade para o plano ${planId} iniciado! (Esta é uma simulação)`);
      setSelectedPlan(null);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            Escolha o plano ideal para{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              suas necessidades
            </span>
          </h1>
          <p className="text-xl text-gray-600">
            Monitore mais produtos, receba alertas mais rápidos e economize ainda mais
          </p>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl shadow-sm border-2 ${plan.color} p-8 ${
                  plan.popular ? 'transform scale-105' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Mais Popular
                    </span>
                  </div>
                )}

                <div className="text-center mb-8">
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
                    plan.id === 'FREE' ? 'bg-gray-100' :
                    plan.id === 'GOLD' ? 'bg-yellow-100' : 'bg-purple-100'
                  }`}>
                    <Icon className={`w-8 h-8 ${
                      plan.id === 'FREE' ? 'text-gray-600' :
                      plan.id === 'GOLD' ? 'text-yellow-600' : 'text-purple-600'
                    }`} />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-600 mb-4">{plan.description}</p>
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-600 ml-1">{plan.period}</span>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-center">
                      <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                  {plan.limitations.map((limitation, index) => (
                    <div key={index} className="flex items-center opacity-50">
                      <div className="w-5 h-5 mr-3 flex-shrink-0 flex items-center justify-center">
                        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                      </div>
                      <span className="text-gray-700 line-through">{limitation}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={plan.current || selectedPlan === plan.id}
                  className={`w-full py-4 px-6 rounded-xl font-semibold transition-all duration-200 ${
                    plan.current
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : selectedPlan === plan.id
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : `${plan.buttonColor} text-white hover:shadow-lg`
                  }`}
                >
                  {plan.current
                    ? 'Plano Atual'
                    : selectedPlan === plan.id
                    ? 'Processando...'
                    : `Escolher ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>

        {/* Features comparison */}
        <div className="mt-20 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-12">
            Compare todos os recursos
          </h2>
          
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="grid grid-cols-4 gap-4 p-6 bg-gray-50 border-b border-gray-100">
              <div className="font-semibold text-gray-900">Recurso</div>
              <div className="text-center font-semibold text-gray-900">Gratuito</div>
              <div className="text-center font-semibold text-yellow-600">Gold</div>
              <div className="text-center font-semibold text-purple-600">Premium</div>
            </div>

            {[
              ['Itens monitorados', '1', '15', '100'],
              ['Buscas por dia', '2', '50', '500'],
              ['Alertas por email', '✓', '✓', '✓'],
              ['Alertas por WhatsApp', '✗', '✓', '✓'],
              ['Frequência de checagem', '6h', '6h', '1h'],
              ['Suporte', 'Email', 'Prioritário', 'VIP'],
            ].map(([feature, free, gold, premium], index) => (
              <div key={index} className="grid grid-cols-4 gap-4 p-4 border-b border-gray-100 last:border-b-0">
                <div className="font-medium text-gray-700">{feature}</div>
                <div className="text-center text-gray-600">{free}</div>
                <div className="text-center text-yellow-600 font-medium">{gold}</div>
                <div className="text-center text-purple-600 font-medium">{premium}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-12">
            Perguntas Frequentes
          </h2>
          
          <div className="space-y-8">
            {[
              {
                question: 'Posso cancelar a qualquer momento?',
                answer: 'Sim! Você pode cancelar seu plano a qualquer momento. Não há compromisso de permanência.',
              },
              {
                question: 'Como funciona o WhatsApp?',
                answer: 'Para receber alertas no WhatsApp, você precisa confirmar seu número e dar consentimento. Disponível nos planos Gold e Premium.',
              },
              {
                question: 'Quantas lojas são suportadas?',
                answer: 'Atualmente suportamos Amazon, Mercado Livre, Americanas, Submarino e Casas Bahia. Mais lojas serão adicionadas regularmente.',
              },
              {
                question: 'Os preços incluem impostos?',
                answer: 'Sim, todos os preços já incluem impostos. Não há taxas adicionais.',
              },
            ].map((faq, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-3">{faq.question}</h3>
                <p className="text-gray-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
