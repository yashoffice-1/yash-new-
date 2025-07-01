
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

// Truncate text to fit constraints
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

// Extract features from description using AI-like logic (simplified)
function extractFeaturesFromDescription(description: string): string[] {
  const sentences = description.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const features: string[] = [];
  
  // Look for key feature indicators
  const featureKeywords = ['feature', 'includes', 'with', 'offers', 'provides', 'equipped', 'designed'];
  
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (trimmed.length > 10 && features.length < 3) {
      // Check if sentence contains feature keywords or describes functionality
      const hasKeyword = featureKeywords.some(keyword => 
        trimmed.toLowerCase().includes(keyword)
      );
      
      if (hasKeyword || trimmed.length < 100) {
        features.push(truncateText(trimmed, 80));
      }
    }
  }
  
  // Fill remaining slots with generic features if needed
  while (features.length < 3) {
    const genericFeatures = [
      'High-quality construction',
      'User-friendly design',
      'Premium materials'
    ];
    features.push(genericFeatures[features.length] || 'Quality assured');
  }
  
  return features;
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
  const features = extractFeaturesFromDescription(description);
  
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
    category_name: truncateText(productInfo.category || 'Electronics', FIELD_CONSTRAINTS.categoryName.maxLength),
    feature_one: truncateText(features[0] || 'Premium quality', FIELD_CONSTRAINTS.featureOne.maxLength),
    feature_two: truncateText(features[1] || 'Advanced technology', FIELD_CONSTRAINTS.featureTwo.maxLength),
    feature_three: truncateText(features[2] || 'User-friendly design', FIELD_CONSTRAINTS.featureThree.maxLength),
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
