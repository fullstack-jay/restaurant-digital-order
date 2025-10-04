import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// Xendit Webhook Handler
export async function POST(request: NextRequest) {
  try {
    console.log('Xendit webhook received');
    
    // Get raw body for signature verification
    const rawBody = await request.text();
    
    console.log('Xendit Webhook Headers:', Object.fromEntries(request.headers));
    console.log('Raw Body:', rawBody);
    
    // Check if XENDIT_WEBHOOK_SECRET is set
    if (!process.env.XENDIT_WEBHOOK_SECRET) {
      console.error('XENDIT_WEBHOOK_SECRET is not set in environment variables');
    } else {
      console.log('XENDIT_WEBHOOK_SECRET is set');
    }
    
    // In production, we require signature verification for security
    // In development, we allow bypass for testing purposes
    if (process.env.NODE_ENV === 'production') {
      // Verify webhook signature - Xendit uses 'x-callback-token' header for invoice webhooks
      // We'll check multiple possible header names Xendit might use
      const signature = request.headers.get('x-callback-token') || 
                       request.headers.get('x-xendit-signature') ||
                       request.headers.get('X-Callback-Token') || 
                       request.headers.get('X-Xendit-Signature');
      
      if (!signature) {
        console.error('Missing Xendit signature header in production. Available headers:', Object.fromEntries(request.headers));
        return NextResponse.json(
          { error: 'Missing signature header' },
          { status: 400 }
        );
      }
      
      // Verify the signature using Xendit's method
      const isSignatureValid = await verifyXenditSignature(rawBody, signature);
      if (!isSignatureValid) {
        console.error('Invalid Xendit signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    } else {
      // For development environment, allow requests without signature for testing
      const signature = request.headers.get('x-callback-token') || 
                       request.headers.get('x-xendit-signature') ||
                       request.headers.get('X-Callback-Token') || 
                       request.headers.get('X-Xendit-Signature');
      
      if (signature) {
        console.log('Signature header found, attempting verification');
        const isSignatureValid = await verifyXenditSignature(rawBody, signature);
        if (!isSignatureValid) {
          console.warn('Invalid Xendit signature in development mode, continuing anyway for testing');
          // In development, continue processing even with invalid signature for testing
        } else {
          console.log('Signature verification successful');
        }
      } else {
        console.warn('No signature header found, continuing in development mode for testing');
      }
    }
    
    // Parse the webhook payload
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('Error parsing webhook payload:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in webhook payload' },
        { status: 400 }
      );
    }
    
    // Log the entire payload for debugging
    console.log('Xendit Webhook Payload:', payload);
    
    // Check if Supabase is properly configured
    if (!isSupabaseConfigured || !supabase) {
      console.error('Supabase is not configured for webhook processing');
      return NextResponse.json(
        { error: 'Database configuration error' },
        { status: 500 }
      );
    }

    console.log('Processing webhook with status:', payload.status);
    
    // Check if this is a paid invoice
    if (payload.status === 'PAID') {
      const externalId = payload.external_id;
      console.log('Processing PAID status for external_id:', externalId);
      
      // Extract order ID from external_id (format: order_123e4567-e89b-12d3-a456-426614174000)
      const orderId = externalId.replace('order_', '');
      console.log('Extracted order ID:', orderId);
      
      // Update order status in the database
      const { error, data } = await supabase!
        .from('orders')
        .update({ 
          status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select(); // Add select to return updated record

      if (error) {
        console.error('Error updating order status:', error);
        return NextResponse.json(
          { error: 'Failed to update order status' },
          { status: 500 }
        );
      }

      console.log(`Order ${orderId} status updated to paid. Updated record:`, data);
      return NextResponse.json({ success: true, message: `Order ${orderId} status updated to paid` });
    } 
    // Handle other statuses if needed
    else if (payload.status === 'EXPIRED' || payload.status === 'FAILED') {
      const externalId = payload.external_id;
      const orderId = externalId.replace('order_', '');
      console.log(`Processing ${payload.status} status for external_id:`, externalId, 'Order ID:', orderId);
      
      // Update order status for expired/failed payments
      const { error, data } = await supabase!
        .from('orders')
        .update({ 
          status: payload.status.toLowerCase(),
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select(); // Add select to return updated record

      if (error) {
        console.error('Error updating order status for failed payment:', error);
        return NextResponse.json(
          { error: 'Failed to update order status' },
          { status: 500 }
        );
      }

      console.log(`Order ${orderId} status updated to ${payload.status.toLowerCase()}. Updated record:`, data);
      return NextResponse.json({ success: true, message: `Order ${orderId} status updated to ${payload.status.toLowerCase()}` });
    } 
    else {
      // For other statuses, just acknowledge
      console.log(`Received webhook for order ${payload.external_id} with status: ${payload.status}`);
      return NextResponse.json({ 
        success: true, 
        message: `Received webhook for status: ${payload.status}`,
        acknowledged: true
      });
    }
  } catch (error) {
    console.error('Xendit webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Export a GET route handler for webhook verification (some services check this)
export async function GET() {
  return NextResponse.json({ message: 'Xendit webhook endpoint' });
}

import { createHmac } from 'crypto';

// Helper function to verify Xendit signature
async function verifyXenditSignature(rawBody: string, signature: string): Promise<boolean> {
  // In production, we must verify the signature for security
  // This requires the Xendit webhook secret to be set in the environment
  if (!process.env.XENDIT_WEBHOOK_SECRET) {
    console.error('XENDIT_WEBHOOK_SECRET is not set in environment');
    return false;
  }

  try {
    // Use crypto to verify the signature
    // Xendit calculates signature using HMAC SHA256 of the raw body with the webhook secret
    const expectedSignature = createHmac('sha256', process.env.XENDIT_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('base64');

    return signature === expectedSignature;
  } catch (error) {
    console.error('Error in signature verification:', error);
    return false;
  }
}