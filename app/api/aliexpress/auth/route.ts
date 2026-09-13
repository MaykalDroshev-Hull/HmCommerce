import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAliExpressAuthUrl, getStoredAliExpressToken } from '@/lib/aliexpress/auth';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: settings } = await supabase
      .from('store_settings')
      .select('aliexpress_access_token, aliexpress_token_expires_at, gemini_api_key')
      .limit(1)
      .maybeSingle();

    const isConnected = Boolean(settings?.aliexpress_access_token);
    const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY || settings?.gemini_api_key);
    const authUrl = getAliExpressAuthUrl();

    return NextResponse.json({
      success: true,
      isConnected,
      tokenExpiresAt: settings?.aliexpress_token_expires_at || null,
      hasGeminiKey,
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
    const { accessToken, refreshToken, expiresIn, geminiApiKey } = body;

    const supabase = createServerClient();
    const updateData: Record<string, any> = {};

    if (geminiApiKey !== undefined) {
      updateData.gemini_api_key = geminiApiKey.trim();
    }

    if (accessToken) {
      const expiresAt = expiresIn
        ? new Date(Date.now() + Number(expiresIn) * 1000).toISOString()
        : null;
      updateData.aliexpress_access_token = accessToken.trim();
      if (refreshToken) updateData.aliexpress_refresh_token = refreshToken.trim();
      if (expiresAt) updateData.aliexpress_token_expires_at = expiresAt;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No configuration provided to update' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('store_settings')
      .update(updateData)
      .neq('storesettingsid', '00000000-0000-0000-0000-000000000000');

    if (error) {
      logger.error('Error saving settings:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Configuration updated successfully'
    });
  } catch (error) {
    logger.error('Failed to update AliExpress credentials:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
