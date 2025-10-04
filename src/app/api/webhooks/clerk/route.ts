import { Webhook, WebhookRequiredHeaders } from 'svix';
import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/env';
import { supabase } from '@/lib/supabase';
import { createClerkClient } from '@clerk/backend';

export async function POST(req: NextRequest) {
  // Get headers from the request in middleware
  const svix_id = req.headers.get('svix-id')!;
  const svix_timestamp = req.headers.get('svix-timestamp')!;
  const svix_signature = req.headers.get('svix-signature')!;

  // Validate webhook headers
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Webhook header validation failed', { status: 400 });
  }

  // Get raw body for signature verification
  const payload = await req.text();
  const headerPayload = {
    'svix-id': svix_id,
    'svix-timestamp': svix_timestamp,
    'svix-signature': svix_signature,
  };

  // Define the specific types for user data we expect in the webhook
  type UserData = {
    id: string;
    email_addresses?: Array<{
      email_address: string;
    }>;
  };

  // Define the type for Clerk webhook events
  type WebhookEvent = {
    data: UserData;
    object: string;
    type: string;
  };

  // Verify webhook signature
  const wh = new Webhook(env.CLERK_WEBHOOK_SECRET);

  let evt: WebhookEvent;
  try {
    evt = wh.verify(payload, headerPayload as WebhookRequiredHeaders) as WebhookEvent;
  } catch (err: unknown) {
    console.error('Webhook verification error:', err);
    return new Response('Webhook verification failed', { status: 400 });
  }

  const userId = evt.data.id;
  const eventType = evt.type;

  if (eventType === 'user.created') {
    try {
      // Check if user_roles table is empty to determine if this is the first user
      const { count, error } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('Error checking user_roles table:', error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }

      // Determine user role
      let role: 'superadmin' | 'admin' = 'admin';
      
      // If the user_roles table is empty, this is the first user - make them a superadmin
      if (count === 0) {
        role = 'superadmin';
      } else {
        // For additional users, check the limit for regular admins only (not counting superadmin)
        const { count: adminCount, error: adminError } = await supabase
          .from('user_roles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'admin'); // Count only regular admins

        if (adminError) {
          console.error('Error checking admin count:', adminError);
          return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        // Limit to 5 regular admin accounts maximum (superadmin doesn't count toward limit)
        const maxAdmins = 5;
        
        // Check if we've reached the maximum number of regular admins
        if ((adminCount ?? 0) >= maxAdmins) {
          console.log(`Maximum admin limit (${maxAdmins}) reached. User ${userId} denied admin access.`);
          
          // Return error response to indicate access denied
          return NextResponse.json({ 
            error: 'Maximum admin limit reached', 
            message: `Only ${maxAdmins} admin accounts are allowed (superadmin does not count toward limit)` 
          }, { status: 400 });
        }
      }

      // Insert user role into database
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert([
          {
            clerk_user_id: userId,
            role,
          },
        ]);

      if (insertError) {
        console.error('Error inserting user role:', insertError);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }

      // Initialize Clerk client  
      const clerkClient = createClerkClient({
        secretKey: env.CLERK_SECRET_KEY,
      });

      // Set user's public metadata
      try {
        await clerkClient.users.updateUserMetadata(userId, {
          publicMetadata: {
            role,
          },
        });
        console.log(`User ${userId} assigned role: ${role}`);
      } catch (metadataError) {
        console.error('Error updating user metadata:', metadataError);
        return NextResponse.json({ error: 'Failed to assign role to user' }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    } catch (error: unknown) {
      console.error('Error processing user creation:', error);
      return NextResponse.json({ error: 'Processing error' }, { status: 500 });
    }
  }

  // Handle other event types if needed
  console.log(`Received event: ${eventType}`);
  return NextResponse.json({ success: true });
}

export async function GET() {
  return NextResponse.json({ message: 'Clerk webhook endpoint' });
}