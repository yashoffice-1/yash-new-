# 📸 Instagram Integration Setup Guide

## 🎯 **Overview**

Your application now supports **Instagram video uploads** using the Instagram Graph API. This allows users to upload their HeyGen-generated videos directly to Instagram as Reels.

## 🔧 **Prerequisites**

### **1. Facebook Business Account**
- Create a Facebook Business account at [business.facebook.com](https://business.facebook.com)
- This is required for Instagram Graph API access

### **2. Instagram Business/Creator Account**
- Convert your Instagram account to Business or Creator account
- Connect it to your Facebook Business account

### **3. Facebook App**
- Create a Facebook app at [developers.facebook.com](https://developers.facebook.com)
- Add Instagram Graph API product to your app

## 🚀 **Setup Steps**

### **Step 1: Create Facebook App**

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Click "Create App"
3. Choose "Business" as app type
4. Fill in app details and create

### **Step 2: Add Instagram Graph API**

1. In your Facebook app dashboard
2. Go to "Add Products"
3. Find "Instagram Graph API" and click "Set Up"
4. Follow the setup wizard

### **Step 3: Configure OAuth Settings**

1. Go to "Facebook Login" → "Settings"
2. Add your domain to "Valid OAuth Redirect URIs":
   ```
   https://yourdomain.com/oauth/callback
   http://localhost:8080/oauth/callback (for development)
   ```

### **Step 4: Get App Credentials**

1. Go to "Settings" → "Basic"
2. Copy your **App ID** and **App Secret**
3. Add them to your environment variables

### **Step 5: Environment Variables**

Add these to your `.env` file:

```bash
# Facebook/Instagram OAuth
VITE_FACEBOOK_CLIENT_ID=your_facebook_app_id
FACEBOOK_CLIENT_ID=your_facebook_app_id
FACEBOOK_CLIENT_SECRET=your_facebook_app_secret

# Frontend URL for OAuth callback
FRONTEND_URL=https://yourdomain.com
```

## 🔐 **Required Permissions**

Your Facebook app needs these permissions:

- `instagram_basic` - Basic Instagram account access
- `instagram_content_publish` - Publish content to Instagram
- `pages_show_list` - Access to Facebook pages
- `pages_read_engagement` - Read page engagement data
- `pages_manage_posts` - Manage page posts
- `instagram_manage_insights` - Access Instagram insights

## 📱 **User Flow**

### **For End Users:**

1. **Connect Instagram Account**
   - User clicks "Connect Instagram" in Social Media tab
   - Redirected to Facebook OAuth
   - Authorizes your app
   - Returns with connected account

2. **Upload Video**
   - User generates video with HeyGen
   - Clicks "Upload to Instagram" in Asset Library
   - Fills in caption
   - Video uploads as Instagram Reel

## 🛠 **Technical Implementation**

### **Backend Routes:**
- `POST /api/social/instagram/exchange-code` - OAuth token exchange
- `POST /api/social/instagram/connect` - Save connection
- `POST /api/social/instagram/upload` - Upload video

### **Frontend Components:**
- `useOAuth` hook - Instagram OAuth flow
- `SocialProfiles` - Account connection UI
- `SocialMediaUpload` - Upload interface

### **Upload Process:**
1. **Create Container** - Create Instagram media container
2. **Publish Media** - Publish the video as Reel
3. **Store Record** - Save upload record in database

## 📊 **Features**

### **✅ What's Working:**
- OAuth authentication with Facebook
- Instagram Business Account connection
- Video upload as Instagram Reels
- Caption support (2200 character limit)
- Upload progress tracking
- Error handling and validation
- Database storage of upload records

### **📋 Requirements:**
- Instagram Business/Creator account
- Facebook Business account
- Connected Facebook page
- Valid video format (MP4, up to 100MB)

## 🚨 **Important Notes**

### **API Limitations:**
- Only works with Instagram Business/Creator accounts
- Requires Facebook Business account
- Videos upload as Reels (not regular posts)
- 100MB file size limit
- 2200 character caption limit

### **Development vs Production:**
- Use different Facebook apps for dev/prod
- Update OAuth redirect URIs accordingly
- Test with real Instagram Business accounts

## 🔍 **Troubleshooting**

### **Common Issues:**

1. **"No Facebook pages found"**
   - User needs to create a Facebook page first
   - Page must be connected to Instagram account

2. **"No Instagram Business Account found"**
   - Instagram account must be Business/Creator type
   - Must be connected to Facebook page

3. **"Token expired"**
   - Facebook tokens expire after 60 days
   - User needs to reconnect account

4. **"Upload failed"**
   - Check video format and size
   - Verify Instagram account permissions
   - Check Facebook app settings

## 🎉 **Next Steps**

After Instagram integration, consider adding:

1. **Facebook** - Similar setup, different API endpoints
2. **TikTok** - TikTok for Developers API
3. **LinkedIn** - LinkedIn Marketing API
4. **Twitter/X** - Twitter API v2

## 📚 **Resources**

- [Instagram Graph API Documentation](https://developers.facebook.com/docs/instagram-api/)
- [Facebook Business Setup](https://business.facebook.com/)
- [Instagram Business Account](https://help.instagram.com/502981923235522)
- [Facebook App Development](https://developers.facebook.com/)

---

**🎯 Your Instagram integration is now ready! Users can connect their Instagram Business accounts and upload HeyGen videos directly to Instagram as Reels.**
