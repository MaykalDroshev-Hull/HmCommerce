import { createServerClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export const ALIEXPRESS_CONFIG = {
  appKey: process.env.ALIEXPRESS_APP_KEY || '546324',
  appSecret: process.env.ALIEXPRESS_APP_SECRET || '0wUdqT6XZKduDfjqxixtIsqToOSvyXz',
  redirectUri: process.env.ALIEXPRESS_REDIRECT_URI || 'https://mb-paws.co.uk/api/aliexpress/callback',
  authUrl: 'https://oauth.aliexpress.com/authorize',
  tokenUrl: 'https://oauth.aliexpress.com/token',
  apiGateway: 'https://api-sg.aliexpress.com/rest'
};

/**
 * Generate OAuth authorization URL to connect seller/dropshipper AliExpress account
 */
export function getAliExpressAuthUrl(customRedirectUri?: string): string {
  const redirectUri = customRedirectUri || ALIEXPRESS_CONFIG.redirectUri;
  const params = new URLSearchParams({
    response_type: 'code',
    force_auth: 'true',
    redirect_uri: redirectUri,
    client_id: ALIEXPRESS_CONFIG.appKey,
    view: 'web'
  });

  return `${ALIEXPRESS_CONFIG.authUrl}?${params.toString()}`;
}

/**
 * Exchange OAuth authorization code for Access Token & Refresh Token
 */
export async function exchangeCodeForToken(code: string, customRedirectUri?: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  userId?: string;
  userNick?: string;
} | null> {
  try {
    const redirectUri = customRedirectUri || ALIEXPRESS_CONFIG.redirectUri;
    const bodyParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code.trim(),
      client_id: ALIEXPRESS_CONFIG.appKey,
      client_secret: ALIEXPRESS_CONFIG.appSecret,
      redirect_uri: redirectUri
    });

    const response = await fetch(ALIEXPRESS_CONFIG.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: bodyParams.toString()
    });

    const data = await response.json();

    if (data.access_token) {
      // Save tokens to store_settings in Supabase
      const supabase = createServerClient();
      const expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : null;

      await supabase
        .from('store_settings')
        .update({
          aliexpress_access_token: data.access_token,
          aliexpress_refresh_token: data.refresh_token || null,
          aliexpress_token_expires_at: expiresAt
        })
        .neq('storesettingsid', '00000000-0000-0000-0000-000000000000'); // update active settings row

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        userId: data.user_id,
        userNick: data.user_nick
      };
    }

    logger.error('Failed to exchange AliExpress code for token:', data);
    return null;
  } catch (error) {
    logger.error('Error exchanging AliExpress token:', error);
    return null;
  }
}

/**
 * Retrieve current active access token from database
 */
export async function getStoredAliExpressToken(): Promise<string | null> {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('store_settings')
      .select('aliexpress_access_token, aliexpress_token_expires_at')
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return data.aliexpress_access_token || null;
  } catch (error) {
    logger.error('Error fetching stored AliExpress token:', error);
    return null;
  }
}
