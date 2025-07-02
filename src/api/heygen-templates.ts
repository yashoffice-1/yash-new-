
export async function fetchHeyGenTemplates(apiKey: string) {
  try {
    const response = await fetch('https://api.heygen.com/v2/templates', {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'x-api-key': apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`HeyGen API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching HeyGen templates:', error);
    throw error;
  }
}

export function transformHeyGenTemplate(heygenTemplate: any) {
  return {
    id: heygenTemplate.template_id || heygenTemplate.id,
    name: heygenTemplate.name || `Template ${heygenTemplate.template_id?.slice(-8) || 'Unknown'}`,
    description: heygenTemplate.description || 'HeyGen video template',
    thumbnail: heygenTemplate.thumbnail || heygenTemplate.preview_url || 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=400&h=200&fit=crop',
    category: heygenTemplate.category || 'Custom',
    duration: heygenTemplate.duration || '30s',
    status: 'active' as const,
    heygenTemplateId: heygenTemplate.template_id || heygenTemplate.id,
    variables: heygenTemplate.variables || []
  };
}
