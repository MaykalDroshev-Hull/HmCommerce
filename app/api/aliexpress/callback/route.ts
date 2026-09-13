import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken } from '@/lib/aliexpress/auth';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const origin = request.nextUrl.origin || 'http://localhost:3000';

  if (error) {
    logger.error('AliExpress OAuth authorization rejected:', error);
    return NextResponse.redirect(`${origin}/admin/dropshipping?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/admin/dropshipping?error=no_code_provided`);
  }

  try {
    const tokenResult = await exchangeCodeForToken(code);
    if (tokenResult) {
      return NextResponse.redirect(`${origin}/admin/dropshipping?status=connected`);
    } else {
      return NextResponse.redirect(`${origin}/admin/dropshipping?error=token_exchange_failed`);
    }
  } catch (err: any) {
    logger.error('Error during AliExpress OAuth callback:', err);
    return NextResponse.redirect(`${origin}/admin/dropshipping?error=${encodeURIComponent(err.message || 'unknown_error')}`);
  }
}
