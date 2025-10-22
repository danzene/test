// Universal URL validator - accepts any http(s) URL
export function isLikelyUrl(u: string): boolean {
  try { 
    const url = new URL(u.trim()); 
    return url.protocol === 'http:' || url.protocol === 'https:'; 
  } catch { 
    return false; 
  }
}
