import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useOAuth } from "@/hooks/useOAuth";
import { 
  ArrowLeft,
  CheckCircle,
  Settings,
  ExternalLink,
  Calendar,
  Users,
  BarChart3,
  AlertTriangle,
  Trash2,
  Youtube,
  Facebook,
  Loader2
} from "lucide-react";

interface SocialConnection {
  id: string;
  platform: string;
  platformUsername: string;
  platformEmail: string;
  channelId?: string; // Added this field
  isActive: boolean;
  createdAt: string;
}

interface AccountStats {
  followers?: number;
  posts?: number;
  engagement?: number;
  lastPost?: string;
  views?: number;
  subscribers?: number;
  videos?: number;
}

interface CachedResponse {
  stats?: AccountStats;
  activity?: any[];
  cached: boolean;
  lastUpdated: string;
  note?: string;
}

const platformDetails = {
  instagram: {
    name: "Instagram",
    color: "bg-gradient-to-r from-purple-500 to-pink-500",
    icon: () => <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-bold">I</div>,
    features: ["Stories", "Reels", "Posts", "IGTV"],
    limits: { caption: 2200 }
  },
  facebook: {
    name: "Facebook",
    color: "bg-blue-600",
    icon: Facebook,
    features: ["Posts", "Stories", "Videos", "Events"],
    limits: { caption: 63206 }
  },
  linkedin: {
    name: "LinkedIn",
    color: "bg-blue-700",
    icon: () => <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center text-white font-bold">L</div>,
    features: ["Posts", "Articles", "Stories", "Videos"],
    limits: { caption: 3000 }
  },
  twitter: {
    name: "Twitter / X",
    color: "bg-black",
    icon: () => <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-bold">X</div>,
    features: ["Tweets", "Threads", "Spaces", "Communities"],
    limits: { caption: 280 }
  },
  youtube: {
    name: "YouTube",
    color: "bg-red-600",
    icon: Youtube,
    features: ["Videos", "Shorts", "Community", "Live"],
    limits: { caption: 5000 }
  },
  tiktok: {
    name: "TikTok",
    color: "bg-black",
    icon: () => <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-bold">T</div>,
    features: ["Videos", "Live", "Effects", "Sounds"],
    limits: { caption: 2200 }
  }
};

type PlatformType = 'youtube' | 'instagram' | 'facebook' | 'linkedin' | 'twitter' | 'tiktok';

export function SocialAccountManager() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { initiateYouTubeOAuth, handleOAuthCallback } = useOAuth();
  const platform = (searchParams.get('platform') || 'youtube') as PlatformType;
  
  const [connection, setConnection] = useState<SocialConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionLoading, setConnectionLoading] = useState(true);
  const [stats, setStats] = useState<AccountStats>({});
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [cacheInfo, setCacheInfo] = useState<{
    stats: { cached: boolean; lastUpdated?: string; note?: string };
    activity: { cached: boolean; lastUpdated?: string; note?: string };
  }>({
    stats: { cached: false },
    activity: { cached: false }
  });

  const platformInfo = platformDetails[platform as keyof typeof platformDetails];

  // Fetch connection data on component mount
  useEffect(() => {
    fetchConnection();
  }, [platform]);

  // Check for OAuth callback on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('code') && urlParams.get('state')) {
      handleOAuthCallback().then((success) => {
        if (success) {
          // Refresh connection data after successful OAuth
          fetchConnection();
        }
      });
    }
  }, [handleOAuthCallback]);

  // Fetch activity when connection is loaded
  useEffect(() => {
    if (connection && !connectionLoading) {
      fetchRecentActivity();
    }
  }, [connection, connectionLoading]);

  const fetchConnection = async () => {
    try {
      setLoading(true);
      setConnectionLoading(true);
      
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/social/connections', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const platformConnection = data.connections.find(
          (conn: SocialConnection) => conn.platform === platform && conn.isActive
        );
        
        setConnection(platformConnection || null);
        setIsConnected(!!platformConnection);
        
        // Only fetch stats if we have a connection
        if (platformConnection) {
          // Fetch stats after connection is set
          fetchPlatformStats(platformConnection);
        }
      }
    } catch (error) {
      console.error('Error fetching connection:', error);
    } finally {
      setLoading(false);
      setConnectionLoading(false);
    }
  };

  const fetchPlatformStats = async (conn: SocialConnection, forceRefresh = false) => {
    try {
      setLoadingStats(true);
      const token = localStorage.getItem('token');
      
      const url = forceRefresh 
        ? `http://localhost:3001/api/social/${platform}/stats?refresh=true`
        : `http://localhost:3001/api/social/${platform}/stats`;
        
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data: CachedResponse = await response.json();
        setStats(data.stats || {});
        setCacheInfo(prev => ({
          ...prev,
          stats: {
            cached: data.cached,
            lastUpdated: data.lastUpdated,
            note: data.note
          }
        }));
      }
    } catch (error) {
      console.error('Error fetching platform stats:', error);
      setStats({});
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchRecentActivity = async (forceRefresh = false) => {
    try {
      setLoadingActivity(true);
      const token = localStorage.getItem('token');
      
      const url = forceRefresh 
        ? `http://localhost:3001/api/social/${platform}/activity?refresh=true`
        : `http://localhost:3001/api/social/${platform}/activity`;
        
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data: CachedResponse = await response.json();
        setRecentActivity(data.activity || []);
        setCacheInfo(prev => ({
          ...prev,
          activity: {
            cached: data.cached,
            lastUpdated: data.lastUpdated,
            note: data.note
          }
        }));
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      setRecentActivity([]);
    } finally {
      setLoadingActivity(false);
    }
  };

  const handleConnectYouTube = async () => {
    setConnectingPlatform('youtube');
    const success = initiateYouTubeOAuth();
    if (!success) {
      setConnectingPlatform(null);
    }
  };

  const saveYouTubeConnection = async (oauthResult: any) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/social/youtube/connect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(oauthResult)
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      } else {
        throw new Error('Failed to save connection');
      }
    } catch (error) {
      console.error('Error saving YouTube connection:', error);
      throw error;
    }
  };

  const handleConnect = () => {
    if (platform === 'youtube') {
      handleConnectYouTube();
    } else {
      toast({
        title: "Integration Coming Soon",
        description: `${platformInfo?.name} integration will be available soon.`,
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/social/connections/${platform}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setIsConnected(false);
        setConnection(null);
        setStats({});
        toast({
          title: "Account Disconnected",
          description: `Successfully disconnected from ${platformInfo?.name}.`,
        });
      }
    } catch (error) {
      console.error('Error disconnecting account:', error);
      toast({
        title: "Disconnection Failed",
        description: "Failed to disconnect account. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!platformInfo) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Platform Not Found</h1>
          <Button onClick={() => navigate('?')}>
            Back to Social Profiles
          </Button>
        </div>
      </div>
    );
  }

  const IconComponent = platformInfo.icon;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('?')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <IconComponent />
        <div>
          <h1 className="text-2xl font-bold">{platformInfo.name} Account</h1>
          <p className="text-muted-foreground">Manage your {platformInfo.name} integration</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Account Status */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>Connection Status</span>
                {isConnected && <CheckCircle className="h-5 w-5 text-green-500" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {connectionLoading ? (
                // Show loading state for connection status
                <div className="text-center space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    Checking connection status...
                  </p>
                </div>
              ) : isConnected && connection ? (
                // Show connected state
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Username</span>
                      <span className="text-sm">{connection.platformUsername}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Email</span>
                      <span className="text-sm">{connection.platformEmail}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Connected Since</span>
                      <span className="text-sm">
                        {new Date(connection.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => {
                        const platformUrls = {
                          youtube: `https://studio.youtube.com/channel/${connection?.channelId || ''}`,
                          facebook: 'https://www.facebook.com',
                          instagram: 'https://www.instagram.com',
                          twitter: 'https://twitter.com',
                          linkedin: 'https://www.linkedin.com',
                          tiktok: 'https://www.tiktok.com'
                        };
                        const url = platformUrls[platform as keyof typeof platformUrls];
                        if (url) {
                          window.open(url, '_blank');
                        }
                      }}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Account Settings
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => {
                        const platformUrls = {
                          youtube: `https://www.youtube.com/channel/${connection?.channelId || ''}`,
                          facebook: 'https://www.facebook.com',
                          instagram: 'https://www.instagram.com',
                          twitter: 'https://twitter.com',
                          linkedin: 'https://www.linkedin.com',
                          tiktok: 'https://www.tiktok.com'
                        };
                        const url = platformUrls[platform as keyof typeof platformUrls];
                        if (url) {
                          window.open(url, '_blank');
                        }
                      }}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View on {platformInfo.name}
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="w-full"
                      onClick={handleDisconnect}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Disconnect Account
                    </Button>
                  </div>
                </>
              ) : (
                // Show not connected state
                <div className="text-center space-y-4">
                  <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto" />
                  <div>
                    <p className="font-medium">Not Connected</p>
                    <p className="text-sm text-muted-foreground">
                      Connect your {platformInfo.name} account to start posting
                    </p>
                  </div>
                  <Button 
                    onClick={handleConnect} 
                    className="w-full"
                    disabled={connectingPlatform === platform}
                  >
                    {connectingPlatform === platform ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      `Connect ${platformInfo.name}`
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account Stats - only show when connected and not loading connection */}
          {isConnected && !connectionLoading && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>Account Statistics</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {cacheInfo.stats.cached && (
                      <Badge variant="secondary" className="text-xs">
                        Cached
                      </Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => connection && fetchPlatformStats(connection, true)}
                      disabled={loadingStats}
                    >
                      <Loader2 className={`h-4 w-4 ${loadingStats ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </CardTitle>
                {cacheInfo.stats.lastUpdated && (
                  <CardDescription>
                    Last updated: {new Date(cacheInfo.stats.lastUpdated).toLocaleString()}
                    {cacheInfo.stats.note && ` (${cacheInfo.stats.note})`}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingStats ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : Object.keys(stats).length === 0 ? (
                  <div className="text-center py-8">
                    <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No statistics available for this account.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {platform === 'youtube' ? (
                      <>
                        <div className="text-center">
                          <div className="text-2xl font-bold">{stats.subscribers?.toLocaleString() || '0'}</div>
                          <div className="text-sm text-muted-foreground">Subscribers</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">{stats.videos || '0'}</div>
                          <div className="text-sm text-muted-foreground">Videos</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">{stats.views?.toLocaleString() || '0'}</div>
                          <div className="text-sm text-muted-foreground">Total Views</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium">{stats.lastPost || 'N/A'}</div>
                          <div className="text-sm text-muted-foreground">Last Upload</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-center">
                          <div className="text-2xl font-bold">{stats.followers?.toLocaleString() || '0'}</div>
                          <div className="text-sm text-muted-foreground">Followers</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">{stats.posts || '0'}</div>
                          <div className="text-sm text-muted-foreground">Posts</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">{stats.engagement || '0'}%</div>
                          <div className="text-sm text-muted-foreground">Engagement</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium">{stats.lastPost || 'N/A'}</div>
                          <div className="text-sm text-muted-foreground">Last Post</div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Platform Features and Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Platform Features */}
          <Card>
            <CardHeader>
              <CardTitle>Platform Features</CardTitle>
              <CardDescription>
                Content types supported by {platformInfo.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {platformInfo.features.map((feature) => (
                  <Badge key={feature} variant="outline">
                    {feature}
                  </Badge>
                ))}
              </div>

              <Separator className="my-4" />
              
              <div>
                <div className="text-sm font-medium">Character Limit</div>
                <p className="text-sm text-muted-foreground">
                  {platformInfo.limits.caption.toLocaleString()} characters
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity - only show when connected and not loading connection */}
          {isConnected && !connectionLoading && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5" />
                    <span>Recent Activity</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {cacheInfo.activity.cached && (
                      <Badge variant="secondary" className="text-xs">
                        Cached
                      </Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchRecentActivity(true)}
                      disabled={loadingActivity}
                    >
                      <Loader2 className={`h-4 w-4 ${loadingActivity ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </CardTitle>
                {cacheInfo.activity.lastUpdated && (
                  <CardDescription>
                    Last updated: {new Date(cacheInfo.activity.lastUpdated).toLocaleString()}
                    {cacheInfo.activity.note && ` (${cacheInfo.activity.note})`}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loadingActivity ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : recentActivity.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto" />
                      <p className="text-sm text-muted-foreground">
                        No recent activity found for this account.
                      </p>
                    </div>
                  ) : (
                    recentActivity.map((activity, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {activity.timestamp || 'N/A'}
                          </span>
                        </div>
                        <p className="text-sm">
                          {activity.message || 'No message available.'}
                        </p>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                          {activity.metrics && (
                            <>
                              <span>👁️ {activity.metrics.views || '0'} views</span>
                              <span>👍 {activity.metrics.likes || '0'} likes</span>
                              <span>💬 {activity.metrics.comments || '0'} comments</span>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  )}

                  <div className="text-center">
                    <Button variant="outline" size="sm">
                      View All Activity
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 