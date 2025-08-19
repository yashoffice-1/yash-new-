import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/layout/card";
import { Button } from "@/components/ui/forms/button";
import { Input } from "@/components/ui/forms/input";
import { Label } from "@/components/ui/forms/label";
import { Textarea } from "@/components/ui/forms/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/forms/select";
import { Badge } from "@/components/ui/data_display/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/overlays/dialog";
import { Progress } from "@/components/ui/data_display/progress";
import { Separator } from "@/components/ui/layout/separator";
import { useToast } from "@/hooks/ui/use-toast";
import { Youtube, Upload, CheckCircle, AlertCircle, X, Globe, Lock, Eye, EyeOff, Sparkles, Clock, FileVideo, Facebook, Image, XCircle } from "lucide-react";
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
  const [isGenerating, setIsGenerating] = useState(false);

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
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/social/connections`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setConnections(data.connections);
      } else {
        console.error('Failed to fetch connections:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching connections:', error);
    } finally {
      setIsLoadingConnections(false);
    }
  };

  const handleGenerateMetadata = async () => {
    if (!asset?.asset_url) {
      toast({
        title: "No Video Available",
        description: "Please select a video first.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);

    try {
      const token = localStorage.getItem('auth_token');
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/ai/youtube/generate-metadata`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          assetId: asset.id,
          instruction: asset.instruction,
          productInfo: {
            name: asset?.title || "",
            description: asset?.description || "",
            category: 'Tools & Hardware'
          }
        })
      });

      const result = await response.json();

      if (result.success) {
        setUploadFormData({
          ...uploadFormData,
          title: result.data.title,
          description: result.data.description,
          tags: result.data.tags
        });

        toast({
          title: "Metadata Generated! ✨",
          description: "AI has generated title, description, and tags for your YouTube video.",
        });
      } else {
        throw new Error(result.error || 'Failed to generate metadata');
      }
    } catch (error) {
      console.error('Error generating metadata:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate YouTube metadata.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUploadToYouTube = async () => {
    // YouTube only supports video uploads, not direct image uploads
    if (asset?.asset_type === 'image') {
      toast({
        title: "YouTube Image Upload Not Supported",
        description: "YouTube only supports video uploads. Images can be used as video thumbnails or in Community posts.",
        variant: "destructive"
      });
      return;
    }

    if (!asset?.asset_url) {
      toast({
        title: "Error",
        description: `No ${asset?.asset_type || 'asset'} URL available for upload.`,
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setUploadingTo('youtube');
    setUploadProgress(0);

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 10;
      });
    }, 500);

    try {
      const token = localStorage.getItem('auth_token');
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/social/youtube/upload`, {
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

  const handleUploadToInstagram = async () => {
    if (!asset?.asset_url) {
      toast({
        title: "Error",
        description: `No ${asset?.asset_type || 'asset'} URL available for upload.`,
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setUploadingTo('instagram');
    setUploadProgress(0);

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 10;
      });
    }, 500);

    try {
      const token = localStorage.getItem('auth_token');
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      
      // Prepare request body based on asset type
      const requestBody: any = {
        caption: uploadFormData.description || uploadFormData.title,
        assetId: asset.id,
        mediaType: 'auto' // Let backend determine best media type
      };

      // Add the appropriate URL field based on asset type
      if (asset.asset_type === 'video') {
        requestBody.videoUrl = asset.asset_url;
      } else if (asset.asset_type === 'image') {
        requestBody.imageUrl = asset.asset_url;
      }

      const response = await fetch(`${backendUrl}/api/social/instagram/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();

      if (result.success) {
        setUploadProgress(100);
        setUploadStatus('success');
        const mediaTypeText = result.instagramMediaType === 'REELS' ? 'Reel' : 
                             result.instagramMediaType === 'IMAGE' ? 'Post' : 'Video';
        toast({
          title: "Upload Successful! 🎉",
          description: `${asset.asset_type === 'image' ? 'Image' : 'Video'} uploaded to Instagram as ${mediaTypeText}: ${result.mediaId}`,
        });
        if (onUploadComplete) {
          onUploadComplete(result);
        }
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading to Instagram:', error);
      setUploadStatus('error');
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : `Failed to upload ${asset.asset_type} to Instagram.`,
        variant: "destructive"
      });
    } finally {
      clearInterval(progressInterval);
      setUploadingTo(null);
      setIsLoading(false);
    }
  };

  const handleUploadToFacebook = async () => {
    if (!asset?.asset_url) {
      toast({
        title: "Error",
        description: `No ${asset?.asset_type || 'asset'} URL available for upload.`,
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setUploadingTo('facebook');
    setUploadProgress(0);

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 10;
      });
    }, 500);

    try {
      const token = localStorage.getItem('auth_token');
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/social/facebook/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: uploadFormData.description || uploadFormData.title,
          ...(asset.asset_type === 'video' ? { videoUrl: asset.asset_url } : { imageUrl: asset.asset_url }),
          assetId: asset.id
        })
      });

      const result = await response.json();

      if (result.success) {
        setUploadProgress(100);
        setUploadStatus('success');
        toast({
          title: "Upload Successful! 🎉",
          description: `${asset?.asset_type === 'image' ? 'Image' : 'Content'} uploaded to Facebook: ${result.postId}`,
        });
        if (onUploadComplete) {
          onUploadComplete(result);
        }
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading to Facebook:', error);
      setUploadStatus('error');
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : `Failed to upload ${asset?.asset_type === 'image' ? 'image' : 'content'} to Facebook.`,
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
      case 'facebook': return <Facebook className="h-5 w-5 text-blue-600" />;
      default: return null;
    }
  };

  const getPlatformName = (platform: string) => {
    switch (platform) {
      case 'youtube': return 'YouTube';
      case 'facebook': return 'Facebook';
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
                  {asset.asset_type === 'video' ? (
                    <FileVideo className="h-6 w-6 text-blue-600" />
                  ) : asset.asset_type === 'image' ? (
                    <Image className="h-6 w-6 text-blue-600" />
                  ) : (
                    <FileVideo className="h-6 w-6 text-blue-600" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">
                    {asset.title || `Untitled ${asset.asset_type || 'Asset'}`}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {asset.asset_type?.toUpperCase()} • {asset.source_system}
                  </p>
                </div>
                <Badge variant="secondary">
                  {asset.asset_type === 'video' ? 'Video' : asset.asset_type === 'image' ? 'Image' : 'Asset'}
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
                {asset?.asset_type === 'image' && (
                  <Badge variant="outline" className="text-xs">Images Not Supported</Badge>
                )}
              </div>

              {asset?.asset_type === 'image' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-800">YouTube Image Upload Not Available</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        YouTube only supports video uploads. Images can be used as video thumbnails or in Community posts, but direct image uploads are not supported.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="title" className="flex items-center space-x-2">
                      <span>Video Title</span>
                      <span className="text-red-500">*</span>
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateMetadata}
                      disabled={isGenerating || !asset?.asset_url}
                      className="flex items-center space-x-2"
                    >
                      {isGenerating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          <span>Generate with AI</span>
                        </>
                      )}
                    </Button>
                  </div>
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
                  disabled={isLoading || !asset?.asset_url || uploadStatus === 'success' || asset?.asset_type === 'image'}
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
                    ) : asset?.asset_type === 'image' ? (
                      <>
                        <XCircle className="h-5 w-5" />
                        <span>Images Not Supported</span>
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

          {/* Instagram Upload Section */}
          {isConnected('instagram') && (
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 bg-gradient-to-r from-purple-500 to-pink-500 rounded"></div>
                <h3 className="text-lg font-semibold">Upload to Instagram</h3>
                {asset?.asset_type === 'image' && (
                  <Badge variant="outline" className="text-xs">Images as Posts</Badge>
                )}
              </div>

              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="instagram-caption">Caption</Label>
                  <Textarea
                    id="instagram-caption"
                    value={uploadFormData.description}
                    onChange={(e) => setUploadFormData({ ...uploadFormData, description: e.target.value })}
                    placeholder="Write an engaging caption for your Instagram post..."
                    rows={4}
                    className="resize-none"
                  />
                  <p className="text-xs text-gray-500">
                    {uploadFormData.description.length}/2200 characters (Instagram limit)
                  </p>
                </div>

                {/* Upload Progress for Instagram */}
                <div className={`space-y-2 transition-all duration-300 ${uploadingTo === 'instagram' ? 'opacity-100 max-h-20' : 'opacity-0 max-h-0 overflow-hidden'}`}>
                  <div className="flex items-center justify-between text-sm">
                    <span>Uploading to Instagram...</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-xs text-gray-500">
                    This may take a few minutes depending on {asset?.asset_type === 'image' ? 'image' : 'video'} size
                  </p>
                </div>

                {/* Success State for Instagram */}
                <div className={`transition-all duration-300 ${uploadStatus === 'success' && uploadingTo === 'instagram' ? 'opacity-100 max-h-24' : 'opacity-0 max-h-0 overflow-hidden'}`}>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-800">Upload Successful!</span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      Your {asset?.asset_type === 'image' ? 'image' : 'video'} has been uploaded to Instagram successfully.
                    </p>
                  </div>
                </div>

                {/* Upload Button for Instagram */}
                <Button
                  onClick={handleUploadToInstagram}
                  disabled={isLoading || !asset?.asset_url || (uploadStatus === 'success' && uploadingTo === 'instagram')}
                  className="w-full h-12 text-base font-medium transition-all duration-200"
                  size="lg"
                >
                  <div className="flex items-center justify-center space-x-2 min-h-[20px]">
                    {uploadingTo === 'instagram' ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Uploading...</span>
                      </>
                    ) : uploadStatus === 'success' && uploadingTo === 'instagram' ? (
                      <>
                        <CheckCircle className="h-5 w-5" />
                        <span>Uploaded Successfully</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-5 w-5" />
                        <span>Upload {asset?.asset_type === 'image' ? 'Image' : 'Video'} to Instagram</span>
                      </>
                    )}
                  </div>
                </Button>
              </div>
            </div>
          )}

          {/* Facebook Upload Section */}
          {isConnected('facebook') && (
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <Facebook className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Upload to Facebook</h3>
              </div>

              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="facebook-message">Message</Label>
                  <Textarea
                    id="facebook-message"
                    value={uploadFormData.description}
                    onChange={(e) => setUploadFormData({ ...uploadFormData, description: e.target.value })}
                    placeholder={`Write an engaging message for your Facebook ${asset?.asset_type === 'image' ? 'image post' : 'video post'}...`}
                    rows={4}
                    className="resize-none"
                  />
                  <p className="text-xs text-gray-500">
                    {uploadFormData.description.length}/63206 characters (Facebook limit)
                  </p>
                </div>

                {/* Upload Progress for Facebook */}
                <div className={`space-y-2 transition-all duration-300 ${uploadingTo === 'facebook' ? 'opacity-100 max-h-20' : 'opacity-0 max-h-0 overflow-hidden'}`}>
                  <div className="flex items-center justify-between text-sm">
                    <span>Uploading to Facebook...</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-xs text-gray-500">
                    This may take a few minutes depending on {asset?.asset_type === 'image' ? 'image' : 'video'} size
                  </p>
                </div>

                {/* Success State for Facebook */}
                <div className={`transition-all duration-300 ${uploadStatus === 'success' && uploadingTo === 'facebook' ? 'opacity-100 max-h-24' : 'opacity-0 max-h-0 overflow-hidden'}`}>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-800">Upload Successful!</span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      Your {asset?.asset_type === 'image' ? 'image' : 'content'} has been uploaded to Facebook successfully.
                    </p>
                  </div>
                </div>

                {/* Upload Button for Facebook */}
                <Button
                  onClick={handleUploadToFacebook}
                  disabled={isLoading || !asset?.asset_url || (uploadStatus === 'success' && uploadingTo === 'facebook')}
                  className="w-full h-12 text-base font-medium transition-all duration-200"
                  size="lg"
                >
                  <div className="flex items-center justify-center space-x-2 min-h-[20px]">
                    {uploadingTo === 'facebook' ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Uploading...</span>
                      </>
                    ) : uploadStatus === 'success' && uploadingTo === 'facebook' ? (
                      <>
                        <CheckCircle className="h-5 w-5" />
                        <span>Uploaded Successfully</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-5 w-5" />
                        <span>Upload {asset?.asset_type === 'image' ? 'Image' : 'Video'} to Facebook</span>
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
                    <p className="font-medium">LinkedIn</p>
                    <p className="text-sm text-gray-600">Share professional content</p>
                  </div>
                </div>
                <Badge variant="outline">Coming Soon</Badge>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                    <div className="w-5 h-5 bg-white rounded"></div>
                  </div>
                  <div>
                    <p className="font-medium">TikTok</p>
                    <p className="text-sm text-gray-600">Share short-form videos</p>
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