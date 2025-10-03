import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/env';
import { supabase } from '@/lib/supabase';
import { HfInference } from '@huggingface/inference';

// Initialize Hugging Face client
const hf = new HfInference(env.HUGGINGFACE_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image } = body; // image is expected to be a data URL

    if (!image) {
      return NextResponse.json({ error: 'Image is required' }, { status: 400 });
    }

    if (!env.HUGGINGFACE_API_KEY) {
      return NextResponse.json({ error: 'Hugging Face API key is not configured' }, { status: 500 });
    }

    // First, use Hugging Face image classification to identify the product
    try {
      // Using an image classification model to identify the food item
      const imageClassification = await hf.imageClassification({
        model: 'google/vit-base-patch16-224',
        data: image, // This should be the image data URL
      });

      // Get the most confident prediction
      const topPrediction = imageClassification?.[0];
      const predictedName = topPrediction?.label || 'Food Item';

      // Create a description based on the prediction
      const description = `Delicious ${predictedName.toLowerCase()} - a great addition to our menu.`;
      
      // For price estimation, we'll use a simple approach based on the food type
      // In a real implementation, you might want to use a more sophisticated approach
      const price = estimatePriceBasedOnFoodType(predictedName);

      // Insert the new product into the database
      const { data, error } = await supabase
        .from('products')
        .insert([
          {
            name: predictedName,
            description,
            price: price.toFixed(2), // Format price to 2 decimal places
            image_url: image, // Use the processed image URL
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
    } catch (imageError) {
      console.error('Error processing image with Hugging Face:', imageError);
      
      // Fallback: Use a simpler approach when image analysis fails
      try {
        // For fallback, we'll use a generic product name and description
        const name = 'Food Item'; // Generic name when classification fails
        const description = 'Delicious food item - description not available';
        const price = 10.99; // Default price if we can't estimate

        // Insert the new product into the database
        const { data, error } = await supabase
          .from('products')
          .insert([
            {
              name,
              description,
              price: price.toFixed(2),
              image_url: image,
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
      } catch (fallbackError) {
        console.error('Fallback image processing also failed:', fallbackError);
        return NextResponse.json(
          { error: 'Failed to process image with Hugging Face' },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error('Error in Hugging Face image processing:', error);
    return NextResponse.json(
      { error: 'Internal server error during image processing' },
      { status: 500 }
    );
  }
}

// Simple function to estimate price based on food type
function estimatePriceBasedOnFoodType(foodType: string): number {
  const foodTypePrices: Record<string, number> = {
    'Pizza': 15.99,
    'Burger': 9.99,
    'Salad': 8.99,
    'Pasta': 12.99,
    'Sushi': 18.99,
    'Steak': 25.99,
    'Sandwich': 7.99,
    'Soup': 6.99,
    'Dessert': 6.99,
    'Drink': 3.99,
  };

  const normalizedFoodType = foodType.toLowerCase();
  
  for (const [type, price] of Object.entries(foodTypePrices)) {
    if (normalizedFoodType.includes(type.toLowerCase())) {
      return price;
    }
  }
  
  // Default price range based on common food pricing
  return 10.99 + Math.random() * 10; // Random price between 10.99 and 20.99
}

export async function GET() {
  return NextResponse.json({ message: 'n8n webhook endpoint for product creation with Hugging Face' });
}