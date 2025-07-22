import express from 'express';
import { google } from 'googleapis';
import { prisma } from '../index';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// YouTube OAuth configuration
const youtubeOAuth2Client = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:3001/api/social/youtube/callback'
);

// Generate YouTube OAuth URL
router.get('/youtube/auth', authenticateToken, async (req, res) => {
  try {
    const scopes = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ];

    const authUrl = youtubeOAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });

    res.json({ authUrl });
  } catch (error) {
    console.error('Error generating YouTube auth URL:', error);
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
});

// Handle YouTube OAuth callback
router.get('/youtube/callback', async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    // Exchange code for tokens
    const { tokens } = await youtubeOAuth2Client.getToken(code as string);
    
    // Get user info from Google
    youtubeOAuth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: youtubeOAuth2Client });
    const userInfo = await oauth2.userinfo.get();

    // Get YouTube channel info
    const youtube = google.youtube({ version: 'v3', auth: youtubeOAuth2Client });
    const channelsResponse = await youtube.channels.list({
      part: ['snippet', 'statistics'],
      mine: true
    });

    const channel = channelsResponse.data.items?.[0];
    
    // Store in database (you'll need to get the user ID from session/token)
    // For now, we'll redirect to frontend with tokens
    const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/settings/social?success=true&platform=youtube&channelId=${channel?.id}&channelTitle=${channel?.snippet?.title}`;
    
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Error in YouTube callback:', error);
    const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/settings/social?error=true&platform=youtube`;
    res.redirect(redirectUrl);
  }
});

// Save YouTube connection to database
router.post('/youtube/connect', authenticateToken, async (req, res) => {
  try {
    const { accessToken, refreshToken, channelId, channelTitle, platformUserId, platformEmail } = req.body;
    const userId = (req as any).user.id; // From auth middleware

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

// Get user's social connections
router.get('/connections', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    
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

// Disconnect a social account
router.delete('/connections/:platform', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
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

// Upload video to YouTube
router.post('/youtube/upload', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { videoUrl, title, description, tags, privacy = 'private' } = req.body;

    // Get user's YouTube connection
    const connection = await prisma.socialMediaConnection.findFirst({
      where: {
        profileId: userId,
        platform: 'youtube',
        isActive: true
      }
    });

    if (!connection) {
      return res.status(400).json({ error: 'YouTube account not connected' });
    }

    // Check if token is expired and refresh if needed
    if (connection.tokenExpiresAt && connection.tokenExpiresAt < new Date()) {
      if (!connection.refreshToken) {
        return res.status(400).json({ error: 'YouTube token expired and no refresh token available' });
      }

      // Refresh the token
      youtubeOAuth2Client.setCredentials({
        refresh_token: connection.refreshToken
      });

      const { credentials } = await youtubeOAuth2Client.refreshAccessToken();
      
      // Update the stored tokens
      await prisma.socialMediaConnection.update({
        where: { id: connection.id },
        data: {
          accessToken: credentials.access_token!,
          refreshToken: credentials.refresh_token || connection.refreshToken,
          tokenExpiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null
        }
      });

      connection.accessToken = credentials.access_token!;
    }

    // Set up YouTube API client
    youtubeOAuth2Client.setCredentials({
      access_token: connection.accessToken
    });

    const youtube = google.youtube({ version: 'v3', auth: youtubeOAuth2Client });

    // Download the video file
    const videoResponse = await fetch(videoUrl);
    const videoBuffer = await videoResponse.arrayBuffer();

    // Upload to YouTube
    const uploadResponse = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: title,
          description: description,
          tags: tags || [],
          categoryId: '22' // People & Blogs category
        },
        status: {
          privacyStatus: privacy // 'private', 'unlisted', or 'public'
        }
      },
      media: {
        body: Buffer.from(videoBuffer)
      }
    });

    const uploadedVideo = uploadResponse.data;

    res.json({
      success: true,
      videoId: uploadedVideo.id,
      title: uploadedVideo.snippet?.title,
      url: `https://www.youtube.com/watch?v=${uploadedVideo.id}`,
      privacy: uploadedVideo.status?.privacyStatus
    });

  } catch (error) {
    console.error('Error uploading to YouTube:', error);
    res.status(500).json({ error: 'Failed to upload video to YouTube' });
  }
});

export default router; 