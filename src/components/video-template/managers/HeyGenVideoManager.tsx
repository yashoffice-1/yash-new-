import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Download, 
  RefreshCw, 
  Video, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Play,
  Eye
} from "lucide-react";

interface HeyGenVideo {
  id: string;
  title: string;
  status: string;
  created_at: string;
  video_url?: string;
  gif_url?: string;
  thumbnail_url?: string;
  duration?: number;
  callback_id?: string;
}

export function HeyGenVideoManager() {
  const { toast } = useToast();
  const [videos, setVideos] = useState<HeyGenVideo[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const fetchHeyGenVideos = async () => {
    setIsLoading(true);
    try {
      console.log('Fetching HeyGen videos...');
      
      const { data, error } = await supabase.functions.invoke('heygen-list-videos', {
        body: {
          action: 'list',
          page: 1,
          limit: 50
        }
      });

      if (error) {
        throw new Error(`Function error: ${error.message}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch videos');
      }

      console.log('HeyGen videos fetched:', data.videos);
      setVideos(data.videos || []);
      setLastFetch(new Date());
      
      toast({
        title: "Videos Loaded",
        description: `Found ${data.videos?.length || 0} videos from HeyGen`,
      });
    } catch (error) {
      console.error('Error fetching HeyGen videos:', error);
      toast({
        title: "Error",
        description: `Failed to fetch videos: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const pullSelectedVideos = async () => {
    if (selectedVideos.length === 0) {
      toast({
        title: "No Videos Selected",
        description: "Please select videos to pull to your library",
        variant: "destructive",
      });
      return;
    }

    setIsPulling(true);
    try {
      console.log('Pulling selected videos:', selectedVideos);
      
      const { data, error } = await supabase.functions.invoke('heygen-list-videos', {
        body: {
          action: 'pull',
          videoIds: selectedVideos
        }
      });

      if (error) {
        throw new Error(`Function error: ${error.message}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to pull videos');
      }

      console.log('Videos pulled:', data);
      
      let message = data.message || `Pulled ${data.pulledVideos?.length || 0} videos`;
      if (data.errors && data.errors.length > 0) {
        message += `. ${data.errors.length} videos had errors.`;
      }
      
      toast({
        title: "Videos Pulled",
        description: message,
        variant: data.errors && data.errors.length > 0 ? "destructive" : "default"
      });

      // Clear selection after successful pull
      setSelectedVideos([]);
      
      // Optionally refresh the list to show updated statuses
      if (data.pulledVideos && data.pulledVideos.length > 0) {
        setTimeout(() => {
          fetchHeyGenVideos();
        }, 1000);
      }
    } catch (error) {
      console.error('Error pulling videos:', error);
      toast({
        title: "Error",
        description: `Failed to pull videos: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsPulling(false);
    }
  };

  const toggleVideoSelection = (videoId: string) => {
    setSelectedVideos(prev => 
      prev.includes(videoId) 
        ? prev.filter(id => id !== videoId)
        : [...prev, videoId]
    );
  };

  const selectAllCompletedVideos = () => {
    const completedVideoIds = videos
      .filter(video => video.status === 'completed' && video.video_url)
      .map(video => video.id);
    setSelectedVideos(completedVideoIds);
  };

  const clearSelection = () => {
    setSelectedVideos([]);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'default';
      case 'processing':
      case 'pending':
        return 'secondary';
      case 'failed':
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="h-3 w-3" />;
      case 'processing':
      case 'pending':
        return <Loader2 className="h-3 w-3 animate-spin" />;
      case 'failed':
      case 'error':
        return <AlertCircle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  // Auto-fetch on component mount
  useEffect(() => {
    fetchHeyGenVideos();
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Video className="h-5 w-5" />
              <span>HeyGen Video Manager</span>
            </CardTitle>
            <CardDescription>
              Fetch and pull videos from your HeyGen dashboard
              {lastFetch && (
                <span className="text-xs text-muted-foreground ml-2">
                  Last updated: {lastFetch.toLocaleTimeString()}
                </span>
              )}
            </CardDescription>
          </div>
          <Button
            onClick={fetchHeyGenVideos}
            disabled={isLoading}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Action Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              onClick={selectAllCompletedVideos}
              variant="outline"
              size="sm"
              disabled={videos.length === 0}
            >
              Select All Completed
            </Button>
            <Button
              onClick={clearSelection}
              variant="outline"
              size="sm"
              disabled={selectedVideos.length === 0}
            >
              Clear Selection
            </Button>
            <span className="text-sm text-muted-foreground">
              {selectedVideos.length} selected
            </span>
          </div>
          <Button
            onClick={pullSelectedVideos}
            disabled={selectedVideos.length === 0 || isPulling}
            className="flex items-center space-x-2"
          >
            <Download className={`h-4 w-4 ${isPulling ? 'animate-pulse' : ''}`} />
            <span>{isPulling ? 'Pulling...' : 'Pull to Library'}</span>
          </Button>
        </div>

        {/* Video List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading videos from HeyGen...</span>
            </div>
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-12">
            <Video className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No videos found in your HeyGen account</p>
            <Button onClick={fetchHeyGenVideos} variant="outline" className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {videos.map((video) => {
              const isSelected = selectedVideos.includes(video.id);
              const canBePulled = video.status === 'completed' && video.video_url;
              
              return (
                <div
                  key={video.id}
                  className={`flex items-center space-x-4 p-4 border rounded-lg transition-all ${
                    isSelected ? 'bg-primary/5 border-primary' : ''
                  } ${canBePulled ? 'hover:bg-gray-50' : 'opacity-60'}`}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleVideoSelection(video.id)}
                    disabled={!canBePulled}
                  />
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">
                        {video.title || `Video ${video.id.slice(-8)}`}
                      </h4>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={getStatusBadgeVariant(video.status)}
                          className="flex items-center space-x-1 text-xs"
                        >
                          {getStatusIcon(video.status)}
                          <span>{video.status}</span>
                        </Badge>
                        {video.duration && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {video.duration}s
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(video.created_at).toLocaleDateString()}</span>
                        </span>
                        <span>ID: {video.id.slice(-12)}</span>
                      </div>
                      
                      {video.video_url && (
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(video.video_url, '_blank')}
                            className="h-6 px-2 text-xs"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Preview
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}