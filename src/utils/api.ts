// Helper function to get the current access token from localStorage
const getAccessToken = (): string | null => {
  return localStorage.getItem('authToken');
};

export const apiCall = async (url: string, options: RequestInit = {}, token?: string) => {
  // Get token from parameter or localStorage
  const accessToken = token || getAccessToken();
  
  if (!accessToken) {
    throw new Error('No access token available');
  }

  // Set up headers with JWT token
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
    ...options.headers,
  };

  // Make the API call
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// Helper functions for common HTTP methods
export const apiGet = (url: string, token?: string) => apiCall(url, {}, token);

export const apiPost = (url: string, data: any, token?: string) => apiCall(url, {
  method: 'POST',
  body: JSON.stringify(data),
}, token);

export const apiPut = (url: string, data: any, token?: string) => apiCall(url, {
  method: 'PUT',
  body: JSON.stringify(data),
}, token);

export const apiDelete = (url: string, token?: string) => apiCall(url, {
  method: 'DELETE',
}, token);

export const apiPatch = (url: string, data: any, token?: string) => apiCall(url, {
  method: 'PATCH',
  body: JSON.stringify(data),
}, token); 