// Test webhook registration
const registerWebhook = async () => {
  try {
    const response = await fetch('/api/heygen-webhook-register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'register'
      })
    });
    
    const result = await response.json();
    console.log('Webhook registration result:', result);
    return result;
  } catch (error) {
    console.error('Failed to register webhook:', error);
    return { success: false, error: error.message };
  }
};

// List existing webhooks
const listWebhooks = async () => {
  try {
    const response = await fetch('/api/heygen-webhook-register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'list'
      })
    });
    
    const result = await response.json();
    console.log('Existing webhooks:', result);
    return result;
  } catch (error) {
    console.error('Failed to list webhooks:', error);
    return { success: false, error: error.message };
  }
};

export { registerWebhook, listWebhooks };