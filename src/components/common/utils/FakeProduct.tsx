
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/layout/card";
import { Button } from "@/components/ui/forms/button";
import { AspectRatio } from "@/components/ui/layout/aspect-ratio";

const FAKE_PRODUCT = {
  name: "Premium Wireless Headphones",
  description: "High-quality wireless headphones with noise cancellation, premium build quality, and superior sound.",
  images: [
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=400&h=400&fit=crop", 
    "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400&h=400&fit=crop"
  ]
};

interface FakeProductProps {
  onImageSelect: (imageUrl: string) => void;
  selectedImage: string | null;
}

export function FakeProduct({ onImageSelect, selectedImage }: FakeProductProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{FAKE_PRODUCT.name}</CardTitle>
        <CardDescription>{FAKE_PRODUCT.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <h4 className="font-medium">Select an image to generate content from:</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {FAKE_PRODUCT.images.map((image, index) => (
              <div key={index} className="space-y-2">
                <AspectRatio ratio={1}>
                  <img
                    src={image}
                    alt={`${FAKE_PRODUCT.name} - Image ${index + 1}`}
                    className="rounded-lg object-cover w-full h-full"
                  />
                </AspectRatio>
                <Button
                  variant={selectedImage === image ? "default" : "outline"}
                  onClick={() => onImageSelect(image)}
                  className="w-full"
                >
                  {selectedImage === image ? "Selected" : `Select Image ${index + 1}`}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
