import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.1'
import { createHmac } from "node:crypto"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Twitter OAuth 1.0a credentials
const CONSUMER_KEY = Deno.env.get("TWITTER_API_KEY")?.trim()
const CONSUMER_SECRET = Deno.env.get("TWITTER_API_SECRET")?.trim()

function validateEnvironmentVariables() {
  if (!CONSUMER_KEY) {
    throw new Error("Missing TWITTER_API_KEY environment variable")
  }
  if (!CONSUMER_SECRET) {
    throw new Error("Missing TWITTER_API_SECRET environment variable")
  }
}

// Generate OAuth 1.0a signature
function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret = ''
): string {
  const signatureBaseString = `${method}&${encodeURIComponent(
    url
  )}&${encodeURIComponent(
    Object.entries(params)
      .sort()
      .map(([k, v]) => `${k}=${v}`)
      .join("&")
  )}`
  
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`
  const hmacSha1 = createHmac("sha1", signingKey)
  const signature = hmacSha1.update(signatureBaseString).digest("base64")
  
  return signature
}

function generateOAuthHeader(method: string, url: string, additionalParams: Record<string, string> = {}, tokenSecret = ''): string {
  const oauthParams = {
    oauth_consumer_key: CONSUMER_KEY!,
    oauth_nonce: Math.random().toString(36).substring(2),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: "1.0",
    ...additionalParams
  }

  const signature = generateOAuthSignature(method, url, oauthParams, CONSUMER_SECRET!, tokenSecret)

  const signedOAuthParams = {
    ...oauthParams,
    oauth_signature: signature,
  }

  const entries = Object.entries(signedOAuthParams).sort((a, b) =>
    a[0].localeCompare(b[0])
  )

  return (
    "OAuth " +
    entries
      .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
      .join(", ")
  )
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    validateEnvironmentVariables()
    
    const { userId, code, state } = await req.json()

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get stored temporary tokens
    const { data: tempData, error: tempError } = await supabase
      .from('user_social_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', 'twitter_temp')
      .single()

    if (tempError || !tempData) {
      throw new Error('No temporary OAuth data found')
    }

    const tempTokens = JSON.parse(tempData.access_token || '{}')
    const oauthToken = tempTokens.oauth_token || code // code is oauth_token from callback
    const oauthTokenSecret = tempTokens.oauth_token_secret
    const oauthVerifier = state // state is oauth_verifier from callback

    if (!oauthToken || !oauthTokenSecret || !oauthVerifier) {
      throw new Error('Missing OAuth parameters')
    }

    // Step 2: Exchange for access token
    const accessTokenUrl = 'https://api.twitter.com/oauth/access_token'
    
    const accessTokenParams = {
      oauth_token: oauthToken,
      oauth_verifier: oauthVerifier
    }
    
    const accessTokenHeader = generateOAuthHeader('POST', accessTokenUrl, accessTokenParams, oauthTokenSecret)
    
    const accessTokenResponse = await fetch(accessTokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': accessTokenHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `oauth_verifier=${encodeURIComponent(oauthVerifier)}`
    })

    if (!accessTokenResponse.ok) {
      const errorText = await accessTokenResponse.text()
      console.error('Access token error:', errorText)
      throw new Error(`Failed to get access token: ${errorText}`)
    }

    const accessTokenText = await accessTokenResponse.text()
    console.log('Access token response:', accessTokenText)
    
    const accessTokenParams_response = new URLSearchParams(accessTokenText)
    const finalAccessToken = accessTokenParams_response.get('oauth_token')
    const finalAccessTokenSecret = accessTokenParams_response.get('oauth_token_secret')
    const screenName = accessTokenParams_response.get('screen_name')
    const userId_twitter = accessTokenParams_response.get('user_id')
    
    if (!finalAccessToken || !finalAccessTokenSecret) {
      throw new Error('Invalid response from Twitter access token API')
    }

    // Store final tokens and remove temp data
    const { error: deleteError } = await supabase
      .from('user_social_connections')
      .delete()
      .eq('user_id', userId)
      .eq('platform', 'twitter_temp')

    if (deleteError) {
      console.error('Error deleting temp data:', deleteError)
    }

    const { error: insertError } = await supabase
      .from('user_social_connections')
      .upsert({
        user_id: userId,
        platform: 'twitter',
        access_token: finalAccessToken,
        refresh_token: finalAccessTokenSecret, // Store token secret as refresh token
        platform_user_id: userId_twitter,
        platform_username: screenName
      }, {
        onConflict: 'user_id,platform'
      })

    if (insertError) {
      console.error('Error storing final tokens:', insertError)
      throw insertError
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        username: screenName,
        message: 'Twitter connected successfully'
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