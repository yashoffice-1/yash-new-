
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LibraryAssetCard } from "./library/LibraryAssetCard";

interface LibraryAsset {
  id: string;
  title: string;
  type: 'video' | 'image' | 'content';
  url: string;
  gif_url?: string;
  thumbnail?: string;
  createdAt: string;
  favorited: boolean;
  status: 'completed' | 'processing' | 'failed';
}

export function LibrarySection() {
  const [assets] = useState<LibraryAsset[]>([
    {
      id: "1",
      title: "Professional Drill Product Showcase",
      type: "video",
      url: "https://example.com/video1.mp4",
      gif_url: "https://example.com/video1.gif",
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
      gif_url: "https://example.com/video2.gif",
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
            <LibraryAssetCard key={asset.id} asset={asset} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
