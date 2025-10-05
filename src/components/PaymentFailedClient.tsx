'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function PaymentFailedClient() {
  const [orderId, setOrderId] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const id = searchParams.get('id');
    setOrderId(id);
  }, [searchParams]);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-5xl mb-6 text-red-500">❌</div>
      <h1 className="text-3xl font-bold mb-4 text-red-600">Payment Failed</h1>
      <p className="text-gray-600 mb-6 text-lg">
        Unfortunately, your payment was not successful. Please try again or use a different payment method.
      </p>

      {orderId && (
        <div className="bg-red-50 rounded-lg p-4 mb-6">
          <p className="text-gray-700">
            Order ID: <span className="font-semibold">{orderId}</span>
          </p>
        </div>
      )}

      <div className="flex justify-center gap-4 mt-8">
        <Link href="/">
          <Button variant="outline" className="px-8">
            Back to Home
          </Button>
        </Link>
        <Link href="/checkout">
          <Button className="px-8">
            Try Again
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default PaymentFailedClient;