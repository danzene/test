// Domain-based concurrency pool to avoid 429/403 errors
export function makeDomainPool(max = 2) {
  const active = new Map<string, number>();
  
  return async function run<T>(url: string, job: () => Promise<T>): Promise<T> {
    const domain = new URL(url).hostname;
    
    // Wait for available slot
    while ((active.get(domain) || 0) >= max) {
      await new Promise(r => setTimeout(r, 120));
    }
    
    // Increment active counter
    active.set(domain, (active.get(domain) || 0) + 1);
    
    try {
      return await job();
    } finally {
      // Decrement active counter
      active.set(domain, Math.max(0, (active.get(domain) || 0) - 1));
    }
  };
}

// Retry helper with backoff and user-agent rotation
export async function withRetry<T>(
  job: () => Promise<T>, 
  maxRetries = 1,
  baseDelay = 300
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await job();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on last attempt
      if (attempt === maxRetries) break;
      
      // Check if it's a retryable error
      if (lastError.message.includes('429') || lastError.message.includes('403')) {
        const delay = baseDelay + Math.random() * baseDelay;
        await new Promise(r => setTimeout(r, delay));
      } else {
        // Non-retryable error, fail fast
        break;
      }
    }
  }
  
  throw lastError || new Error('Unknown error in retry');
}

// Global domain pool instance
export const domainPool = makeDomainPool(2);
