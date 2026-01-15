import { db } from './server/db.ts';
import { hlrBatches, hlrResults } from './drizzle/schema.ts';
import { desc, eq } from 'drizzle-orm';
import fs from 'fs';

async function exportResults() {
  // Get latest batches
  const batches = await db.select().from(hlrBatches).orderBy(desc(hlrBatches.id)).limit(10);
  
  console.log('Latest batches:');
  for (const batch of batches) {
    const results = await db.select().from(hlrResults).where(eq(hlrResults.batchId, batch.id));
    console.log(`ID: ${batch.id}, Name: ${batch.name}, Total: ${batch.totalNumbers}, Processed: ${batch.processedNumbers}, Status: ${batch.status}, Saved Results: ${results.length}`);
  }
  
  // Find the batch with status "processing" (the one that failed)
  const failedBatch = batches.find(b => b.status === 'processing');
  if (failedBatch) {
    console.log(`\nExporting results from failed batch ID ${failedBatch.id}...`);
    const results = await db.select().from(hlrResults).where(eq(hlrResults.batchId, failedBatch.id));
    
    if (results.length > 0) {
      // Create CSV
      const headers = ['phoneNumber', 'internationalFormat', 'validNumber', 'reachable', 'countryName', 'currentCarrierName', 'ported', 'roaming', 'status'];
      const csv = [headers.join(',')];
      
      for (const r of results) {
        csv.push([
          r.phoneNumber,
          r.internationalFormat || '',
          r.validNumber || '',
          r.reachable || '',
          r.countryName || '',
          r.currentCarrierName || '',
          r.ported || '',
          r.roaming || '',
          r.status
        ].map(v => `"${v}"`).join(','));
      }
      
      fs.writeFileSync('/home/ubuntu/recovered-results.csv', csv.join('\n'));
      console.log(`Exported ${results.length} results to /home/ubuntu/recovered-results.csv`);
    } else {
      console.log('No results found for this batch');
    }
  }
  
  process.exit(0);
}

exportResults().catch(console.error);
