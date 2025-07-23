import express from 'express';
import { prisma } from '../index';
import { authenticateToken } from '../middleware/auth';

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

// Get user's social connections
router.get('/connections', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    console.log('Fetching connections for user:', userId);
    
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

    console.log('Found connections:', connections.length);
    res.json({ connections });
  } catch (error) {
    console.error('Error fetching connections:', error);
    // Return empty array instead of error when no connections exist
    res.json({ connections: [] });
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

    // Fetch fresh data from YouTube API
    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true`,
        {
          headers: {
            'Authorization': `Bearer ${connection.accessToken}`
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
                  'Authorization': `Bearer ${connection.accessToken}`
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
        // Return cached data if available, even if expired
        if (cachedStats) {
          res.json({ 
            stats: cachedStats.data,
            cached: true,
            lastUpdated: cachedStats.lastFetchedAt,
          });
        } else {
          res.json({ stats: { subscribers: 0, videos: 0, views: 0, lastPost: 'N/A' } });
        }
      }
    } catch (error) {
      console.error('Error fetching YouTube stats:', error);
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

export default router; 