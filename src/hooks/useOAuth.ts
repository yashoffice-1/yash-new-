import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

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
      }
      
      return false;
    } catch (error) {
      console.error('Error handling OAuth callback:', error);
      return false;
    }
  }, []);

  const handleYouTubeOAuthCallback = useCallback(async (code: string): Promise<boolean> => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return false;
      }

      // Exchange authorization code for tokens
      const tokenResponse = await fetch('http://localhost:3001/api/social/youtube/exchange-code', {
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
      const saveResponse = await fetch('http://localhost:3001/api/social/youtube/connect', {
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

      return true;
      
    } catch (error) {
      console.error('Error handling YouTube OAuth callback:', error);
      return false;
    }
  }, []);

  return {
    initiateYouTubeOAuth,
    handleOAuthCallback,
    handleYouTubeOAuthCallback
  };
}; 