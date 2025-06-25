
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type GeneratorType = 'image' | 'video' | 'content' | 'combo';

interface GeneratedAsset {
  type: GeneratorType;
  url: string;
  instruction: string;
  timestamp: Date;
}

interface AssetDisplayProps {
  assets: GeneratedAsset[];
  isGenerating: boolean;
}

export function AssetDisplay({ assets, isGenerating }: AssetDisplayProps) {
  const { toast } = useToast();

  const handleDownload = (asset: GeneratedAsset) => {
    // Simulate download
    toast({
      title: "Download Started",
      description: `Downloading your ${asset.type}...`,
    });
  };

  const getAssetTypeColor = (type: GeneratorType) => {
    const colors = {
      image: "bg-blue-100 text-blue-800",
      video: "bg-purple-100 text-purple-800", 
      content: "bg-green-100 text-green-800",
      combo: "bg-orange-100 text-orange-800"
    };
    return colors[type];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generated Assets</CardTitle>
        <CardDescription>Your AI-generated content is ready</CardDescription>
      </CardHeader>
      <CardContent>
        {isGenerating && (
          <div className="border rounded-lg p-4 mb-4 bg-blue-50">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-medium">Generating your content...</span>
            </div>
          </div>
        )}

        {assets.length === 0 && !isGenerating && (
          <div className="text-center py-8 text-muted-foreground">
            No assets generated yet. Complete the steps above to start generating!
          </div>
        )}

        <div className="space-y-4">
          {assets.map((asset, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Badge className={getAssetTypeColor(asset.type)}>
                      {asset.type.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {asset.timestamp.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm">{asset.instruction}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload(asset)}
                  className="flex items-center space-x-1"
                >
                  <Download className="h-4 w-4" />
                  <span>Download</span>
                </Button>
              </div>
              
              {asset.type !== 'content' && (
                <div className="border rounded overflow-hidden">
                  <img 
                    src={asset.url} 
                    alt="Generated content"
                    className="w-full h-48 object-cover"
                  />
                </div>
              )}
              
              {asset.type === 'content' && (
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <strong>Sample Generated Content:</strong><br/>
                  "Experience premium sound quality with our wireless headphones. Perfect for professionals who demand excellence in every detail. #AudioExcellence #WirelessFreedom"
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
