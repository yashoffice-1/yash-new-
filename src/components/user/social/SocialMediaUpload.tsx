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
  const [uploadResults, setUploadResults] = useState<Record<string, any>>({}); // Track results for each platform
  
  // Separate form data for each platform
  const [youtubeFormData, setYoutubeFormData] = useState<UploadFormData>({
    title: asset?.title || '',
    description: asset?.description || '',
    tags: '',
    privacy: 'private'
  });
  
  const [instagramFormData, setInstagramFormData] = useState<UploadFormData>({
    title: asset?.title || '',
    description: asset?.description || '',
    tags: '',
    privacy: 'private'
  });
  
  const [facebookFormData, setFacebookFormData] = useState<UploadFormData>({
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
    if (!youtubeFormData.title && asset?.title) {
      setYoutubeFormData(prev => ({ ...prev, title: asset.title }));
    }
    if (!instagramFormData.title && asset?.title) {
      setInstagramFormData(prev => ({ ...prev, title: asset.title }));
    }
    if (!facebookFormData.title && asset?.title) {
      setFacebookFormData(prev => ({ ...prev, title: asset.title }));
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
        setYoutubeFormData({
          ...youtubeFormData,
          title: result.data.title,
          description: result.data.description,
          tags: result.data.tags
        });
        setInstagramFormData({
          ...instagramFormData,
          title: result.data.title,
          description: result.data.description,
          tags: result.data.tags
        });
        setFacebookFormData({
          ...facebookFormData,
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
          title: youtubeFormData.title,
          description: youtubeFormData.description,
          tags: youtubeFormData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
          privacy: youtubeFormData.privacy,
          assetId: asset.id // Use the AssetLibrary ID for tracking
        })
      });

      const result = await response.json();

      if (result.success) {
        setUploadProgress(100);
        setUploadStatus('success');
        setUploadResults(prev => ({ ...prev, youtube: result }));
        toast({
          title: "Upload Successful! 🎉",
          description: `Video uploaded to YouTube: ${result.title}`,
        });
        // Don't call onUploadComplete here - let user decide when to close
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
        caption: instagramFormData.description || instagramFormData.title,
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
        setUploadResults(prev => ({ ...prev, instagram: result }));
        const mediaTypeText = result.instagramMediaType === 'REELS' ? 'Reel' : 
                             result.instagramMediaType === 'IMAGE' ? 'Post' : 'Video';
        toast({
          title: "Upload Successful! 🎉",
          description: `${asset.asset_type === 'image' ? 'Image' : 'Video'} uploaded to Instagram as ${mediaTypeText}: ${result.mediaId}`,
        });
        // Don't call onUploadComplete here - let user decide when to close
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
          message: facebookFormData.description || facebookFormData.title,
          ...(asset.asset_type === 'video' ? { videoUrl: asset.asset_url } : { imageUrl: asset.asset_url }),
          assetId: asset.id
        })
      });

      const result = await response.json();

      if (result.success) {
        setUploadProgress(100);
        setUploadStatus('success');
        setUploadResults(prev => ({ ...prev, facebook: result }));
        toast({
          title: "Upload Successful! 🎉",
          description: `${asset?.asset_type === 'image' ? 'Image' : 'Content'} uploaded to Facebook: ${result.postId}`,
        });
        // Don't call onUploadComplete here - let user decide when to close
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

  // New function to handle modal close with results
  const handleCloseModal = () => {
    // If we have any successful uploads, call onUploadComplete with all results
    if (Object.keys(uploadResults).length > 0) {
      onUploadComplete?.(uploadResults);
    } else {
      // User closed without uploading - show a gentle reminder
      toast({
        title: "No Uploads Made",
        description: "You can upload to multiple platforms. Your form data is preserved until you close the modal.",
        variant: "default"
      });
    }
    onClose?.();
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
    <Dialog open={!!asset} onOpenChange={handleCloseModal}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-6">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-gray-900">
                Share to Social Media
              </DialogTitle>
              <p className="text-gray-600 mt-1">
                Upload your {asset?.asset_type || 'asset'} to multiple platforms with custom content
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                {asset?.asset_type?.toUpperCase() || 'ASSET'}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-8">
          {/* Asset Preview */}
          {asset && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-white rounded-lg shadow-sm flex items-center justify-center border border-blue-200">
                  {asset.asset_type === 'video' ? (
                    <FileVideo className="h-8 w-8 text-blue-600" />
                  ) : asset.asset_type === 'image' ? (
                    <Image className="h-8 w-8 text-purple-600" />
                  ) : (
                    <Upload className="h-8 w-8 text-gray-600" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 text-lg">
                    {asset.title || `Untitled ${asset.asset_type || 'Asset'}`}
                  </h4>
                  <p className="text-gray-600">
                    {asset.asset_type?.toUpperCase()} • {asset.source_system}
                  </p>
                  {asset.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {asset.description}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <Badge variant="secondary" className="bg-white text-gray-700 border-gray-200">
                    {asset.asset_type === 'video' ? 'Video' : asset.asset_type === 'image' ? 'Image' : 'Asset'}
                  </Badge>
                  <div className="text-xs text-gray-500">
                    Ready to upload
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Connected Platforms Status */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Connected Platforms</h3>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                {connections.length} connected
              </Badge>
            </div>
            <div className="grid gap-3">
              {connections.map((connection) => (
                <div key={connection.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 transition-all duration-200 shadow-sm">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
                      {getPlatformIcon(connection.platform)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{getPlatformName(connection.platform)}</p>
                      <p className="text-sm text-gray-600">@{connection.platformUsername}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-700 font-medium">Connected</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator className="my-8" />

          {/* Upload Sections */}
          <div className="space-y-8">
            {/* YouTube Upload Section */}
            {isConnected('youtube') && (
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <Youtube className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">YouTube</h3>
                      <p className="text-sm text-gray-600">Share your video with the world</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {uploadResults.youtube && (
                      <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Uploaded
                      </Badge>
                    )}
                    {asset?.asset_type === 'image' && (
                      <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                        Images Not Supported
                      </Badge>
                    )}
                  </div>
                </div>

                {asset?.asset_type === 'image' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-yellow-800">YouTube Image Upload Not Available</h4>
                        <p className="text-sm text-yellow-700 mt-1">
                          YouTube only supports video uploads. Images can be used as video thumbnails or in Community posts, but direct image uploads are not supported.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Success State for YouTube */}
                {uploadResults.youtube && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <div>
                        <span className="font-medium text-green-800">Uploaded to YouTube Successfully!</span>
                        <p className="text-sm text-green-700 mt-1">
                          Video: {uploadResults.youtube.title}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="youtube-title" className="flex items-center space-x-2 text-sm font-medium">
                        <span>Video Title</span>
                        <span className="text-red-500">*</span>
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateMetadata}
                        disabled={isGenerating || !asset?.asset_url}
                        className="flex items-center space-x-2 text-xs"
                      >
                        {isGenerating ? (
                          <>
                            <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            <span>Generating...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3 w-3" />
                            <span>Generate with AI</span>
                          </>
                        )}
                      </Button>
                    </div>
                    <Input
                      id="youtube-title"
                      value={youtubeFormData.title}
                      onChange={(e) => setYoutubeFormData({ ...youtubeFormData, title: e.target.value })}
                      placeholder="Enter a compelling title for your video..."
                      className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      disabled={!!uploadResults.youtube}
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Keep it engaging and descriptive</span>
                      <span>{youtubeFormData.title.length}/100</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="youtube-description" className="text-sm font-medium">Description</Label>
                    <Textarea
                      id="youtube-description"
                      value={youtubeFormData.description}
                      onChange={(e) => setYoutubeFormData({ ...youtubeFormData, description: e.target.value })}
                      placeholder="Describe your video content, include relevant links, and engage your audience..."
                      rows={4}
                      className="resize-none border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      disabled={!!uploadResults.youtube}
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Include relevant links and call-to-actions</span>
                      <span>{youtubeFormData.description.length}/5000</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="youtube-tags" className="text-sm font-medium">Tags</Label>
                    <Input
                      id="youtube-tags"
                      value={youtubeFormData.tags}
                      onChange={(e) => setYoutubeFormData({ ...youtubeFormData, tags: e.target.value })}
                      placeholder="Enter tags separated by commas (e.g., tutorial, tech, 2024)"
                      className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      disabled={!!uploadResults.youtube}
                    />
                    <div className="text-xs text-gray-500">
                      Tags help people discover your video
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="youtube-privacy" className="text-sm font-medium">Privacy Setting</Label>
                    <Select 
                      value={youtubeFormData.privacy} 
                      onValueChange={(value: 'private' | 'unlisted' | 'public') => 
                        setYoutubeFormData({ ...youtubeFormData, privacy: value })
                      }
                      disabled={!!uploadResults.youtube}
                    >
                      <SelectTrigger className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="private">Private</SelectItem>
                        <SelectItem value="unlisted">Unlisted</SelectItem>
                        <SelectItem value="public">Public</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Upload Progress for YouTube */}
                  <div className={`space-y-3 transition-all duration-300 ${uploadingTo === 'youtube' ? 'opacity-100 max-h-24' : 'opacity-0 max-h-0 overflow-hidden'}`}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Uploading to YouTube...</span>
                      <span className="text-blue-600 font-semibold">{Math.round(uploadProgress)}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2 bg-gray-200" />
                    <p className="text-xs text-gray-500">
                      This may take a few minutes depending on video size
                    </p>
                  </div>

                  {/* Upload Button for YouTube */}
                  <Button
                    onClick={handleUploadToYouTube}
                    disabled={isLoading || !asset?.asset_url || asset?.asset_type === 'image' || !!uploadResults.youtube}
                    className="w-full h-12 text-base font-medium transition-all duration-200 bg-red-600 hover:bg-red-700 disabled:bg-gray-300"
                    size="lg"
                  >
                    <div className="flex items-center justify-center space-x-2 min-h-[20px]">
                      {uploadingTo === 'youtube' ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span>Uploading...</span>
                        </>
                      ) : uploadResults.youtube ? (
                        <>
                          <CheckCircle className="h-5 w-5" />
                          <span>Uploaded Successfully</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-5 w-5" />
                          <span>Upload Video to YouTube</span>
                        </>
                      )}
                    </div>
                  </Button>
                </div>
              </div>
            )}

            {/* Instagram Upload Section */}
            {isConnected('instagram') && (
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                      <div className="w-6 h-6 bg-white rounded-sm"></div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Instagram</h3>
                      <p className="text-sm text-gray-600">Share your content with your followers</p>
                    </div>
                  </div>
                  {uploadResults.instagram && (
                    <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Uploaded
                    </Badge>
                  )}
                </div>

                {/* Success State for Instagram */}
                {uploadResults.instagram && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <div>
                        <span className="font-medium text-green-800">Uploaded to Instagram Successfully!</span>
                        <p className="text-sm text-green-700 mt-1">
                          {uploadResults.instagram.instagramMediaType === 'REELS' ? 'Reel' : 'Post'} ID: {uploadResults.instagram.mediaId}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="instagram-caption" className="text-sm font-medium">Caption</Label>
                    <Textarea
                      id="instagram-caption"
                      value={instagramFormData.description}
                      onChange={(e) => setInstagramFormData({ ...instagramFormData, description: e.target.value })}
                      placeholder={`Write an engaging caption for your Instagram ${asset?.asset_type === 'image' ? 'image post' : 'video post'}...`}
                      rows={4}
                      className="resize-none border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                      disabled={!!uploadResults.instagram}
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Use relevant hashtags and emojis</span>
                      <span>{instagramFormData.description.length}/2200</span>
                    </div>
                  </div>

                  {/* Upload Progress for Instagram */}
                  <div className={`space-y-3 transition-all duration-300 ${uploadingTo === 'instagram' ? 'opacity-100 max-h-24' : 'opacity-0 max-h-0 overflow-hidden'}`}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Uploading to Instagram...</span>
                      <span className="text-purple-600 font-semibold">{Math.round(uploadProgress)}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2 bg-gray-200" />
                    <p className="text-xs text-gray-500">
                      This may take a few minutes depending on {asset?.asset_type === 'image' ? 'image' : 'video'} size
                    </p>
                  </div>

                  {/* Upload Button for Instagram */}
                  <Button
                    onClick={handleUploadToInstagram}
                    disabled={isLoading || !asset?.asset_url || !!uploadResults.instagram}
                    className="w-full h-12 text-base font-medium transition-all duration-200 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:bg-gray-300"
                    size="lg"
                  >
                    <div className="flex items-center justify-center space-x-2 min-h-[20px]">
                      {uploadingTo === 'instagram' ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span>Uploading...</span>
                        </>
                      ) : uploadResults.instagram ? (
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
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Facebook className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Facebook</h3>
                      <p className="text-sm text-gray-600">Share with your Facebook audience</p>
                    </div>
                  </div>
                  {uploadResults.facebook && (
                    <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Uploaded
                    </Badge>
                  )}
                </div>

                {/* Success State for Facebook */}
                {uploadResults.facebook && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <div>
                        <span className="font-medium text-green-800">Uploaded to Facebook Successfully!</span>
                        <p className="text-sm text-green-700 mt-1">
                          Post ID: {uploadResults.facebook.postId}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="facebook-message" className="text-sm font-medium">Message</Label>
                    <Textarea
                      id="facebook-message"
                      value={facebookFormData.description}
                      onChange={(e) => setFacebookFormData({ ...facebookFormData, description: e.target.value })}
                      placeholder={`Write an engaging message for your Facebook ${asset?.asset_type === 'image' ? 'image post' : 'video post'}...`}
                      rows={4}
                      className="resize-none border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      disabled={!!uploadResults.facebook}
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Engage your audience with compelling content</span>
                      <span>{facebookFormData.description.length}/63206</span>
                    </div>
                  </div>

                  {/* Upload Progress for Facebook */}
                  <div className={`space-y-3 transition-all duration-300 ${uploadingTo === 'facebook' ? 'opacity-100 max-h-24' : 'opacity-0 max-h-0 overflow-hidden'}`}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Uploading to Facebook...</span>
                      <span className="text-blue-600 font-semibold">{Math.round(uploadProgress)}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2 bg-gray-200" />
                    <p className="text-xs text-gray-500">
                      This may take a few minutes depending on {asset?.asset_type === 'image' ? 'image' : 'video'} size
                    </p>
                  </div>

                  {/* Upload Button for Facebook */}
                  <Button
                    onClick={handleUploadToFacebook}
                    disabled={isLoading || !asset?.asset_url || !!uploadResults.facebook}
                    className="w-full h-12 text-base font-medium transition-all duration-200 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300"
                    size="lg"
                  >
                    <div className="flex items-center justify-center space-x-2 min-h-[20px]">
                      {uploadingTo === 'facebook' ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span>Uploading...</span>
                        </>
                      ) : uploadResults.facebook ? (
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
          </div>

          <Separator className="my-8" />

          {/* Coming Soon Platforms */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center space-x-2 text-gray-900">
              <Clock className="h-5 w-5 text-gray-400" />
              <span>Coming Soon</span>
            </h3>
            <div className="grid gap-3">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <div className="w-5 h-5 bg-blue-600 rounded"></div>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">LinkedIn</p>
                    <p className="text-sm text-gray-600">Share professional content</p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-white">Coming Soon</Badge>
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                    <div className="w-5 h-5 bg-white rounded"></div>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">TikTok</p>
                    <p className="text-sm text-gray-600">Share short-form videos</p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-white">Coming Soon</Badge>
              </div>
            </div>
          </div>

          {/* Done Button */}
          <div className="flex justify-between items-center pt-6 border-t border-gray-200">
            {/* Upload Summary */}
            {Object.keys(uploadResults).length > 0 && (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-900">
                    {Object.keys(uploadResults).length} platform{Object.keys(uploadResults).length > 1 ? 's' : ''} uploaded
                  </span>
                </div>
                <div className="flex space-x-1">
                  {Object.keys(uploadResults).map((platform) => (
                    <div key={platform} className="w-2 h-2 bg-green-500 rounded-full"></div>
                  ))}
                </div>
              </div>
            )}
            
            <Button
              variant={Object.keys(uploadResults).length > 0 ? "default" : "outline"}
              onClick={handleCloseModal}
              className={`flex items-center space-x-2 px-6 py-2 ${
                Object.keys(uploadResults).length > 0 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : ''
              }`}
            >
              <span>
                {Object.keys(uploadResults).length > 0 
                  ? `Done (${Object.keys(uploadResults).length} uploaded)`
                  : 'Done'
                }
              </span>
              <CheckCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 