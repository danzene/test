import { Link } from 'react-router';
import { Product } from '@/shared/types';
import { ExternalLink } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const formatPrice = (price: number | null) => {
    if (!price) return 'Preço indisponível';
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

  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-gray-300 transition-colors">
      <div className="flex gap-3">
        {product.image_url && (
          <div className="flex-shrink-0">
            <img
              src={product.image_url}
              alt={product.title}
              className="w-16 h-16 object-cover rounded-lg border border-gray-200"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-xs text-gray-500 mb-1">
            {getDomainName(product.domain)}
          </div>
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2">
            {product.title}
          </h3>
          <div className="flex items-center justify-between">
            <div className="text-lg font-bold text-green-600">
              {formatPrice(product.last_price)}
            </div>
            <div className="flex gap-2">
              <Link
                to={`/product/${product.id}`}
                className="text-xs text-blue-600 hover:text-blue-700 transition-colors"
              >
                Ver detalhes
              </Link>
              <a
                href={product.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-600 hover:text-gray-700 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
