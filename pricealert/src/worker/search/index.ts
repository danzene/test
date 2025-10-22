// Legacy search functions - kept for compatibility
import { CanonicalIds, OfferResolved } from '@/shared/types';

export class ProductSearchEngine {
  constructor(private env: any) {}
  
  async findEquivalents(
    sourceCanonical: CanonicalIds,
    sourceTitle: string,
    maxResults: number = 8
  ): Promise<OfferResolved[]> {
    // Legacy method - now redirects to equivalents search
    const { findEquivalentsStrict } = await import('./equivalents');
    const result = await findEquivalentsStrict(this.env, sourceCanonical, sourceTitle, maxResults);
    return result.items;
  }
}

// Log search provider usage
export async function logSearchProvider(
  db: any,
  provider: string,
  query: string,
  resultsCount: number,
  duration: number,
  success: boolean,
  error?: string
) {
  try {
    await db.prepare(
      "INSERT INTO search_provider_logs (provider, query, results_count, duration_ms, success, error_message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      provider,
      query,
      resultsCount,
      Math.round(duration),
      success ? 1 : 0,
      error || null,
      new Date().toISOString()
    ).run();
  } catch (err) {
    console.error('Failed to log search provider usage:', err);
  }
}
