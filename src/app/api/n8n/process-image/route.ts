import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/env';
import { supabase } from '@/lib/supabase';
import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

// Initialize OpenAI with the vision model
const openai = createOpenAI({
  apiKey: env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image } = body; // image is expected to be a data URL

    if (!image) {
      return NextResponse.json({ error: 'Image is required' }, { status: 400 });
    }

    // Process the image using OpenAI Vision API to extract product details
    // The image is expected to be a data URL (e.g., "data:image/jpeg;base64,...")
    
    const result = await generateObject({
      model: openai('gpt-4-vision-preview'), // Using GPT-4 Vision model
      schema: z.object({
        name: z.string().describe('The name of the product'),
        description: z.string().describe('A short description of the product'),
        price: z.number().describe('The price of the product'),
      }),
      prompt: 'Analyze this image and extract the product information. Return the product name, a short description, and the price. If the price is not visible in the image, make a reasonable estimate based on the type of product.',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'What product is shown in this image? Please provide the name, description, and price.' },
            { type: 'image', image: image },
          ],
        },
      ],
    });

    // Extract the product information from the AI response
    const { name, description, price } = result.object;

    // In a real implementation, we would upload the image to Supabase Storage
    // For now, we'll assume the image is stored somewhere and use a placeholder URL
    // In reality, you'd save the image to Supabase storage and get a URL
    
    // For demo purposes, we'll use a placeholder image URL
    const imageUrl = '/placeholder-food.jpg'; // In real app, you'd upload to Supabase Storage

    // Insert the new product into the database
    const { data, error } = await supabase
      .from('products')
      .insert([
        {
          name,
          description,
          price: price.toFixed(2), // Format price to 2 decimal places
          image_url: imageUrl,
          is_available: true,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error inserting product:', error);
      return NextResponse.json({ error: 'Failed to add product to database' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      product: {
        id: data.id,
        name: data.name,
        description: data.description,
        price: parseFloat(data.price),
        image_url: data.image_url,
      },
    });
  } catch (error) {
    console.error('Error processing image with OpenAI:', error);
    return NextResponse.json(
      { error: 'Failed to process image with AI' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: 'n8n webhook endpoint for product creation' });
}