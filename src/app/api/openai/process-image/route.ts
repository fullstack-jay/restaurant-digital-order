import { NextRequest, NextResponse } from 'next/server';
import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';

// Create OpenRouter client using the OpenAI-compatible interface
const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image, imageName } = body;

    if (!image) {
      return NextResponse.json(
        { error: 'Image is required.' },
        { status: 400 }
      );
    }

    // Validate OpenRouter API key
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured. Please add OPENROUTER_API_KEY to your environment variables.' },
        { status: 500 }
      );
    }

    // Extract product name and price from image filename when format is "name price"
    let extractedName: string | null = null;
    let extractedPrice: number | null = null;
    
    if (imageName) {
      // Remove file extension
      const nameWithoutExt = (imageName as string).replace(/\.[^/.]+$/, '');
      
      // Look for pattern "name price" at the end of the filename
      // This regex looks for any text followed by a number at the end
      const match = nameWithoutExt.match(/^(.*?)\s+(\d{3,})$/); 
      
      if (match) {
        // Extract the name part and price part
        extractedName = match[1]
          .replace(/[_-]/g, ' ') // Replace underscores and hyphens with spaces
          .replace(/\b\w/g, (l: string) => l.toUpperCase()) // Capitalize first letter of each word
          .trim();
        extractedPrice = parseInt(match[2], 10);
      }
    }

    // Convert data URL to base64 if necessary
    let imageData = image;
    if (image.startsWith('data:')) {
      // Data URL format: data:image/jpeg;base64,encoded_data
      const base64Data = image.split(',')[1];
      imageData = base64Data;
    }

    let object: {
      name: string;
      description: string;
      estimated_price_idr: number;
    };
    
    if (extractedName && extractedPrice !== null) {
      // If we extracted name and price from filename, use AI only for description
      const result = await generateObject({
        model: openrouter('gpt-4o-mini'), // Updated to use correct OpenRouter model identifier
        schema: z.object({
          description: z.string().describe('A short description of the food item (maximum 50 words)'),
        }),
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze the food image provided and create a short description in Indonesian (maximum 50 words) for the dish. The dish is called "${extractedName}". Describe its ingredients, appearance, and taste. The description should be in Indonesian. Always respond in JSON format with only the description field.`,
              },
              {
                type: 'image',
                image: imageData, // This will be the base64 encoded image
              },
            ],
          },
        ],
        temperature: 0.7,
      });
      
      object = {
        name: extractedName,
        description: result.object.description,
        estimated_price_idr: extractedPrice,
      };
    } else {
      // If we couldn't extract from filename, use the original approach
      let fileNameHint = '';
      if (imageName) {
        // Remove file extension and format the name
        const cleanName = (imageName as string)
          .replace(/[_-]/g, ' ') // Replace underscores and hyphens with spaces
          .replace(/\b\w/g, (l: string) => l.toUpperCase()); // Capitalize first letter of each word
        fileNameHint = `The filename suggests this might be "${cleanName}". Use this as a hint but verify with the image content.`;
      }

      // Use OpenRouter Vision API to analyze the image
      // Using a vision-capable model from OpenRouter 
      const result = await generateObject({
        model: openrouter('gpt-4o-mini'), // Updated to use correct OpenRouter model identifier
        schema: z.object({
          name: z.string().describe('The name of the food item'),
          description: z.string().describe('A short description of the food item (maximum 50 words)'),
          estimated_price_idr: z.number().describe('Estimated price in Indonesian Rupiah (IDR)'),
        }),
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze the food image provided and identify the dish name and describe it. ${fileNameHint} Use the filename as additional context to help estimate the price range: if the filename matches the dish, use common Indonesian market pricing for this type of food. For example: Nasi Goreng (IDR 15,000-30,000), Bakso (IDR 10,000-25,000), Sate (IDR 20,000-40,000), etc. Provide a reasonable price estimate based on Indonesian market prices. Name the dish in Indonesian language. The description should be in Indonesian and maximum 50 words. Always respond in JSON format.`,
              },
              {
                type: 'image',
                image: imageData, // This will be the base64 encoded image
              },
            ],
          },
        ],
        temperature: 0.7,
      });
      
      object = result.object;
    }

    // Save to Supabase
    const { data, error } = await supabase
      .from('products')
      .insert([
        {
          name: object.name,
          description: object.description,
          price: object.estimated_price_idr.toString(),
          image_url: image,
          is_available: true,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('❌ Error inserting product:', error);
      return NextResponse.json(
        { error: 'Failed to add product to database.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      product: {
        id: data.id,
        name: data.name,
        description: data.description,
        price: object.estimated_price_idr,
        image_url: data.image_url,
      },
      message: extractedPrice !== null 
        ? `Product created successfully. Name and price extracted from filename: "${extractedName}" at Rp ${extractedPrice.toLocaleString('id-ID')}. Description generated from image analysis.` 
        : object.estimated_price_idr === 0 
          ? 'Product created successfully. Price was uncertain, please verify the price manually. (AI could not confidently estimate price based on image and filename.)' 
          : `Product created successfully. Estimated price: Rp ${object.estimated_price_idr.toLocaleString('id-ID')}. Please verify this matches current market prices.`,
    });
  } catch (error) {
    console.error('❌ Error in OpenRouter image processing:', error);
    
    // Enhanced error handling to catch various response types from OpenRouter
    if (error instanceof Error) {
      const errorMessage = error.message;
      
      // Check if error message looks like HTML content
      if (typeof errorMessage === 'string' && 
          (errorMessage.includes('<!DOCTYPE') || 
           errorMessage.includes('<html') || 
           errorMessage.includes('<head') || 
           errorMessage.includes('<body') ||
           errorMessage.startsWith('<'))) {
        return NextResponse.json(
          { 
            error: 'OpenRouter returned an HTML error page',
            message: 'OpenRouter API returned HTML instead of JSON. This could indicate an API issue, invalid API key, or rate limiting. Please verify your OpenRouter API key and check OpenRouter status.'
          },
          { status: 500 }
        );
      }
      
      // Check for common error patterns
      if (errorMessage.toLowerCase().includes('internal server') || 
          errorMessage.toLowerCase().includes('internal s')) { // matches "Internal S" from your error
        return NextResponse.json(
          { 
            error: 'Internal Server Error from OpenRouter',
            message: 'OpenRouter API encountered an internal server error. This may be temporary. Please try again later or verify your API configuration.'
          },
          { status: 500 }
        );
      }
      
      // Handle AI SDK specific error properties
      if ('responseBody' in error && typeof error.responseBody === 'string') {
        // If the response body is HTML
        if (error.responseBody.includes('<!DOCTYPE') || 
            error.responseBody.includes('<html')) {
          return NextResponse.json(
            { 
              error: 'OpenRouter returned HTML error page',
              message: 'OpenRouter API returned an HTML error page instead of JSON. Please verify your API key and endpoint settings.',
              details: 'HTML response detected'
            },
            { status: 500 }
          );
        }
        
        // Otherwise return the response body
        return NextResponse.json(
          { 
            error: 'OpenRouter API error',
            message: error.message,
            details: error.responseBody
          },
          { status: 500 }
        );
      }
      
      // Return standard error
      return NextResponse.json(
        { 
          error: 'Processing error',
          message: error.message
        },
        { status: 500 }
      );
    } else if (typeof error === 'string') {
      // If the error is just a string
      if (error.includes('<!DOCTYPE') || error.includes('<html') || error.startsWith('<')) {
        return NextResponse.json(
          { 
            error: 'OpenRouter returned HTML error',
            message: 'OpenRouter returned HTML content instead of JSON. Please verify your API configuration.'
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'Processing error',
          message: error
        },
        { status: 500 }
      );
    } else {
      // Generic error
      return NextResponse.json(
        { 
          error: 'Unknown error during OpenRouter processing',
          message: 'An unexpected error occurred while processing the image. Please try again later.'
        },
        { status: 500 }
      );
    }
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'API endpoint for processing food images with OpenRouter Vision API',
  });
}