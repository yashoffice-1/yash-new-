
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
    default:
      return "";
  }
};

export const generateAISuggestion = (variable: string, extractedValue: string): string => {
  switch (variable) {
    case "product_name":
      return extractedValue ? `Professional ${extractedValue}` : "";
    case "product_price":
      return extractedValue || "$1,155";
    case "product_discount":
      return "15% Off Limited Time";
    case "category_name":
      return extractedValue || "Premium Tools";
    case "brand_name":
      return extractedValue || "Premium Brand";
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
      return extractedValue ? 
        `Complete ${extractedValue || "professional"} solution combining advanced technologies.` : 
        "Professional solution for your needs";
    case "product_image":
      return extractedValue || "https://example.com/product-image.jpg";
    case "website_url":
      return "https://yourwebsite.com";
    default:
      return "";
  }
};

export const formatVariableName = (variable: string): string => {
  return variable.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export const initializeProductVariables = (
  variables: string[], 
  selectedProduct: InventoryItem
): Record<string, ProductVariableState> => {
  const productVariables: Record<string, ProductVariableState> = {};
  variables.forEach(variable => {
    const extractedValue = extractProductData(variable, selectedProduct);
    productVariables[variable] = {
      extracted: extractedValue,
      aiSuggested: generateAISuggestion(variable, extractedValue),
      userImproved: "",
      checked: false
    };
  });
  return productVariables;
};
