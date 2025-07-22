import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
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

export function SocialAccountManager() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const platform = searchParams.get('platform') || 'youtube';
  
  const [connection, setConnection] = useState<SocialConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AccountStats>({});
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);

  const platformInfo = platformDetails[platform as keyof typeof platformDetails];

  // Fetch connection data on component mount
  useEffect(() => {
    fetchConnection();
  }, [platform]);

  // Fetch activity when connection is loaded
  useEffect(() => {
    if (connection) {
      fetchRecentActivity();
    }
  }, [connection]);

  const fetchConnection = async () => {
    try {
      setLoading(true);
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
        
        if (platformConnection) {
          // Fetch platform-specific stats
          await fetchPlatformStats(platformConnection);
        }
      }
    } catch (error) {
      console.error('Error fetching connection:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      setLoadingActivity(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/social/${platform}/activity`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setRecentActivity(data.activity || []);
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      setRecentActivity([]);
    } finally {
      setLoadingActivity(false);
    }
  };

  const fetchPlatformStats = async (conn: SocialConnection) => {
    try {
      setLoadingStats(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`http://localhost:3001/api/social/${platform}/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching platform stats:', error);
      setStats({});
    } finally {
      setLoadingStats(false);
    }
  };

  const handleConnectYouTube = async () => {
    setConnectingPlatform('youtube');
    
    if (!window.google?.accounts?.oauth2) {
      toast({
        title: "Google Services Not Loaded",
        description: "Please wait for Google services to load and try again.",
        variant: "destructive"
      });
      setConnectingPlatform(null);
      return;
    }

    try {
      const YT_CLIENT_ID = import.meta.env.VITE_YOUTUBE_CLIENT_ID || 'your-client-id';
      const YT_SCOPES = [
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email'
      ].join(' ');

      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: YT_CLIENT_ID,
        scope: YT_SCOPES,
        callback: async (response: any) => {
          if (response.access_token) {
            try {
              const userInfo = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: {
                  'Authorization': `Bearer ${response.access_token}`
                }
              }).then(res => res.json());

              const channelsResponse = await fetch(
                `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true`,
                {
                  headers: {
                    'Authorization': `Bearer ${response.access_token}`
                  }
                }
              ).then(res => res.json());

              const channel = channelsResponse.items?.[0];
              
              if (channel) {
                await saveYouTubeConnection({
                  accessToken: response.access_token,
                  refreshToken: response.refresh_token,
                  channelId: channel.id,
                  channelTitle: channel.snippet.title,
                  platformUserId: userInfo.id,
                  platformEmail: userInfo.email
                });

                toast({
                  title: "YouTube Connected!",
                  description: `Successfully connected to ${channel.snippet.title}`,
                });
                
                // Refresh connection data
                await fetchConnection();
              }
            } catch (error) {
              console.error('Error getting user/channel info:', error);
              toast({
                title: "Connection Failed",
                description: "Failed to get channel information.",
                variant: "destructive"
              });
            }
          } else {
            toast({
              title: "Connection Failed",
              description: "Failed to get access token from Google.",
              variant: "destructive"
            });
          }
          setConnectingPlatform(null);
        },
      });
      
      tokenClient.requestAccessToken();
    } catch (error) {
      console.error('Error starting YouTube OAuth:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to start YouTube connection. Please try again.",
        variant: "destructive"
      });
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
        body: JSON.stringify({
          accessToken: oauthResult.accessToken,
          refreshToken: oauthResult.refreshToken,
          channelId: oauthResult.channelId,
          channelTitle: oauthResult.channelTitle,
          platformUserId: oauthResult.platformUserId,
          platformEmail: oauthResult.platformEmail
        })
      });
      
      if (response.ok) {
        await fetchConnection();
      }
    } catch (error) {
      console.error('Error saving YouTube connection:', error);
    }
  };

  const handleConnect = () => {
    switch (platform) {
      case 'youtube':
        handleConnectYouTube();
        break;
      case 'facebook':
        toast({
          title: "Facebook Integration Coming Soon",
          description: "Facebook integration will be available soon.",
        });
        break;
      default:
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
              {isConnected && connection ? (
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

          {/* Account Stats */}
          {isConnected && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>Account Statistics</span>
                  </div>
                  {!loadingStats && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => connection && fetchPlatformStats(connection)}
                      disabled={loadingStats}
                    >
                      <Loader2 className={`h-4 w-4 ${loadingStats ? 'animate-spin' : ''}`} />
                    </Button>
                  )}
                </CardTitle>
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

          {/* Recent Activity */}
          {isConnected && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5" />
                    <span>Recent Activity</span>
                  </div>
                  {!loadingActivity && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchRecentActivity}
                      disabled={loadingActivity}
                    >
                      <Loader2 className={`h-4 w-4 ${loadingActivity ? 'animate-spin' : ''}`} />
                    </Button>
                  )}
                </CardTitle>
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