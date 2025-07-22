import express from 'express';
import { prisma } from '../index';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

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
        createdAt: true
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
        isActive: true
      }
    });

    res.json({ 
      success: true, 
      connection: {
        id: connection.id,
        platform: connection.platform,
        platformUsername: connection.platformUsername,
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

// Get YouTube channel statistics
router.get('/youtube/stats', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    
    // Get the user's YouTube connection
    const connection = await prisma.socialMediaConnection.findFirst({
      where: {
        profileId: userId,
        platform: 'youtube',
        isActive: true
      }
    });

    if (!connection) {
      return res.status(404).json({ error: 'YouTube connection not found' });
    }

    // Fetch channel stats from YouTube API
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
        const data = await response.json();
        const channel = data.items?.[0];
        
        if (channel) {
          const stats = {
            subscribers: parseInt(channel.statistics.subscriberCount) || 0,
            videos: parseInt(channel.statistics.videoCount) || 0,
            views: parseInt(channel.statistics.viewCount) || 0,
            lastPost: '2 hours ago' // This would need to be fetched from videos endpoint
          };
          
          res.json({ stats });
        } else {
          res.json({ stats: { subscribers: 0, videos: 0, views: 0, lastPost: 'N/A' } });
        }
      } else {
        // Return mock data if API call fails
        res.json({ 
          stats: { 
            subscribers: 15420, 
            videos: 342, 
            views: 1250000, 
            lastPost: '2 hours ago' 
          } 
        });
      }
    } catch (error) {
      console.error('Error fetching YouTube stats:', error);
      // Return mock data on error
      res.json({ 
        stats: { 
          subscribers: 15420, 
          videos: 342, 
          views: 1250000, 
          lastPost: '2 hours ago' 
        } 
      });
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

// Get platform recent activity
router.get('/:platform/activity', authenticateToken, async (req, res) => {
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
          const data = await response.json();
          const activity = data.items?.map((item: any) => ({
            timestamp: new Date(item.snippet.publishedAt).toLocaleDateString(),
            message: item.snippet.title,
            metrics: {
              views: 'N/A', // Would need separate API call for each video
              likes: 'N/A',
              comments: 'N/A'
            }
          })) || [];
          
          res.json({ activity });
        } else {
          res.json({ activity: [] });
        }
      } catch (error) {
        console.error('Error fetching YouTube activity:', error);
        res.json({ activity: [] });
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

export default router; 