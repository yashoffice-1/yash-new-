import { CostService } from '../services/cost-service';

async function initializePricing() {
  try {
    console.log('Initializing default platform pricing...');
    
    await CostService.initializeDefaultPricing();
    
    console.log('✅ Default platform pricing initialized successfully!');
    console.log('\n📊 Pricing Summary:');
    console.log('HeyGen Video: $0.15-0.35 base + $0.02-0.04/second');
    console.log('OpenAI Image: $0.02-0.04 base + $0.0001-0.0002/token');
    console.log('OpenAI Text: $0.01-0.02 base + $0.0001-0.0002/token');
    console.log('RunwayML Video: $0.20-0.40 base + $0.025-0.045/second');
    console.log('RunwayML Image: $0.05-0.15 base + $0.0001-0.0003/token');
    
  } catch (error) {
    console.error('❌ Error initializing pricing:', error);
    process.exit(1);
  }
}

// Run the initialization
initializePricing();

