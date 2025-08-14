import crypto from 'crypto';
   
const payload = JSON.stringify({
    "event_type": "avatar_video.success",
    "event_data": {
      "video_id": "test_video_123",
      "url": "https://heygen.com/video/test_video_123.mp4",
      "gif_download_url": "https://heygen.com/gif/test_video_123.gif",
      "video_share_page_url": "https://heygen.com/share/test_video_123",
      "folder_id": "test_folder_456",
      "callback_id": "test_callback_789"
    }
});

const secret = "test";
const signature = crypto
  .createHmac('sha256', secret)
  .update(payload, 'utf8')
  .digest('hex');

console.log('X-Heygen-Signature:', signature);