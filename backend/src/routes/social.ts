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
const isCacheValid = (cachedData: Record<string, unknown>) => {
  if (!cachedData) return false;

  const now = new Date();
  const expiresAt = new Date(cachedData.expiresAt as string | number | Date);

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

    return res.json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      channelId: channel.id,
      channelTitle: channel.snippet.title,
      platformUserId: userInfo.id,
      platformEmail: userInfo.email
    });

  } catch (error) {
    console.error('Error exchanging authorization code:', error);
    return res.status(500).json({ error: 'Failed to exchange authorization code' });
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
        pageName: true,
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

          return res.json({
            stats,
            cached: false,
            lastUpdated: new Date()
          });
        } else {
          return res.json({ stats: { subscribers: 0, videos: 0, views: 0, lastPost: 'N/A' } });
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
          return res.json({
            stats: cachedStats.data,
            cached: true,
            lastUpdated: cachedStats.lastFetchedAt,
            note: 'Using cached data due to API error'
          });
        } else {
          return res.json({ stats: { subscribers: 0, videos: 0, views: 0, lastPost: 'N/A' } });
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
        return res.json({
          stats: cachedStats.data,
          cached: true,
          lastUpdated: cachedStats.lastFetchedAt,
          note: 'Using cached data due to API error'
        });
      } else {
        return res.json({ stats: { subscribers: 0, videos: 0, views: 0, lastPost: 'N/A' } });
      }
    }
  } catch (error) {
    console.error('Error getting YouTube stats:', error);
    return res.status(500).json({ error: 'Failed to get YouTube stats' });
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

    return res.json({ settings: defaultSettings });
  } catch (error) {
    console.error('Error getting platform settings:', error);
    return res.status(500).json({ error: 'Failed to get platform settings' });
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

    return res.json({ success: true, message: 'Settings saved successfully' });
  } catch (error) {
    console.error('Error saving platform settings:', error);
    return res.status(500).json({ error: 'Failed to save platform settings' });
  }
});

// // Get platform recent activity with caching
// router.get('/:platform/activity', authenticateToken, async (req, res) => {
//   try {
//     const userId = (req as any).user.userId;
//     const { platform } = req.params;
//     const forceRefresh = req.query.refresh === 'true';

//     // Get the user's platform connection
//     const connection = await prisma.socialMediaConnection.findFirst({
//       where: {
//         profileId: userId,
//         platform: platform,
//         isActive: true
//       },
//       include: {
//         cachedData: {
//           where: {
//             dataType: 'activity'
//           }
//         }
//       }
//     });

//     if (!connection) {
//       return res.status(404).json({ error: 'Platform connection not found' });
//     }

//     // Check if we have valid cached data
//       const cachedActivity = connection.cachedData[0];
//       if (!forceRefresh && isCacheValid(cachedActivity)) {
//         return res.json({ 
//           activity: cachedActivity.data,
//           cached: true,
//           lastUpdated: cachedActivity.lastFetchedAt
//         });
//       }

//       // For YouTube, fetch recent videos
//       if (platform === 'youtube') {
//       try {
//         const response = await fetch(
//           `https://www.googleapis.com/youtube/v3/search?part=snippet&forMine=true&type=video&order=date&maxResults=5`,
//           {
//             headers: {
//               'Authorization': `Bearer ${connection.accessToken}`
//             }
//           }
//         );

//         if (response.ok) {
//           const data = await response.json() as YouTubeVideosResponse;
//           const activity = data.items?.map((item: YouTubeVideoItem) => ({
//             timestamp: new Date(item.snippet.publishedAt).toLocaleDateString(),
//             message: item.snippet.title,
//             metrics: {
//               views: 'N/A',
//               likes: 'N/A',
//               comments: 'N/A'
//             }
//           })) || [];

//           // Cache the activity data
//           await prisma.socialMediaCachedData.upsert({
//             where: {
//               connectionId_dataType: {
//                 connectionId: connection.id,
//                 dataType: 'activity'
//               }
//             },
//             update: {
//               data: activity,
//               lastFetchedAt: new Date(),
//               expiresAt: getCacheExpiry('activity')
//             },
//             create: {
//               connectionId: connection.id,
//               dataType: 'activity',
//               data: activity,
//               expiresAt: getCacheExpiry('activity')
//             }
//           });

//          return  res.json({ 
//             activity,
//             cached: false,
//             lastUpdated: new Date()
//           });
//         } else {
//           // Return cached data if available
//           if (cachedActivity) {
//            return  res.json({ 
//               activity: cachedActivity.data,
//               cached: true,
//               lastUpdated: cachedActivity.lastFetchedAt,
//             });
//           } else {
//             return res.json({ activity: [] });
//           }
//         }
//       } catch (error) {
//         console.error('Error fetching YouTube activity:', error);
//         if (cachedActivity) {
//          return  res.json({ 
//             activity: cachedActivity.data,
//             cached: true,
//             lastUpdated: cachedActivity.lastFetchedAt,
//             note: 'Using cached data due to API error'
//           });
//         } else {
//           return res.json({ activity: [] });
//         }
//       }
//     } else {
//       // For other platforms, return empty activity for now
//       return res.json({ activity: [] });
//     }
//   } catch (error) {
//     console.error('Error getting platform activity:', error);
//     return res.status(500).json({ error: 'Failed to get platform activity' });
//   }
// });

// // Get platform statistics (generic endpoint)
// router.get('/:platform/stats', authenticateToken, async (req, res) => {
//   try {
//     const userId = (req as any).user.userId;
//     const { platform } = req.params;

//     // Get the user's platform connection
//     const connection = await prisma.socialMediaConnection.findFirst({
//       where: {
//         profileId: userId,
//         platform: platform,
//         isActive: true
//       }
//     });

//     if (!connection) {
//       return res.status(404).json({ error: 'Platform connection not found' });
//     }

//     // For now, return empty stats for non-YouTube platforms
//     // In the future, this would integrate with each platform's API
//     if (platform !== 'youtube') {
//       return res.json({ 
//         stats: { 
//           followers: 0, 
//           posts: 0, 
//           engagement: 0, 
//           lastPost: 'N/A' 
//         } 
//       });

//     }

//     // For YouTube, use the existing YouTube stats logic
//     // This will be handled by the specific /youtube/stats route
//     return res.status(404).json({ error: 'Use /youtube/stats for YouTube statistics' });
//   } catch (error) {
//     console.error('Error getting platform stats:', error);
//     return res.status(500).json({ error: 'Failed to get platform stats' });
//   }
// });

// YouTube video upload endpoint
router.post('/youtube/upload', authenticateToken, async (req, res) => {
  try {
    const { videoUrl, title, description, tags, privacy, assetId } = req.body;
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
    const videoMetadata = {
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
        const uploadRecord = await prisma.socialMediaUpload.create({
          data: {
            profileId: userId,
            platform: 'youtube',
            contentType: 'video',
            uploadUrl: `https://www.youtube.com/watch?v=${uploadResult.id}`,
            platformId: uploadResult.id,
            title: title,
            description: description,
            tags: tags || [],
            metadata: {
              videoId: uploadResult.id,
              title: uploadResult.snippet.title,
              description: uploadResult.snippet.description,
              privacy: privacy,
              categoryId: null // YouTube doesn't require category for uploads
            },
            status: 'uploaded',
            assetId: assetId || null // Optional reference to original asset
          }
        });

        return res.json({
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
        const uploadRecord = await prisma.socialMediaUpload.create({
          data: {
            profileId: userId,
            platform: 'youtube',
            contentType: 'video',
            uploadUrl: `https://www.youtube.com/watch?v=${uploadResult.id}`,
            platformId: uploadResult.id,
            title: title,
            description: description,
            tags: tags || [],
            metadata: {
              videoId: uploadResult.id,
              title: uploadResult.snippet.title,
              description: uploadResult.snippet.description,
              privacy: privacy,
              categoryId: null // YouTube doesn't require category for uploads
            },
            status: 'uploaded',
            assetId: assetId || null // Optional reference to original asset
          }
        });

        return res.json({
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
    const errorMessage = 'Failed to upload video to YouTube';
    let errorDetails = '';

    if (axios.isAxiosError(error)) {
      errorDetails = `Status: ${error.response?.status}, Message: ${error.response?.data?.error?.message || error.message}`;
      console.error('Axios error details:', errorDetails);
    } else if (error instanceof Error) {
      errorDetails = error.message;
      console.error('Standard error:', errorDetails);
    }

    return res.status(500).json({
      error: errorMessage,
      details: errorDetails
    });
  }
});

// Get user's social media uploads
router.get('/uploads', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { platform, contentType, status, page = '1', limit = '10' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = {
      profileId: userId
    };

    if (platform) {
      where.platform = platform;
    }

    if (contentType) {
      where.contentType = contentType;
    }

    if (status) {
      where.status = status;
    }

    const [uploads, total] = await Promise.all([
      prisma.socialMediaUpload.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          asset: true // Include the original asset if it exists
        }
      }),
      prisma.socialMediaUpload.count({ where })
    ]);

    return res.json({
      success: true,
      data: uploads,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error getting social media uploads:', error);
    return res.status(500).json({ error: 'Failed to get social media uploads' });
  }
});

// Get specific social media upload
router.get('/uploads/:id', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;

    const upload = await prisma.socialMediaUpload.findFirst({
      where: {
        id,
        profileId: userId
      },
      include: {
        asset: true
      }
    });

    if (!upload) {
      return res.status(404).json({
        success: false,
        error: 'Upload not found'
      });
    }

    return res.json({
      success: true,
      data: upload
    });
  } catch (error) {
    console.error('Error getting social media upload:', error);
    return res.status(500).json({ error: 'Failed to get social media upload' });
  }
});

// Facebook Integration (using Facebook Graph API)
router.post('/facebook/exchange-code', authenticateToken, async (req, res) => {
  try {
    const { code } = req.body;

    console.log('Exchanging Facebook authorization code for tokens');

    // Exchange authorization code for access token using Facebook Graph API
    const tokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', process.env.FACEBOOK_CLIENT_ID || '');
    tokenUrl.searchParams.set('client_secret', process.env.FACEBOOK_CLIENT_SECRET || '');
    tokenUrl.searchParams.set('redirect_uri', `${process.env.FRONTEND_URL || 'http://localhost:8080'}/oauth/callback`);
    tokenUrl.searchParams.set('code', code);

    const tokenResponse = await fetch(tokenUrl.toString());

    if (!tokenResponse.ok) {
      console.error('Facebook token exchange failed:', tokenResponse.status, tokenResponse.statusText);
      const errorText = await tokenResponse.text();
      console.error('Error response:', errorText);
      return res.status(400).json({ error: 'Failed to exchange Facebook authorization code' });
    }

    const tokenData = await tokenResponse.json() as {
      access_token: string;
      token_type: string;
      expires_in: number;
    };

    console.log('Facebook token exchange successful:', {
      hasAccessToken: !!tokenData.access_token,
      tokenType: tokenData.token_type,
      expiresIn: tokenData.expires_in
    });

    // Get user's Facebook Pages
    const userResponse = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${tokenData.access_token}`);

    if (!userResponse.ok) {
      console.error('Failed to get user pages');
      return res.status(400).json({ error: 'Failed to get user pages' });
    }

    const userData = await userResponse.json() as {
      data: Array<{
        id: string;
        name: string;
        access_token: string;
      }>;
    };

    // Get the first page (you could let user choose which page to connect)
    if (userData.data.length === 0) {
      return res.status(400).json({ error: 'No Facebook pages found. Please create a Facebook page first.' });
    }
    console.log('User data:', userData);
    const pageId = userData.data[0].id;
    const pageName = userData.data[0].name;
    const pageAccessToken = userData.data[0].access_token;

    // Get user info
    const userInfoResponse = await fetch(`https://graph.facebook.com/v18.0/me?access_token=${tokenData.access_token}`);

    if (!userInfoResponse.ok) {
      console.error('Failed to get user info');
      return res.status(400).json({ error: 'Failed to get user info' });
    }

    const userInfo = await userInfoResponse.json() as {
      id: string;
      name: string;
    };

    return res.json({
      access_token: pageAccessToken, // Use page access token for Facebook operations
      user_id: userInfo.id,
      username: userInfo.name,
      page_id: pageId,
      page_name: pageName
    });

  } catch (error) {
    console.error('Error exchanging Facebook authorization code:', error);
    return res.status(500).json({ error: 'Failed to exchange Facebook authorization code' });
  }
});

// Save Facebook connection to database
router.post('/facebook/connect', authenticateToken, async (req, res) => {
  try {
    const { accessToken, userId, username, pageId, pageName } = req.body;
    const profileId = (req as any).user.userId;

    // Calculate token expiry (Facebook tokens typically last 60 days)
    const tokenExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days

    const connection = await prisma.socialMediaConnection.upsert({
      where: {
        profileId_platform: {
          profileId: profileId,
          platform: 'facebook'
        }
      },
      update: {
        accessToken,
        tokenExpiresAt,
        platformUserId: userId,
        platformUsername: username,
        pageName: pageName, // Store Facebook Page Name
        channelId: pageId, // Store Facebook Page ID
        isActive: true,
        updatedAt: new Date()
      },
      create: {
        profileId: profileId,
        platform: 'facebook',
        accessToken,
        tokenExpiresAt,
        platformUserId: userId,
        platformUsername: username,
        pageName: pageName, // Store Facebook Page Name
        channelId: pageId,
        isActive: true
      }
    });

    res.json({
      success: true,
      connection: {
        id: connection.id,
        platform: connection.platform,
        platformUsername: connection.platformUsername,
        pageName: connection.pageName,
        channelId: connection.channelId,
        isActive: connection.isActive
      }
    });
  } catch (error) {
    console.error('Error saving Facebook connection:', error);
    res.status(500).json({ error: 'Failed to save Facebook connection' });
  }
});

// Get Facebook Page statistics with caching
router.get('/facebook/stats', authenticateToken, async (req, res) => {
  console.log('=== FACEBOOK STATS ROUTE HIT ===');
  try {
    const userId = (req as any).user.userId;
    const forceRefresh = req.query.refresh === 'true';

    // Get the user's Facebook connection
    const connection = await prisma.socialMediaConnection.findFirst({
      where: {
        profileId: userId,
        platform: 'facebook',
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
      return res.status(404).json({ error: 'Facebook connection not found' });
    }

    // Check if we have valid cached data and user didn't force refresh
    const cachedStats = connection.cachedData[0];


    if (!forceRefresh && isCacheValid(cachedStats)) {
      console.log('cachedStats is valid');
      return res.json({
        stats: cachedStats.data,
        cached: true,
        lastUpdated: cachedStats.lastFetchedAt,
      });
    }

    // Check if token is expired
    if (connection.tokenExpiresAt && new Date() >= connection.tokenExpiresAt) {
      if (forceRefresh) {
        return res.status(401).json({ error: 'Facebook token expired. Please reconnect your account.' });
      }
      if (cachedStats) {
        return res.json({
          stats: cachedStats.data,
          cached: true,
          lastUpdated: cachedStats.lastFetchedAt,
          note: 'Using cached data due to expired token'
        });
      } else {
        return res.status(401).json({ error: 'Facebook token expired and no cached data available' });
      }
    }

    // Fetch fresh data from Facebook Graph API
    try {
      console.log('Fetching Facebook insights for page:', connection.channelId);

      // Get page insights (followers, reach, etc.)
      // Try with basic metrics first, then fallback to page info
      const insightsResponse = await fetch(
        `https://graph.facebook.com/v18.0/${connection.channelId}/insights?metric=page_fans&period=day&access_token=${connection.accessToken}`
      );


      if (!insightsResponse.ok) {
        const errorText = await insightsResponse.text();
        console.error('Facebook insights API error:', errorText);
        throw new Error(`Facebook insights API failed: ${insightsResponse.status} - ${errorText}`);
      }

      const insightsData = await insightsResponse.json() as any;
      console.log('Insights data received:', JSON.stringify(insightsData, null, 2));

      const postsResponse = await fetch(
        `https://graph.facebook.com/v18.0/${connection.channelId}/posts?fields=id,message,created_time,insights.metric(post_impressions,post_engagements)&limit=5&access_token=${connection.accessToken}`
      );

      let recentPosts: any[] = [];
      let totalEngagement = 0;
      let totalReach = 0;

      if (postsResponse.ok) {
        const postsData = await postsResponse.json() as any;
        console.log('Posts data received:', JSON.stringify(postsData, null, 2));
        recentPosts = postsData.data || [];

        // Calculate total engagement and reach from posts
        for (const post of recentPosts) {
          if (post.insights && post.insights.data) {
            const impressions = post.insights.data.find((insight: any) => insight.name === 'post_impressions')?.values[0]?.value || 0;
            const engagements = post.insights.data.find((insight: any) => insight.name === 'post_engagements')?.values[0]?.value || 0;
            
            totalReach += parseInt(impressions) || 0;
            totalEngagement += parseInt(engagements) || 0;
          }
        }

        console.log('Found', recentPosts.length, 'recent posts');
        console.log('Total engagement:', totalEngagement, 'Total reach:', totalReach);
      } else {
        console.log('Posts API failed, trying without insights...');
        // Fallback: get posts without insights if the insights request fails
        const fallbackPostsResponse = await fetch(
          `https://graph.facebook.com/v18.0/${connection.channelId}/posts?fields=id,message,created_time&limit=5&access_token=${connection.accessToken}`
        );
        
        if (fallbackPostsResponse.ok) {
          const fallbackPostsData = await fallbackPostsResponse.json() as any;
          recentPosts = fallbackPostsData.data || [];
          console.log('Fallback: Found', recentPosts.length, 'recent posts (no insights available)');
        }
      }

      // Extract insights data
      const followers = insightsData.data?.find((item: any) => item.name === 'page_fans')?.values[0]?.value || 0;

      // If insights fail, try to get basic page info
      let pageInfo = null;
      if (!insightsData.data || insightsData.data.length === 0) {
        console.log('No insights data available, fetching basic page info');
        try {
          const pageResponse = await fetch(
            `https://graph.facebook.com/v18.0/${connection.channelId}?fields=name,fan_count&access_token=${connection.accessToken}`
          );
          if (pageResponse.ok) {
            pageInfo = await pageResponse.json() as any;
            console.log('Page info received:', JSON.stringify(pageInfo, null, 2));
          }
        } catch (error) {
          console.error('Error fetching page info:', error);
        }
      }

      // Calculate engagement rate
      const engagementRate = totalReach > 0 ? Math.round((totalEngagement / totalReach) * 100) : 0;

      const stats = {
        followers: parseInt(followers) || parseInt(pageInfo?.fan_count) || 0,
        reach: totalReach,
        engagement: totalEngagement,
        engagementRate: engagementRate,
        recentPosts: recentPosts.length,
        totalEngagement: totalEngagement,
        totalReach: totalReach,
        lastPost: recentPosts.length > 0 ? formatTimeAgo(new Date(recentPosts[0].created_time)) : 'N/A'
      };

      console.log('Calculated stats:', stats);

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

      return res.json({
        stats,
        cached: false,
        lastUpdated: new Date()
      });

    } catch (error) {
      console.error('Error fetching Facebook stats:', error);

      if (forceRefresh) {
        return res.status(500).json({
          error: 'Failed to fetch fresh data from Facebook API',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // Return cached data if available
      if (cachedStats) {
        return res.json({
          stats: cachedStats.data,
          cached: true,
          lastUpdated: cachedStats.lastFetchedAt,
          note: 'Using cached data due to API error'
        });
      } else {
        console.log('cachedStats is not valid in catch block');
        return res.json({
          stats: {
            followers: 0,
            reach: 0,
            engagement: 0,
            engagementRate: 0,
            recentPosts: 0,
            totalEngagement: 0,
            totalReach: 0,
            lastPost: 'N/A'
          }
        });
      }
    }
  } catch (error) {
    console.error('Error getting Facebook stats:', error);
    return res.status(500).json({ error: 'Failed to get Facebook stats' });
  }
});

// Get Facebook recent activity with caching
router.get('/facebook/activity', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const forceRefresh = req.query.refresh === 'true';

    // Get the user's Facebook connection
    const connection = await prisma.socialMediaConnection.findFirst({
      where: {
        profileId: userId,
        platform: 'facebook',
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
      return res.status(404).json({ error: 'Facebook connection not found' });
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

    // Check if token is expired
    if (connection.tokenExpiresAt && new Date() >= connection.tokenExpiresAt) {
      if (forceRefresh) {
        return res.status(401).json({ error: 'Facebook token expired. Please reconnect your account.' });
      }
      if (cachedActivity) {
        return res.json({
          activity: cachedActivity.data,
          cached: true,
          lastUpdated: cachedActivity.lastFetchedAt,
          note: 'Using cached data due to expired token'
        });
      } else {
        return res.status(401).json({ error: 'Facebook token expired and no cached data available' });
      }
    }

    try {
      console.log('Fetching Facebook activity for page:', connection.channelId);

      // Fetch recent posts with updated fields for v18.0
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${connection.channelId}/posts?fields=id,message,created_time,status_type&limit=10&access_token=${connection.accessToken}`
      );

      console.log('Activity response status:', response.status);

      if (response.ok) {
        const data = await response.json() as any;
        console.log('Activity data received:', JSON.stringify(data, null, 2));
        const activity = data.data?.map((post: any) => {
          return {
            id: post.id,
            timestamp: formatTimeAgo(new Date(post.created_time)),
            message: post.message ? (post.message.substring(0, 100) + (post.message.length > 100 ? '...' : '')) : 'No message',
            type: post.status_type || 'post',
            metrics: {
              reach: 'N/A', // Insights not available
              engagement: 'N/A', // Insights not available
              clicks: 'N/A', // Insights not available
              likes: 'N/A' // Would need additional API call for detailed reactions
            }
          };
        }) || [];

        console.log('Processed activity data:', activity.length, 'posts found');

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

        return res.json({
          activity,
          cached: false,
          lastUpdated: new Date()
        });
      } else {
        const errorText = await response.text();
        console.error('Facebook activity API error:', errorText);
        throw new Error(`Facebook API failed: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('Error fetching Facebook activity:', error);

      if (forceRefresh) {
        return res.status(500).json({
          error: 'Failed to fetch fresh data from Facebook API',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      if (cachedActivity) {
        return res.json({
          activity: cachedActivity.data,
          cached: true,
          lastUpdated: cachedActivity.lastFetchedAt,
          note: 'Using cached data due to API error'
        });
      } else {
        return res.json({ activity: [] });
      }
    }
  } catch (error) {
    console.error('Error getting Facebook activity:', error);
    return res.status(500).json({ error: 'Failed to get Facebook activity' });
  }
});

// Helper function to format time ago
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

  if (diffInHours < 1) {
    return 'Just now';
  } else if (diffInHours < 24) {
    return `${diffInHours} hours ago`;
  } else {
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} days ago`;
  }
}

// Facebook post upload endpoint
router.post('/facebook/upload', authenticateToken, async (req, res) => {
  try {
    const { message, link, videoUrl, imageUrl, assetId } = req.body;
    const userId = (req as any).user.userId;

    // Validate required fields
    if (!message && !link && !videoUrl && !imageUrl) {
      return res.status(400).json({
        error: 'Message, link, video URL, or image URL is required'
      });
    }

    // Check if Facebook credentials are configured
    if (!process.env.FACEBOOK_CLIENT_ID || !process.env.FACEBOOK_CLIENT_SECRET) {
      console.error('Facebook credentials not configured');
      return res.status(500).json({
        error: 'Facebook credentials not configured. Please set FACEBOOK_CLIENT_ID and FACEBOOK_CLIENT_SECRET in your environment variables.'
      });
    }

    // Get the user's Facebook connection
    const connection = await prisma.socialMediaConnection.findFirst({
      where: {
        profileId: userId,
        platform: 'facebook',
        isActive: true
      }
    });

    if (!connection) {
      return res.status(404).json({
        error: 'Facebook account not connected. Please connect your Facebook account first.'
      });
    }

    // Check if token is expired
    if (connection.tokenExpiresAt && new Date() > connection.tokenExpiresAt) {
      return res.status(401).json({
        error: 'Facebook token expired. Please reconnect your account.'
      });
    }

    // Prepare post data
    const postData: any = {
      message: message || '',
      access_token: connection.accessToken
    };

    // Add link if provided
    if (link) {
      postData.link = link;
    }

    // Add video if provided
    if (videoUrl) {
      postData.video_url = videoUrl;
    }

    // Add image if provided
    if (imageUrl) {
      postData.image_url = imageUrl;
    }

    // Create the post
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${connection.channelId}/feed`,
      postData
    );

    if (response.status !== 200) {
      console.error('Failed to create Facebook post:', response.data);
      return res.status(response.status).json({
        error: `Failed to create post: ${response.data?.error?.message || 'Unknown error'}`
      });
    }

    const postResult = response.data;
    const postId = postResult.id;

    console.log('Facebook post created successfully:', postId);

    // Store upload record in database
    const uploadRecord = await prisma.socialMediaUpload.create({
      data: {
        profileId: userId,
        platform: 'facebook',
        contentType: 'post',
        uploadUrl: `https://www.facebook.com/${postId}`,
        platformId: postId,
        title: message?.substring(0, 100) || 'Facebook Post',
        description: message,
        tags: [],
        metadata: {
          postId: postId,
          message: message,
          link: link,
          videoUrl: videoUrl,
          imageUrl: imageUrl,
          type: videoUrl ? 'video' : (imageUrl ? 'image' : (link ? 'link' : 'text'))
        },
        status: 'uploaded',
        assetId: assetId || null
      }
    });

    return res.json({
      success: true,
      postId: postId,
      url: `https://www.facebook.com/${postId}`,
      uploadRecord
    });

  } catch (error) {
    console.error('Error uploading to Facebook:', error);

    const errorMessage = 'Failed to upload post to Facebook';
    let errorDetails = '';

    if (axios.isAxiosError(error)) {
      errorDetails = `Status: ${error.response?.status}, Message: ${error.response?.data?.error?.message || error.message}`;
      console.error('Axios error details:', errorDetails);
    } else if (error instanceof Error) {
      errorDetails = error.message;
      console.error('Standard error:', errorDetails);
    }

    return res.status(500).json({
      error: errorMessage,
      details: errorDetails
    });
  }
});

// Instagram Integration (using Facebook Graph API)
router.post('/instagram/exchange-code', authenticateToken, async (req, res) => {
  try {
    const { code } = req.body;

    const _userId = (req as any).user.userId;


    // Exchange authorization code for access token using Facebook Graph API
    const tokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', process.env.FACEBOOK_CLIENT_ID || '');
    tokenUrl.searchParams.set('client_secret', process.env.FACEBOOK_CLIENT_SECRET || '');
    tokenUrl.searchParams.set('redirect_uri', `${process.env.FRONTEND_URL || 'http://localhost:8080'}/oauth/callback`);
    tokenUrl.searchParams.set('code', code);

    const tokenResponse = await fetch(tokenUrl.toString());

    if (!tokenResponse.ok) {
      console.error('Instagram token exchange failed:', tokenResponse.status, tokenResponse.statusText);
      const errorText = await tokenResponse.text();
      console.error('Error response:', errorText);
      return res.status(400).json({ error: 'Failed to exchange Instagram authorization code' });
    }

    const tokenData = await tokenResponse.json() as {
      access_token: string;
      token_type: string;
      expires_in: number;
    };

    console.log('Instagram token exchange successful:', {
      hasAccessToken: !!tokenData.access_token,
      tokenType: tokenData.token_type,
      expiresIn: tokenData.expires_in
    });

    // Get user's Instagram Business Account
    const userResponse = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${tokenData.access_token}`);

    if (!userResponse.ok) {
      console.error('Failed to get user accounts');
      return res.status(400).json({ error: 'Failed to get user accounts' });
    }
    const data=await userResponse.json()
    console.log('User data:', data);
    const userData = data as {
      data: Array<{
        id: string;
        name: string;
        access_token: string;
      }>;
    };

    // Get Instagram Business Account for the first page
    if (userData.data.length === 0) {
      return res.status(400).json({ error: 'No Facebook pages found. Please create a Facebook page first.' });
    }

    const pageId = userData.data[0].id;
    const pageAccessToken = userData.data[0].access_token;

    // Get Instagram Business Account
    const instagramResponse = await fetch(`https://graph.facebook.com/v18.0/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`);

    if (!instagramResponse.ok) {
      console.error('Failed to get Instagram business account');
      return res.status(400).json({ error: 'No Instagram Business Account found. Please connect your Instagram account to your Facebook page.' });
    }

    const instagramData = await instagramResponse.json() as {
      instagram_business_account: {
        id: string;
      };
    };

    if (!instagramData.instagram_business_account) {
      return res.status(400).json({ error: 'No Instagram Business Account found. Please connect your Instagram account to your Facebook page.' });
    }

    // Get Instagram account details
    const instagramAccountResponse = await fetch(`https://graph.facebook.com/v18.0/${instagramData.instagram_business_account.id}?fields=id,username,name&access_token=${pageAccessToken}`);

    if (!instagramAccountResponse.ok) {
      console.error('Failed to get Instagram account details');
      return res.status(400).json({ error: 'Failed to get Instagram account details' });
    }

    const instagramAccount = await instagramAccountResponse.json() as {
      id: string;
      username: string;
      name: string;
    };

    return res.json({
      access_token: pageAccessToken, // Use page access token for Instagram operations
      user_id: instagramAccount.id,
      username: instagramAccount.username,
      page_id: pageId,
      instagram_business_account_id: instagramData.instagram_business_account.id
    });

  } catch (error) {
    console.error('Error exchanging Instagram authorization code:', error);
    return res.status(500).json({ error: 'Failed to exchange Instagram authorization code' });
  }
});

// Save Instagram connection to database
router.post('/instagram/connect', authenticateToken, async (req, res) => {
  try {
    const { accessToken, userId, username, instagramBusinessAccountId } = req.body;
    const profileId = (req as any).user.userId;

    // Calculate token expiry (Facebook tokens typically last 60 days)
    const tokenExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days

    const connection = await prisma.socialMediaConnection.upsert({
      where: {
        profileId_platform: {
          profileId: profileId,
          platform: 'instagram'
        }
      },
      update: {
        accessToken,
        tokenExpiresAt,
        platformUserId: userId,
        platformUsername: username,
        channelId: instagramBusinessAccountId, // Store Instagram Business Account ID
        isActive: true,
        updatedAt: new Date()
      },
      create: {
        profileId: profileId,
        platform: 'instagram',
        accessToken,
        tokenExpiresAt,
        platformUserId: userId,
        platformUsername: username,
        channelId: instagramBusinessAccountId,
        isActive: true
      }
    });

    res.json({
      success: true,
      connection: {
        id: connection.id,
        platform: connection.platform,
        platformUsername: connection.platformUsername,
        channelId: connection.channelId,
        isActive: connection.isActive
      }
    });
  } catch (error) {
    console.error('Error saving Instagram connection:', error);
    res.status(500).json({ error: 'Failed to save Instagram connection' });
  }
});

// Instagram media upload endpoint (using Instagram Graph API) - supports images, videos, and reels
router.post('/instagram/upload', authenticateToken, async (req, res) => {
  try {
    const { videoUrl, imageUrl, caption, assetId, mediaType = 'auto' } = req.body;
    const userId = (req as any).user.userId;

    // Validate required fields
    if (!videoUrl && !imageUrl) {
      return res.status(400).json({
        error: 'Either video URL or image URL is required'
      });
    }

    // Determine media type and URL
    const isVideo = !!videoUrl;
    const mediaUrl = videoUrl || imageUrl;
    const contentType = isVideo ? 'video' : 'image';

    // Validate basic requirements
    if (!process.env.FACEBOOK_CLIENT_ID || !process.env.FACEBOOK_CLIENT_SECRET) {
      return res.status(500).json({
        error: 'Facebook credentials not configured'
      });
    }

    // Get Instagram connection
    const connection = await prisma.socialMediaConnection.findFirst({
      where: {
        profileId: userId,
        platform: 'instagram',
        isActive: true
      }
    });

    if (!connection) {
      return res.status(404).json({
        error: 'Instagram account not connected'
      });
    }

    // Validate media URL and caption
    if (!mediaUrl.startsWith('http')) {
      return res.status(400).json({
        error: 'Invalid media URL. Must be a valid HTTP/HTTPS URL.'
      });
    }

    if (caption && caption.length > 2200) {
      return res.status(400).json({
        error: 'Caption is too long. Instagram captions have a 2200 character limit.'
      });
    }

    // Determine Instagram media type
    const instagramMediaType = isVideo 
      ? (mediaType === 'auto' || mediaType === 'reels' ? 'REELS' : 'VIDEO')
      : 'IMAGE';

    // Create media container
    const containerData = {
      media_type: instagramMediaType,
      caption: caption || '',
      access_token: connection.accessToken,
      ...(isVideo ? { video_url: mediaUrl } : { image_url: mediaUrl })
    };

    const containerResponse = await axios.post(
      `https://graph.facebook.com/v18.0/${connection.channelId}/media`,
      containerData
    );

    if (containerResponse.status !== 200) {
      return res.status(containerResponse.status).json({
        error: `Failed to create media container: ${containerResponse.data?.error?.message || 'Unknown error'}`
      });
    }

    const creationId = containerResponse.data.id;
    console.log('Instagram media container created:', creationId);

         // Wait for media processing
     const _mediaId = await waitForMediaProcessing(creationId, connection.accessToken, contentType);

    // Publish the media
    const publishResponse = await axios.post(
      `https://graph.facebook.com/v18.0/${connection.channelId}/media_publish`,
      {
        creation_id: creationId,
        access_token: connection.accessToken
      }
    );

    if (publishResponse.status !== 200) {
      return res.status(publishResponse.status).json({
        error: `Failed to publish media: ${publishResponse.data?.error?.message || 'Unknown error'}`
      });
    }

    const finalMediaId = publishResponse.data.id;

    // Store upload record
    const uploadRecord = await prisma.socialMediaUpload.create({
      data: {
        profileId: userId,
        platform: 'instagram',
        contentType: contentType,
        uploadUrl: `https://www.instagram.com/p/${finalMediaId}/`,
        platformId: finalMediaId,
        title: caption || `Instagram ${isVideo ? 'Reel' : 'Post'}`,
        description: caption,
        tags: [],
        metadata: {
          mediaId: finalMediaId,
          creationId: creationId,
          caption: caption,
          mediaType: instagramMediaType,
          contentType: contentType
        },
        status: 'uploaded',
        assetId: assetId || null
      }
    });

    return res.json({
      success: true,
      mediaId: finalMediaId,
      url: `https://www.instagram.com/p/${finalMediaId}/`,
      uploadRecord,
      contentType: contentType,
      instagramMediaType: instagramMediaType
    });

  } catch (error) {
    console.error('Error uploading to Instagram:', error);
    
    const errorMessage = 'Failed to upload to Instagram';
    let errorDetails = '';

    if (axios.isAxiosError(error)) {
      errorDetails = `Status: ${error.response?.status}, Message: ${error.response?.data?.error?.message || error.message}`;
    } else if (error instanceof Error) {
      errorDetails = error.message;
    }

    return res.status(500).json({
      error: errorMessage,
      details: errorDetails
    });
  }
});

// Helper function to wait for Instagram media processing
async function waitForMediaProcessing(creationId: string, accessToken: string, contentType: string): Promise<string> {
  const maxAttempts = 30;
  const pollInterval = 2000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`Polling attempt ${attempt}/${maxAttempts} for media status...`);
    
    try {
      const statusResponse = await axios.get(
        `https://graph.facebook.com/v18.0/${creationId}?fields=status_code&access_token=${accessToken}`
      );

      const statusCode = statusResponse.data.status_code;
      
      if (statusCode === 'FINISHED') {
        console.log('Media is ready for publishing!');
        return creationId;
      } else if (statusCode === 'ERROR') {
        throw new Error(`Instagram rejected the ${contentType}. Please check format, size, and content requirements.`);
      } else {
        console.log(`Media status: ${statusCode}, waiting...`);
        await new Promise(resolve => global.setTimeout(resolve, pollInterval));
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Instagram rejected')) {
        throw error;
      }
      console.error('Error checking media status:', error);
      await new Promise(resolve => global.setTimeout(resolve, pollInterval));
    }
  }

  throw new Error('Media processing timeout. Please try again.');
}

export default router; 