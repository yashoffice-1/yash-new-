import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';

// HeyGen webhook signature verification
export const verifyHeyGenSignature = (req: Request, res: Response, next: NextFunction) => {
  const signature = req.headers['x-heygen-signature'] as string;
  const webhookSecret = process.env.HEYGEN_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.warn('HEYGEN_WEBHOOK_SECRET not configured, skipping signature verification');
    return next();
  }

  if (!signature) {
    console.error('Missing HeyGen webhook signature');
    return res.status(401).json({ 
      success: false, 
      error: 'Missing webhook signature' 
    });
  }

  try {
    const rawBody = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody, 'utf8')
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('Invalid HeyGen webhook signature');
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid webhook signature' 
      });
    }

    console.log('HeyGen webhook signature verified successfully');
    next();
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Signature verification failed' 
    });
  }
};

// IP whitelisting for HeyGen webhooks
export const validateHeyGenIP = (req: Request, res: Response, next: NextFunction) => {
  // HeyGen IP ranges (you should verify these with HeyGen documentation)
  const allowedIPs = [
    '35.184.0.0/13',    // Google Cloud (HeyGen's infrastructure)
    '34.96.0.0/12',     // Google Cloud
    '34.104.0.0/12',    // Google Cloud
    // Add more IP ranges as needed
  ];

  const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
  
  if (!clientIP) {
    console.error('Unable to determine client IP');
    return res.status(400).json({ 
      success: false, 
      error: 'Unable to determine client IP' 
    });
  }

  // For development, allow localhost
  if (process.env.NODE_ENV === 'development' && (clientIP === '127.0.0.1' || clientIP === '::1')) {
    console.log('Development mode: allowing localhost IP');
    return next();
  }

  // Check if IP is in allowed ranges
  const isAllowed = allowedIPs.some(range => {
    return isIPInRange(clientIP, range);
  });

  if (!isAllowed) {
    console.error(`Blocked webhook from unauthorized IP: ${clientIP}`);
    return res.status(403).json({ 
      success: false, 
      error: 'Unauthorized IP address' 
    });
  }

  console.log(`Webhook from authorized IP: ${clientIP}`);
  next();
};

// Helper function to check if IP is in CIDR range
function isIPInRange(ip: string, cidr: string): boolean {
  try {
    const [range, bits = '32'] = cidr.split('/');
    const mask = ~((1 << (32 - parseInt(bits))) - 1);
    const ipLong = ipToLong(ip);
    const rangeLong = ipToLong(range);
    return (ipLong & mask) === (rangeLong & mask);
  } catch (error) {
    console.error('Error checking IP range:', error);
    return false;
  }
}

// Helper function to convert IP to long integer
function ipToLong(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
}

// Rate limiting for webhook endpoints
export const webhookRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 webhook requests per windowMs
  message: {
    success: false,
    error: 'Too many webhook requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/api/health';
  }
});

// Enhanced input validation for HeyGen webhooks
export const validateHeyGenWebhook = (req: Request, res: Response, next: NextFunction) => {
  const { event_type, event_data } = req.body;

  // Check required fields
  if (!event_type) {
    return res.status(400).json({
      success: false,
      error: 'Missing event_type in webhook payload'
    });
  }

  if (!event_data) {
    return res.status(400).json({
      success: false,
      error: 'Missing event_data in webhook payload'
    });
  }

  // Validate event types
  const validEventTypes = ['avatar_video.success', 'avatar_video.fail'];
  if (!validEventTypes.includes(event_type)) {
    return res.status(400).json({
      success: false,
      error: `Invalid event_type: ${event_type}. Expected one of: ${validEventTypes.join(', ')}`
    });
  }

  // Validate event_data structure based on event type
  if (event_type === 'avatar_video.success') {
    const requiredFields = ['video_id', 'url'];
    for (const field of requiredFields) {
      if (!event_data[field]) {
        return res.status(400).json({
          success: false,
          error: `Missing required field in success event: ${field}`
        });
      }
    }
  } else if (event_type === 'avatar_video.fail') {
    const requiredFields = ['video_id', 'error'];
    for (const field of requiredFields) {
      if (!event_data[field]) {
        return res.status(400).json({
          success: false,
          error: `Missing required field in fail event: ${field}`
        });
      }
    }
  }

  console.log(`Validated HeyGen webhook: ${event_type}`);
  return next();
};

// Combined webhook security middleware
export const webhookSecurity = [
  validateHeyGenIP,
  webhookRateLimit,
  verifyHeyGenSignature,
  validateHeyGenWebhook
];
