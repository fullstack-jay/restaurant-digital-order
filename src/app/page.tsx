"use client";

import { useCart } from '@/contexts/CartContext';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import Image from 'next/image';

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: string; // Will be converted to number
  image_url: string;
  is_available: boolean;
};

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart, cartCount } = useCart();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products');
        if (response.ok) {
          const data = await response.json();
          // Take only first 4 products for the homepage
          setProducts(data.slice(0, 4));
        } else {
          console.error('Failed to fetch products');
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="py-4 px-4 sm:px-6">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Image
              src="/codeguide-logo.png"
              alt="Logo"
              width={40}
              height={40}
              className="rounded-xl"
            />
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
              Restaurant Order
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link href="/cart" className="relative">
              <Button variant="outline" size="sm">
                Cart ({cartCount})
              </Button>
            </Link>
            
            <SignedOut>
              <SignInButton>
                <Button size="sm">Sign In</Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
            
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="text-center py-12 sm:py-16 px-4">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent mb-4">
          Delicious Food, Delivered
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Discover our delicious menu and enjoy the convenience of digital ordering
        </p>
        
        <Link href="/products">
          <Button size="lg" className="px-8 py-3 text-lg">
            View Menu
          </Button>
        </Link>
      </div>

      {/* Featured Products */}
      <div className="container mx-auto px-4 pb-12 sm:pb-8 max-w-5xl">
        <h2 className="text-2xl font-bold text-center mb-8 text-gray-800">Featured Items</h2>
        
        {loading ? (
          <div className="text-center">Loading menu items...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <div 
                key={product.id} 
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
              >
                <img 
                  src={product.image_url} 
                  alt={product.name} 
                  className="w-full h-48 object-cover"
                  onError={(e) => {
                    // Set a default image if the image fails to load
                    (e.target as HTMLImageElement).src = '/placeholder-food.jpg';
                  }}
                />
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-2 text-gray-800">{product.name}</h3>
                  <p className="text-gray-600 mb-3 text-sm min-h-[40px]">
                    {product.description || 'No description available'}
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-blue-600">
                      ${parseFloat(product.price).toFixed(2)}
                    </span>
                    <button
                      onClick={() => 
                        addToCart({
                          id: product.id,
                          name: product.name,
                          description: product.description,
                          price: parseFloat(product.price),
                          imageUrl: product.image_url,
                        })
                      }
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md transition-colors duration-200"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="text-center mt-10">
          <Link href="/products">
            <Button variant="outline" size="lg">
              View Full Menu
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
