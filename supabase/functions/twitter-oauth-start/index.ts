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

function generateOAuthHeader(method: string, url: string, additionalParams: Record<string, string> = {}): string {
  const oauthParams = {
    oauth_consumer_key: CONSUMER_KEY!,
    oauth_nonce: Math.random().toString(36).substring(2),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: "1.0",
    ...additionalParams
  }

  const signature = generateOAuthSignature(method, url, oauthParams, CONSUMER_SECRET!)

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
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const userResponse = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (userResponse.error || !userResponse.data.user) {
      throw new Error('Invalid user token')
    }

    const userId = userResponse.data.user.id

    // Step 1: Get request token from Twitter
    const requestTokenUrl = 'https://api.twitter.com/oauth/request_token'
    const callbackUrl = 'https://preview--feed-genesis.lovable.app/x-manage'
    
    const requestTokenParams = {
      oauth_callback: callbackUrl
    }
    
    const requestTokenHeader = generateOAuthHeader('POST', requestTokenUrl, requestTokenParams)
    
    const requestTokenResponse = await fetch(requestTokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': requestTokenHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `oauth_callback=${encodeURIComponent(callbackUrl)}`
    })

    if (!requestTokenResponse.ok) {
      const errorText = await requestTokenResponse.text()
      console.error('Request token error:', errorText)
      throw new Error(`Failed to get request token: ${errorText}`)
    }

    const requestTokenText = await requestTokenResponse.text()
    console.log('Request token response:', requestTokenText)
    
    const requestTokenParams_response = new URLSearchParams(requestTokenText)
    const oauthToken = requestTokenParams_response.get('oauth_token')
    const oauthTokenSecret = requestTokenParams_response.get('oauth_token_secret')
    
    if (!oauthToken || !oauthTokenSecret) {
      throw new Error('Invalid response from Twitter request token API')
    }

    // Store temporary tokens
    const { error } = await supabase
      .from('user_social_connections')
      .upsert({
        user_id: userId,
        platform: 'twitter_temp',
        access_token: JSON.stringify({ 
          oauth_token: oauthToken,
          oauth_token_secret: oauthTokenSecret
        })
      }, {
        onConflict: 'user_id,platform'
      })

    if (error) {
      console.error('Error storing OAuth data:', error)
      throw error
    }

    // Build authorization URL
    const authUrl = `https://api.twitter.com/oauth/authenticate?oauth_token=${oauthToken}`

    return new Response(
      JSON.stringify({ 
        authUrl: authUrl,
        oauth_token: oauthToken
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error in twitter-oauth-start:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})