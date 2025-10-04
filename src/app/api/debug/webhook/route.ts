import { NextRequest, NextResponse } from 'next/server';

// Debug webhook endpoint to test incoming requests
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    
    console.log('Debug Webhook - Headers:', Object.fromEntries(request.headers));
    console.log('Debug Webhook - Raw Body:', rawBody);
    
    try {
      const payload = JSON.parse(rawBody);
      console.log('Debug Webhook - Parsed Payload:', payload);
    } catch (e) {
      console.error('Debug Webhook - Could not parse payload:', e);
    }
    
    return NextResponse.json({
      received: true,
      headers: Object.fromEntries(request.headers),
      bodyLength: rawBody.length,
    });
  } catch (error) {
    console.error('Debug Webhook Error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}