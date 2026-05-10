import { NextResponse } from 'next/server';
import { config } from '@/lib/config';

export async function GET() {
  return NextResponse.json({
    hasAnthropicKey: !!config.anthropicKey,
    keyPrefix: config.anthropicKey.slice(0, 14) || 'empty',
    hasGeoapify: !!config.geoapifyKey,
  });
}
