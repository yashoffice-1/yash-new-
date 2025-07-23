import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiGet, apiPost, apiDelete } from "@/utils/api";
import { 
  Instagram, 
  Facebook, 
  Linkedin, 
  Twitter, 
  Youtube, 
  CheckCircle,
  Plus,
  Settings,
  Unlink,
  Link,
  AlertCircle
} from "lucide-react";

interface SocialConnection {
  id: string;
  platform: string;
  platformUsername: string;
  platformEmail: string;
  isActive: boolean;
  createdAt: string;
}

interface SocialChannel {
  id: string;
  name: string;
  icon: React.ElementType;
  connected: boolean;
  accountName?: string;
  platform: string;
}

export function SocialProfiles() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);

  // Fetch existing connections on component mount
  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      console.log('🔄 Fetching social connections...');
      const data = await apiGet('http://localhost:3001/api/social/connections');
      console.log('📦 Connections data:', data);
      setConnections(data.connections || []);
    } catch (error) {
      console.error('❌ Error fetching connections:', error);
      // Set empty array on error
      setConnections([]);
    }
  };

  const handleConnectYouTube = async () => {
    setConnectingPlatform('youtube');
    
    // Check if Google Identity Services is loaded
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
            console.log('✅ YouTube Access Token:', response.access_token);
            
            // Get user info and channel details
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
                // Save connection to database
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
            console.error('❌ YouTube Token Error:', response);
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
      await apiPost('http://localhost:3001/api/social/youtube/connect', {
        accessToken: oauthResult.accessToken,
        refreshToken: oauthResult.refreshToken,
        channelId: oauthResult.channelId,
        channelTitle: oauthResult.channelTitle,
        platformUserId: oauthResult.platformUserId,
        platformEmail: oauthResult.platformEmail
      });
      
      // Refresh connections list
      fetchConnections();
    } catch (error) {
      console.error('Error saving YouTube connection:', error);
    }
  };

  const handleConnect = (platform: string) => {
    switch (platform) {
      case 'youtube':
        handleConnectYouTube();
        break;
      default:
        toast({
          title: "Integration Coming Soon",
          description: `${getPlatformName(platform)} integration will be available soon.`,
        });
    }
  };

  const handleDisconnect = async (platform: string) => {
    try {
      await apiDelete(`http://localhost:3001/api/social/connections/${platform}`);
      
      toast({
        title: "Account Disconnected",
        description: `Your ${getPlatformName(platform)} account has been disconnected.`,
      });
      fetchConnections(); // Refresh connections
    } catch (error) {
      console.error('Error disconnecting account:', error);
      toast({
        title: "Disconnection Failed",
        description: "Failed to disconnect account. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleManage = (platform: string) => {
    // Navigate to the social account manager within the same tab
    navigate(`?platform=${platform}`, { replace: true });
  };

  const getPlatformName = (platform: string) => {
    switch (platform) {
      case 'youtube': return 'YouTube';
      case 'facebook': return 'Facebook';
      case 'instagram': return 'Instagram';
      case 'linkedin': return 'LinkedIn';
      case 'twitter': return 'Twitter / X';
      case 'tiktok': return 'TikTok';
      case 'pinterest': return 'Pinterest';
      case 'google-ads': return 'Google Ads';
      default: return platform;
    }
  };

  const isConnected = (platform: string) => {
    return connections.some(conn => conn.platform === platform && conn.isActive);
  };

  const getConnection = (platform: string) => {
    return connections.find(conn => conn.platform === platform && conn.isActive);
  };

  // Define available platforms with their icons and connection status
  const channels: SocialChannel[] = [
    {
      id: "youtube",
      name: "YouTube",
      icon: Youtube,
      connected: isConnected('youtube'),
      accountName: getConnection('youtube')?.platformUsername,
      platform: 'youtube'
    },
    {
      id: "instagram",
      name: "Instagram",
      icon: Instagram,
      connected: isConnected('instagram'),
      accountName: getConnection('instagram')?.platformUsername,
      platform: 'instagram'
    },
    {
      id: "facebook",
      name: "Facebook",
      icon: Facebook,
      connected: isConnected('facebook'),
      accountName: getConnection('facebook')?.platformUsername,
      platform: 'facebook'
    },
    {
      id: "linkedin",
      name: "LinkedIn",
      icon: Linkedin,
      connected: isConnected('linkedin'),
      accountName: getConnection('linkedin')?.platformUsername,
      platform: 'linkedin'
    },
    {
      id: "twitter",
      name: "Twitter / X",
      icon: Twitter,
      connected: isConnected('twitter'),
      accountName: getConnection('twitter')?.platformUsername,
      platform: 'twitter'
    },
    {
      id: "tiktok",
      name: "TikTok",
      icon: () => (
        <div className="h-4 w-4 bg-foreground rounded-sm flex items-center justify-center">
          <span className="text-xs font-bold text-background">T</span>
        </div>
      ),
      connected: isConnected('tiktok'),
      accountName: getConnection('tiktok')?.platformUsername,
      platform: 'tiktok'
    },
    {
      id: "pinterest",
      name: "Pinterest",
      icon: () => (
        <div className="h-4 w-4 bg-red-600 rounded-full flex items-center justify-center">
          <span className="text-xs font-bold text-white">P</span>
        </div>
      ),
      connected: isConnected('pinterest'),
      accountName: getConnection('pinterest')?.platformUsername,
      platform: 'pinterest'
    },
    {
      id: "google-ads",
      name: "Google Ads",
      icon: () => (
        <div className="h-4 w-4 bg-blue-600 rounded-sm flex items-center justify-center">
          <span className="text-xs font-bold text-white">G</span>
        </div>
      ),
      connected: isConnected('google-ads'),
      accountName: getConnection('google-ads')?.platformUsername,
      platform: 'google-ads'
    }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Social Media Integrations</CardTitle>
          <CardDescription>
            Connect your social media and advertising accounts to streamline content publishing and campaign management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {channels.map((channel) => {
              const IconComponent = channel.icon;
              const isConnecting = connectingPlatform === channel.platform;
              
              return (
                <Card key={channel.id} className="relative">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <IconComponent className="h-6 w-6" />
                        <span className="font-medium">{channel.name}</span>
                      </div>
                      {channel.connected && (
                        <Badge variant="secondary" className="flex items-center space-x-1">
                          <CheckCircle className="h-3 w-3" />
                          <span>Connected</span>
                        </Badge>
                      )}
                    </div>
                    
                    {channel.connected && channel.accountName && (
                      <p className="text-sm text-muted-foreground mb-3">
                        {channel.accountName}
                      </p>
                    )}
                    
                    <div className="flex space-x-2">
                      {!channel.connected ? (
                        <Button 
                          onClick={() => handleConnect(channel.platform)}
                          size="sm"
                          className="flex-1"
                          disabled={isConnecting}
                        >
                          {isConnecting ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                              Connecting...
                            </>
                          ) : (
                            <>
                              <Plus className="h-3 w-3 mr-1" />
                              Connect
                            </>
                          )}
                        </Button>
                      ) : (
                        <>
                          <Button 
                            onClick={() => handleManage(channel.platform)}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            <Settings className="h-3 w-3 mr-1" />
                            Manage
                          </Button>
                          <Button 
                            onClick={() => handleDisconnect(channel.platform)}
                            variant="outline"
                            size="sm"
                          >
                            <Unlink className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Info section for connected accounts */}
          {connections.length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Connected Accounts</h4>
                  <p className="text-sm text-blue-800 mt-1">
                    You can now upload your generated content directly to your connected social media accounts. 
                    Go to your settings for more detailed management options.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Info section for available integrations */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-gray-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900">Available Integrations</h4>
                <p className="text-sm text-gray-700 mt-1">
                  YouTube integration is fully functional. Other platforms are coming soon. 
                  Connected accounts will automatically sync with your content generation workflow.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}