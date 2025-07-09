import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TweetComposer } from "./TweetComposer";
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
  Loader2
} from "lucide-react";

interface SocialChannel {
  id: string;
  name: string;
  icon: React.ElementType;
  connected: boolean;
  accountName?: string;
}

export function SocialProfiles() {
  const { toast } = useToast();
  const [channels, setChannels] = useState<SocialChannel[]>([
    {
      id: "instagram",
      name: "Instagram",
      icon: Instagram,
      connected: false
    },
    {
      id: "facebook",
      name: "Facebook",
      icon: Facebook,
      connected: true,
      accountName: "@mybrand"
    },
    {
      id: "linkedin",
      name: "LinkedIn",
      icon: Linkedin,
      connected: false
    },
    {
      id: "twitter",
      name: "Twitter / X",
      icon: Twitter,
      connected: false
    },
    {
      id: "youtube",
      name: "YouTube",
      icon: Youtube,
      connected: false
    },
    {
      id: "tiktok",
      name: "TikTok",
      icon: () => (
        <div className="h-4 w-4 bg-foreground rounded-sm flex items-center justify-center">
          <span className="text-xs font-bold text-background">T</span>
        </div>
      ),
      connected: false
    },
    {
      id: "pinterest",
      name: "Pinterest",
      icon: () => (
        <div className="h-4 w-4 bg-red-600 rounded-full flex items-center justify-center">
          <span className="text-xs font-bold text-white">P</span>
        </div>
      ),
      connected: false
    },
    {
      id: "google-ads",
      name: "Google Ads",
      icon: () => (
        <div className="h-4 w-4 bg-blue-600 rounded-sm flex items-center justify-center">
          <span className="text-xs font-bold text-white">G</span>
        </div>
      ),
      connected: false
    }
  ]);
  const [loading, setLoading] = useState<string | null>(null);

  // Load social connections on mount
  useEffect(() => {
    loadSocialConnections();
  }, []);

  const loadSocialConnections = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return;

      const { data: connections, error } = await supabase
        .from('user_social_connections')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading connections:', error);
        return;
      }

      setChannels(prev => prev.map(channel => {
        const connection = connections?.find(c => c.platform === channel.id);
        return {
          ...channel,
          connected: !!connection,
          accountName: connection?.platform_username ? `@${connection.platform_username}` : undefined
        };
      }));
    } catch (error) {
      console.error('Error loading social connections:', error);
    }
  };

  const handleConnect = async (channelId: string) => {
    if (channelId === 'twitter') {
      setLoading(channelId);
      try {
        // For dummy authentication, simulate connection
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          // If using dummy auth, simulate Twitter connection
          setChannels(prev => 
            prev.map(channel => 
              channel.id === channelId 
                ? { ...channel, connected: true, accountName: "@test_user" }
                : channel
            )
          );
          toast({
            title: "Twitter Connected (Demo)",
            description: "Twitter connection simulated for testing.",
          });
          setLoading(null);
          return;
        }

        const { data, error } = await supabase.functions.invoke('twitter-oauth-start');
        
        if (error) {
          throw new Error(error.message);
        }

        if (data.error) {
          throw new Error(data.error);
        }

        // Redirect to Twitter authorization
        window.location.href = data.authUrl;
      } catch (error: any) {
        console.error('Twitter connection error:', error);
        toast({
          title: "Connection Failed",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(null);
      }
    } else {
      toast({
        title: "Integration Coming Soon",
        description: `${channels.find(c => c.id === channelId)?.name} integration will be available soon.`,
      });
    }
  };

  const handleDisconnect = async (channelId: string) => {
    if (channelId === 'twitter') {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) return;

        const { error } = await supabase
          .from('user_social_connections')
          .delete()
          .eq('user_id', user.id)
          .eq('platform', 'twitter');

        if (error) {
          throw new Error('Failed to disconnect Twitter');
        }

        await loadSocialConnections();
        toast({
          title: "Twitter Disconnected",
          description: "Successfully disconnected from Twitter.",
        });
      } catch (error: any) {
        console.error('Disconnect error:', error);
        toast({
          title: "Disconnect Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } else {
      setChannels(prev => 
        prev.map(channel => 
          channel.id === channelId 
            ? { ...channel, connected: false, accountName: undefined }
            : channel
        )
      );
      toast({
        title: "Account Disconnected",
        description: `Successfully disconnected from ${channels.find(c => c.id === channelId)?.name}.`,
      });
    }
  };

  const handleManage = (channelId: string) => {
    toast({
      title: "Manage Account",
      description: `Opening management settings for ${channels.find(c => c.id === channelId)?.name}.`,
    });
  };

  // Check if Twitter is connected
  const twitterConnected = channels.find(c => c.id === 'twitter')?.connected;

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
                          onClick={() => handleConnect(channel.id)}
                          size="sm"
                          className="flex-1"
                          disabled={loading === channel.id}
                        >
                          {loading === channel.id ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Plus className="h-3 w-3 mr-1" />
                          )}
                          Connect
                        </Button>
                      ) : (
                        <>
                          <Button 
                            onClick={() => handleManage(channel.id)}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            <Settings className="h-3 w-3 mr-1" />
                            Manage
                          </Button>
                          <Button 
                            onClick={() => handleDisconnect(channel.id)}
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
        </CardContent>
      </Card>
      
      {/* Twitter Tweet Composer - Only show if Twitter is connected */}
      {twitterConnected && (
        <TweetComposer onTweetSuccess={loadSocialConnections} />
      )}
    </div>
  );
}