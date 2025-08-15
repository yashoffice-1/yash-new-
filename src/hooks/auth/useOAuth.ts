import { useCallback } from 'react';
import { useToast } from '@/hooks/ui/use-toast';

interface OAuthState {
  platform: string;
  returnTo: string;
}

interface TokenExchangeResponse {
  access_token: string;
  refresh_token: string;
  channelId: string;
  channelTitle: string;
  platformUserId: string;
  platformEmail: string;
}

export const useOAuth = () => {
  const { toast } = useToast();

  const initiateYouTubeOAuth = useCallback(() => {
    try {
      const YT_CLIENT_ID = import.meta.env.VITE_YOUTUBE_CLIENT_ID;
      
      console.log('YouTube OAuth - Client ID:', YT_CLIENT_ID ? 'Configured' : 'Not configured');
      
      if (!YT_CLIENT_ID) {
        toast({
          title: "Configuration Error",
          description: "YouTube OAuth is not configured. Please contact support.",
          variant: "destructive"
        });
        return false;
      }

      const YT_SCOPES = [
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube',
        'https://www.googleapis.com/auth/youtube.force-ssl',
        'https://www.googleapis.com/auth/userinfo.email'
      ].join(' ');

      // Store return URL and tab state before redirecting
      const currentUrl = window.location.href;
      const currentPath = window.location.pathname;
      const currentSearch = window.location.search;
      
      // Store the full current state including query parameters
      sessionStorage.setItem('youtube_oauth_return', currentUrl);
      sessionStorage.setItem('youtube_oauth_tab', 'social'); // Always social tab for this flow

      // Build authorization URL with proper parameters for refresh tokens
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', YT_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', `${window.location.origin}/oauth/callback`);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', YT_SCOPES);
      authUrl.searchParams.set('access_type', 'offline'); // This is crucial for refresh tokens
      authUrl.searchParams.set('prompt', 'consent'); // Force consent to get refresh token
      authUrl.searchParams.set('state', 'youtube'); // Simplified state

      // Redirect to Google
      window.location.href = authUrl.toString();
      return true;
      
    } catch (error) {
      console.error('Error initiating YouTube OAuth:', error);
      toast({
        title: "Connection Error",
        description: "An error occurred while connecting to YouTube.",
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  const initiateInstagramOAuth = useCallback(() => {
    try {
      const FB_CLIENT_ID = import.meta.env.VITE_FACEBOOK_CLIENT_ID;
      
      console.log('Instagram OAuth - Client ID:', FB_CLIENT_ID ? 'Configured' : 'Not configured');
      
      if (!FB_CLIENT_ID) {
        toast({
          title: "Configuration Error",
          description: "Facebook/Instagram OAuth is not configured. Please contact support.",
          variant: "destructive"
        });
        return false;
      }

      const FB_SCOPES = [
        'instagram_basic',
        'instagram_content_publish',
        'pages_show_list',
        'pages_read_engagement',
        'pages_manage_posts',
        'instagram_manage_insights'
      ].join(',');

      // Store return URL and tab state before redirecting
      const currentUrl = window.location.href;
      sessionStorage.setItem('instagram_oauth_return', currentUrl);
      sessionStorage.setItem('instagram_oauth_tab', 'social');

      // Build authorization URL for Facebook Graph API (Instagram)
      const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth');
      authUrl.searchParams.set('client_id', FB_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', `${window.location.origin}/oauth/callback`);
      authUrl.searchParams.set('scope', FB_SCOPES);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('state', 'instagram');

      // Redirect to Facebook
      window.location.href = authUrl.toString();
      return true;
      
    } catch (error) {
      console.error('Error initiating Instagram OAuth:', error);
      toast({
        title: "Connection Error",
        description: "An error occurred while connecting to Instagram.",
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  const initiateFacebookOAuth = useCallback(() => {
    try {
      const FB_CLIENT_ID = import.meta.env.VITE_FACEBOOK_CLIENT_ID;
      
      console.log('Facebook OAuth - Client ID:', FB_CLIENT_ID ? 'Configured' : 'Not configured');
      
      if (!FB_CLIENT_ID) {
        toast({
          title: "Configuration Error",
          description: "Facebook OAuth is not configured. Please contact support.",
          variant: "destructive"
        });
        return false;
      }

      const FB_SCOPES = [
        'pages_show_list',
        'pages_read_engagement',
        'pages_manage_posts',
        'pages_manage_metadata',
        'pages_manage_instant_articles',
        'pages_manage_ads'
      ].join(',');

      // Store return URL and tab state before redirecting
      const currentUrl = window.location.href;
      sessionStorage.setItem('facebook_oauth_return', currentUrl);
      sessionStorage.setItem('facebook_oauth_tab', 'social');

      // Build authorization URL for Facebook Graph API
      const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth');
      authUrl.searchParams.set('client_id', FB_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', `${window.location.origin}/oauth/callback`);
      authUrl.searchParams.set('scope', FB_SCOPES);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('state', 'facebook');

      // Redirect to Facebook
      window.location.href = authUrl.toString();
      return true;
      
    } catch (error) {
      console.error('Error initiating Facebook OAuth:', error);
      toast({
        title: "Connection Error",
        description: "An error occurred while connecting to Facebook.",
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  const handleOAuthCallback = useCallback(async (): Promise<boolean> => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    if (error) {
      return false;
    }

    if (!code || !state) {
      return false;
    }

    try {
      if (state === 'youtube') {
        return await handleYouTubeOAuthCallback(code);
      } else if (state === 'instagram') {
        return await handleInstagramOAuthCallback(code);
      } else if (state === 'facebook') {
        return await handleFacebookOAuthCallback(code);
      }
      
      return false;
    } catch (error) {
      console.error('Error handling OAuth callback:', error);
      return false;
    }
  }, []);

  const handleYouTubeOAuthCallback = useCallback(async (code: string): Promise<boolean> => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please log in to connect your YouTube account.",
          variant: "destructive"
        });
        return false;
      }

      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      
      // Exchange authorization code for tokens
      const tokenResponse = await fetch(`${backendUrl}/api/social/youtube/exchange-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code })
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to exchange authorization code');
      }

      const tokenData: TokenExchangeResponse = await tokenResponse.json();
      
      // Save the connection
      const saveResponse = await fetch(`${backendUrl}/api/social/youtube/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          channelId: tokenData.channelId,
          channelTitle: tokenData.channelTitle,
          platformUserId: tokenData.platformUserId,
          platformEmail: tokenData.platformEmail
        })
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save YouTube connection');
      }

      toast({
        title: "Success!",
        description: "YouTube account connected successfully.",
        variant: "default"
      });

      return true;
      
    } catch (error) {
      console.error('Error handling YouTube OAuth callback:', error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect YouTube account.",
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  const handleInstagramOAuthCallback = useCallback(async (code: string): Promise<boolean> => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please log in to connect your Instagram account.",
          variant: "destructive"
        });
        return false;
      }

      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      
      // Exchange authorization code for tokens
      const tokenResponse = await fetch(`${backendUrl}/api/social/instagram/exchange-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code })
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to exchange authorization code');
      }

      const tokenData = await tokenResponse.json();
      
      // Save the connection
      const saveResponse = await fetch(`${backendUrl}/api/social/instagram/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          accessToken: tokenData.access_token,
          userId: tokenData.user_id,
          username: tokenData.username,
          pageId: tokenData.page_id,
          instagramBusinessAccountId: tokenData.instagram_business_account_id
        })
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save Instagram connection');
      }

      toast({
        title: "Success!",
        description: "Instagram account connected successfully.",
        variant: "default"
      });

      return true;
      
    } catch (error) {
      console.error('Error handling Instagram OAuth callback:', error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect Instagram account.",
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  const handleFacebookOAuthCallback = useCallback(async (code: string): Promise<boolean> => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please log in to connect your Facebook account.",
          variant: "destructive"
        });
        return false;
      }

      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      
      // Exchange authorization code for tokens
      const tokenResponse = await fetch(`${backendUrl}/api/social/facebook/exchange-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code })
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to exchange authorization code');
      }

      const tokenData = await tokenResponse.json();
      
      // Save the connection
      const saveResponse = await fetch(`${backendUrl}/api/social/facebook/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          accessToken: tokenData.access_token,
          userId: tokenData.user_id,
          username: tokenData.username,
          pageId: tokenData.page_id,
          pageName: tokenData.page_name
        })
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save Facebook connection');
      }

      toast({
        title: "Success!",
        description: "Facebook account connected successfully.",
        variant: "default"
      });

      return true;
      
    } catch (error) {
      console.error('Error handling Facebook OAuth callback:', error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect Facebook account.",
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  return {
    initiateYouTubeOAuth,
    initiateInstagramOAuth,
    initiateFacebookOAuth,
    handleOAuthCallback
  };
}; 