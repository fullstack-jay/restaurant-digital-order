'use client';

import { useCart } from '@/contexts/CartContext';
import { useState, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function CheckoutPage() {
  const { state, cartTotal, clearCart } = useCart();
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!customerName.trim()) {
      setError('Please enter your name');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Calculate total with tax
      const totalWithTax = cartTotal * 1.1;

      // Prepare order data
      const orderData = {
        customerName,
        email: customerEmail,
        items: state.items.map(item => ({
          productId: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        totalAmount: totalWithTax,
      };

      // Send cart details to the checkout API
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (response.ok) {
        const { invoiceUrl } = await response.json();
        
        // Clear the cart after successful checkout initiation
        clearCart();
        
        // Redirect to Xendit payment page
        window.location.href = invoiceUrl;
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to process checkout');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  // Calculate tax
  const tax = cartTotal * 0.1;

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
          
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {state.items.map((item) => (
              <div key={item.id} className="p-4 border-b border-gray-200 flex items-center">
                <img 
                  src={item.imageUrl} 
                  alt={item.name} 
                  className="w-16 h-16 object-cover rounded-md mr-4"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder-food.jpg';
                  }}
                />
                <div className="flex-1">
                  <h3 className="font-semibold">{item.name}</h3>
                  <p className="text-gray-600 text-sm">Rp {Math.round(item.price).toLocaleString('id-ID')} x {item.quantity}</p>
                </div>
                <div className="w-24 text-right font-semibold">
                  Rp {Math.round(item.price * item.quantity).toLocaleString('id-ID')}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 bg-white rounded-lg shadow-md p-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>Rp {Math.round(cartTotal).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>Rp {Math.round(tax).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200">
                <span>Total</span>
                <span>Rp {Math.round(cartTotal + tax).toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-4">Customer Information</h2>
          
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
            <div className="mb-4">
              <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your full name"
              />
            </div>
             <div className="mb-4">
              <label htmlFor="customerEmail" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="text"
                id="customerEmail"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your email"
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                {error}
              </div>
            )}

            <div className="mb-4">
              <p className="text-sm text-gray-600">
                By proceeding with the payment, you agree to our terms and conditions.
              </p>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : `Bayar Rp ${Math.round(cartTotal + tax).toLocaleString('id-ID')}`}
            </Button>
            
            <div className="mt-4 text-center">
              <Link href="/cart" className="text-blue-500 hover:underline">
                Return to Cart
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}