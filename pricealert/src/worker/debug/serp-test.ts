// Debug endpoint for testing SerpAPI integration
export async function testSerpAPI(apiKey: string, query: string = 'iPhone 15') {
  console.log('🧪 Testing SerpAPI integration...');
  
  if (!apiKey) {
    return {
      ok: false,
      error: 'SERP_API_KEY not configured',
      instructions: 'Please set SERP_API_KEY in your worker environment'
    };
  }
  
  try {
    const { hybridSearch } = await import('../search/hybrid-search');
    
    console.log(`  Testing with query: "${query}"`);
    const startTime = Date.now();
    
    const results = await hybridSearch(apiKey, query, 3);
    const duration = Date.now() - startTime;
    
    console.log(`  ✅ Test completed in ${duration}ms`);
    
    return {
      ok: true,
      query,
      resultsCount: results.length,
      duration: `${duration}ms`,
      results: results.map(r => ({
        title: r.title.substring(0, 60) + '...',
        price: r.price,
        store: r.domain,
        confidence: r.confidence
      })),
      message: results.length > 0 
        ? `SerpAPI working! Found ${results.length} products`
        : 'SerpAPI connected but no results found for this query'
    };
    
  } catch (error) {
    console.error('  ❌ SerpAPI test failed:', error);
    
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      troubleshooting: [
        'Check if SERP_API_KEY is valid',
        'Verify your SerpAPI quota (100 free searches/month)',
        'Try a simpler search query',
        'Check network connectivity'
      ]
    };
  }
}
