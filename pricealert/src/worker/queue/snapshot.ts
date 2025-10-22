import { ProductSearchEngine, logSearchProvider } from '../search/index';

interface SnapshotJob {
  id: number;
  productId: number;
  priority: 'eager' | 'normal' | 'background';
  originalProduct?: any;
}

export class MarketSnapshotQueue {
  private engine: ProductSearchEngine;
  
  constructor(env: any, private db: any) {
    this.engine = new ProductSearchEngine(env);
  }
  
  // Add a job to the queue
  async enqueue(productId: number, priority: 'eager' | 'normal' | 'background' = 'normal'): Promise<void> {
    const now = new Date().toISOString();
    
    // Check if there's already a pending job for this product
    const existingJob = await this.db.prepare(
      "SELECT id FROM snapshot_queue WHERE product_id = ? AND status = 'pending'"
    ).bind(productId).first();
    
    if (existingJob) {
      // Update priority if the new one is higher
      if (priority === 'eager') {
        await this.db.prepare(
          "UPDATE snapshot_queue SET priority = ?, updated_at = ? WHERE id = ?"
        ).bind(priority, now, existingJob.id).run();
      }
      return;
    }
    
    // Add new job
    await this.db.prepare(
      "INSERT INTO snapshot_queue (product_id, priority, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
    ).bind(productId, priority, 'pending', now, now).run();
  }
  
  // Process jobs with timeout for eager jobs
  async processEager(timeoutMs: number = 4000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const job = await this.getNextEagerJob();
      if (!job) break;
      
      try {
        await this.processJob(job);
      } catch (error) {
        console.error('Failed to process eager job:', error);
        await this.markJobFailed(job.id, String(error));
        
        // If we can't complete this job quickly, skip it
        break;
      }
      
      // Check if we're running out of time
      if (Date.now() - startTime > timeoutMs - 1000) {
        break;
      }
    }
  }
  
  // Process all pending jobs (for background cron)
  async processAll(maxJobs: number = 50): Promise<void> {
    let processed = 0;
    
    while (processed < maxJobs) {
      const job = await this.getNextJob();
      if (!job) break;
      
      try {
        await this.processJob(job);
        processed++;
      } catch (error) {
        console.error('Failed to process job:', error);
        await this.markJobFailed(job.id, String(error));
      }
    }
  }
  
  private async getNextEagerJob(): Promise<SnapshotJob | null> {
    const result = await this.db.prepare(
      `SELECT sq.*, p.title, p.canonical_gtin, p.canonical_brand, p.canonical_model 
       FROM snapshot_queue sq 
       INNER JOIN products p ON sq.product_id = p.id 
       WHERE sq.status = 'pending' AND sq.priority = 'eager' 
       ORDER BY sq.created_at ASC LIMIT 1`
    ).first();
    
    if (!result) return null;
    
    return {
      id: result.id,
      productId: result.product_id,
      priority: result.priority,
      originalProduct: {
        title: result.title,
        canonical: {
          gtin: result.canonical_gtin,
          brand: result.canonical_brand,
          model: result.canonical_model,
        }
      }
    };
  }
  
  private async getNextJob(): Promise<SnapshotJob | null> {
    const result = await this.db.prepare(
      `SELECT sq.*, p.title, p.canonical_gtin, p.canonical_brand, p.canonical_model 
       FROM snapshot_queue sq 
       INNER JOIN products p ON sq.product_id = p.id 
       WHERE sq.status = 'pending' AND sq.attempts < sq.max_attempts
       ORDER BY 
         CASE sq.priority 
           WHEN 'eager' THEN 1 
           WHEN 'normal' THEN 2 
           ELSE 3 
         END, 
         sq.created_at ASC 
       LIMIT 1`
    ).first();
    
    if (!result) return null;
    
    return {
      id: result.id,
      productId: result.product_id,
      priority: result.priority,
      originalProduct: {
        title: result.title,
        canonical: {
          gtin: result.canonical_gtin,
          brand: result.canonical_brand,
          model: result.canonical_model,
        }
      }
    };
  }
  
  private async processJob(job: SnapshotJob): Promise<void> {
    const now = new Date().toISOString();
    
    // Mark job as started
    await this.db.prepare(
      "UPDATE snapshot_queue SET status = 'processing', started_at = ?, attempts = attempts + 1, updated_at = ? WHERE id = ?"
    ).bind(now, now, job.id).run();
    
    const searchStart = Date.now();
    
    try {
      // Get the original product data
      const product = await this.db.prepare(
        "SELECT * FROM products WHERE id = ?"
      ).bind(job.productId).first();
      
      if (!product) {
        throw new Error('Product not found');
      }
      
      // Resolve canonical IDs
      const canonical = {
        gtin: product.canonical_gtin,
        asin: product.canonical_asin,
        mpn: product.canonical_mpn,
        brand: product.canonical_brand || product.brand,
        model: product.canonical_model || product.model,
      };
      
      // Find equivalent products
      const equivalents = await this.engine.findEquivalents(
        canonical,
        product.title,
        8 // Max results
      );
      
      const searchDuration = Date.now() - searchStart;
      
      // Save results to market_prices
      let savedCount = 0;
      for (const equivalent of equivalents) {
        if (equivalent.confidence >= 0.7 && equivalent.price) {
          try {
            // Upsert market price (replace existing for same product+domain)
            await this.db.prepare(`
              INSERT OR REPLACE INTO market_prices 
              (product_id, domain, url, price, currency, confidence, data_quality, collected_at, last_checked_at, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
              job.productId,
              equivalent.domain,
              equivalent.sourceUrl,
              equivalent.price,
              equivalent.currency,
              equivalent.confidence,
              'verified',
              now,
              now,
              now,
              now
            ).run();
            
            savedCount++;
          } catch (error) {
            console.error('Failed to save market price:', error);
          }
        }
      }
      
      // Log successful search
      await logSearchProvider(
        this.db,
        'market_snapshot',
        `${canonical.gtin || canonical.brand + ' ' + canonical.model}`,
        equivalents.length,
        searchDuration,
        true
      );
      
      // Mark job as completed
      await this.db.prepare(
        "UPDATE snapshot_queue SET status = 'completed', completed_at = ?, result_data = ?, updated_at = ? WHERE id = ?"
      ).bind(
        now,
        JSON.stringify({ equivalents: equivalents.length, saved: savedCount }),
        now,
        job.id
      ).run();
      
      console.log(`Completed snapshot for product ${job.productId}: ${savedCount} prices saved`);
      
    } catch (error) {
      const searchDuration = Date.now() - searchStart;
      
      // Log failed search
      await logSearchProvider(
        this.db,
        'market_snapshot',
        `${job.originalProduct?.canonical?.gtin || 'unknown'}`,
        0,
        searchDuration,
        false,
        String(error)
      );
      
      throw error;
    }
  }
  
  private async markJobFailed(jobId: number, errorMessage: string): Promise<void> {
    const now = new Date().toISOString();
    
    await this.db.prepare(
      "UPDATE snapshot_queue SET status = 'failed', error_message = ?, updated_at = ? WHERE id = ?"
    ).bind(errorMessage, now, jobId).run();
  }
  
  // Clean up old jobs
  async cleanup(olderThanDays: number = 7): Promise<void> {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();
    
    await this.db.prepare(
      "DELETE FROM snapshot_queue WHERE status IN ('completed', 'failed') AND updated_at < ?"
    ).bind(cutoffDate).run();
  }
}
