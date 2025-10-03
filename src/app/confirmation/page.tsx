'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function OrderConfirmation() {
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    // In a real application, you would extract order details from URL parameters
    // or from the redirect from Xendit
    setOrderId('12345'); // Placeholder - in reality this would come from the URL or state
  }, []);

  return (
    <div className="container mx-auto py-8 px-4 text-center">
      <div className="max-w-2xl mx-auto">
        <div className="text-5xl mb-6">✅</div>
        <h1 className="text-3xl font-bold mb-4">Thank You for Your Order!</h1>
        <p className="text-gray-600 mb-6 text-lg">
          Your order has been placed successfully. A confirmation email has been sent to your email address.
        </p>
        
        {orderId && (
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <p className="text-gray-700">Order ID: <span className="font-semibold">{orderId}</span></p>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
          <Link href="/products">
            <Button variant="outline" className="w-full">
              Continue Shopping
            </Button>
          </Link>
          <Link href="/orders">
            <Button className="w-full">
              View Order History
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}