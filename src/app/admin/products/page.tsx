'use client';

import { useState, useRef, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Upload } from 'lucide-react';

export default function AdminProductsPage() {
  const { user, isLoaded } = useUser();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  type Product = {
    id: string;
    name: string;
    description: string | null;
    price: string;
    image_url: string;
    is_available: boolean;
    created_at: string;
  };

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (user && isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase!
            .from('user_roles')
            .select('role')
            .eq('clerk_user_id', user.id)
            .single();

          if (error) {
            console.error('Error fetching user role:', error);
          } else {
            setUserRole(data?.role || null);
          }
        } catch (err) {
          console.error('Error:', err);
        }
      }
    };

    const fetchProducts = async () => {
      if (!isSupabaseConfigured || !supabase) {
        console.error('Supabase is not configured');
        setLoadingProducts(false);
        return;
      }

      try {
        const { data, error } = await supabase!
          .from('products')
          .select('id, image_url, name, price, description, created_at, is_available')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching products:', error);
        } else {
          // Cast to Product type since we're selecting all required fields
          setProducts(data as Product[]);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoadingProducts(false);
      }
    };

    if (isLoaded && user) {
      fetchUserRole();
      fetchProducts();
    }
  }, [user, isLoaded]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!image) {
      setUploadError('Please select an image first');
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      // In a real implementation, we would upload to Supabase Storage and then
      // send the image to n8n/OpenAI for processing
      // For now, we'll call our n8n webhook endpoint directly with the image data
      
      // Get the filename from the file input
      const fileName = fileInputRef.current?.files?.[0]?.name || 'unknown_image.jpg';
      
      const response = await fetch('/api/openai/process-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: image, // This is the image data URL
          imageName: fileName, // Pass the original filename
        }),
      });

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = 'Failed to process image';
        try {
          const errorResult = await response.json();
          errorMessage = errorResult.error || errorResult.message || errorMessage;
        } catch (e) {
          console.error('Could not parse error response as JSON:', e);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        setUploadError(errorMessage);
        return;
      }

      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        console.error('Error parsing JSON response:', jsonError);
        setUploadError('Invalid response from server');
        return;
      }

      if (result.success) {
        setUploadSuccess(true);
        // Reset form
        setImage(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        // Show message if price needs verification
        if (result.message) {
          console.log('API message:', result.message);
          // Optionally show the message in the UI
          if (result.message.includes('verify the price manually')) {
            setUploadSuccess(result.message);
          }
        }
        
        // Refresh product list only if Supabase is configured
        if (isSupabaseConfigured && supabase) {
          const { data, error } = await supabase!
            .from('products')
            .select('id, image_url, name, price, description, created_at, is_available')
            .order('created_at', { ascending: false });

          if (!error) {
            setProducts(data as Product[]);
          }
        } else {
          console.error('Supabase is not configured for product refresh');
        }
      } else {
        setUploadError(result.error || 'Failed to process image');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError('An error occurred while uploading');
    } finally {
      setUploading(false);
    }
  };

  if (!isLoaded) {
    return <div className="container mx-auto py-8">Loading...</div>;
  }

  if (userRole !== 'admin') {
    return (
      <div className="container mx-auto py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p>Only regular admins can access this page. Superadmins do not have product management permissions.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Manage Products</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Add New Product</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Upload Product Image</label>
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {image ? (
                    <img 
                      src={image} 
                      alt="Preview" 
                      className="max-h-40 mx-auto rounded-md"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                      <Upload className="h-10 w-10 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-600">Click to upload an image of the product</p>
                      <p className="text-xs text-gray-500">The AI will extract product details automatically (price needs manual verification)</p>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              {uploadError && (
                <p className="text-red-500">{uploadError}</p>
              )}

              {uploadSuccess && (
                <p className="text-green-500">
                  {typeof uploadSuccess === 'string' ? uploadSuccess : 'Product processed successfully!'}
                </p>
              )}

              <Button 
                onClick={handleUpload} 
                disabled={uploading || !image}
                className="w-full"
              >
                {uploading ? 'Processing...' : 'Process Image & Extract Details'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Existing Products</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingProducts ? (
              <p>Loading products...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Image
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Available
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {products.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <img 
                            src={product.image_url} 
                            alt={product.name} 
                            className="h-10 w-10 object-cover rounded"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder-food.jpg';
                            }}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {product.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          Rp {parseInt(product.price).toLocaleString('id-ID')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                            ${product.is_available 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'}`}>
                            {product.is_available ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {product.description || 'No description available'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}