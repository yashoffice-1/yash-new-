# 🧪 HeyGen Webhook Flow Testing Guide

## **📋 Pre-Testing Checklist**

### **1. Environment Setup**
- [ ] Backend server running on port 3001
- [ ] Frontend running on port 8080
- [ ] Ngrok tunnel active (for webhook testing)
- [ ] Database migrations applied
- [ ] Environment variables configured

### **2. Required Environment Variables**
```bash
# Backend (.env)
HEYGEN_API_KEY=your_actual_heygen_api_key
WEBHOOK_URL=https://your-ngrok-url.ngrok.io/api/ai/heygen/webhook
HEYGEN_WEBHOOK_SECRET=your_webhook_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret

# Frontend (.env)
VITE_BACKEND_URL=https://your-ngrok-url.ngrok.io
```

---

## **🧪 Manual Testing Steps**

### **Test 1: Health Check**
```bash
curl http://localhost:3001/api/ai/health
```
**Expected Response:**
```json
{
  "status": "healthy",
  "services": {
    "database": "connected",
    "cloudinary": "configured",
    "heygen": "configured"
  }
}
```

### **Test 2: Frontend Real-time Connection**
1. **Open browser** to `http://localhost:8080`
2. **Login** to the application
3. **Check header** for real-time status indicator
4. **Expected**: Status shows "🟢 Online" or "🔴 Offline"

### **Test 3: Video Generation Flow**
1. **Navigate** to video template page
2. **Select a template** and fill variables
3. **Click "Generate Video"**
4. **Expected Results**:
   - Toast notification: "🎬 Video Generation Started"
   - Progress indicator appears
   - Header shows pending video count
   - Real-time status updates

### **Test 4: Webhook Simulation**
```bash
# Test successful webhook
curl -X POST https://your-ngrok-url.ngrok.io/api/ai/heygen/webhook \
  -H "Content-Type: application/json" \
  -H "X-Heygen-Signature: test-signature" \
  -d '{
    "event_type": "avatar_video.success",
    "event_data": {
      "video_id": "test_video_123",
      "url": "https://example.com/video.mp4",
      "gif_download_url": "https://example.com/gif.gif",
      "thumbnail_url": "https://example.com/thumb.jpg"
    }
  }'
```

### **Test 5: Failed Webhook Simulation**
```bash
# Test failed webhook
curl -X POST https://your-ngrok-url.ngrok.io/api/ai/heygen/webhook \
  -H "Content-Type: application/json" \
  -H "X-Heygen-Signature: test-signature" \
  -d '{
    "event_type": "avatar_video.fail",
    "event_data": {
      "video_id": "test_video_123",
      "error": "Test error message"
    }
  }'
```

---

## **🔍 Automated Testing**

### **Run Test Suite**
```bash
cd backend
node test-heygen-flow.js
```

### **Expected Output**
```
🧪 HeyGen Webhook Flow Test Suite
=====================================

🚀 Starting HeyGen Webhook Flow Tests...

1️⃣ Testing Health Check...
✅ Health Check Response: { status: 'healthy', ... }

2️⃣ Testing SSE Connection...
✅ SSE Connection Established

3️⃣ Testing Video Generation Endpoint...
✅ Video Generation Response: { success: true, ... }

4️⃣ Testing Webhook Processing...
✅ Webhook Processing Response: { success: true, ... }

5️⃣ Testing Failed Webhook Processing...
✅ Failed Webhook Response: { success: true, ... }

📊 Test Results Summary
========================
Health Check: ✅ PASS
SSE Connection: ✅ PASS
Video Generation: ✅ PASS
Webhook Success: ✅ PASS
Webhook Failure: ✅ PASS

🎯 Overall: 5/5 tests passed
🎉 All tests passed! The HeyGen webhook flow is working correctly.
```

---

## **🐛 Troubleshooting**

### **Common Issues & Solutions**

#### **1. SSE Connection Fails**
- **Issue**: Frontend shows "🔴 Offline"
- **Solution**: 
  - Check `VITE_BACKEND_URL` in frontend `.env`
  - Verify backend is running on correct port
  - Check CORS configuration

#### **2. Webhook Not Received**
- **Issue**: Backend doesn't receive webhooks
- **Solution**:
  - Verify `WEBHOOK_URL` in HeyGen dashboard
  - Check ngrok tunnel is active
  - Ensure webhook endpoint is accessible

#### **3. Cloudinary Upload Fails**
- **Issue**: Assets not uploaded to Cloudinary
- **Solution**:
  - Verify Cloudinary credentials
  - Check network connectivity
  - Review Cloudinary upload logs

#### **4. Database Errors**
- **Issue**: Asset records not created/updated
- **Solution**:
  - Run `npx prisma migrate dev`
  - Check database connection
  - Verify schema changes

#### **5. Authentication Errors**
- **Issue**: 401 Unauthorized errors
- **Solution**:
  - Check JWT token validity
  - Verify user authentication
  - Review auth middleware

---

## **📊 Success Criteria**

### **✅ All Tests Must Pass**
- [ ] Health check returns healthy status
- [ ] SSE connection establishes successfully
- [ ] Video generation creates pending asset
- [ ] Webhook processing updates asset status
- [ ] Real-time updates appear in frontend
- [ ] Cloudinary upload completes successfully
- [ ] Error handling works for failed webhooks

### **✅ User Experience**
- [ ] Toast notifications appear for all events
- [ ] Progress indicators show real-time updates
- [ ] Connection status is clearly visible
- [ ] Error messages are user-friendly
- [ ] No page refreshes required for updates

### **✅ Performance**
- [ ] SSE connection maintains stability
- [ ] Webhook processing completes within 30 seconds
- [ ] No memory leaks from SSE connections
- [ ] Automatic reconnection works properly

---

## **🎯 Next Steps After Testing**

1. **If All Tests Pass**: ✅ Ready for production deployment
2. **If Some Tests Fail**: 🔧 Debug and fix issues
3. **Performance Issues**: 📈 Optimize and retest
4. **Security Concerns**: 🔒 Review and enhance security measures

---

## **📞 Support**

If you encounter issues during testing:
1. Check the troubleshooting section above
2. Review backend logs for error details
3. Verify all environment variables are set correctly
4. Ensure all dependencies are installed and up to date
