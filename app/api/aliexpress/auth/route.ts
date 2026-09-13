import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAliExpressAuthUrl, getStoredAliExpressToken } from '@/lib/aliexpress/auth';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: settings } = await supabase
      .from('store_settings')
      .select('aliexpress_access_token, aliexpress_token_expires_at')
      .limit(1)
      .maybeSingle();

    const isConnected = Boolean(settings?.aliexpress_access_token);
    const authUrl = getAliExpressAuthUrl();

    return NextResponse.json({
      success: true,
      isConnected,
      tokenExpiresAt: settings?.aliexpress_token_expires_at || null,
      authUrl
    });
  } catch (error) {
    logger.error('Error checking AliExpress auth status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve auth status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken, refreshToken, expiresIn } = body;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Access token is required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const expiresAt = expiresIn
      ? new Date(Date.now() + Number(expiresIn) * 1000).toISOString()
      : null;

    const { error } = await supabase
      .from('store_settings')
      .update({
        aliexpress_access_token: accessToken.trim(),
        aliexpress_refresh_token: refreshToken ? refreshToken.trim() : null,
        aliexpress_token_expires_at: expiresAt
      })
      .neq('storesettingsid', '00000000-0000-0000-0000-000000000000');

    if (error) {
      logger.error('Error saving AliExpress access token:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'AliExpress credentials updated successfully'
    });
  } catch (error) {
    logger.error('Failed to update AliExpress credentials:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
