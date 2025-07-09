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
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')

    if (!code || !state) {
      throw new Error('Missing code or state parameter')
    }

    const { userId } = await req.json()
    if (!userId) {
      throw new Error('Missing userId in request body')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Retrieve PKCE parameters
    const { data: tempData, error: tempError } = await supabase
      .from('user_social_connections')
      .select('access_token')
      .eq('user_id', userId)
      .eq('platform', 'twitter_temp')
      .single()

    if (tempError || !tempData) {
      throw new Error('PKCE data not found')
    }

    const pkceData = JSON.parse(tempData.access_token)
    
    if (pkceData.state !== state) {
      throw new Error('State mismatch')
    }

    // Exchange code for access token
    const CLIENT_ID = 'MFJlSGdVR3ZRQy11N3VyME01cGE6MTpjaQ'
    const REDIRECT_URI = 'https://preview--feed-genesis.lovable.app/x-manage'

    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        code_verifier: pkceData.code_verifier,
      }).toString(),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Token exchange failed:', errorText)
      throw new Error(`Token exchange failed: ${errorText}`)
    }

    const tokenData = await tokenResponse.json()

    // Get user info from Twitter
    const userResponse = await fetch('https://api.twitter.com/2/users/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    })

    if (!userResponse.ok) {
      throw new Error('Failed to get user info from Twitter')
    }

    const userData = await userResponse.json()

    // Calculate token expiry
    const expiresAt = new Date()
    expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in)

    // Store the connection
    const { error: storeError } = await supabase
      .from('user_social_connections')
      .upsert({
        user_id: userId,
        platform: 'twitter',
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: expiresAt.toISOString(),
        platform_user_id: userData.data.id,
        platform_username: userData.data.username,
      }, {
        onConflict: 'user_id,platform'
      })

    if (storeError) {
      console.error('Error storing connection:', storeError)
      throw storeError
    }

    // Clean up temp data
    await supabase
      .from('user_social_connections')
      .delete()
      .eq('user_id', userId)
      .eq('platform', 'twitter_temp')

    return new Response(
      JSON.stringify({ 
        success: true,
        username: userData.data.username 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in twitter-oauth-callback:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})