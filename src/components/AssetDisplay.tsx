
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

type GeneratorType = 'image' | 'video' | 'content' | 'combo';

interface GeneratedAsset {
  id: string;
  type: GeneratorType;
  url: string;
  instruction: string;
  timestamp: Date;
  source_system?: string;
  content?: string; // For content-type assets
}

interface AssetDisplayProps {
  assets: GeneratedAsset[];
  isGenerating: boolean;
}

export function AssetDisplay({ assets, isGenerating }: AssetDisplayProps) {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleDownload = (asset: GeneratedAsset) => {
    if (asset.url && asset.type !== 'content') {
      // Create a temporary link to download the asset
      const link = document.createElement('a');
      link.href = asset.url;
      link.download = `${asset.type}-${asset.id}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download Started",
        description: `Downloading your ${asset.type}...`,
      });
    } else {
      toast({
        title: "Download Not Available",
        description: "This asset cannot be downloaded.",
        variant: "destructive",
      });
    }
  };

  const handleCopyContent = async (asset: GeneratedAsset) => {
    if (asset.content) {
      try {
        await navigator.clipboard.writeText(asset.content);
        setCopiedId(asset.id);
        setTimeout(() => setCopiedId(null), 2000);
        toast({
          title: "Content Copied",
          description: "Marketing content copied to clipboard!",
        });
      } catch (error) {
        toast({
          title: "Copy Failed",
          description: "Failed to copy content to clipboard.",
          variant: "destructive",
        });
      }
    }
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

  const getProviderBadge = (sourceSystem?: string) => {
    if (!sourceSystem) return null;
    
    const providerColors = {
      runway: "bg-red-100 text-red-800",
      heygen: "bg-blue-100 text-blue-800",
      openai: "bg-green-100 text-green-800"
    };
    
    return (
      <Badge className={providerColors[sourceSystem as keyof typeof providerColors] || "bg-gray-100 text-gray-800"}>
        {sourceSystem.toUpperCase()}
      </Badge>
    );
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
          {assets.map((asset) => (
            <div key={asset.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Badge className={getAssetTypeColor(asset.type)}>
                      {asset.type.toUpperCase()}
                    </Badge>
                    {getProviderBadge(asset.source_system)}
                    <span className="text-xs text-muted-foreground">
                      {asset.timestamp.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm">{asset.instruction}</p>
                </div>
                
                {asset.type === 'content' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyContent(asset)}
                    className="flex items-center space-x-1"
                  >
                    {copiedId === asset.id ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    <span>{copiedId === asset.id ? "Copied!" : "Copy"}</span>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(asset)}
                    className="flex items-center space-x-1"
                    disabled={!asset.url}
                  >
                    <Download className="h-4 w-4" />
                    <span>Download</span>
                  </Button>
                )}
              </div>
              
              {asset.type === 'image' && asset.url && (
                <div className="border rounded overflow-hidden">
                  <img 
                    src={asset.url} 
                    alt="Generated image"
                    className="w-full h-48 object-cover"
                  />
                </div>
              )}
              
              {asset.type === 'video' && asset.url && (
                <div className="border rounded overflow-hidden bg-black">
                  <video 
                    src={asset.url} 
                    controls
                    className="w-full h-48 object-contain"
                    poster={asset.url}
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              )}
              
              {asset.type === 'content' && asset.content && (
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <strong>Generated Marketing Content:</strong><br/>
                  <p className="mt-2 whitespace-pre-wrap">{asset.content}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
