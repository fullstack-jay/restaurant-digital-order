'use client';

import { useCart } from '@/contexts/CartContext';
import { useEffect, useState } from 'react';

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: string; // Will be converted to number
  image_url: string;
  is_available: boolean;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products');
        if (response.ok) {
          const data = await response.json();
          setProducts(data);
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

  if (loading) {
    return <div className="container mx-auto py-8 text-center">Loading menu items...</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">Our Menu</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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
              <h2 className="text-xl font-semibold mb-2 text-gray-800">{product.name}</h2>
              <p className="text-gray-600 mb-3 text-sm min-h-[50px]">
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
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}