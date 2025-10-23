export interface ProductSearchResult {
  title: string;
  price: number;
  currency: string;
  domain: string;
  url: string;
  imageUrl?: string;
  confidence: number;
}

/**
 * Mock search com busca EXATA
 */
export async function hybridSearch(
  _apiKey: string,
  query: string,
  maxResults: number = 5
): Promise<ProductSearchResult[]> {
  
  console.log(`🔍 Mock search: "${query}" (EXACT MATCH)`);
  
  // Dados organizados por palavra-chave EXATA
  const productDatabase: Record<string, ProductSearchResult[]> = {
    // iPhone 15
    'iphone 15': [
      {
        title: 'iPhone 15 256GB Preto',
        price: 6999,
        currency: 'BRL',
        domain: 'kabum.com.br',
        url: 'https://www.kabum.com.br/produto/iphone-15-256gb',
        imageUrl: 'https://images.kabum.com.br/iphone-15.jpg',
        confidence: 0.95,
      },
      {
        title: 'Apple iPhone 15 256GB',
        price: 7299,
        currency: 'BRL',
        domain: 'mercadolivre.com.br',
        url: 'https://produto.mercadolivre.com.br/iphone-15',
        imageUrl: 'https://images.ml-static.com/iphone-15.jpg',
        confidence: 0.95,
      },
      {
        title: 'iPhone 15 Standard Edition',
        price: 7099,
        currency: 'BRL',
        domain: 'amazon.com.br',
        url: 'https://www.amazon.com.br/Apple-iPhone-15/dp/B0DCT8ZQCK',
        imageUrl: 'https://images-amazon.com/iphone-15.jpg',
        confidence: 0.95,
      },
      {
        title: 'iPhone 15 - 256GB',
        price: 7199,
        currency: 'BRL',
        domain: 'magazineluiza.com.br',
        url: 'https://www.magazineluiza.com.br/iphone-15',
        imageUrl: 'https://images.ml.com.br/iphone-15.jpg',
        confidence: 0.95,
      },
      {
        title: 'Apple iPhone 15 - Preto',
        price: 7399,
        currency: 'BRL',
        domain: 'americanas.com.br',
        url: 'https://www.americanas.com.br/iphone-15',
        imageUrl: 'https://images.americanas.com.br/iphone-15.jpg',
        confidence: 0.95,
      },
    ],
    
    // iPhone 15 Pro
    'iphone 15 pro': [
      {
        title: 'iPhone 15 Pro 256GB Titânio',
        price: 8199,
        currency: 'BRL',
        domain: 'kabum.com.br',
        url: 'https://www.kabum.com.br/produto/iphone-15-pro-256gb',
        imageUrl: 'https://images.kabum.com.br/iphone-15-pro.jpg',
        confidence: 0.95,
      },
      {
        title: 'Apple iPhone 15 Pro 256GB',
        price: 8299,
        currency: 'BRL',
        domain: 'mercadolivre.com.br',
        url: 'https://produto.mercadolivre.com.br/iphone-15-pro',
        imageUrl: 'https://images.ml-static.com/iphone-15-pro.jpg',
        confidence: 0.95,
      },
      {
        title: 'iPhone 15 Pro Standard',
        price: 8499,
        currency: 'BRL',
        domain: 'amazon.com.br',
        url: 'https://www.amazon.com.br/Apple-iPhone-15-Pro/dp/B0DCT8ZQCK',
        imageUrl: 'https://images-amazon.com/iphone-15-pro.jpg',
        confidence: 0.95,
      },
      {
        title: 'iPhone 15 Pro - Titânio',
        price: 8399,
        currency: 'BRL',
        domain: 'magazineluiza.com.br',
        url: 'https://www.magazineluiza.com.br/iphone-15-pro',
        imageUrl: 'https://images.ml.com.br/iphone-15-pro.jpg',
        confidence: 0.95,
      },
      {
        title: 'Apple iPhone 15 Pro',
        price: 8599,
        currency: 'BRL',
        domain: 'americanas.com.br',
        url: 'https://www.americanas.com.br/iphone-15-pro',
        imageUrl: 'https://images.americanas.com.br/iphone-15-pro.jpg',
        confidence: 0.95,
      },
    ],

    // PlayStation 5
    'playstation 5': [
      {
        title: 'PlayStation 5 Console Standard',
        price: 4499,
        currency: 'BRL',
        domain: 'kabum.com.br',
        url: 'https://www.kabum.com.br/produto/ps5-console',
        imageUrl: 'https://images.kabum.com.br/ps5.jpg',
        confidence: 0.95,
      },
      {
        title: 'Sony PlayStation 5',
        price: 4599,
        currency: 'BRL',
        domain: 'mercadolivre.com.br',
        url: 'https://produto.mercadolivre.com.br/playstation-5',
        imageUrl: 'https://images.ml-static.com/ps5.jpg',
        confidence: 0.95,
      },
      {
        title: 'PlayStation 5 Standard Edition',
        price: 4699,
        currency: 'BRL',
        domain: 'amazon.com.br',
        url: 'https://www.amazon.com.br/Sony-PlayStation-5/dp/B0DCVL1Z9K',
        imageUrl: 'https://images-amazon.com/ps5.jpg',
        confidence: 0.95,
      },
      {
        title: 'PS5 Console',
        price: 4799,
        currency: 'BRL',
        domain: 'magazineluiza.com.br',
        url: 'https://www.magazineluiza.com.br/playstation-5',
        imageUrl: 'https://images.ml.com.br/ps5.jpg',
        confidence: 0.95,
      },
      {
        title: 'PlayStation 5',
        price: 4899,
        currency: 'BRL',
        domain: 'americanas.com.br',
        url: 'https://www.americanas.com.br/playstation-5',
        imageUrl: 'https://images.americanas.com.br/ps5.jpg',
        confidence: 0.95,
      },
    ],

    // Xbox Series X
    'xbox series x': [
      {
        title: 'Xbox Series X Console',
        price: 5199,
        currency: 'BRL',
        domain: 'kabum.com.br',
        url: 'https://www.kabum.com.br/produto/xbox-series-x',
        imageUrl: 'https://images.kabum.com.br/xbox-x.jpg',
        confidence: 0.95,
      },
      {
        title: 'Microsoft Xbox Series X',
        price: 5299,
        currency: 'BRL',
        domain: 'mercadolivre.com.br',
        url: 'https://produto.mercadolivre.com.br/xbox-series-x',
        imageUrl: 'https://images.ml-static.com/xbox-x.jpg',
        confidence: 0.95,
      },
      {
        title: 'Xbox Series X',
        price: 5399,
        currency: 'BRL',
        domain: 'amazon.com.br',
        url: 'https://www.amazon.com.br/Microsoft-Xbox-Series-X/dp/B0DCVL1Z9K',
        imageUrl: 'https://images-amazon.com/xbox-x.jpg',
        confidence: 0.95,
      },
      {
        title: 'Xbox Series X Console',
        price: 5499,
        currency: 'BRL',
        domain: 'magazineluiza.com.br',
        url: 'https://www.magazineluiza.com.br/xbox-series-x',
        imageUrl: 'https://images.ml.com.br/xbox-x.jpg',
        confidence: 0.95,
      },
      {
        title: 'Microsoft Xbox Series X',
        price: 5599,
        currency: 'BRL',
        domain: 'americanas.com.br',
        url: 'https://www.americanas.com.br/xbox-series-x',
        imageUrl: 'https://images.americanas.com.br/xbox-x.jpg',
        confidence: 0.95,
      },
    ],
  };

  const queryLower = query.toLowerCase().trim();
  let results: ProductSearchResult[] = [];

  // Busca EXATA primeiro
  if (productDatabase[queryLower]) {
    results = productDatabase[queryLower];
    console.log(`✅ Exact match found for "${queryLower}"`);
  } else {
    // Se não encontrar exato, procurar por palavra-chave
    for (const [key, products] of Object.entries(productDatabase)) {
      if (key.includes(queryLower)) {
        results = products;
        console.log(`ℹ️ Partial match: "${key}" for query "${queryLower}"`);
        break;
      }
    }
  }

  // Se ainda não encontrou nada, retornar mensagem clara
  if (results.length === 0) {
    console.warn(`❌ No products found for "${queryLower}". Available: iPhone 15, iPhone 15 Pro, PlayStation 5, Xbox Series X`);
    return [];
  }

  // Ordenar por preço
  results.sort((a, b) => a.price - b.price);

  console.log(`✅ Returning ${results.length} products`);
  return results.slice(0, maxResults);
}
