import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text, mediaUrl } = await req.json()

    if (!text) {
      throw new Error('Tweet text is required')
    }

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const userResponse = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (userResponse.error || !userResponse.data.user) {
      throw new Error('Invalid user token')
    }

    const userId = userResponse.data.user.id

    // Get Twitter connection
    const { data: connection, error: connectionError } = await supabase
      .from('user_social_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', 'twitter')
      .single()

    if (connectionError || !connection) {
      throw new Error('Twitter not connected')
    }

    // Check if token is expired and refresh if needed
    const now = new Date()
    const expiresAt = new Date(connection.token_expires_at)
    
    let accessToken = connection.access_token

    if (now >= expiresAt && connection.refresh_token) {
      // Refresh token
      const refreshResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: connection.refresh_token,
          client_id: 'MFJlSGdVR3ZRQy11N3VyME01cGE6MTpjaQ',
        }).toString(),
      })

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json()
        accessToken = refreshData.access_token

        // Update stored tokens
        const newExpiresAt = new Date()
        newExpiresAt.setSeconds(newExpiresAt.getSeconds() + refreshData.expires_in)

        await supabase
          .from('user_social_connections')
          .update({
            access_token: refreshData.access_token,
            refresh_token: refreshData.refresh_token || connection.refresh_token,
            token_expires_at: newExpiresAt.toISOString(),
          })
          .eq('id', connection.id)
      } else {
        throw new Error('Failed to refresh Twitter token')
      }
    }

    // Prepare tweet data
    const tweetData: any = { text }

    // If media is provided, upload it first
    if (mediaUrl) {
      try {
        // Download the image
        const imageResponse = await fetch(mediaUrl)
        if (!imageResponse.ok) {
          throw new Error('Failed to download image')
        }

        const imageBlob = await imageResponse.blob()
        const imageBuffer = await imageBlob.arrayBuffer()

        // Upload media to Twitter
        const formData = new FormData()
        formData.append('media', new Blob([imageBuffer]), 'image.jpg')

        const mediaResponse = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          body: formData,
        })

        if (mediaResponse.ok) {
          const mediaData = await mediaResponse.json()
          tweetData.media = { media_ids: [mediaData.media_id_string] }
        }
      } catch (mediaError) {
        console.error('Media upload failed:', mediaError)
        // Continue without media if upload fails
      }
    }

    // Post tweet
    const tweetResponse = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tweetData),
    })

    if (!tweetResponse.ok) {
      const errorText = await tweetResponse.text()
      console.error('Tweet posting failed:', errorText)
      throw new Error(`Tweet posting failed: ${errorText}`)
    }

    const tweetResult = await tweetResponse.json()

    return new Response(
      JSON.stringify({ 
        success: true,
        tweetId: tweetResult.data.id,
        tweetUrl: `https://twitter.com/${connection.platform_username}/status/${tweetResult.data.id}`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in twitter-post:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})