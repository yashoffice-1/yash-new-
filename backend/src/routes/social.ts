import express from 'express';
import { prisma } from '../index';
import { authenticateToken } from '../middleware/auth';
import axios from 'axios';
import FormData from 'form-data';

const router = express.Router();

// Type definitions for YouTube API responses
interface YouTubeVideoItem {
  snippet: {
    publishedAt: string;
    title: string;
    description: string;
  };
}

interface YouTubeVideosResponse {
  items: YouTubeVideoItem[];
}

interface YouTubeChannelItem {
  id: string;
  snippet: {
    title: string;
  };
  statistics: {
    subscriberCount: string;
    videoCount: string;
    viewCount: string;
  };
}

interface YouTubeChannelsResponse {
  items: YouTubeChannelItem[];
}

// Helper function to check if cache is valid
const isCacheValid = (cachedData: any) => {
  if (!cachedData) return false;
  
  const now = new Date();
  const expiresAt = new Date(cachedData.expiresAt);
  
  return now < expiresAt;
};

// Helper function to create cache expiry time (e.g., 1 hour for stats)
const getCacheExpiry = (dataType: string) => {
  const now = new Date();
  switch (dataType) {
    case 'stats':
      return new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
    case 'activity':
      return new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes
    default:
      return new Date(now.getTime() + 60 * 60 * 1000); // 1 hour default
  }
};

// Helper function to refresh Google OAuth token
const refreshGoogleToken = async (refreshToken: string) => {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.YOUTUBE_CLIENT_ID || '',
        client_secret: process.env.YOUTUBE_CLIENT_SECRET || '',
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (response.ok) {
      const data = await response.json() as {
        access_token: string;
        expires_in: number;
        token_type: string;
      };
      return {
        accessToken: data.access_token,
        expiresIn: data.expires_in,
        tokenType: data.token_type,
      };
    } else {
      console.error('Token refresh failed:', response.status, response.statusText);
      return null;
    }
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
};

// Exchange authorization code for tokens
router.post('/youtube/exchange-code', authenticateToken, async (req, res) => {
  try {
    const { code } = req.body;
    const userId = (req as any).user.userId;

    console.log('Exchanging authorization code for tokens');

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.YOUTUBE_CLIENT_ID || '',
        client_secret: process.env.YOUTUBE_CLIENT_SECRET || '',
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.FRONTEND_URL || 'http://localhost:8080'}/oauth/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokenResponse.status, tokenResponse.statusText);
      const errorText = await tokenResponse.text();
      console.error('Error response:', errorText);
      return res.status(400).json({ error: 'Failed to exchange authorization code' });
    }

    const tokenData = await tokenResponse.json() as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };
    
    console.log('Token exchange successful:', {
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      accessTokenLength: tokenData.access_token?.length,
      refreshTokenLength: tokenData.refresh_token?.length,
      expiresIn: tokenData.expires_in
    });

    // Get user info and channel info
    const userInfo = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    }).then(res => res.json()) as { id: string; email: string };

    const channelsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true`,
      {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`
        }
      }
    ).then(res => res.json()) as YouTubeChannelsResponse;

    const channel = channelsResponse.items?.[0];
    
    if (!channel) {
      return res.status(400).json({ error: 'No YouTube channel found' });
    }

    // Calculate token expiry
    const tokenExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

    // Save the connection with both access and refresh tokens
    const connection = await prisma.socialMediaConnection.upsert({
      where: {
        profileId_platform: {
          profileId: userId,
          platform: 'youtube'
        }
      },
      update: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenExpiresAt,
        platformUserId: userInfo.id,
        platformUsername: channel.snippet.title,
        platformEmail: userInfo.email,
        channelId: channel.id,
        isActive: true,
        updatedAt: new Date()
      },
      create: {
        profileId: userId,
        platform: 'youtube',
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenExpiresAt,
        platformUserId: userInfo.id,
        platformUsername: channel.snippet.title,
        platformEmail: userInfo.email,
        channelId: channel.id,
        isActive: true
      }
    });

    console.log('YouTube connection saved with refresh token:', {
      id: connection.id,
      hasAccessToken: !!connection.accessToken,
      hasRefreshToken: !!connection.refreshToken
    });

    res.json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      channelId: channel.id,
      channelTitle: channel.snippet.title,
      platformUserId: userInfo.id,
      platformEmail: userInfo.email
    });

  } catch (error) {
    console.error('Error exchanging authorization code:', error);
    res.status(500).json({ error: 'Failed to exchange authorization code' });
  }
});

// Get user's social connections
router.get('/connections', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId; // Changed from .id to .userId
    
    const connections = await prisma.socialMediaConnection.findMany({
      where: {
        profileId: userId,
        isActive: true
      },
      select: {
        id: true,
        platform: true,
        platformUsername: true,
        platformEmail: true,
        isActive: true,
        createdAt: true,
        channelId: true
      }
    });

    res.json({ connections });
  } catch (error) {
    console.error('Error fetching connections:', error);
    res.status(500).json({ error: 'Failed to fetch connections' });
  }
});

// Save YouTube connection to database
router.post('/youtube/connect', authenticateToken, async (req, res) => {
  try {
    const { accessToken, refreshToken, channelId, channelTitle, platformUserId, platformEmail } = req.body;
    const userId = (req as any).user.userId; // Changed from .id to .userId

    // Calculate token expiry (typically 1 hour for Google tokens)
    const tokenExpiresAt = new Date(Date.now() + 3600000); // 1 hour from now

    // Save or update the connection
    const connection = await prisma.socialMediaConnection.upsert({
      where: {
        profileId_platform: {
          profileId: userId,
          platform: 'youtube'
        }
      },
      update: {
        accessToken,
        refreshToken,
        tokenExpiresAt,
        platformUserId,
        platformUsername: channelTitle,
        platformEmail,
        channelId, // Added this field
        isActive: true,
        updatedAt: new Date()
      },
      create: {
        profileId: userId,
        platform: 'youtube',
        accessToken,
        refreshToken,
        tokenExpiresAt,
        platformUserId,
        platformUsername: channelTitle,
        platformEmail,
        channelId, // Added this field
        isActive: true
      }
    });

    res.json({ 
      success: true, 
      connection: {
        id: connection.id,
        platform: connection.platform,
        platformUsername: connection.platformUsername,
        channelId: connection.channelId, // Return channelId in response
        isActive: connection.isActive
      }
    });
  } catch (error) {
    console.error('Error saving YouTube connection:', error);
    res.status(500).json({ error: 'Failed to save connection' });
  }
});

// Disconnect a social account
router.delete('/connections/:platform', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId; // Changed from .id to .userId
    const { platform } = req.params;

    await prisma.socialMediaConnection.updateMany({
      where: {
        profileId: userId,
        platform: platform
      },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting account:', error);
    res.status(500).json({ error: 'Failed to disconnect account' });
  }
});

// Get YouTube channel statistics with caching
router.get('/youtube/stats', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const forceRefresh = req.query.refresh === 'true'; // Manual refresh parameter
    
    // Get the user's YouTube connection
    const connection = await prisma.socialMediaConnection.findFirst({
      where: {
        profileId: userId,
        platform: 'youtube',
        isActive: true
      },
      include: {
        cachedData: {
          where: {
            dataType: 'stats'
          }
        }
      }
    });

    if (!connection) {
      return res.status(404).json({ error: 'YouTube connection not found' });
    }

    // Check if we have valid cached data and user didn't force refresh
    const cachedStats = connection.cachedData[0];
    if (!forceRefresh && isCacheValid(cachedStats)) {
      return res.json({ 
        stats: cachedStats.data,
        cached: true,
        lastUpdated: cachedStats.lastFetchedAt,
      });
    }

    // Check if access token is expired and refresh if needed
    let accessToken = connection.accessToken;
    if (connection.tokenExpiresAt && new Date() >= connection.tokenExpiresAt) {
      console.log('Access token expired, refreshing...');
      if (connection.refreshToken) {
        const refreshResult = await refreshGoogleToken(connection.refreshToken);
        if (refreshResult) {
          accessToken = refreshResult.accessToken;
          
          // Update the connection with new token
          await prisma.socialMediaConnection.update({
            where: { id: connection.id },
            data: {
              accessToken: refreshResult.accessToken,
              tokenExpiresAt: new Date(Date.now() + (refreshResult.expiresIn * 1000)),
              updatedAt: new Date()
            }
          });
          
          console.log('Token refreshed successfully');
        } else {
          console.error('Failed to refresh token');
          // If force refresh is requested but token refresh failed, return error
          if (forceRefresh) {
            return res.status(401).json({ error: 'Failed to refresh access token' });
          }
          // Otherwise, return cached data if available
          if (cachedStats) {
            return res.json({ 
              stats: cachedStats.data,
              cached: true,
              lastUpdated: cachedStats.lastFetchedAt,
              note: 'Using cached data due to token refresh failure'
            });
          } else {
            return res.status(401).json({ error: 'Access token expired and refresh failed' });
          }
        }
      } else {
        console.error('No refresh token available');
        if (forceRefresh) {
          return res.status(401).json({ error: 'Access token expired and no refresh token available' });
        }
        if (cachedStats) {
          return res.json({ 
            stats: cachedStats.data,
            cached: true,
            lastUpdated: cachedStats.lastFetchedAt,
            note: 'Using cached data due to expired token'
          });
        } else {
          return res.status(401).json({ error: 'Access token expired and no refresh token available' });
        }
      }
    }

    // Fetch fresh data from YouTube API
    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json() as YouTubeChannelsResponse;
        const channel = data.items?.[0];

        if (channel) {
          // Fetch recent videos to get last upload time
          let lastPost = 'N/A';
          try {
            const videosResponse = await fetch(
              `https://www.googleapis.com/youtube/v3/search?part=snippet&forMine=true&type=video&order=date&maxResults=1`,
              {
                headers: {
                  'Authorization': `Bearer ${accessToken}`
                }
              }
            );

            if (videosResponse.ok) {
              const videosData = await videosResponse.json() as YouTubeVideosResponse;
              if (videosData.items && videosData.items.length > 0) {
                const lastVideo = videosData.items[0];
                const uploadDate = new Date(lastVideo.snippet.publishedAt);
                const now = new Date();
                const diffInHours = Math.floor((now.getTime() - uploadDate.getTime()) / (1000 * 60 * 60));

                if (diffInHours < 1) {
                  lastPost = 'Just now';
                } else if (diffInHours < 24) {
                  lastPost = `${diffInHours} hours ago`;
                } else {
                  const diffInDays = Math.floor(diffInHours / 24);
                  lastPost = `${diffInDays} days ago`;
                }
              }
            }
          } catch (error) {
            console.error('Error fetching last video:', error);
          }

          const stats = {
            subscribers: parseInt(channel.statistics.subscriberCount) || 0,
            videos: parseInt(channel.statistics.videoCount) || 0,
            views: parseInt(channel.statistics.viewCount) || 0,
            lastPost: lastPost
          };

          // Cache the data
          await prisma.socialMediaCachedData.upsert({
            where: {
              connectionId_dataType: {
                connectionId: connection.id,
                dataType: 'stats'
              }
            },
            update: {
              data: stats,
              lastFetchedAt: new Date(),
              expiresAt: getCacheExpiry('stats')
            },
            create: {
              connectionId: connection.id,
              dataType: 'stats',
              data: stats,
              expiresAt: getCacheExpiry('stats')
            }
          });

          res.json({ 
            stats,
            cached: false,
            lastUpdated: new Date()
          });
        } else {
          res.json({ stats: { subscribers: 0, videos: 0, views: 0, lastPost: 'N/A' } });
        }
      } else {
        // If force refresh is requested but API call failed, return error
        if (forceRefresh) {
          console.error('YouTube API call failed:', response.status, response.statusText);
          return res.status(response.status).json({ 
            error: 'Failed to fetch fresh data from YouTube API',
            status: response.status,
            statusText: response.statusText
          });
        }
        
        // Return cached data if available, even if expired
        if (cachedStats) {
          res.json({ 
            stats: cachedStats.data,
            cached: true,
            lastUpdated: cachedStats.lastFetchedAt,
            note: 'Using cached data due to API error'
          });
        } else {
          res.json({ stats: { subscribers: 0, videos: 0, views: 0, lastPost: 'N/A' } });
        }
      }
    } catch (error) {
      console.error('Error fetching YouTube stats:', error);
      
      // If force refresh is requested but API call failed, return error
      if (forceRefresh) {
        return res.status(500).json({ 
          error: 'Failed to fetch fresh data from YouTube API',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      // Return cached data if available
      if (cachedStats) {
        res.json({ 
          stats: cachedStats.data,
          cached: true,
          lastUpdated: cachedStats.lastFetchedAt,
          note: 'Using cached data due to API error'
        });
      } else {
        res.json({ stats: { subscribers: 0, videos: 0, views: 0, lastPost: 'N/A' } });
      }
    }
  } catch (error) {
    console.error('Error getting YouTube stats:', error);
    res.status(500).json({ error: 'Failed to get YouTube stats' });
  }
});

// Get platform settings
router.get('/:platform/settings', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { platform } = req.params;
    
    // Get the user's platform connection
    const connection = await prisma.socialMediaConnection.findFirst({
      where: {
        profileId: userId,
        platform: platform,
        isActive: true
      }
    });

    if (!connection) {
      return res.status(404).json({ error: 'Platform connection not found' });
    }

    // For now, return default settings. In a real app, you'd store these in a separate table
    const defaultSettings = {
      autoPost: true,
      postTime: '09:00',
      contentFilter: 'moderate',
      hashtagLimit: platform === 'youtube' ? 15 : 20
    };

    res.json({ settings: defaultSettings });
  } catch (error) {
    console.error('Error getting platform settings:', error);
    res.status(500).json({ error: 'Failed to get platform settings' });
  }
});

// Save platform settings
router.post('/:platform/settings', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { platform } = req.params;
    const { settings } = req.body;
    
    // Get the user's platform connection
    const connection = await prisma.socialMediaConnection.findFirst({
      where: {
        profileId: userId,
        platform: platform,
        isActive: true
      }
    });

    if (!connection) {
      return res.status(404).json({ error: 'Platform connection not found' });
    }

    // In a real app, you'd save these settings to a database
    // For now, just return success
    console.log('Saving settings for platform:', platform, settings);

    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (error) {
    console.error('Error saving platform settings:', error);
    res.status(500).json({ error: 'Failed to save platform settings' });
  }
});

// Get platform recent activity with caching
router.get('/:platform/activity', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { platform } = req.params;
    const forceRefresh = req.query.refresh === 'true';

    // Get the user's platform connection
    const connection = await prisma.socialMediaConnection.findFirst({
      where: {
        profileId: userId,
        platform: platform,
        isActive: true
      },
      include: {
        cachedData: {
          where: {
            dataType: 'activity'
          }
        }
      }
    });

    if (!connection) {
      return res.status(404).json({ error: 'Platform connection not found' });
    }

    // Check if we have valid cached data
      const cachedActivity = connection.cachedData[0];
      if (!forceRefresh && isCacheValid(cachedActivity)) {
        return res.json({ 
          activity: cachedActivity.data,
          cached: true,
          lastUpdated: cachedActivity.lastFetchedAt
        });
      }

      // For YouTube, fetch recent videos
      if (platform === 'youtube') {
      try {
        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&forMine=true&type=video&order=date&maxResults=5`,
          {
            headers: {
              'Authorization': `Bearer ${connection.accessToken}`
            }
          }
        );

        if (response.ok) {
          const data = await response.json() as YouTubeVideosResponse;
          const activity = data.items?.map((item: YouTubeVideoItem) => ({
            timestamp: new Date(item.snippet.publishedAt).toLocaleDateString(),
            message: item.snippet.title,
            metrics: {
              views: 'N/A',
              likes: 'N/A',
              comments: 'N/A'
            }
          })) || [];

          // Cache the activity data
          await prisma.socialMediaCachedData.upsert({
            where: {
              connectionId_dataType: {
                connectionId: connection.id,
                dataType: 'activity'
              }
            },
            update: {
              data: activity,
              lastFetchedAt: new Date(),
              expiresAt: getCacheExpiry('activity')
            },
            create: {
              connectionId: connection.id,
              dataType: 'activity',
              data: activity,
              expiresAt: getCacheExpiry('activity')
            }
          });

          res.json({ 
            activity,
            cached: false,
            lastUpdated: new Date()
          });
        } else {
          // Return cached data if available
          if (cachedActivity) {
            res.json({ 
              activity: cachedActivity.data,
              cached: true,
              lastUpdated: cachedActivity.lastFetchedAt,
            });
          } else {
            res.json({ activity: [] });
          }
        }
      } catch (error) {
        console.error('Error fetching YouTube activity:', error);
        if (cachedActivity) {
          res.json({ 
            activity: cachedActivity.data,
            cached: true,
            lastUpdated: cachedActivity.lastFetchedAt,
            note: 'Using cached data due to API error'
          });
        } else {
          res.json({ activity: [] });
        }
      }
    } else {
      // For other platforms, return empty activity for now
      res.json({ activity: [] });
    }
  } catch (error) {
    console.error('Error getting platform activity:', error);
    res.status(500).json({ error: 'Failed to get platform activity' });
  }
});

// Get platform statistics (generic endpoint)
router.get('/:platform/stats', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { platform } = req.params;
    
    // Get the user's platform connection
    const connection = await prisma.socialMediaConnection.findFirst({
      where: {
        profileId: userId,
        platform: platform,
        isActive: true
      }
    });

    if (!connection) {
      return res.status(404).json({ error: 'Platform connection not found' });
    }

    // For now, return empty stats for non-YouTube platforms
    // In the future, this would integrate with each platform's API
    if (platform !== 'youtube') {
      res.json({ 
        stats: { 
          followers: 0, 
          posts: 0, 
          engagement: 0, 
          lastPost: 'N/A' 
        } 
      });
      return;
    }

    // For YouTube, use the existing YouTube stats logic
    // This will be handled by the specific /youtube/stats route
    res.status(404).json({ error: 'Use /youtube/stats for YouTube statistics' });
  } catch (error) {
    console.error('Error getting platform stats:', error);
    res.status(500).json({ error: 'Failed to get platform stats' });
  }
});

// YouTube video upload endpoint
router.post('/youtube/upload', authenticateToken, async (req, res) => {
  try {
    const { videoUrl, title, description, tags, privacy } = req.body;
    const userId = (req as any).user.userId;

    // Validate required fields
    if (!videoUrl || !title) {
      return res.status(400).json({ 
        error: 'Video URL and title are required' 
      });
    }


    // Check if YouTube OAuth credentials are configured
    if (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_CLIENT_SECRET) {
      console.error('YouTube OAuth credentials not configured');
      return res.status(500).json({ 
        error: 'YouTube OAuth credentials not configured. Please set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET in your environment variables.' 
      });
    }

    // Get the user's YouTube connection
    const connection = await prisma.socialMediaConnection.findFirst({
      where: {
        profileId: userId,
        platform: 'youtube',
        isActive: true
      }
    });


    if (!connection) {
      return res.status(404).json({ 
        error: 'YouTube account not connected. Please connect your YouTube account first.' 
      });
    }

    // Check if token is expired and refresh if needed
    let accessToken = connection.accessToken;
    if (connection.tokenExpiresAt && new Date() > connection.tokenExpiresAt) {
      if (!connection.refreshToken) {
        return res.status(401).json({ 
          error: 'YouTube token expired and no refresh token available. Please reconnect your account.' 
        });
      }

      const refreshResult = await refreshGoogleToken(connection.refreshToken);
      if (!refreshResult) {
        return res.status(401).json({ 
          error: 'Failed to refresh YouTube token. Please reconnect your account.' 
        });
      }

      // Update the connection with new token
      await prisma.socialMediaConnection.update({
        where: { id: connection.id },
        data: {
          accessToken: refreshResult.accessToken,
          tokenExpiresAt: new Date(Date.now() + refreshResult.expiresIn * 1000)
        }
      });

      accessToken = refreshResult.accessToken;
    }

    // Download the video from the URL
    let videoBuffer: ArrayBuffer;
    try {
      const videoResponse = await axios.get(videoUrl, {
        responseType: 'arraybuffer'
      })  
      
    
      
      if (videoResponse.status !== 200) {
        return res.status(400).json({ 
          error: 'Failed to download video from the provided URL' 
        });
      }

      videoBuffer = videoResponse.data;
      console.log('Video buffer size:', videoBuffer.byteLength);
      
      // Check file size limits (YouTube has a 128GB limit, but we'll set a reasonable limit)
      const maxSizeBytes = 100 * 1024 * 1024; // 100MB limit
      if (videoBuffer.byteLength > maxSizeBytes) {
        return res.status(400).json({ 
          error: `Video file is too large (${Math.round(videoBuffer.byteLength / 1024 / 1024)}MB). Maximum size is 100MB.` 
        });
      }
      
      // Check if file is too small (likely not a valid video)
      if (videoBuffer.byteLength < 1024 * 1024) { // Less than 1MB
        return res.status(400).json({ 
          error: 'Video file appears to be too small or invalid' 
        });
      }
    } catch (downloadError) {
      console.error('Error downloading video:', downloadError);
      return res.status(400).json({ 
        error: 'Failed to download video from the provided URL',
        details: downloadError instanceof Error ? downloadError.message : 'Unknown download error'
      });
    }

    // Prepare video metadata as JSON string - keep it minimal to avoid size issues
    let videoMetadata = {
      snippet: {
        title: title.substring(0, 100), // Limit title to 100 characters
        description: (description || '').substring(0, 500), // Limit description to 500 characters
        categoryId: '22' // People & Blogs category
      },
      status: {
        privacyStatus: privacy || 'private'
      }
    };

    // Add metadata to form data
    let metadataString = JSON.stringify(videoMetadata);
    
    // Check metadata size and reduce if needed (YouTube has strict limits)
   
    // If still too large, further reduce description
    if (metadataString.length > 500) {
      console.warn('Metadata size is still large, reducing description');
      videoMetadata.snippet.description = videoMetadata.snippet.description.substring(0, 200);
      metadataString = JSON.stringify(videoMetadata);
    }
    
    // If still too large, remove description entirely
    if (metadataString.length > 500) {
      console.warn('Metadata size still too large, removing description');
      delete videoMetadata.snippet.description;
      metadataString = JSON.stringify(videoMetadata);
    }
    
    // If still too large, reduce title
    if (metadataString.length > 500) {
      console.warn('Metadata size still too large, reducing title');
      videoMetadata.snippet.title = videoMetadata.snippet.title.substring(0, 50);
      metadataString = JSON.stringify(videoMetadata);
    }
    
  
    // Choose upload method based on file size
    const isLargeFile = videoBuffer.byteLength > 10 * 1024 * 1024; // 10MB threshold
    
    if (isLargeFile) {
      console.log('Using resumable upload for large file');
      // Use resumable upload for large files
      try {
        // Step 1: Initialize resumable upload
        const initResponse = await axios.post(
          `https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status&uploadType=resumable`,
          metadataString,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'X-Upload-Content-Length': videoBuffer.byteLength.toString(),
              'X-Upload-Content-Type': 'video/mp4'
            }
          }
        );

        if (initResponse.status !== 200) {
          console.error('Failed to initialize resumable upload:', initResponse.data);
          return res.status(initResponse.status).json({ 
            error: `Failed to initialize upload: ${initResponse.data?.error?.message || 'Unknown error'}` 
          });
        }

        const uploadUrl = initResponse.headers.location;
        console.log('Resumable upload URL:', uploadUrl);

        // Step 2: Upload the video data
        const uploadResponse = await axios.put(
          uploadUrl,
          videoBuffer,
          {
            headers: {
              'Content-Type': 'video/mp4',
              'Content-Length': videoBuffer.byteLength.toString()
            }
          }
        );


        if (uploadResponse.status !== 200) {
          console.error('Resumable upload failed:', uploadResponse.data);
          return res.status(uploadResponse.status).json({ 
            error: `Upload failed: ${uploadResponse.data?.error?.message || 'Unknown error'}` 
          });
        }

        const uploadResult = uploadResponse.data;
        console.log('Resumable upload successful:', uploadResult);

        // Store upload record in database
        const uploadRecord = await prisma.generatedAsset.create({
          data: {
            inventoryId: null, // Not tied to a specific product
            channel: 'youtube',
            format: 'mp4',
            sourceSystem: 'youtube_upload',
            assetType: 'video',
            url: `https://www.youtube.com/watch?v=${uploadResult.id}`,
            instruction: `Uploaded to YouTube: ${title}`,
            status: 'completed'
          }
        });

        res.json({
          success: true,
          videoId: uploadResult.id,
          title: uploadResult.snippet.title,
          url: `https://www.youtube.com/watch?v=${uploadResult.id}`,
          uploadRecord
        });

      } catch (uploadError) {
        console.error('Resumable upload request failed:', uploadError);
        if (axios.isAxiosError(uploadError)) {
          console.error('YouTube API error response:', uploadError.response?.data);
          console.error('YouTube API error status:', uploadError.response?.status);
          return res.status(uploadError.response?.status || 500).json({ 
            error: `Upload failed: ${uploadError.response?.data?.error?.message || uploadError.message}` 
          });
        }
        throw uploadError;
      }
    } else {
      console.log('Using multipart upload for small file');
      // Use multipart upload for smaller files
      const formData = new FormData();
      formData.append('file', videoBuffer, {
        filename: 'video.mp4',
        contentType: 'video/mp4'
      });
      formData.append('metadata', metadataString);

      try {
        const uploadResponse = await axios.post(
          `https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status&uploadType=multipart`,
          formData,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              ...formData.getHeaders()
            }
          }
        );

              console.log('Multipart upload response status:', uploadResponse.status);
        console.log('Multipart upload response data:', uploadResponse.data);

        if (uploadResponse.status !== 200) {
          console.error('Multipart upload error:', uploadResponse.data);
          return res.status(uploadResponse.status).json({ 
            error: `Upload failed: ${uploadResponse.data?.error?.message || 'Unknown error'}` 
          });
        }

        const uploadResult = uploadResponse.data;
        console.log('Multipart upload successful:', uploadResult);

        // Store upload record in database
        const uploadRecord = await prisma.generatedAsset.create({
          data: {
            inventoryId: null, // Not tied to a specific product
            channel: 'youtube',
            format: 'mp4',
            sourceSystem: 'youtube_upload',
            assetType: 'video',
            url: `https://www.youtube.com/watch?v=${uploadResult.id}`,
            instruction: `Uploaded to YouTube: ${title}`,
            status: 'completed'
          }
        });

        res.json({
          success: true,
          videoId: uploadResult.id,
          title: uploadResult.snippet.title,
          url: `https://www.youtube.com/watch?v=${uploadResult.id}`,
          uploadRecord
        });

      } catch (uploadError) {
        console.error('Multipart upload request failed:', uploadError);
        if (axios.isAxiosError(uploadError)) {
          console.error('YouTube API error response:', uploadError.response?.data);
          console.error('YouTube API error status:', uploadError.response?.status);
          return res.status(uploadError.response?.status || 500).json({ 
            error: `Upload failed: ${uploadError.response?.data?.error?.message || uploadError.message}` 
          });
        }
        throw uploadError;
      }
    }

  } catch (error) {
    console.error('Error uploading to YouTube:', error);
    
    // Provide more detailed error information
    let errorMessage = 'Failed to upload video to YouTube';
    let errorDetails = '';
    
    if (axios.isAxiosError(error)) {
      errorDetails = `Status: ${error.response?.status}, Message: ${error.response?.data?.error?.message || error.message}`;
      console.error('Axios error details:', errorDetails);
    } else if (error instanceof Error) {
      errorDetails = error.message;
      console.error('Standard error:', errorDetails);
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: errorDetails
    });
  }
});

export default router; 