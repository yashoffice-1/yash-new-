import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/layout/card';
import { Progress } from '@/components/ui/data_display/progress';
import { Badge } from '@/components/ui/data_display/badge';
import { Button } from '@/components/ui/forms/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/overlays/tooltip';
import { Clock, CheckCircle, XCircle, Download, Play, RefreshCw } from 'lucide-react';
import { useRealtimeUpdates, RealtimeUpdate } from '@/hooks/realtime/useRealtimeUpdates';
import { useToast } from '@/hooks/ui/use-toast';

interface VideoProgress {
  assetId: string;
  videoId: string;
  templateId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  startTime: Date;
  completedTime?: Date;
  videoUrl?: string;
  gifUrl?: string;
  thumbnailUrl?: string;
  error?: string;
}

interface RealtimeVideoProgressProps {
  className?: string;
  onVideoComplete?: (video: VideoProgress) => void;
}

export function RealtimeVideoProgress({ 
  className = '', 
  onVideoComplete 
}: RealtimeVideoProgressProps) {
  const [videos, setVideos] = useState<Map<string, VideoProgress>>(new Map());
  const { toast } = useToast();

  const { isConnected } = useRealtimeUpdates({
    onVideoStarted: (update) => {
      if (update.assetId && update.videoId) {
        const videoProgress: VideoProgress = {
          assetId: update.assetId,
          videoId: update.videoId,
          templateId: update.templateId || 'unknown',
          status: 'pending',
          progress: 0,
          startTime: new Date(update.timestamp)
        };
        
        setVideos(prev => new Map(prev.set(update.assetId!, videoProgress)));
        
        // Start progress simulation
        simulateProgress(update.assetId);
      }
    },
    onVideoCompleted: (update) => {
      if (update.assetId) {
        setVideos(prev => {
          const newMap = new Map(prev);
          const video = newMap.get(update.assetId!);
          if (video) {
            const updatedVideo: VideoProgress = {
              ...video,
              status: 'completed',
              progress: 100,
              completedTime: new Date(update.timestamp),
              videoUrl: update.videoUrl,
              gifUrl: update.gifUrl,
              thumbnailUrl: update.thumbnailUrl
            };
            newMap.set(update.assetId!, updatedVideo);
            onVideoComplete?.(updatedVideo);
          }
          return newMap;
        });
      }
    },
    onVideoFailed: (update) => {
      if (update.assetId) {
        setVideos(prev => {
          const newMap = new Map(prev);
          const video = newMap.get(update.assetId!);
          if (video) {
            const updatedVideo: VideoProgress = {
              ...video,
              status: 'failed',
              progress: 0,
              error: update.error
            };
            newMap.set(update.assetId!, updatedVideo);
          }
          return newMap;
        });
      }
    }
  });

  const simulateProgress = (assetId: string) => {
    const interval = setInterval(() => {
      setVideos(prev => {
        const newMap = new Map(prev);
        const video = newMap.get(assetId);
        if (video && video.status === 'pending') {
          // Simulate realistic progress
          const elapsed = Date.now() - video.startTime.getTime();
          const estimatedDuration = 5 * 60 * 1000; // 5 minutes
          const progress = Math.min(90, (elapsed / estimatedDuration) * 90); // Cap at 90% until completion
          
          const updatedVideo: VideoProgress = {
            ...video,
            status: progress > 10 ? 'processing' : 'pending',
            progress: Math.round(progress)
          };
          newMap.set(assetId, updatedVideo);
        }
        return newMap;
      });
    }, 3000); // Update every 3 seconds

    // Clean up interval when video is completed or failed
    const cleanup = () => {
      clearInterval(interval);
    };

    // Store cleanup function
    setTimeout(() => {
      const video = videos.get(assetId);
      if (video && (video.status === 'completed' || video.status === 'failed')) {
        cleanup();
      }
    }, 1000);
  };

  const handleDownload = (video: VideoProgress) => {
    if (video.videoUrl) {
      const link = document.createElement('a');
      link.href = video.videoUrl;
      link.download = `video-${video.videoId}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download Started",
        description: "Video download has begun",
      });
    }
  };

  const handlePlay = (video: VideoProgress) => {
    if (video.videoUrl) {
      window.open(video.videoUrl, '_blank');
    }
  };

  const handleRetry = (video: VideoProgress) => {
    // Remove failed video from list
    setVideos(prev => {
      const newMap = new Map(prev);
      newMap.delete(video.assetId);
      return newMap;
    });
    
    toast({
      title: "Video Removed",
      description: "Failed video removed from list. You can generate a new one.",
    });
  };

  const getStatusIcon = (status: VideoProgress['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: VideoProgress['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
    }
  };

  const getElapsedTime = (startTime: Date) => {
    const elapsed = Date.now() - startTime.getTime();
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const videoList = Array.from(videos.values());

  if (videoList.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Video Generation Progress</span>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-muted-foreground">
                {isConnected ? 'Live Updates' : 'Offline'}
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {videoList.map((video) => (
            <div key={video.assetId} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(video.status)}
                  <span className="font-medium">Video {video.videoId.slice(-8)}</span>
                  <Badge className={getStatusColor(video.status)}>
                    {video.status.charAt(0).toUpperCase() + video.status.slice(1)}
                  </Badge>
                </div>
                <span className="text-sm text-muted-foreground">
                  {getElapsedTime(video.startTime)}
                </span>
              </div>

              <Progress value={video.progress} className="w-full" />

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {video.status === 'completed' ? 'Ready for download' : 
                   video.status === 'failed' ? video.error : 
                   `${video.progress}% complete`}
                </span>

                <div className="flex items-center space-x-2">
                  {video.status === 'completed' && (
                    <>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePlay(video)}
                            className="h-8 px-2"
                          >
                            <Play className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Play video</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(video)}
                            className="h-8 px-2"
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Download video</p>
                        </TooltipContent>
                      </Tooltip>
                    </>
                  )}
                  
                  {video.status === 'failed' && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetry(video)}
                          className="h-8 px-2"
                        >
                          <XCircle className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Remove failed video</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>

              {video.thumbnailUrl && (
                <div className="mt-2">
                  <img 
                    src={video.thumbnailUrl} 
                    alt="Video thumbnail" 
                    className="w-16 h-9 object-cover rounded"
                  />
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
