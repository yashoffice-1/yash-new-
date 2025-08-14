import { prisma } from '../index';

export class WebhookRetryService {
  static async addToRetryQueue(webhookData: any, error: string): Promise<void> {
    try {
      // Calculate next retry time with exponential backoff
      const retryCount = 0;
      const delay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Max 30 seconds
      const nextRetry = new Date(Date.now() + delay);

      await prisma.webhookRetry.create({
        data: {
          webhookData,
          retryCount,
          nextRetry,
          error: error.substring(0, 500) // Limit error message length
        }
      });

      console.log(`Webhook added to retry queue. Next retry: ${nextRetry.toISOString()}`);
    } catch (error) {
      console.error('Error adding webhook to retry queue:', error);
    }
  }

  static async processRetryQueue(): Promise<void> {
    try {
      const now = new Date();
      
      // Get webhooks ready for retry
      const pendingRetries = await prisma.webhookRetry.findMany({
        where: {
          status: 'pending',
          nextRetry: {
            lte: now
          },
          retryCount: {
            lt: 3 // Max 3 retries
          }
        }
      });

      console.log(`Processing ${pendingRetries.length} webhook retries`);

      for (const retry of pendingRetries) {
        try {
          // Mark as processing
          await prisma.webhookRetry.update({
            where: { id: retry.id },
            data: { status: 'processing' }
          });

          // Process the webhook (this will call the same logic as the main webhook endpoint)
          await this.processWebhook(retry.webhookData);

          // Mark as completed
          await prisma.webhookRetry.update({
            where: { id: retry.id },
            data: { status: 'completed' }
          });

          console.log(`Webhook retry ${retry.id} completed successfully`);
        } catch (error :any) {
          console.error(`Webhook retry ${retry.id} failed:`, error);

          // Increment retry count and schedule next retry
          const newRetryCount = retry.retryCount + 1;
          const delay = Math.min(1000 * Math.pow(2, newRetryCount), 30000);
          const nextRetry = new Date(Date.now() + delay);

          if (newRetryCount >= 3) {
            // Max retries reached, mark as failed
            await prisma.webhookRetry.update({
              where: { id: retry.id },
              data: {
                status: 'failed',
                retryCount: newRetryCount,
                error: error.message
              }
            });
            console.log(`Webhook retry ${retry.id} failed permanently after ${newRetryCount} attempts`);
          } else {
            // Schedule next retry
            await prisma.webhookRetry.update({
              where: { id: retry.id },
              data: {
                status: 'pending',
                retryCount: newRetryCount,
                nextRetry,
                error: error.message
              }
            });
            console.log(`Webhook retry ${retry.id} scheduled for retry ${newRetryCount + 1} at ${nextRetry.toISOString()}`);
          }
        }
      }
    } catch (error) {
      console.error('Error processing webhook retry queue:', error);
    }
  }

  private static async processWebhook(webhookData: any): Promise<void> {
    // This is a simplified version of the webhook processing logic
    // In a real implementation, you'd extract the webhook processing logic into a separate function
    // and call it from both the main webhook endpoint and here
    
    const { event_type, event_data } = webhookData;

    if (event_type === 'avatar_video.success') {
      // Process success event
      console.log('Processing webhook retry for success event:', event_data.video_id);
      // Add your webhook processing logic here
    } else if (event_type === 'avatar_video.fail') {
      // Process failure event
      console.log('Processing webhook retry for failure event:', event_data.video_id);
      // Add your webhook processing logic here
    }
  }

  // Start the retry queue processor
  static startRetryProcessor(): void {
    // Process retry queue every 30 seconds
    // eslint-disable-next-line no-undef
    setInterval(() => {
      this.processRetryQueue();
    }, 30000);

    console.log('Webhook retry processor started');
  }
}
