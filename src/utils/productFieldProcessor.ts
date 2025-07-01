
interface ProductFieldConstraints {
  productName: { maxLength: 81 };
  categoryName: { maxLength: 150 };
  featureOne: { maxLength: 80 };
  featureTwo: { maxLength: 80 };
  featureThree: { maxLength: 80 };
  websiteDescription: { maxLength: 22 };
}

interface ProcessedProductData {
  product_name: string;
  product_price: string;
  product_discount: string;
  category_name: string;
  feature_one: string;
  feature_two: string;
  feature_three: string;
  website_description: string;
  product_image: string;
}

const FIELD_CONSTRAINTS: ProductFieldConstraints = {
  productName: { maxLength: 81 },
  categoryName: { maxLength: 150 },
  featureOne: { maxLength: 80 },
  featureTwo: { maxLength: 80 },
  featureThree: { maxLength: 80 },
  websiteDescription: { maxLength: 22 }
};

// Truncate text to fit constraints (fallback only)
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

// Generate concise, meaningful features from description
function extractFeaturesFromDescription(description: string, productName: string, category: string): string[] {
  const features: string[] = [];
  
  // Category-specific feature templates
  const categoryFeatures: Record<string, string[]> = {
    'electronics': [
      'Advanced technology integration',
      'Energy-efficient performance',
      'User-friendly interface'
    ],
    'headphones': [
      'Superior sound quality',
      'Comfortable fit design',
      'Long-lasting battery'
    ],
    'automotive': [
      'Durable construction',
      'Performance optimized',
      'Safety certified'
    ],
    'clothing': [
      'Premium fabric quality',
      'Comfortable fit',
      'Stylish design'
    ],
    'home': [
      'Space-saving design',
      'Easy installation',
      'Durable materials'
    ],
    'kitchen': [
      'Food-safe materials',
      'Easy to clean',
      'Versatile functionality'
    ]
  };

  // Extract key terms from description
  const words = description.toLowerCase().split(/\s+/);
  const keyTerms = {
    quality: words.some(w => ['quality', 'premium', 'high-end', 'superior'].includes(w)),
    wireless: words.some(w => ['wireless', 'bluetooth', 'cordless'].includes(w)),
    portable: words.some(w => ['portable', 'compact', 'lightweight'].includes(w)),
    durable: words.some(w => ['durable', 'sturdy', 'robust', 'strong'].includes(w)),
    smart: words.some(w => ['smart', 'intelligent', 'ai', 'automated'].includes(w)),
    comfortable: words.some(w => ['comfortable', 'ergonomic', 'soft'].includes(w)),
    fast: words.some(w => ['fast', 'quick', 'rapid', 'speed'].includes(w)),
    efficient: words.some(w => ['efficient', 'optimized', 'effective'].includes(w)),
    stylish: words.some(w => ['stylish', 'elegant', 'beautiful', 'design'].includes(w)),
    versatile: words.some(w => ['versatile', 'multi', 'various', 'flexible'].includes(w))
  };

  // Generate intelligent features based on product characteristics
  const intelligentFeatures: string[] = [];
  
  if (keyTerms.quality) intelligentFeatures.push('Premium quality construction');
  if (keyTerms.wireless) intelligentFeatures.push('Advanced wireless connectivity');
  if (keyTerms.portable) intelligentFeatures.push('Compact and portable design');
  if (keyTerms.durable) intelligentFeatures.push('Built for long-lasting durability');
  if (keyTerms.smart) intelligentFeatures.push('Smart technology integration');
  if (keyTerms.comfortable) intelligentFeatures.push('Ergonomic comfort design');
  if (keyTerms.fast) intelligentFeatures.push('High-speed performance');
  if (keyTerms.efficient) intelligentFeatures.push('Energy-efficient operation');
  if (keyTerms.stylish) intelligentFeatures.push('Sleek and modern styling');
  if (keyTerms.versatile) intelligentFeatures.push('Multi-purpose functionality');

  // Use intelligent features first
  features.push(...intelligentFeatures.slice(0, 3));

  // Fill remaining slots with category-specific features
  const categoryKey = category.toLowerCase();
  let categorySpecificFeatures: string[] = [];
  
  for (const [key, featureList] of Object.entries(categoryFeatures)) {
    if (categoryKey.includes(key)) {
      categorySpecificFeatures = featureList;
      break;
    }
  }
  
  // Default to electronics if no specific category match
  if (categorySpecificFeatures.length === 0) {
    categorySpecificFeatures = categoryFeatures.electronics;
  }

  // Fill remaining slots
  while (features.length < 3) {
    const remainingIndex = features.length;
    if (remainingIndex < categorySpecificFeatures.length) {
      features.push(categorySpecificFeatures[remainingIndex]);
    } else {
      features.push('Quality assured product');
    }
  }

  // Ensure all features are within 80 characters (they should be by design)
  return features.slice(0, 3).map(feature => {
    if (feature.length <= 80) return feature;
    // This should rarely happen with our curated features, but safety check
    return feature.substring(0, 77) + '...';
  });
}

export function processProductForSpreadsheet(productInfo: {
  name: string;
  description?: string;
  category?: string;
  price?: number;
  discount?: string;
  imageUrl?: string;
}): ProcessedProductData {
  const description = productInfo.description || productInfo.name;
  const category = productInfo.category || 'Electronics';
  
  // Generate intelligent features that naturally fit within constraints
  const features = extractFeaturesFromDescription(description, productInfo.name, category);
  
  // Calculate discount if not provided
  let discount = productInfo.discount || '0%';
  if (!productInfo.discount && productInfo.price) {
    // Generate a sample discount for demo purposes
    const discountPercentage = Math.floor(Math.random() * 20) + 5; // 5-25%
    discount = `${discountPercentage}%`;
  }
  
  return {
    product_name: truncateText(productInfo.name, FIELD_CONSTRAINTS.productName.maxLength),
    product_price: productInfo.price ? `$${productInfo.price}` : '$99.99',
    product_discount: discount,
    category_name: truncateText(category, FIELD_CONSTRAINTS.categoryName.maxLength),
    feature_one: features[0],
    feature_two: features[1], 
    feature_three: features[2],
    website_description: truncateText(description, FIELD_CONSTRAINTS.websiteDescription.maxLength),
    product_image: productInfo.imageUrl || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop'
  };
}

export function validateProcessedData(data: ProcessedProductData): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (data.product_name.length > FIELD_CONSTRAINTS.productName.maxLength) {
    errors.push(`Product name exceeds ${FIELD_CONSTRAINTS.productName.maxLength} characters`);
  }
  
  if (data.category_name.length > FIELD_CONSTRAINTS.categoryName.maxLength) {
    errors.push(`Category name exceeds ${FIELD_CONSTRAINTS.categoryName.maxLength} characters`);
  }
  
  if (data.feature_one.length > FIELD_CONSTRAINTS.featureOne.maxLength) {
    errors.push(`Feature one exceeds ${FIELD_CONSTRAINTS.featureOne.maxLength} characters`);
  }
  
  if (data.feature_two.length > FIELD_CONSTRAINTS.featureTwo.maxLength) {
    errors.push(`Feature two exceeds ${FIELD_CONSTRAINTS.featureTwo.maxLength} characters`);
  }
  
  if (data.feature_three.length > FIELD_CONSTRAINTS.featureThree.maxLength) {
    errors.push(`Feature three exceeds ${FIELD_CONSTRAINTS.featureThree.maxLength} characters`);
  }
  
  if (data.website_description.length > FIELD_CONSTRAINTS.websiteDescription.maxLength) {
    errors.push(`Website description exceeds ${FIELD_CONSTRAINTS.websiteDescription.maxLength} characters`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
