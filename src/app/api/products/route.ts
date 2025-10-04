import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export async function GET(_request: NextRequest) {
  try {
    // Check if Supabase is properly configured
    if (!isSupabaseConfigured || !supabase) {
      console.error('Supabase is not configured');
      return NextResponse.json(
        { error: 'Database configuration error' },
        { status: 500 }
      );
    }

    // Get all products that are available
    const { data, error } = await supabase!
      .from('products')
      .select('*')
      .eq('is_available', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching products:', error);
      return NextResponse.json(
        { error: 'Failed to fetch products' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Unexpected error fetching products:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}