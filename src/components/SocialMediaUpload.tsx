import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Youtube, Upload, CheckCircle, AlertCircle } from "lucide-react";

interface SocialConnection {
  id: string;
  platform: string;
  platformUsername: string;
  platformEmail: string;
  isActive: boolean;
  createdAt: string;
}

interface UploadFormData {
  title: string;
  description: string;
  tags: string;
  privacy: 'private' | 'unlisted' | 'public';
}

interface SocialMediaUploadProps {
  videoUrl?: string;
  onUploadComplete?: (result: any) => void;
}

export function SocialMediaUpload({ videoUrl, onUploadComplete }: SocialMediaUploadProps) {
  const { toast } = useToast();
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingTo, setUploadingTo] = useState<string | null>(null);
  const [uploadFormData, setUploadFormData] = useState<UploadFormData>({
    title: '',
    description: '',
    tags: '',
    privacy: 'private'
  });

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/social/connections', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setConnections(data.connections);
      }
    } catch (error) {
      console.error('Error fetching connections:', error);
    }
  };

  const handleUploadToYouTube = async () => {
    if (!videoUrl) {
      toast({
        title: "No Video Available",
        description: "Please generate a video first before uploading.",
        variant: "destructive"
      });
      return;
    }

    if (!uploadFormData.title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a title for your video.",
        variant: "destructive"
      });
      return;
    }

    setUploadingTo('youtube');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/social/youtube/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          videoUrl,
          title: uploadFormData.title,
          description: uploadFormData.description,
          tags: uploadFormData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
          privacy: uploadFormData.privacy
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Upload Successful!",
          description: `Video uploaded to YouTube: ${result.title}`,
        });
        
        if (onUploadComplete) {
          onUploadComplete(result);
        }
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading to YouTube:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload video to YouTube.",
        variant: "destructive"
      });
    } finally {
      setUploadingTo(null);
      setIsLoading(false);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'youtube': return <Youtube className="h-4 w-4 text-red-600" />;
      default: return null;
    }
  };

  const getPlatformName = (platform: string) => {
    switch (platform) {
      case 'youtube': return 'YouTube';
      default: return platform;
    }
  };

  const isConnected = (platform: string) => {
    return connections.some(conn => conn.platform === platform && conn.isActive);
  };

  if (connections.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>Upload to Social Media</span>
          </CardTitle>
          <CardDescription>
            Connect your social media accounts to upload content directly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">
              No social media accounts connected yet.
            </p>
            <Button variant="outline" onClick={() => window.location.href = '/settings'}>
              Connect Accounts
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Upload className="h-5 w-5" />
          <span>Upload to Social Media</span>
        </CardTitle>
        <CardDescription>
          Upload your generated content to your connected social media accounts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connected Platforms */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Connected Platforms</h3>
          <div className="grid gap-4">
            {connections.map((connection) => (
              <div key={connection.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {getPlatformIcon(connection.platform)}
                  <div>
                    <p className="font-medium">{getPlatformName(connection.platform)}</p>
                    <p className="text-sm text-gray-600">{connection.platformUsername}</p>
                  </div>
                </div>
                <Badge variant="secondary">Connected</Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Upload Form */}
        {isConnected('youtube') && (
          <div className="space-y-4 border-t pt-6">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <Youtube className="h-5 w-5 text-red-600" />
              <span>Upload to YouTube</span>
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Video Title *</Label>
                <Input
                  id="title"
                  value={uploadFormData.title}
                  onChange={(e) => setUploadFormData({ ...uploadFormData, title: e.target.value })}
                  placeholder="Enter your video title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={uploadFormData.description}
                  onChange={(e) => setUploadFormData({ ...uploadFormData, description: e.target.value })}
                  placeholder="Enter video description"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={uploadFormData.tags}
                  onChange={(e) => setUploadFormData({ ...uploadFormData, tags: e.target.value })}
                  placeholder="Enter tags separated by commas"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="privacy">Privacy Setting</Label>
                <Select
                  value={uploadFormData.privacy}
                  onValueChange={(value: 'private' | 'unlisted' | 'public') => 
                    setUploadFormData({ ...uploadFormData, privacy: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="unlisted">Unlisted</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleUploadToYouTube}
                disabled={isLoading || !videoUrl}
                className="w-full flex items-center space-x-2"
              >
                {uploadingTo === 'youtube' ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Uploading to YouTube...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    <span>Upload to YouTube</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Coming Soon Platforms */}
        <div className="space-y-4 border-t pt-6">
          <h3 className="text-lg font-semibold">Coming Soon</h3>
          <div className="grid gap-4 opacity-50">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="h-5 w-5 bg-blue-600 rounded"></div>
                <div>
                  <p className="font-medium">Facebook</p>
                  <p className="text-sm text-gray-600">Post videos to your Facebook page</p>
                </div>
              </div>
              <Badge variant="outline">Coming Soon</Badge>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="h-5 w-5 bg-pink-600 rounded"></div>
                <div>
                  <p className="font-medium">Instagram</p>
                  <p className="text-sm text-gray-600">Share videos to your Instagram account</p>
                </div>
              </div>
              <Badge variant="outline">Coming Soon</Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 