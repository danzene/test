// Enhanced price parsing utilities for Brazilian currency format
export function parsePriceBRL(str: string): number | null {
  if (!str || typeof str !== 'string') return null;
  
  // Skip prices with installment indicators
  if (str.includes('x') || str.includes('juros') || str.includes('sem juros') || str.includes('de R$')) {
    return null;
  }
  
  // Remove currency symbols and extra spaces
  const cleaned = str
    .replace(/[R$\s]/g, '')
    .replace(/[^\d.,]/g, '');
  
  if (!cleaned) return null;
  
  // Handle Brazilian number format (1.299,99 or 1299,99)
  if (cleaned.includes(',') && cleaned.includes('.')) {
    // Format: 1.299,99
    const parts = cleaned.split(',');
    if (parts.length === 2) {
      const integerPart = parts[0].replace(/\./g, '');
      const decimalPart = parts[1];
      const numberStr = `${integerPart}.${decimalPart}`;
      const parsed = parseFloat(numberStr);
      return isNaN(parsed) ? null : parsed;
    }
  } else if (cleaned.includes(',')) {
    // Format: 1299,99
    const numberStr = cleaned.replace(',', '.');
    const parsed = parseFloat(numberStr);
    return isNaN(parsed) ? null : parsed;
  } else if (cleaned.includes('.')) {
    // Could be either 1299.99 (US format) or 1.299 (BR thousands)
    const dotIndex = cleaned.lastIndexOf('.');
    const afterDot = cleaned.substring(dotIndex + 1);
    
    if (afterDot.length === 2) {
      // Likely decimal: 1299.99
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? null : parsed;
    } else {
      // Likely thousands separator: 1.299
      const numberStr = cleaned.replace(/\./g, '');
      const parsed = parseFloat(numberStr);
      return isNaN(parsed) ? null : parsed;
    }
  } else {
    // No separators, just digits
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }
  
  return null;
}

export function trimAll(str: string | null | undefined): string | null {
  if (!str || typeof str !== 'string') return null;
  const trimmed = str.trim();
  return trimmed || null;
}

export function normalizeTitle(title: string): string {
  if (!title) return '';
  
  return title
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s\-áàâãéèêíìîóòôõúùûçÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ]/g, '')
    .substring(0, 200);
}

export function extractGTIN(text: string): string | null {
  if (!text) return null;
  
  // GTIN-13 (EAN-13), GTIN-12 (UPC-A), GTIN-8 (EAN-8)
  const gtinPattern = /\b(\d{8}|\d{12}|\d{13}|\d{14})\b/g;
  const matches = text.match(gtinPattern);
  
  if (!matches) return null;
  
  // Return the first valid GTIN (prioritize 13-digit)
  const validGTINs = matches.filter(gtin => {
    const length = gtin.length;
    return length === 8 || length === 12 || length === 13 || length === 14;
  });
  
  return validGTINs.find(gtin => gtin.length === 13) || 
         validGTINs.find(gtin => gtin.length === 12) || 
         validGTINs[0] || null;
}

export function extractASIN(url: string): string | null {
  if (!url) return null;
  
  const asinPattern = /\/(dp|gp\/product)\/([A-Z0-9]{10})/i;
  const match = url.match(asinPattern);
  
  return match ? match[2] : null;
}

export function normalizeBrand(brand: string): string | null {
  if (!brand) return null;
  
  const brandMap: Record<string, string> = {
    'samsung': 'Samsung',
    'apple': 'Apple',
    'motorola': 'Motorola',
    'xiaomi': 'Xiaomi',
    'lg': 'LG',
    'sony': 'Sony',
    'nokia': 'Nokia',
    'huawei': 'Huawei',
    'positivo': 'Positivo',
    'multilaser': 'Multilaser',
    'acer': 'Acer',
    'asus': 'Asus',
    'dell': 'Dell',
    'hp': 'HP',
    'lenovo': 'Lenovo',
    'microsoft': 'Microsoft',
  };
  
  return brandMap[brand.toLowerCase()] || brand;
}

export function normalizeModel(model: string): string | null {
  if (!model) return null;
  
  // Remove common prefixes and normalize
  return model
    .replace(/^(modelo|model)\s+/i, '')
    .trim()
    .toUpperCase() || null;
}

export function calculateTextSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0;
  
  // Normalize texts
  const normalize = (text: string) => 
    text.toLowerCase()
        .replace(/[^\w\sáàâãéèêíìîóòôõúùûç]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 2); // Filter short words
  
  const words1 = normalize(text1);
  const words2 = normalize(text2);
  
  if (words1.length === 0 || words2.length === 0) return 0;
  
  // Calculate Jaccard similarity (intersection over union)
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  
  const intersection = new Set([...set1].filter(word => set2.has(word)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}
