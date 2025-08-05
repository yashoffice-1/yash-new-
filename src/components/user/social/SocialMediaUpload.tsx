import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/ui/use-toast";
import { Youtube, Upload, CheckCircle, AlertCircle, X, Globe, Lock, Eye, EyeOff, Sparkles, Clock, FileVideo } from "lucide-react";
import { AssetLibraryItem } from "@/hooks/data/useAssetLibrary";

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
  asset?: AssetLibraryItem;
  onClose?: () => void;
  onUploadComplete?: (result: any) => void;
}

export function SocialMediaUpload({ asset, onClose, onUploadComplete }: SocialMediaUploadProps) {
  const { toast } = useToast();
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConnections, setIsLoadingConnections] = useState(true);
  const [uploadingTo, setUploadingTo] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadFormData, setUploadFormData] = useState<UploadFormData>({
    title: asset?.title || '',
    description: asset?.description || '',
    tags: '',
    privacy: 'private'
  });

  useEffect(() => {
    fetchConnections();
  }, []);

  // Auto-generate title if empty
  useEffect(() => {
    if (!uploadFormData.title && asset?.title) {
      setUploadFormData(prev => ({ ...prev, title: asset.title }));
    }
  }, [asset]);

  const fetchConnections = async () => {
    try {
      setIsLoadingConnections(true);
      const token = localStorage.getItem('auth_token');
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
    } finally {
      setIsLoadingConnections(false);
    }
  };

  const handleUploadToYouTube = async () => {
    if (!asset?.asset_url) {
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
    setUploadStatus('uploading');
    setUploadProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 10;
      });
    }, 500);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:3001/api/social/youtube/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          videoUrl: asset.asset_url,
          title: uploadFormData.title,
          description: uploadFormData.description,
          tags: uploadFormData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
          privacy: uploadFormData.privacy,
          assetId: asset.id // Use the AssetLibrary ID for tracking
        })
      });

      const result = await response.json();

      if (result.success) {
        setUploadProgress(100);
        setUploadStatus('success');
        toast({
          title: "Upload Successful! 🎉",
          description: `Video uploaded to YouTube: ${result.title}`,
        });
        if (onUploadComplete) {
          onUploadComplete(result);
        }
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading to YouTube:', error);
      setUploadStatus('error');
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload video to YouTube.",
        variant: "destructive"
      });
    } finally {
      clearInterval(progressInterval);
      setUploadingTo(null);
      setIsLoading(false);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'youtube': return <Youtube className="h-5 w-5 text-red-600" />;
      default: return null;
    }
  };

  const getPlatformName = (platform: string) => {
    switch (platform) {
      case 'youtube': return 'YouTube';
      default: return platform;
    }
  };

  const getPrivacyIcon = (privacy: string) => {
    switch (privacy) {
      case 'private': return <Lock className="h-4 w-4" />;
      case 'unlisted': return <EyeOff className="h-4 w-4" />;
      case 'public': return <Globe className="h-4 w-4" />;
      default: return <Lock className="h-4 w-4" />;
    }
  };

  const getPrivacyDescription = (privacy: string) => {
    switch (privacy) {
      case 'private': return 'Only you can see this video';
      case 'unlisted': return 'Anyone with the link can see this video';
      case 'public': return 'Anyone can search for and see this video';
      default: return 'Only you can see this video';
    }
  };

  const isConnected = (platform: string) => {
    return connections.some(conn => conn.platform === platform && conn.isActive);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoadingConnections) {
    return (
      <Dialog open={!!asset} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Upload className="h-5 w-5" />
              <span>Upload to Social Media</span>
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
            <h3 className="text-lg font-semibold mb-2">Loading Connections</h3>
            <p className="text-gray-600 mb-6">
              Checking your connected social media accounts...
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (connections.length === 0) {
    return (
      <Dialog open={!!asset} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Upload className="h-5 w-5" />
              <span>Upload to Social Media</span>
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Connected Accounts</h3>
            <p className="text-gray-600 mb-6">
              Connect your social media accounts to upload content directly from your asset library.
            </p>
            <Button onClick={() => window.location.href = '/settings'} className="w-full">
              <Sparkles className="h-4 w-4 mr-2" />
              Connect Accounts
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={!!asset} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>Upload to Social Media</span>
          </DialogTitle>
          <p className="text-sm text-gray-600">
            Share your generated content with the world
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Asset Preview */}
          {asset && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileVideo className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{asset.title || 'Untitled Video'}</h4>
                  <p className="text-sm text-gray-600">
                    {asset.asset_type?.toUpperCase()} • {asset.source_system}
                  </p>
                </div>
                <Badge variant="secondary">
                  {asset.asset_type === 'video' ? 'Video' : 'Asset'}
                </Badge>
              </div>
            </div>
          )}

          {/* Connected Platforms */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Connected Platforms</span>
            </h3>
            <div className="grid gap-3">
              {connections.map((connection) => (
                <div key={connection.id} className="flex items-center justify-between p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    {getPlatformIcon(connection.platform)}
                    <div>
                      <p className="font-medium">{getPlatformName(connection.platform)}</p>
                      <p className="text-sm text-gray-600">{connection.platformUsername}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Upload Form */}
          {isConnected('youtube') && (
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <Youtube className="h-5 w-5 text-red-600" />
                <h3 className="text-lg font-semibold">Upload to YouTube</h3>
              </div>
              
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="flex items-center space-x-2">
                    <span>Video Title</span>
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={uploadFormData.title}
                    onChange={(e) => setUploadFormData({ ...uploadFormData, title: e.target.value })}
                    placeholder="Enter an engaging title for your video"
                    className="h-10"
                  />
                  <p className="text-xs text-gray-500">
                    {uploadFormData.title.length}/100 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={uploadFormData.description}
                    onChange={(e) => setUploadFormData({ ...uploadFormData, description: e.target.value })}
                    placeholder="Describe your video content, include relevant links, and engage your audience"
                    rows={4}
                    className="resize-none"
                  />
                  <p className="text-xs text-gray-500">
                    {uploadFormData.description.length}/5000 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags">Tags</Label>
                  <Input
                    id="tags"
                    value={uploadFormData.tags}
                    onChange={(e) => setUploadFormData({ ...uploadFormData, tags: e.target.value })}
                    placeholder="Enter tags separated by commas (e.g., tutorial, tech, 2024)"
                    className="h-10"
                  />
                  <p className="text-xs text-gray-500">
                    Tags help people discover your video
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="privacy">Privacy Setting</Label>
                  <Select
                    value={uploadFormData.privacy}
                    onValueChange={(value: 'private' | 'unlisted' | 'public') => 
                      setUploadFormData({ ...uploadFormData, privacy: value })
                    }
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">
                        <div className="flex items-center space-x-2">
                          <Lock className="h-4 w-4" />
                          <span>Private</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="unlisted">
                        <div className="flex items-center space-x-2">
                          <EyeOff className="h-4 w-4" />
                          <span>Unlisted</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="public">
                        <div className="flex items-center space-x-2">
                          <Globe className="h-4 w-4" />
                          <span>Public</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    {getPrivacyDescription(uploadFormData.privacy)}
                  </p>
                </div>

                {/* Upload Progress - Always reserve space */}
                <div className={`space-y-2 transition-all duration-300 ${uploadStatus === 'uploading' ? 'opacity-100 max-h-20' : 'opacity-0 max-h-0 overflow-hidden'}`}>
                  <div className="flex items-center justify-between text-sm">
                    <span>Uploading to YouTube...</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-xs text-gray-500">
                    This may take a few minutes depending on video size
                  </p>
                </div>

                {/* Success State - Always reserve space */}
                <div className={`transition-all duration-300 ${uploadStatus === 'success' ? 'opacity-100 max-h-24' : 'opacity-0 max-h-0 overflow-hidden'}`}>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-800">Upload Successful!</span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      Your video has been uploaded to YouTube successfully.
                    </p>
                  </div>
                </div>

                {/* Upload Button - Fixed height to prevent layout shift */}
                <Button
                  onClick={handleUploadToYouTube}
                  disabled={isLoading || !asset?.asset_url || uploadStatus === 'success'}
                  className="w-full h-12 text-base font-medium transition-all duration-200"
                  size="lg"
                >
                  <div className="flex items-center justify-center space-x-2 min-h-[20px]">
                    {uploadingTo === 'youtube' ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Uploading...</span>
                      </>
                    ) : uploadStatus === 'success' ? (
                      <>
                        <CheckCircle className="h-5 w-5" />
                        <span>Uploaded Successfully</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-5 w-5" />
                        <span>Upload to YouTube</span>
                      </>
                    )}
                  </div>
                </Button>
              </div>
            </div>
          )}

          <Separator />

          {/* Coming Soon Platforms */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <Clock className="h-5 w-5 text-gray-400" />
              <span>Coming Soon</span>
            </h3>
            <div className="grid gap-3">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <div className="w-5 h-5 bg-blue-600 rounded"></div>
                  </div>
                  <div>
                    <p className="font-medium">Facebook</p>
                    <p className="text-sm text-gray-600">Post videos to your Facebook page</p>
                  </div>
                </div>
                <Badge variant="outline">Coming Soon</Badge>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                    <div className="w-5 h-5 bg-pink-600 rounded"></div>
                  </div>
                  <div>
                    <p className="font-medium">Instagram</p>
                    <p className="text-sm text-gray-600">Share videos to your Instagram account</p>
                  </div>
                </div>
                <Badge variant="outline">Coming Soon</Badge>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <div className="w-5 h-5 bg-blue-600 rounded"></div>
                  </div>
                  <div>
                    <p className="font-medium">LinkedIn</p>
                    <p className="text-sm text-gray-600">Share professional content</p>
                  </div>
                </div>
                <Badge variant="outline">Coming Soon</Badge>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 