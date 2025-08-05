import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ManualVideoEntry {
  videoId: string;
  videoUrl: string;
  productName: string;
  price: string;
  orientation: 'landscape' | 'portrait';
  description?: string;
}

export function ManualVideoAdder() {
  const [formData, setFormData] = useState<ManualVideoEntry>({
    videoId: "61ea8aedbfae4b0eaffb8aaf1c91d41a",
    videoUrl: "https://app.heygen.com/videos/61ea8aedbfae4b0eaffb8aaf1c91d41a",
    productName: "Original Lishi - Residential Bundle with KW1, KW5, SC1, SC4",
    price: "199",
    orientation: 'landscape',
    description: "Generated HeyGen video for Original Lishi residential bundle"
  });
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);

    try {
      // Format title: "name + price + landscape/portrait"
      const titleParts = [
        formData.productName,
        `$${formData.price}`,
        formData.orientation
      ];
      const title = titleParts.join(' + ');

      console.log('Adding video to library with title:', title);

      const { data, error } = await supabase
        .from('asset_library')
        .insert({
          title: title,
          asset_type: 'video',
          asset_url: formData.videoUrl,
          source_system: 'heygen',
          instruction: 'Manually added HeyGen video',
          description: formData.description || `Generated HeyGen video (ID: ${formData.videoId})`
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      toast({
        title: "Video Added Successfully! 🎉",
        description: `"${title}" has been added to your library`,
      });

      console.log('Video added to library:', data);

      // Reset form
      setFormData({
        videoId: "",
        videoUrl: "",
        productName: "",
        price: "",
        orientation: 'landscape',
        description: ""
      });

    } catch (error) {
      console.error('Error adding video:', error);
      toast({
        title: "Failed to Add Video",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Manually Add Generated Video</CardTitle>
        <CardDescription>
          Add your HeyGen video to the library with proper title formatting
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="videoId">Video ID</Label>
              <Input
                id="videoId"
                value={formData.videoId}
                onChange={(e) => setFormData(prev => ({ ...prev, videoId: e.target.value }))}
                placeholder="61ea8aedbfae4b0eaffb8aaf1c91d41a"
              />
            </div>
            <div>
              <Label htmlFor="videoUrl">Video URL</Label>
              <Input
                id="videoUrl"
                value={formData.videoUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, videoUrl: e.target.value }))}
                placeholder="https://app.heygen.com/videos/..."
              />
            </div>
          </div>

          <div>
            <Label htmlFor="productName">Product Name</Label>
            <Input
              id="productName"
              value={formData.productName}
              onChange={(e) => setFormData(prev => ({ ...prev, productName: e.target.value }))}
              placeholder="Original Lishi - Residential Bundle..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Price (without $)</Label>
              <Input
                id="price"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                placeholder="199"
              />
            </div>
            <div>
              <Label htmlFor="orientation">Orientation</Label>
              <select
                id="orientation"
                value={formData.orientation}
                onChange={(e) => setFormData(prev => ({ ...prev, orientation: e.target.value as 'landscape' | 'portrait' }))}
                className="w-full px-3 py-2 border border-input rounded-md"
              >
                <option value="landscape">Landscape</option>
                <option value="portrait">Portrait</option>
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Generated HeyGen video description..."
            />
          </div>

          <div className="p-3 bg-gray-50 rounded border">
            <Label className="text-sm font-medium">Preview Title:</Label>
            <p className="text-sm text-gray-700 mt-1">
              {formData.productName && formData.price
                ? `${formData.productName} + $${formData.price} + ${formData.orientation}`
                : "Enter product name and price to see title preview"
              }
            </p>
          </div>

          <Button type="submit" disabled={isAdding || !formData.productName || !formData.price}>
            {isAdding ? "Adding..." : "Add Video to Library"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}