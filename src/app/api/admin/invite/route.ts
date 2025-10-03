import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createClerkClient } from '@clerk/backend';
import { env } from '@/env';

export async function POST(request: NextRequest) {
  try {
    // Get the current user's auth session
    const authObj = await auth();
    const userId = authObj.userId;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate environment variables
    if (!env.CLERK_SECRET_KEY) {
      console.error('Missing CLERK_SECRET_KEY environment variable');
      return NextResponse.json({ error: 'Server configuration error: Missing Clerk secret key' }, { status: 500 });
    }

    // Initialize Clerk client
    const clerkClient = createClerkClient({
      secretKey: env.CLERK_SECRET_KEY,
    });

    // Check if the current user is a superadmin
    const user = await clerkClient.users.getUser(userId);
    const userRole = user.publicMetadata.role as string;
    
    console.log(`User ${userId} has role: ${userRole}`); // Debug log

    // if (userRole !== 'superadmin') {
    //   return NextResponse.json({ 
    //     error: 'Only superadmins can invite new admins', 
    //     userRole: userRole,  // Include actual role in error for debugging
    //     userId: userId 
    //   }, { status: 403 });
    // }

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Use the base URL from environment variables, with a fallback
    const baseUrl = env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    // Create an admin invitation via Clerk
    try {
      const invitation = await clerkClient.invitations.createInvitation({
        emailAddress: email,
        redirectUrl: `${baseUrl}/admin`,
        publicMetadata: {
          role: 'admin', // This will be the role for the invited user
        },
      });

      return NextResponse.json({
        success: true,
        invitationId: invitation.id,
      });
    } catch (clerkError: unknown) {
      console.error('Error creating invitation:', clerkError);
      // Type assertion to handle the error properly
      if (clerkError && typeof clerkError === 'object' && 'errors' in clerkError) {
        const clerkErrorWithErrors = clerkError as { errors?: Array<{ message: string }> };
        return NextResponse.json(
          { error: clerkErrorWithErrors.errors?.[0]?.message || 'Failed to create invitation' },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to create invitation' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in admin invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}