
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Share2, 
  Mail, 
  MessageSquare, 
  Copy, 
  Download, 
  Play,
  Heart,
  HeartOff
} from "lucide-react";

interface LibraryAsset {
  id: string;
  title: string;
  type: 'video' | 'image' | 'content';
  url: string;
  thumbnail?: string;
  createdAt: string;
  favorited: boolean;
  status: 'completed' | 'processing' | 'failed';
}

export function LibrarySection() {
  const { toast } = useToast();
  const [assets] = useState<LibraryAsset[]>([
    {
      id: "1",
      title: "Professional Drill Product Showcase",
      type: "video",
      url: "https://example.com/video1.mp4",
      thumbnail: "/placeholder.svg",
      createdAt: "2024-01-15",
      favorited: true,
      status: "completed"
    },
    {
      id: "2", 
      title: "Brand Story Video",
      type: "video",
      url: "https://example.com/video2.mp4",
      thumbnail: "/placeholder.svg",
      createdAt: "2024-01-14",
      favorited: false,
      status: "completed"
    },
    {
      id: "3",
      title: "Feature Highlight Reel",
      type: "video", 
      url: "https://example.com/video3.mp4",
      thumbnail: "/placeholder.svg",
      createdAt: "2024-01-13",
      favorited: false,
      status: "processing"
    }
  ]);

  const handleShare = (method: 'email' | 'sms' | 'whatsapp' | 'copy', asset: LibraryAsset) => {
    const shareUrl = `${window.location.origin}/share/${asset.id}`;
    const shareText = `Check out this video: ${asset.title}`;

    switch (method) {
      case 'email':
        window.open(`mailto:?subject=${encodeURIComponent(asset.title)}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`);
        break;
      case 'sms':
        window.open(`sms:?body=${encodeURIComponent(`${shareText} ${shareUrl}`)}`);
        break;
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`);
        break;
      case 'copy':
        navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Link Copied",
          description: "Share link has been copied to clipboard.",
        });
        break;
    }
  };

  const toggleFavorite = (assetId: string) => {
    // In real implementation, this would update the database
    toast({
      title: "Updated",
      description: "Asset favorite status updated.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Asset Library</CardTitle>
        <CardDescription>
          Your generated videos and content with sharing options
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {assets.map((asset) => (
            <div key={asset.id} className="border rounded-lg p-4">
              <div className="flex items-start space-x-4">
                {/* Thumbnail */}
                <div className="relative">
                  <img 
                    src={asset.thumbnail} 
                    alt={asset.title}
                    className="w-24 h-16 object-cover rounded bg-gray-200"
                  />
                  {asset.type === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Play className="h-6 w-6 text-white bg-black bg-opacity-50 rounded-full p-1" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{asset.title}</h3>
                      <p className="text-sm text-gray-600">
                        Created: {new Date(asset.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={asset.status === 'completed' ? 'default' : asset.status === 'processing' ? 'secondary' : 'destructive'}
                      >
                        {asset.status}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleFavorite(asset.id)}
                      >
                        {asset.favorited ? (
                          <Heart className="h-4 w-4 text-red-500 fill-current" />
                        ) : (
                          <HeartOff className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Share buttons - only show for completed assets */}
                  {asset.status === 'completed' && (
                    <div className="mt-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Share2 className="h-4 w-4" />
                        <span className="text-sm font-medium">Share:</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleShare('email', asset)}
                          className="flex items-center space-x-1"
                        >
                          <Mail className="h-3 w-3" />
                          <span>Email</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleShare('sms', asset)}
                          className="flex items-center space-x-1"
                        >
                          <MessageSquare className="h-3 w-3" />
                          <span>SMS</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleShare('whatsapp', asset)}
                          className="flex items-center space-x-1 bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                        >
                          <MessageSquare className="h-3 w-3" />
                          <span>WhatsApp</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleShare('copy', asset)}
                          className="flex items-center space-x-1"
                        >
                          <Copy className="h-3 w-3" />
                          <span>Copy Link</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center space-x-1"
                        >
                          <Download className="h-3 w-3" />
                          <span>Download</span>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
