import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/data_display/badge';
import { Button } from '@/components/ui/forms/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/overlays/tooltip';
import { Wifi, WifiOff, RefreshCw, CheckCircle, XCircle, Clock, Video } from 'lucide-react';
import { useRealtimeUpdates, RealtimeUpdate } from '@/hooks/realtime/useRealtimeUpdates';
import { useToast } from '@/hooks/ui/use-toast';

interface RealtimeStatusIndicatorProps {
  className?: string;
  showVideoProgress?: boolean;
}

export function RealtimeStatusIndicator({ 
  className = '', 
  showVideoProgress = true 
}: RealtimeStatusIndicatorProps) {
  const [pendingVideos, setPendingVideos] = useState<Map<string, RealtimeUpdate>>(new Map());
  const [completedVideos, setCompletedVideos] = useState<Map<string, RealtimeUpdate>>(new Map());
  const [failedVideos, setFailedVideos] = useState<Map<string, RealtimeUpdate>>(new Map());
  const { toast } = useToast();

  const { isConnected, connect, disconnect } = useRealtimeUpdates({
    onVideoStarted: (update) => {
      if (update.assetId) {
        setPendingVideos(prev => new Map(prev.set(update.assetId!, update)));
        toast({
          title: "🎬 Video Generation Started",
          description: update.message || "Your video is now being generated!",
        });
      }
    },
    onVideoCompleted: (update) => {
      if (update.assetId) {
        setPendingVideos(prev => {
          const newMap = new Map(prev);
          newMap.delete(update.assetId!);
          return newMap;
        });
        setCompletedVideos(prev => new Map(prev.set(update.assetId!, update)));
        toast({
          title: "✅ Video Ready!",
          description: update.message || "Your video has been completed successfully!",
        });
      }
    },
    onVideoFailed: (update) => {
      if (update.assetId) {
        setPendingVideos(prev => {
          const newMap = new Map(prev);
          newMap.delete(update.assetId!);
          return newMap;
        });
        setFailedVideos(prev => new Map(prev.set(update.assetId!, update)));
        toast({
          title: "❌ Video Generation Failed",
          description: update.error || update.message || "Video generation failed. Please try again.",
          variant: "destructive",
        });
      }
    },
    onConnectionChange: (connected) => {
      if (!connected) {
        toast({
          title: "Real-time Connection Lost",
          description: "Video updates may be delayed. Reconnecting...",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Real-time Connection Restored",
          description: "You'll now receive live video updates!",
        });
      }
    }
  });

  const handleReconnect = () => {
    disconnect();
    setTimeout(() => connect(), 1000);
    toast({
      title: "Reconnecting...",
      description: "Attempting to restore real-time connection",
    });
  };

  const clearCompletedVideos = () => {
    setCompletedVideos(new Map());
  };

  const clearFailedVideos = () => {
    setFailedVideos(new Map());
  };

  const totalPending = pendingVideos.size;
  const totalCompleted = completedVideos.size;
  const totalFailed = failedVideos.size;

  return (
    <TooltipProvider>
      <div className={`flex items-center space-x-2 ${className}`}>
        {/* Connection Status */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center space-x-1">
              {isConnected ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <Badge variant={isConnected ? "default" : "destructive"} className="text-xs">
                {isConnected ? "Live" : "Offline"}
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isConnected ? "Real-time updates active" : "Real-time updates unavailable"}</p>
          </TooltipContent>
        </Tooltip>

        {/* Reconnect Button */}
        {!isConnected && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReconnect}
                className="h-6 px-2"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Reconnect to real-time updates</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Video Progress Indicators */}
        {showVideoProgress && (
          <>
            {/* Pending Videos */}
            {totalPending > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />
                    <Badge variant="secondary" className="text-xs">
                      {totalPending} Processing
                    </Badge>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    <p className="font-medium">Videos in Progress:</p>
                    {Array.from(pendingVideos.values()).map((video) => (
                      <p key={video.assetId} className="text-xs">
                        {video.videoId?.slice(-8)} - {video.message}
                      </p>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Completed Videos */}
            {totalCompleted > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center space-x-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <Badge variant="default" className="text-xs">
                      {totalCompleted} Ready
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearCompletedVideos}
                      className="h-4 w-4 p-0 hover:bg-green-100"
                    >
                      <XCircle className="h-3 w-3" />
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    <p className="font-medium">Recently Completed:</p>
                    {Array.from(completedVideos.values()).slice(0, 3).map((video) => (
                      <p key={video.assetId} className="text-xs">
                        {video.videoId?.slice(-8)} - Ready for download
                      </p>
                    ))}
                    {totalCompleted > 3 && (
                      <p className="text-xs text-muted-foreground">
                        +{totalCompleted - 3} more
                      </p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Failed Videos */}
            {totalFailed > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center space-x-1">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <Badge variant="destructive" className="text-xs">
                      {totalFailed} Failed
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFailedVideos}
                      className="h-4 w-4 p-0 hover:bg-red-100"
                    >
                      <XCircle className="h-3 w-3" />
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    <p className="font-medium">Failed Videos:</p>
                    {Array.from(failedVideos.values()).slice(0, 3).map((video) => (
                      <p key={video.assetId} className="text-xs">
                        {video.videoId?.slice(-8)} - {video.error}
                      </p>
                    ))}
                    {totalFailed > 3 && (
                      <p className="text-xs text-muted-foreground">
                        +{totalFailed - 3} more
                      </p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
