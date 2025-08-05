
import { ProductVariableState, InventoryItem } from './types';

export const extractProductData = (variable: string, selectedProduct: InventoryItem): string => {
  switch (variable) {
    case "product_name":
      return selectedProduct.name || "";
    case "product_price":
      return selectedProduct.price ? `$${selectedProduct.price}` : "";
    case "category_name":
      return selectedProduct.category || "";
    case "brand_name":
      return selectedProduct.brand || "";
    case "website_description":
      return selectedProduct.description || "";
    case "product_image":
      return selectedProduct.images?.[0] || "";
    // Additional mappings for better extraction
    case "product_discount":
      return ""; // Will be filled by AI suggestion
    case "feature_one":
    case "feature_two": 
    case "feature_three":
      // Try to extract features from description
      const description = selectedProduct.description || "";
      if (description) {
        const features = description.match(/[A-Z][^.!?]*[.!?]/g) || [];
        const index = variable === "feature_one" ? 0 : variable === "feature_two" ? 1 : 2;
        return features[index]?.trim().replace(/[.!?]$/, '') || "";
      }
      return "";
    default:
      return "";
  }
};

export const generateAISuggestion = (variable: string, extractedValue: string, selectedProduct?: InventoryItem): string => {
  // Use extracted value if available, otherwise generate smart suggestions
  if (extractedValue && extractedValue.trim() !== "") {
    switch (variable) {
      case "product_name":
        return extractedValue.includes("Professional") ? extractedValue : `Professional ${extractedValue}`;
      case "product_price":
      case "product_image":
        return extractedValue;
      case "website_description":
        return extractedValue.length > 200 ? extractedValue.substring(0, 200) + "..." : extractedValue;
      default:
        return extractedValue;
    }
  }

  // Fallback suggestions based on variable type and product info
  switch (variable) {
    case "product_name":
      return selectedProduct?.name ? `Professional ${selectedProduct.name}` : "Premium Product";
    case "product_price":
      return selectedProduct?.price ? `$${selectedProduct.price}` : "$1,155";
    case "product_discount":
      return "19% Off Limited Time";
    case "category_name":
      return selectedProduct?.category || "Premium Tools";
    case "brand_name":
      return selectedProduct?.brand || "Premium Brand";
    case "feature_one":
      return "Universal Compatibility";
    case "feature_two":
      return "Advanced Security Features";
    case "feature_three":
      return "User-Friendly Interface";
    case "main_feature":
      return "Industry-Leading Performance";
    case "benefit_one":
      return "Saves Time and Money";
    case "benefit_two":
      return "Professional Results";
    case "call_to_action":
      return "Order Now - Limited Time Offer!";
    case "brand_story":
      return "Trusted by professionals worldwide for over a decade";
    case "unique_value":
      return "The only solution you'll ever need";
    case "customer_testimonial":
      return "This product transformed our business operations";
    case "website_description":
      return selectedProduct?.description ? 
        `Complete ${selectedProduct.name || "professional"} solution combining advanced technologies.` : 
        "Professional solution for your needs";
    case "product_image":
      return selectedProduct?.images?.[0] || "https://example.com/product-image.jpg";
    case "website_url":
      return "https://yourwebsite.com";
    case "urgency_text":
      return "Limited Time Only";
    case "cta_text":
      return "Shop Now";
    case "discount_percent":
      return "19%";
    default:
      return `Enter ${variable.replace(/_/g, ' ')}`;
  }
};

export const formatVariableName = (variable: string): string => {
  return variable.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export const initializeProductVariables = (
  variables: string[], 
  selectedProduct: InventoryItem,
  aiSuggestions?: Record<string, string>
): Record<string, ProductVariableState> => {
  const productVariables: Record<string, ProductVariableState> = {};
  variables.forEach(variable => {
    const extractedValue = extractProductData(variable, selectedProduct);
    const aiSuggested = aiSuggestions?.[variable] || generateAISuggestion(variable, extractedValue, selectedProduct);
    productVariables[variable] = {
      extracted: extractedValue,
      aiSuggested: aiSuggested,
      userImproved: "",
      checked: false
    };
  });
  return productVariables;
};
