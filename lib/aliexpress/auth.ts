import crypto from 'crypto';
import { createServerClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export const ALIEXPRESS_CONFIG = {
  appKey: process.env.ALIEXPRESS_APP_KEY || '546324',
  appSecret: process.env.ALIEXPRESS_APP_SECRET || '0wUdqT6XZKduDfjqxixtIsqToOSvyXz',
  redirectUri: process.env.ALIEXPRESS_REDIRECT_URI || 'https://mb-paws.co.uk/api/aliexpress/callback',
  authUrl: 'https://api-sg.aliexpress.com/oauth/authorize',
  tokenUrl: 'https://api-sg.aliexpress.com/rest',
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
    sp: 'ae',
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
    const appKey = ALIEXPRESS_CONFIG.appKey;
    const appSecret = ALIEXPRESS_CONFIG.appSecret;
    const apiPath = '/auth/token/create';

    const params: Record<string, string> = {
      app_key: appKey,
      timestamp: String(Date.now()),
      sign_method: 'sha256',
      code: code.trim()
    };

    // Sort alphabetically by ASCII key
    const sortedKeys = Object.keys(params).sort();
    let baseString = apiPath;
    for (const key of sortedKeys) {
      baseString += key + params[key];
    }

    const sign = crypto
      .createHmac('sha256', appSecret)
      .update(baseString)
      .digest('hex')
      .toUpperCase();

    const queryParams = new URLSearchParams({
      ...params,
      sign
    });

    const response = await fetch(`${ALIEXPRESS_CONFIG.apiGateway}${apiPath}?${queryParams.toString()}`, {
      method: 'POST'
    });

    const rawData = await response.json();
    logger.info('AliExpress token creation response:', rawData);

    // Some responses wrap data in gopResponseBody (JSON string)
    let payload = rawData;
    if (rawData.gopResponseBody) {
      try {
        payload = JSON.parse(rawData.gopResponseBody);
      } catch (e) {
        logger.warn('Could not parse gopResponseBody:', e);
      }
    }

    const accessToken = payload.access_token || rawData.access_token;
    const refreshToken = payload.refresh_token || rawData.refresh_token;
    const expiresIn = payload.expires_in || rawData.expires_in;
    const userId = payload.user_id || rawData.user_id;
    const userNick = payload.user_nick || rawData.user_nick;

    if (accessToken) {
      const supabase = createServerClient();
      const expiresAt = expiresIn
        ? new Date(Date.now() + Number(expiresIn) * 1000).toISOString()
        : null;

      await supabase
        .from('store_settings')
        .update({
          aliexpress_access_token: accessToken,
          aliexpress_refresh_token: refreshToken || null,
          aliexpress_token_expires_at: expiresAt
        })
        .neq('storesettingsid', '00000000-0000-0000-0000-000000000000'); // update active settings row

      return {
        accessToken,
        refreshToken,
        expiresIn: Number(expiresIn) || undefined,
        userId: String(userId || ''),
        userNick: String(userNick || '')
      };
    }

    logger.error('Failed to exchange AliExpress code for token:', rawData);
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
